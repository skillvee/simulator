/**
 * Resource Verifier
 *
 * Final step of the iterative resource pipeline. After all resources have been
 * generated, this step runs a candidate-perspective judge: "given ONLY these
 * resources, can the candidate complete the task?"
 *
 * If gaps are found, returns structured missingFacts each tagged with the
 * resource that should carry them — so the orchestrator can patch that
 * specific resource instead of regenerating the whole set.
 */

import { gemini } from "@/lib/ai/gemini";
import { createLogger } from "@/lib/core";
import { buildLanguageInstruction, type SupportedLanguage } from "@/lib/core/language";
import {
  RESOURCE_VERIFIER_SYSTEM_PROMPT,
  RESOURCE_VERIFIER_PROMPT_VERSION,
} from "@/prompts/recruiter/resource-verifier";
import type { ScenarioResource } from "@/types";
import type { ResourcePlan } from "./resource-planner";
import { z } from "zod";
import { Type } from "@google/genai";

const logger = createLogger("lib:scenarios:resource-verifier");

const VERIFIER_MODEL = "gemini-3-pro-preview";

export interface MissingFact {
  fact: string;
  targetResourceLabel: string;
}

export interface VerificationResult {
  complete: boolean;
  reasoning: string;
  missingFacts: MissingFact[];
}

export interface VerifyResourcesInput {
  taskDescription: string;
  roleName: string;
  plan: ResourcePlan;
  resources: ScenarioResource[];
  language: SupportedLanguage;
}

export interface VerifyResourcesResult {
  verification: VerificationResult;
  _debug: {
    promptText: string;
    responseText: string;
  };
}

const verificationSchema = z.object({
  complete: z.boolean(),
  reasoning: z.string().min(1),
  missingFacts: z.array(
    z.object({
      fact: z.string().min(1),
      targetResourceLabel: z.string().min(1),
    })
  ),
});

export async function verifyResources(
  input: VerifyResourcesInput
): Promise<VerifyResourcesResult> {
  const contextPrompt = buildVerifierPrompt(input);
  const languageInstruction = buildLanguageInstruction(input.language);
  const systemInstruction = languageInstruction
    ? `${languageInstruction}\n\n${RESOURCE_VERIFIER_SYSTEM_PROMPT}`
    : RESOURCE_VERIFIER_SYSTEM_PROMPT;

  const response = await gemini.models.generateContent({
    model: VERIFIER_MODEL,
    config: {
      systemInstruction,
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          complete: { type: Type.BOOLEAN },
          reasoning: { type: Type.STRING },
          missingFacts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                fact: { type: Type.STRING },
                targetResourceLabel: { type: Type.STRING },
              },
              required: ["fact", "targetResourceLabel"],
            },
          },
        },
        required: ["complete", "reasoning", "missingFacts"],
      },
    },
    contents: [{ role: "user", parts: [{ text: contextPrompt }] }],
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error("Empty response from Gemini verifier");
  }

  const parsed = JSON.parse(cleanJson(responseText));
  const result = verificationSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid verification output: ${result.error.message}`);
  }

  // Drop missingFacts whose targetResourceLabel doesn't match any real resource.
  // The judge sometimes invents labels — if we can't map the fact to a
  // patchable resource, it's noise.
  const validLabels = new Set(input.resources.map((r) => r.label));
  const missingFacts = result.data.missingFacts.filter((m) =>
    validLabels.has(m.targetResourceLabel)
  );

  if (missingFacts.length !== result.data.missingFacts.length) {
    logger.warn("Verifier returned missingFacts with unknown labels, filtered", {
      total: result.data.missingFacts.length,
      kept: missingFacts.length,
    });
  }

  return {
    verification: {
      complete: result.data.complete && missingFacts.length === 0,
      reasoning: result.data.reasoning,
      missingFacts,
    },
    _debug: {
      promptText: `[System Instruction]\n${systemInstruction}\n\n[User Message]\n${contextPrompt}`,
      responseText,
    },
  };
}

function buildVerifierPrompt(input: VerifyResourcesInput): string {
  const planBlock = input.plan.resources
    .map((r) => {
      const facts = r.keyFacts.map((f) => `    - ${f}`).join("\n");
      return `  - **${r.label}** (${r.type})\n    Purpose: ${r.purpose}\n    Planned keyFacts:\n${facts}`;
    })
    .join("\n");

  const resourceBlock = input.resources
    .map(
      (r, i) =>
        `### Resource ${i + 1}: ${r.label} (${r.type})\n\n${r.content ?? "[EMPTY]"}`
    )
    .join("\n\n---\n\n");

  return `Verify that the generated resources give the candidate everything they need to complete this task.

## Candidate Role
${input.roleName}

## Task (written in the manager's voice — this is what the candidate was told)
${input.taskDescription}

## The Plan
${planBlock}

## The Generated Resources

${resourceBlock}

## Your Job
Walk through the task step-by-step from the candidate's perspective. Check every concrete artifact they need. Output a structured verdict. If complete, \`missingFacts\` is an empty array. If gaps exist, list each one with the label of the resource it should be patched into.`;
}

function cleanJson(text: string): string {
  let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return cleaned.trim();
}

export { RESOURCE_VERIFIER_PROMPT_VERSION };
