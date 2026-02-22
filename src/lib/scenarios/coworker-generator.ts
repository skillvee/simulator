/**
 * Coworker Generator
 *
 * Auto-generates 2-3 realistic coworker personas based on role and company context.
 */

import { gemini } from "@/lib/ai/gemini";
import {
  COWORKER_GENERATOR_PROMPT_V1,
  COWORKER_GENERATOR_PROMPT_VERSION,
} from "@/prompts/recruiter/coworker-generator";
import { type CoworkerBuilderData, coworkerBuilderSchema } from "./scenario-builder";

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
    const result = coworkerBuilderSchema.safeParse(coworker);
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
    console.warn(`Got ${coworkers.length} coworkers, trimming to 3`);
    coworkers.length = 3; // Trim to max 3
  }

  for (const coworker of coworkers) {
    const criticalCount = coworker.knowledge.filter((k) => k.isCritical).length;
    if (criticalCount < 2) {
      throw new Error(
        `Coworker "${coworker.name}" has only ${criticalCount} critical knowledge items, need at least 2`
      );
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

        console.warn(
          `Fixed specific file path in ${coworker.name}'s knowledge: "${originalResponse}" → "${knowledge.response}"`
        );
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
  const contextPrompt = buildContextPrompt(input);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      const response = await gemini.models.generateContent({
        model: GENERATION_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${COWORKER_GENERATOR_PROMPT_V1}\n\n## Context for Generation\n\n${contextPrompt}`,
              },
            ],
          },
        ],
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini");
      }

      const coworkers = parseAndValidateCoworkers(responseText);

      // Validate we have an Engineering Manager
      const hasManager = coworkers.some((c) => isEngineeringManagerRole(c.role));
      if (!hasManager) {
        if (attempt < MAX_GENERATION_ATTEMPTS) {
          console.warn(
            `Attempt ${attempt}: No Engineering Manager found in generated coworkers, retrying...`
          );
          lastError = new Error("Generated coworkers must include an Engineering Manager");
          continue;
        }
        // Final attempt: patch the first coworker's role to Engineering Manager
        console.warn(
          "Engineering Manager missing after all attempts, patching first coworker"
        );
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
      };
    } catch (error) {
      lastError =
        error instanceof SyntaxError
          ? new Error(`Failed to parse JSON response: ${error.message}`)
          : error instanceof Error
            ? error
            : new Error(String(error));

      if (attempt < MAX_GENERATION_ATTEMPTS) {
        console.warn(
          `Attempt ${attempt} failed: ${lastError.message}, retrying...`
        );
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
  return `**Role Name:** ${input.roleName}
**Seniority Level:** ${input.seniorityLevel}
**Company Name:** ${input.companyName}
**Company Description:** ${input.companyDescription}
**Tech Stack:** ${input.techStack.join(", ")}
**Task Description:** ${input.taskDescription}
**Key Responsibilities:**
${input.keyResponsibilities.map((r) => `- ${r}`).join("\n")}

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
