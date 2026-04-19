/**
 * Coworker Generator
 *
 * Auto-generates 2-3 realistic coworker personas based on role and company context.
 */

import { gemini } from "@/lib/ai/gemini";
import { createLogger } from "@/lib/core";
import { DEFAULT_LANGUAGE, type SupportedLanguage, buildLanguageInstruction } from "@/lib/core/language";
import {
  COWORKER_GENERATOR_PROMPT_V1,
  COWORKER_GENERATOR_PROMPT_VERSION,
} from "@/prompts/recruiter/coworker-generator";
import { type CoworkerBuilderData, coworkerBuilderSchema } from "./scenario-builder";
import { inferDemographics } from "@/lib/avatar/name-ethnicity";

const logger = createLogger("lib:scenarios:coworker-generator");

const GENERATION_MODEL = "gemini-3-flash-preview";

/**
 * Input parameters for coworker generation
 */
export type GenerateCoworkersInput = {
  roleName: string;
  seniorityLevel: "junior" | "mid" | "senior" | "staff" | "principal";
  companyName: string;
  companyDescription: string;
  techStack: string[];
  taskDescription: string;
  keyResponsibilities: string[];
  language?: SupportedLanguage;
};

/**
 * Response from coworker generation
 */
export type GenerateCoworkersResponse = {
  coworkers: CoworkerBuilderData[];
  _meta: {
    promptVersion: string;
    generatedAt: string;
  };
  _debug: {
    promptText: string;
    responseText: string;
    attempts: number;
  };
};

const MAX_GENERATION_ATTEMPTS = 3; // Increased for better resilience against transient failures

/**
 * Check if a role title refers to an Engineering Manager
 */
function isEngineeringManagerRole(role: string): boolean {
  const lower = role.toLowerCase();
  return (
    lower.includes("engineering manager") ||
    lower.includes("eng manager") ||
    lower.includes("eng. manager") ||
    (lower.includes("manager") && lower.includes("engineer"))
  );
}

/**
 * Parse and validate a raw Gemini response into coworker data.
 * Returns the validated coworkers array or throws with a specific message.
 */
function parseAndValidateCoworkers(responseText: string): CoworkerBuilderData[] {
  const cleanedText = cleanJsonResponse(responseText);
  const parsed = JSON.parse(cleanedText);

  if (!Array.isArray(parsed)) {
    throw new Error("Response is not an array");
  }

  const coworkers = parsed.map((coworker, index) => {
    // Backfill gender/ethnicity from name if LLM omitted them, so one missing field
    // doesn't fail the whole generation. The name-based dictionary now covers common
    // international names; the hash fallback is a last resort.
    const candidate = coworker && typeof coworker === "object" ? { ...coworker } : coworker;
    if (candidate && typeof candidate === "object" && typeof candidate.name === "string") {
      if (!candidate.gender || !candidate.ethnicity) {
        const inferred = inferDemographics(candidate.name);
        if (!candidate.gender) {
          candidate.gender = inferred.gender;
          logger.warn("LLM omitted gender; inferred from name", { name: candidate.name, inferred: inferred.gender });
        }
        if (!candidate.ethnicity) {
          candidate.ethnicity = inferred.group;
          logger.warn("LLM omitted ethnicity; inferred from name", { name: candidate.name, inferred: inferred.group });
        }
      }
    }

    const result = coworkerBuilderSchema.safeParse(candidate);
    if (!result.success) {
      throw new Error(
        `Invalid coworker at index ${index}: ${result.error.message}`
      );
    }
    return result.data;
  });

  // Ensure we have at least 2 coworkers (critical for simulation quality)
  if (coworkers.length < 2) {
    throw new Error(`Expected at least 2 coworkers, got ${coworkers.length}. Generation must include an Engineering Manager plus 1-2 team members.`);
  }

  if (coworkers.length > 3) {
    logger.warn("Too many coworkers generated, trimming to 3", { count: coworkers.length });
    coworkers.length = 3; // Trim to max 3
  }

  for (const coworker of coworkers) {
    const criticalCount = coworker.knowledge.filter((k) => k.isCritical).length;
    if (criticalCount < 2) {
      // Auto-fix: promote non-critical knowledge items to critical
      const needed = 2 - criticalCount;
      let promoted = 0;
      for (const k of coworker.knowledge) {
        if (!k.isCritical && promoted < needed) {
          k.isCritical = true;
          promoted++;
        }
      }
      logger.warn("Auto-promoted knowledge items to critical", {
        coworkerName: coworker.name,
        originalCritical: criticalCount,
        promoted,
      });
    }

    // Validate that knowledge doesn't contain specific file paths
    for (const knowledge of coworker.knowledge) {
      const specificPathPattern = /(?:src|lib|pages|api|components|stores|services)\/[\w\/-]+\.\w+/;
      if (specificPathPattern.test(knowledge.response)) {
        // Auto-fix by making the path reference generic
        const originalResponse = knowledge.response;
        knowledge.response = knowledge.response
          .replace(/src\/stores\/[\w\/-]+\.\w+/g, "the state management files")
          .replace(/src\/api\/[\w\/-]+\.\w+/g, "the API handlers")
          .replace(/src\/components\/[\w\/-]+\.\w+/g, "the component files")
          .replace(/src\/lib\/[\w\/-]+\.\w+/g, "the utility files")
          .replace(/src\/services\/[\w\/-]+\.\w+/g, "the service layer")
          .replace(/(?:src|lib|pages|api|components|stores|services)\/[\w\/-]+\.\w+/g, "the relevant files in the codebase");

        logger.warn("Fixed specific file path in coworker knowledge", {
          coworkerName: coworker.name,
          originalResponse,
          fixedResponse: knowledge.response,
        });
      }
    }
  }

  return coworkers;
}

