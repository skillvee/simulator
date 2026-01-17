/**
 * Feedback Parsing Service
 *
 * Parses rejection feedback to extract constraint updates for search refinement.
 * Uses Gemini to understand natural language feedback and extract structured
 * constraint updates that can be applied to the search query.
 *
 * @since 2026-01-17
 * @see Issue #75: US-012b
 */

import { gemini, TEXT_MODEL } from "@/lib/gemini";
import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

/**
 * Types of constraints that can be extracted from feedback
 */
export type ConstraintType =
  | "years_experience"
  | "skills"
  | "job_title"
  | "location"
  | "industry"
  | "company_type";

/**
 * A single constraint update extracted from feedback
 */
export interface ConstraintUpdate {
  /** Type of constraint */
  type: ConstraintType;
  /** The constraint value (string for single values, array for multiple) */
  value: string | string[];
  /** Reason for the constraint (optional) */
  reason?: string;
}

/**
 * Result of parsing feedback
 */
export interface FeedbackParseResult {
  /** Whether parsing was successful */
  success: boolean;
  /** Extracted constraint updates */
  constraints: ConstraintUpdate[];
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Error message if parsing failed */
  error?: string;
}

// ============================================================================
// Schema
// ============================================================================

/**
 * Zod schema for validating Gemini's response
 */
const constraintSchema = z.object({
  type: z.enum([
    "years_experience",
    "skills",
    "job_title",
    "location",
    "industry",
    "company_type",
  ]),
  value: z.union([z.string(), z.array(z.string())]),
  reason: z.string().optional(),
});

const feedbackResponseSchema = z.object({
  constraints: z.array(constraintSchema),
});

// ============================================================================
// Prompt
// ============================================================================

/**
 * Prompt for extracting constraints from rejection feedback
 */
const FEEDBACK_PARSING_PROMPT = `You are a search constraint parser. Analyze the hiring manager's feedback about why a candidate isn't a fit, and extract structured constraint updates.

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanations, just JSON.

Extract these constraint types:
- years_experience: Years of experience needed (e.g., "8+", "10+", "5-8")
- skills: Technical skills, technologies, or competencies needed (array, e.g., ["React", "Python", "backend"])
- job_title: Job title or role level needed (e.g., "Tech Lead", "Senior Engineer")
- location: Location requirement (e.g., "NYC", "SF", "remote")
- industry: Industry experience needed (array, e.g., ["fintech", "healthcare"])
- company_type: Company type preference (array, e.g., ["startup", "enterprise"])

For each constraint, include:
- type: The constraint type from the list above
- value: The constraint value (string or array of strings)
- reason: Brief explanation of why this constraint is needed (optional)

Example input: "Need 8+ years, not 5"
Example output: {"constraints":[{"type":"years_experience","value":"8+","reason":"Candidate has only 5 years"}]}

Example input: "Looking for more frontend focus"
Example output: {"constraints":[{"type":"skills","value":["frontend"],"reason":"Need frontend specialization"}]}

Feedback to parse: `;

// ============================================================================
// Main Function
// ============================================================================

/**
 * Parses rejection feedback to extract constraint updates.
 *
 * Uses Gemini to analyze natural language feedback and extract structured
 * constraints that can be used to refine search criteria.
 *
 * @param feedback - The rejection feedback from the hiring manager
 * @returns Parsed constraints and metadata
 */
export async function parseFeedback(
  feedback: string
): Promise<FeedbackParseResult> {
  const startTime = Date.now();

  // Handle empty feedback
  if (!feedback || feedback.trim().length === 0) {
    return {
      success: true,
      constraints: [],
      processingTimeMs: Date.now() - startTime,
    };
  }

  try {
    // Call Gemini for constraint extraction
    const result = await gemini.models.generateContent({
      model: TEXT_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: FEEDBACK_PARSING_PROMPT + feedback }],
        },
      ],
      config: {
        temperature: 0, // Deterministic output
        maxOutputTokens: 512, // Enough for multiple constraints
      },
    });

    const responseText = result.text;

    if (!responseText) {
      return {
        success: false,
        constraints: [],
        processingTimeMs: Date.now() - startTime,
        error: "No response from Gemini",
      };
    }

    // Parse the JSON response
    const constraints = parseGeminiResponse(responseText);

    return {
      success: true,
      constraints,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      constraints: [],
      processingTimeMs: Date.now() - startTime,
      error: message,
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parses Gemini's JSON response into constraint updates.
 * Handles markdown code blocks and validates with Zod.
 */
function parseGeminiResponse(responseText: string): ConstraintUpdate[] {
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

  // Parse JSON
  const parsed = JSON.parse(cleanedResponse);

  // Validate with Zod
  const validated = feedbackResponseSchema.parse(parsed);

  return validated.constraints;
}

/**
 * Applies constraint updates to an existing search intent.
 *
 * @param currentIntent - The current extracted intent from the search query
 * @param constraints - Constraint updates to apply
 * @returns Updated intent with new constraints merged in
 */
export function applyConstraints<
  T extends {
    job_title?: string | null;
    location?: string | null;
    years_experience?: number | null;
    skills?: string[];
    industry?: string[];
    company_type?: string[];
  }
>(currentIntent: T, constraints: ConstraintUpdate[]): T {
  const updated = { ...currentIntent };

  for (const constraint of constraints) {
    switch (constraint.type) {
      case "years_experience":
        // Parse the years value (e.g., "8+" -> 8)
        const yearsMatch =
          typeof constraint.value === "string"
            ? constraint.value.match(/(\d+)/)
            : null;
        if (yearsMatch) {
          updated.years_experience = parseInt(yearsMatch[1], 10);
        }
        break;

      case "skills":
        // Merge skills arrays
        const newSkills = Array.isArray(constraint.value)
          ? constraint.value
          : [constraint.value];
        updated.skills = [...(updated.skills || []), ...newSkills];
        break;

      case "job_title":
        updated.job_title =
          typeof constraint.value === "string" ? constraint.value : null;
        break;

      case "location":
        updated.location =
          typeof constraint.value === "string" ? constraint.value : null;
        break;

      case "industry":
        const newIndustry = Array.isArray(constraint.value)
          ? constraint.value
          : [constraint.value];
        updated.industry = [...(updated.industry || []), ...newIndustry];
        break;

      case "company_type":
        const newCompanyType = Array.isArray(constraint.value)
          ? constraint.value
          : [constraint.value];
        updated.company_type = [
          ...(updated.company_type || []),
          ...newCompanyType,
        ];
        break;
    }
  }

  return updated;
}
