/**
 * Real-Time Entity Extraction Service
 *
 * Parses natural language search queries into structured entities for
 * candidate matching. Uses Gemini for NLU with optimized prompts for
 * sub-500ms response times.
 *
 * @since 2026-01-16
 * @see Issue #68: US-008
 */

import { gemini, TEXT_MODEL } from "@/lib/ai/gemini";
import { z } from "zod";
import { type RoleArchetype } from "@/lib/candidate";
import { type SeniorityLevel } from "@/lib/candidate";
import { buildEntityExtractionContext } from "@/prompts";

// ============================================================================
// Types and Schemas
// ============================================================================

/**
 * Zod schema for validating Gemini's response
 */
const extractedIntentSchema = z.object({
  job_title: z.string().nullable(),
  location: z.string().nullable(),
  years_experience: z.number().nullable(),
  skills: z.array(z.string()).default([]),
  industry: z.array(z.string()).default([]),
  company_type: z.array(z.string()).default([]),
});

/**
 * Structured intent extracted from a search query (inferred from Zod schema)
 */
export type ExtractedIntent = z.infer<typeof extractedIntentSchema>;

/**
 * Result of entity extraction with optional archetype and seniority mapping
 */
export interface EntityExtractionResult {
  /** Raw extracted intent from the query */
  intent: ExtractedIntent;
  /** Mapped archetype (if job title matches known roles) */
  archetype: RoleArchetype | null;
  /** Inferred seniority level (from years of experience) */
  seniority: SeniorityLevel | null;
  /** Whether the extraction was successful */
  success: boolean;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Error message if extraction failed */
  error?: string;
}

// ============================================================================
// Job Title to Archetype Mapping
// ============================================================================

/**
 * Maps job title keywords to role archetypes.
 * Keywords are checked in order, first match wins.
 */
const JOB_TITLE_ARCHETYPE_MAP: Array<{
  keywords: string[];
  archetype: RoleArchetype;
}> = [
  // More specific patterns first to avoid false matches
  {
    keywords: ["data engineer", "data platform", "analytics engineer", "etl"],
    archetype: "DATA_ENGINEER",
  },
  {
    keywords: ["data scientist", "ds engineer", "applied scientist", "research scientist"],
    archetype: "DATA_SCIENTIST",
  },
  {
    keywords: ["data analyst", "business analyst", "bi analyst", "analytics analyst"],
    archetype: "DATA_ANALYST",
  },
  {
    keywords: [
      "frontend",
      "front-end",
      "front end",
      "ui engineer",
      "ui developer",
    ],
    archetype: "SENIOR_FRONTEND_ENGINEER",
  },
  {
    keywords: [
      "backend",
      "back-end",
      "back end",
      "server engineer",
      "api engineer",
    ],
    archetype: "SENIOR_BACKEND_ENGINEER",
  },
  {
    keywords: ["fullstack", "full-stack", "full stack"],
    archetype: "FULLSTACK_ENGINEER",
  },
  {
    keywords: [
      "engineering manager",
      "eng manager",
      "em ",
      "manager of engineering",
    ],
    archetype: "ENGINEERING_MANAGER",
  },
  {
    keywords: [
      "tech lead",
      "technical lead",
      "lead engineer",
      "staff engineer",
      "principal engineer",
      "architect",
    ],
    archetype: "TECH_LEAD",
  },
  {
    keywords: [
      "devops",
      "sre",
      "site reliability",
      "infrastructure engineer",
      "platform engineer",
    ],
    archetype: "DEVOPS_ENGINEER",
  },
  {
    keywords: ["ml engineer", "machine learning", "ai engineer", "ai/ml"],
    archetype: "GENERAL_SOFTWARE_ENGINEER", // AI/ML maps to general SE
  },
  {
    keywords: ["software engineer", "software developer", "swe", "developer"],
    archetype: "GENERAL_SOFTWARE_ENGINEER",
  },
];

/**
 * Maps a job title string to a role archetype.
 *
 * @param jobTitle - The job title extracted from the query
 * @returns The matching archetype or null if no match
 */
export function mapJobTitleToArchetype(
  jobTitle: string | null
): RoleArchetype | null {
  if (!jobTitle) return null;

  const normalizedTitle = jobTitle.toLowerCase().trim();

  for (const { keywords, archetype } of JOB_TITLE_ARCHETYPE_MAP) {
    for (const keyword of keywords) {
      if (normalizedTitle.includes(keyword)) {
        return archetype;
      }
    }
  }

  return null;
}

