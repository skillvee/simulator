/**
 * Entity Extraction API Route
 *
 * Extracts structured entities from natural language search queries.
 * Used by the conversational search interface for real-time feedback.
 *
 * @since 2026-01-17
 * @see Issue #72: US-007
 */

import { NextRequest } from "next/server";
import { success, error } from "@/lib/api";
import {
  extractEntities,
  mapJobTitleToArchetype,
  inferSeniorityFromYears,
} from "@/lib/candidate";

/**
 * POST /api/search/extract
 *
 * Extracts entities from a search query for real-time UI feedback.
 *
 * Request body:
 * - query: string - The natural language search query
 *
 * Response:
 * - intent: ExtractedIntent - Structured entities
 * - archetype: RoleArchetype | null - Mapped role archetype
 * - seniority: SeniorityLevel | null - Inferred seniority
 * - processingTimeMs: number - Processing time in milliseconds
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (typeof query !== "string") {
      return error("Invalid request body", 400);
    }

    const result = await extractEntities(query);

    if (!result.success) {
      // Try to extract entities from the query using simple pattern matching as fallback
      const fallbackIntent = extractFallbackEntities(query);
      return success({
        intent: fallbackIntent.intent,
        archetype: fallbackIntent.archetype,
        seniority: fallbackIntent.seniority,
        processingTimeMs: result.processingTimeMs,
        fallback: true,
      });
    }

    return success({
      intent: result.intent,
      archetype: result.archetype,
      seniority: result.seniority,
      processingTimeMs: result.processingTimeMs,
    });
  } catch (err) {
    console.error("Entity extraction error:", err);
    return error("Internal server error", 500);
  }
}

// ============================================================================
// Fallback Entity Extraction
// ============================================================================

/**
 * Simple pattern-based fallback for entity extraction when AI fails.
 * Uses regex patterns to extract common entities from search queries.
 */
function extractFallbackEntities(query: string): {
  intent: {
    job_title: string | null;
    location: string | null;
    years_experience: number | null;
    skills: string[];
    industry: string[];
    company_type: string[];
  };
  archetype: ReturnType<typeof mapJobTitleToArchetype>;
  seniority: ReturnType<typeof inferSeniorityFromYears>;
} {
  const lowerQuery = query.toLowerCase();

  // Extract job title patterns
  const jobTitlePatterns = [
    /\b(senior|junior|mid-level|staff|principal|lead)?\s*(software engineers?|developers?|engineers?|frontend|backend|fullstack|devops|sre|data engineers?|ml engineers?|tech leads?|engineering managers?)\b/i,
  ];
  let jobTitle: string | null = null;
  for (const pattern of jobTitlePatterns) {
    const match = query.match(pattern);
    if (match) {
      jobTitle = match[0].trim();
      break;
    }
  }

  // Extract location patterns
  const locationPatterns = [
    /\b(San Francisco|New York|Los Angeles|Silicon Valley)\b/i,
    /\b(NYC|SF|LA|Boston|Seattle|Austin|Denver|Chicago|remote)\b/i,
  ];
  let location: string | null = null;
  for (const pattern of locationPatterns) {
    const match = query.match(pattern);
    if (match) {
      // Normalize common abbreviations
      const loc = match[1] || match[0];
      location =
        loc === "NYC"
          ? "New York"
          : loc === "SF"
            ? "San Francisco"
            : loc === "LA"
              ? "Los Angeles"
              : loc;
      break;
    }
  }

  // Extract years of experience
  const yearsPattern = /(\d+)\+?\s*(?:years?|yrs?)/i;
  const yearsMatch = query.match(yearsPattern);
  let yearsExperience: number | null = null;
  if (yearsMatch) {
    yearsExperience = parseInt(yearsMatch[1], 10);
  } else if (lowerQuery.includes("senior")) {
    yearsExperience = 6;
  } else if (lowerQuery.includes("junior")) {
    yearsExperience = 1;
  }

  // Extract skills (common programming keywords)
  const skillKeywords = [
    "python",
    "javascript",
    "typescript",
    "react",
    "node",
    "nodejs",
    "go",
    "golang",
    "rust",
    "java",
    "c++",
    "ruby",
    "php",
    "swift",
    "kubernetes",
    "docker",
    "aws",
    "gcp",
    "azure",
    "terraform",
    "ml",
    "machine learning",
    "ai",
    "llm",
    "llms",
    "data science",
    "sql",
    "postgresql",
    "mongodb",
    "redis",
    "graphql",
    "rest",
  ];
  const skills: string[] = [];
  for (const skill of skillKeywords) {
    if (lowerQuery.includes(skill)) {
      // Normalize skill names
      const normalized =
        skill === "nodejs"
          ? "Node.js"
          : skill === "golang"
            ? "Go"
            : skill === "llms"
              ? "LLMs"
              : skill === "llm"
                ? "LLMs"
                : skill.charAt(0).toUpperCase() + skill.slice(1);
      if (!skills.includes(normalized)) {
        skills.push(normalized);
      }
    }
  }

  // Extract company type
  const companyTypes: string[] = [];
  if (lowerQuery.includes("startup")) companyTypes.push("startup");
  if (lowerQuery.includes("vc backed") || lowerQuery.includes("vc-backed"))
    companyTypes.push("VC backed");
  if (lowerQuery.includes("enterprise")) companyTypes.push("enterprise");
  if (lowerQuery.includes("faang") || lowerQuery.includes("big tech"))
    companyTypes.push("FAANG");

  // Extract industry
  const industries: string[] = [];
  if (lowerQuery.includes("fintech") || lowerQuery.includes("finance"))
    industries.push("fintech");
  if (lowerQuery.includes("healthcare") || lowerQuery.includes("health"))
    industries.push("healthcare");
  if (lowerQuery.includes("retail") || lowerQuery.includes("e-commerce"))
    industries.push("retail");

  const intent = {
    job_title: jobTitle,
    location,
    years_experience: yearsExperience,
    skills,
    industry: industries,
    company_type: companyTypes,
  };

  return {
    intent,
    archetype: mapJobTitleToArchetype(jobTitle),
    seniority: inferSeniorityFromYears(yearsExperience),
  };
}
