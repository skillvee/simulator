import { gemini } from "@/lib/ai/gemini";
import { supabaseAdmin } from "@/lib/external/supabase";
import { STORAGE_BUCKETS } from "@/lib/external";
import { createLogger } from "@/lib/core";
import { CV_PARSING_PROMPT } from "@/prompts/analysis/cv-parser";
import { parsedProfileSchema, type ParsedProfile } from "./schemas";

const logger = createLogger("lib:candidate:cv-parser");

// ============================================================================
// CV Content Fetching
// ============================================================================

/**
 * Fetches the raw content of a CV from Supabase storage
 * @param cvUrl - The signed URL or storage path of the CV
 * @returns The text content of the CV
 */
export async function fetchCvContent(cvUrl: string): Promise<string> {
  try {
    // If it's a signed URL, extract the path
    let storagePath = cvUrl;
    if (cvUrl.includes("supabase.co")) {
      // Extract path from signed URL
      const url = new URL(cvUrl);
      const pathMatch = url.pathname.match(
        /\/storage\/v1\/object\/sign\/resumes\/(.+)/
      );
      if (pathMatch) {
        storagePath = pathMatch[1];
      }
    }

    // Download the file
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKETS.RESUMES)
      .download(storagePath);

    if (error || !data) {
      throw new Error(`Failed to download CV: ${error?.message}`);
    }

    // Get the content type to determine how to extract text
    const contentType = data.type;

    // For text files, just read directly
    if (contentType === "text/plain") {
      return await data.text();
    }

    // For PDF and other documents, we'll use Gemini's vision capability
    // Convert blob to base64
    const arrayBuffer = await data.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return `[BASE64_FILE:${contentType}:${base64}]`;
  } catch (error) {
    logger.error("Error fetching CV content", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// ============================================================================
// Main Parsing Function
// ============================================================================

/**
 * Parses a CV using Gemini AI
 * @param cvUrl - The URL or path to the CV file
 * @returns Parsed profile data
 */
export async function parseCv(cvUrl: string): Promise<ParsedProfile> {
  // Fetch the CV content
  const cvContent = await fetchCvContent(cvUrl);

  let contents: Array<{
    role: "user";
    parts: Array<{
      text?: string;
      inlineData?: { mimeType: string; data: string };
    }>;
  }>;

  // Check if we have a base64 file (PDF, DOC, etc.)
  if (cvContent.startsWith("[BASE64_FILE:")) {
    const match = cvContent.match(/\[BASE64_FILE:(.+?):(.+)\]/);
    if (match) {
      const [, mimeType, base64Data] = match;
      contents = [
        {
          role: "user" as const,
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
            {
              text: CV_PARSING_PROMPT,
            },
          ],
        },
      ];
    } else {
      throw new Error("Invalid base64 file format");
    }
  } else {
    // Plain text CV
    contents = [
      {
        role: "user" as const,
        parts: [
          {
            text: `${CV_PARSING_PROMPT}\n\n${cvContent}`,
          },
        ],
      },
    ];
  }

  // Call Gemini for parsing
  const result = await gemini.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
  });

  const responseText = result.text;

  if (!responseText) {
    throw new Error("No response from Gemini");
  }

  // Clean the response (remove markdown code blocks if present)
  let cleanedResponse = responseText.trim();
  if (cleanedResponse.startsWith("```json")) {
    cleanedResponse = cleanedResponse.slice(7);
  }
  if (cleanedResponse.startsWith("```")) {
    cleanedResponse = cleanedResponse.slice(3);
  }
  if (cleanedResponse.endsWith("```")) {
    cleanedResponse = cleanedResponse.slice(0, -3);
  }
  cleanedResponse = cleanedResponse.trim();

  // Parse and validate the response
  try {
    const parsed = JSON.parse(cleanedResponse);

    // Add timestamp if not present
    if (!parsed.parsedAt) {
      parsed.parsedAt = new Date().toISOString();
    }

    // Validate with Zod
    const validated = parsedProfileSchema.parse(parsed);
    return validated;
  } catch (error) {
    logger.error("Error parsing Gemini response", { error: error instanceof Error ? error.message : String(error) });
    logger.error("Raw response from Gemini", { responseText });

    // Return a minimal profile if parsing fails
    return {
      summary: "Unable to fully parse CV content. Manual review recommended.",
      workExperience: [],
      education: [],
      skills: [],
      certifications: [],
      languages: [],
      parsedAt: new Date().toISOString(),
      parseQuality: "low",
      parseNotes: [
        `Parsing error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
    };
  }
}
