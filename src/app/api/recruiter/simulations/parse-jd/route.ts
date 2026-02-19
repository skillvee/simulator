import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { gemini } from "@/lib/ai/gemini";
import {
  JD_PARSER_PROMPT,
  JD_PARSER_PROMPT_VERSION,
} from "@/prompts/recruiter/jd-parser";
import type { ParseJDResponse } from "@/types";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Recruiter access required" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = parseJDRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Failed to parse job description - empty response from AI" },
        { status: 500 }
      );
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
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("AI response:", responseText);
      return NextResponse.json(
        {
          error: "Failed to parse job description - invalid JSON response",
          details: responseText,
        },
        { status: 500 }
      );
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
      console.error("Missing fields in parsed response:", missingFields);
      return NextResponse.json(
        {
          error: "Incomplete parsing result",
          details: `Missing fields: ${missingFields.join(", ")}`,
        },
        { status: 500 }
      );
    }

    // Return the parsed data with version metadata
    return NextResponse.json({
      ...parsedData,
      _meta: {
        promptVersion: JD_PARSER_PROMPT_VERSION,
        parsedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Job description parsing error:", error);
    return NextResponse.json(
      {
        error: "Failed to parse job description",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
