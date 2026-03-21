import { z } from "zod";
import { auth } from "@/auth";
import { success, error, validationError } from "@/lib/api";
import { createLogger } from "@/lib/core";
import { gemini } from "@/lib/ai/gemini";
import {
  JD_PARSER_PROMPT,
  JD_PARSER_PROMPT_VERSION,
} from "@/prompts/recruiter/jd-parser";
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

    const { jobDescription } = validationResult.data;

    // Build the full prompt with the job description
    const fullPrompt = JD_PARSER_PROMPT + jobDescription;

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
    ];

    const missingFields = expectedFields.filter(
      (field) => !(field in parsedData)
    );

    if (missingFields.length > 0) {
      logger.error("Missing fields in parsed response", { missingFields });
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
      return error(
        "Could not extract job details from this text. Make sure to paste the full job description including the title and responsibilities.",
        422
      );
    }

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
