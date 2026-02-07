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
import { z } from "zod";

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
 * @param input Role and company context
 * @returns Array of coworker personas
 * @throws Error if generation fails or response is invalid
 */
export async function generateCoworkers(
  input: GenerateCoworkersInput
): Promise<GenerateCoworkersResponse> {
  // Build the context prompt
  const contextPrompt = buildContextPrompt(input);

  try {
    // Generate coworkers using Gemini Flash
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

    // Clean response (remove markdown fences if present)
    const cleanedText = cleanJsonResponse(responseText);

    // Parse and validate the JSON
    const parsed = JSON.parse(cleanedText);

    // Validate it's an array
    if (!Array.isArray(parsed)) {
      throw new Error("Response is not an array");
    }

    // Validate each coworker against schema
    const coworkers = parsed.map((coworker, index) => {
      const result = coworkerBuilderSchema.safeParse(coworker);
      if (!result.success) {
        throw new Error(
          `Invalid coworker at index ${index}: ${result.error.message}`
        );
      }
      return result.data;
    });

    // Validate we have 2-3 coworkers
    if (coworkers.length < 2 || coworkers.length > 3) {
      throw new Error(
        `Expected 2-3 coworkers, got ${coworkers.length}`
      );
    }

    // Validate we have an Engineering Manager
    const hasManager = coworkers.some((c) =>
      c.role.toLowerCase().includes("engineering manager")
    );
    if (!hasManager) {
      throw new Error(
        "Generated coworkers must include an Engineering Manager"
      );
    }

    // Validate each coworker has at least 2 critical knowledge items
    for (const coworker of coworkers) {
      const criticalCount = coworker.knowledge.filter((k) => k.isCritical).length;
      if (criticalCount < 2) {
        throw new Error(
          `Coworker "${coworker.name}" has only ${criticalCount} critical knowledge items, need at least 2`
        );
      }
    }

    return {
      coworkers,
      _meta: {
        promptVersion: COWORKER_GENERATOR_PROMPT_VERSION,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse JSON response: ${error.message}`);
    }
    throw error;
  }
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
  // Trim whitespace
  return cleaned.trim();
}