/**
 * Generate 2-3 realistic coworkers based on role and company context
 *
 * Always generates:
 * - 1 Engineering Manager (required for kickoff and PR defense)
 * - 1-2 peer/adjacent coworkers relevant to the role
 *
 * Each coworker includes:
 * - Realistic, diverse name
 * - Specific role title
 * - Detailed personaStyle
 * - 3-5 knowledge items (at least 2 marked as critical)
 *
 * Retries once if the first attempt fails validation (e.g., missing Engineering Manager).
 *
 * @param input Role and company context
 * @returns Array of coworker personas
 * @throws Error if generation fails after all attempts
 */
export async function generateCoworkers(
  input: GenerateCoworkersInput
): Promise<GenerateCoworkersResponse> {
  const lang = input.language || DEFAULT_LANGUAGE;
  const langInstruction = buildLanguageInstruction(lang);
  const contextPrompt = buildContextPrompt(input);
  const fullPrompt = `${COWORKER_GENERATOR_PROMPT_V1}\n\n${langInstruction ? `## Language Instructions\n\n${langInstruction}\n\n` : ''}## Context for Generation\n\n${contextPrompt}`;
  let lastError: Error | null = null;
  let _lastResponseText = "";

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      const response = await gemini.models.generateContent({
        model: GENERATION_MODEL,
        contents: [
          {
            role: "user",
            parts: [{ text: fullPrompt }],
          },
        ],
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini");
      }
      _lastResponseText = responseText;

      const coworkers = parseAndValidateCoworkers(responseText);

      // Validate we have an Engineering Manager
      const hasManager = coworkers.some((c) => isEngineeringManagerRole(c.role));
      if (!hasManager) {
        if (attempt < MAX_GENERATION_ATTEMPTS) {
          logger.warn("No Engineering Manager found in generated coworkers, retrying", { attempt });
          lastError = new Error("Generated coworkers must include an Engineering Manager");
          continue;
        }
        // Final attempt: patch the first coworker's role to Engineering Manager
        logger.warn("Engineering Manager missing after all attempts, patching first coworker");
        coworkers[0] = {
          ...coworkers[0],
          role: "Engineering Manager",
        };
      }

      return {
        coworkers,
        _meta: {
          promptVersion: COWORKER_GENERATOR_PROMPT_VERSION,
          generatedAt: new Date().toISOString(),
        },
        _debug: {
          promptText: fullPrompt,
          responseText,
          attempts: attempt,
        },
      };
    } catch (error) {
      lastError =
        error instanceof SyntaxError
          ? new Error(`Failed to parse JSON response: ${error.message}`)
          : error instanceof Error
            ? error
            : new Error(String(error));

      if (attempt < MAX_GENERATION_ATTEMPTS) {
        logger.warn("Generation attempt failed, retrying", { attempt, error: lastError.message });
        continue;
      }
    }
  }

  throw lastError ?? new Error("Failed to generate coworkers");
}

/**
 * Build the context prompt from input parameters
 */
function buildContextPrompt(input: GenerateCoworkersInput): string {
  const lang = input.language || DEFAULT_LANGUAGE;
  return `**Role Name:** ${input.roleName}
**Seniority Level:** ${input.seniorityLevel}
**Company Name:** ${input.companyName}
**Company Description:** ${input.companyDescription}
**Tech Stack:** ${input.techStack.join(", ")}
**Task Description:** ${input.taskDescription}
**Key Responsibilities:**
${input.keyResponsibilities.map((r) => `- ${r}`).join("\n")}
**Language:** ${lang}

Now generate 2-3 coworkers for this context.`;
}

/**
 * Clean JSON response by removing markdown code fences
 */
function cleanJsonResponse(text: string): string {
  // Remove markdown fences (both ```json and ``` variants)
  let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  // Extract the JSON array — find the outermost [ ... ] to discard trailing text
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  // Trim whitespace
  return cleaned.trim();
}