// ============================================================================
// Years of Experience to Seniority Mapping
// ============================================================================

/**
 * Seniority level thresholds based on years of experience.
 * - Junior: 0-2 years
 * - Mid: 3-5 years
 * - Senior: 6+ years
 */
const SENIORITY_THRESHOLDS = {
  JUNIOR_MAX: 2,
  MID_MAX: 5,
} as const;

/**
 * Infers seniority level from years of experience.
 *
 * @param yearsExperience - Number of years of experience
 * @returns The inferred seniority level or null if not provided
 */
export function inferSeniorityFromYears(
  yearsExperience: number | null
): SeniorityLevel | null {
  if (yearsExperience === null || yearsExperience < 0) return null;

  if (yearsExperience <= SENIORITY_THRESHOLDS.JUNIOR_MAX) {
    return "JUNIOR";
  } else if (yearsExperience <= SENIORITY_THRESHOLDS.MID_MAX) {
    return "MID";
  } else {
    return "SENIOR";
  }
}

// ============================================================================
// Main Extraction Function
// ============================================================================

/**
 * Extracts entities from a natural language search query.
 *
 * Uses Gemini for NLU parsing with optimized prompts for speed.
 * Target response time: <500ms for responsive UI feedback.
 *
 * @param query - The natural language search query
 * @returns Extraction result with structured intent, archetype, and seniority
 */
export async function extractEntities(
  query: string
): Promise<EntityExtractionResult> {
  const startTime = Date.now();

  // Handle empty queries
  if (!query || query.trim().length === 0) {
    return {
      intent: createEmptyIntent(),
      archetype: null,
      seniority: null,
      success: true,
      processingTimeMs: Date.now() - startTime,
    };
  }

  try {
    // Call Gemini for entity extraction
    const result = await gemini.models.generateContent({
      model: TEXT_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: buildEntityExtractionContext(query) }],
        },
      ],
      config: {
        // Optimize for speed
        temperature: 0, // Deterministic output
        maxOutputTokens: 256, // Small response for speed
      },
    });

    const responseText = result.text;

    if (!responseText) {
      return createErrorResult("No response from Gemini", startTime);
    }

    // Parse the JSON response
    const intent = parseGeminiResponse(responseText);

    // Map job title to archetype
    const archetype = mapJobTitleToArchetype(intent.job_title);

    // Infer seniority from years of experience
    const seniority = inferSeniorityFromYears(intent.years_experience);

    return {
      intent,
      archetype,
      seniority,
      success: true,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return createErrorResult(message, startTime);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates an empty intent object for empty queries.
 */
function createEmptyIntent(): ExtractedIntent {
  return {
    job_title: null,
    location: null,
    years_experience: null,
    skills: [],
    industry: [],
    company_type: [],
  };
}

/**
 * Creates an error result with the given message.
 */
function createErrorResult(
  message: string,
  startTime: number
): EntityExtractionResult {
  return {
    intent: createEmptyIntent(),
    archetype: null,
    seniority: null,
    success: false,
    processingTimeMs: Date.now() - startTime,
    error: message,
  };
}

/**
 * Parses Gemini's JSON response into an ExtractedIntent.
 * Handles markdown code blocks and validates with Zod.
 */
function parseGeminiResponse(responseText: string): ExtractedIntent {
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
  const validated = extractedIntentSchema.parse(parsed);

  return validated;
}

/**
 * Cleans and normalizes a JSON response from Gemini.
 * Exported for testing purposes.
 */
export function cleanJsonResponse(responseText: string): string {
  let cleaned = responseText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  }
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates if extraction completed within the target time.
 * Target: 500ms for responsive UI feedback.
 */
export function isWithinTargetTime(processingTimeMs: number): boolean {
  return processingTimeMs <= 500;
}

/**
 * Gets a list of all supported job title keywords for archetype mapping.
 */
export function getSupportedJobTitleKeywords(): string[] {
  return JOB_TITLE_ARCHETYPE_MAP.flatMap(({ keywords }) => keywords);
}

/**
 * Gets the seniority thresholds for years of experience.
 */
export function getSeniorityThresholds(): {
  juniorMax: number;
  midMax: number;
} {
  return {
    juniorMax: SENIORITY_THRESHOLDS.JUNIOR_MAX,
    midMax: SENIORITY_THRESHOLDS.MID_MAX,
  };
}
