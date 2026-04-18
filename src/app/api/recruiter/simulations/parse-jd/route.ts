import { z } from "zod";
import { auth } from "@/auth";
import { success, error, validationError } from "@/lib/api";
import { createLogger } from "@/lib/core";
import { gemini } from "@/lib/ai/gemini";
import {
  JD_PARSER_PROMPT,
  JD_PARSER_PROMPT_VERSION,
} from "@/prompts/recruiter/jd-parser";
import { logGenerationStep } from "@/lib/scenarios/generation-logger";
import { isSupportedLanguage } from "@/lib/core/language";
import type { ParseJDResponse } from "@/types";

const logger = createLogger("api:recruiter:parse-jd");

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

// Gemini Flash model for text parsing
const PARSING_MODEL = "gemini-3-flash-preview";

// Zod schema for request validation
const parseJDRequestSchema = z.object({
  jobDescription: z.string().min(1, "Job description cannot be empty"),
  creationLogId: z.string().optional(),
});

/**
 * POST /api/recruiter/simulations/parse-jd
 * Parse a job description and extract structured simulation data
 * Available to RECRUITER and ADMIN roles
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = parseJDRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return validationError(validationResult.error);
    }

    const { jobDescription, creationLogId } = validationResult.data;

    // Build the full prompt with the job description
    const fullPrompt = JD_PARSER_PROMPT + jobDescription;

    // Start generation step logging if creationLogId is provided
    const tracker = creationLogId
      ? await logGenerationStep({
          creationLogId,
          stepName: "parse_jd",
          modelUsed: PARSING_MODEL,
          promptVersion: JD_PARSER_PROMPT_VERSION,
          promptText: fullPrompt,
          inputData: { jobDescription: jobDescription.slice(0, 500) + (jobDescription.length > 500 ? "..." : "") },
        })
      : null;

    // Call Gemini Flash for parsing
    const response = await gemini.models.generateContent({
      model: PARSING_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: fullPrompt }],
        },
      ],
    });

    const responseText = response.text;

    if (!responseText) {
      await tracker?.fail(new Error("Empty response from AI"));
      return error("Failed to parse job description - empty response from AI", 500);
    }

    // Parse the JSON response
    let parsedData: ParseJDResponse;
    try {
      // Remove any markdown code fences if present
      const cleanedResponse = responseText
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();

      parsedData = JSON.parse(cleanedResponse) as ParseJDResponse;
    } catch (parseErr) {
      logger.error("Failed to parse AI response as JSON", { error: parseErr instanceof Error ? parseErr.message : String(parseErr), responseText });
      await tracker?.fail(new Error(`Invalid JSON response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`));
      return error("Failed to parse job description - invalid JSON response", 500);
    }

    // Validate the parsed data structure
    const expectedFields = [
      "roleName",
      "companyName",
      "companyDescription",
      "techStack",
      "seniorityLevel",
      "keyResponsibilities",
      "domainContext",
      "roleArchetype",
      "language",
    ];

    const missingFields = expectedFields.filter(
      (field) => !(field in parsedData)
    );

    if (missingFields.length > 0) {
      logger.error("Missing fields in parsed response", { missingFields });
      await tracker?.fail(new Error(`Missing fields: ${missingFields.join(", ")}`));
      return error(`Incomplete parsing result - missing fields: ${missingFields.join(", ")}`, 500);
    }

    // Check if the JD had enough content to extract anything useful
    const hasAnyValue = expectedFields.some((field) => {
      const entry = parsedData[field as keyof ParseJDResponse];
      if (entry && typeof entry === "object" && "value" in entry) {
        return entry.value !== null && entry.value !== undefined;
      }
      return false;
    });

    if (!hasAnyValue) {
      await tracker?.fail(new Error("No extractable content from job description"));
      return error(
        "Could not extract job details from this text. Make sure to paste the full job description including the title and responsibilities.",
        422
      );
    }

    // Validate and handle language detection
    if (parsedData.language?.value) {
      const detectedLanguage = parsedData.language.value;
      if (!isSupportedLanguage(detectedLanguage)) {
        // Log the raw detector output for observability
        logger.warn("Unsupported language detected, falling back to English", {
          detectedLanguage,
          jobDescriptionPreview: jobDescription.slice(0, 200)
        });
        // Fall back to English
        parsedData.language = { value: "en", confidence: "low" };
      }
    } else {
      // If language detection failed entirely, default to English
      logger.warn("Language detection returned null, defaulting to English");
      parsedData.language = { value: "en", confidence: "low" };
    }

    // Log successful completion
    await tracker?.complete({
      responseText,
      outputData: parsedData as unknown as Record<string, unknown>,
    });

    // Return the parsed data with version metadata
    return success({
      ...parsedData,
      _meta: {
        promptVersion: JD_PARSER_PROMPT_VERSION,
        parsedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error("Job description parsing error", { error: err instanceof Error ? err.message : String(err) });
    return error("Failed to parse job description", 500);
  }
}
