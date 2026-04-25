/**
 * Step 1 of the v2 resource pipeline: generate the plan + 3 markdown docs.
 *
 * Calls Gemini 3.1 Pro with a structured `responseSchema` that mirrors the
 * `ResourcePlan` + `ScenarioDoc[]` shape declared in `@/types/scenario`.
 * Validates with Zod after parsing; retries up to 3 times on schema failure.
 */

import { gemini } from "@/lib/ai/gemini";
import { PRO_MODEL } from "@/lib/ai/gemini-config";
import { wrapAICall } from "@/lib/ai/errors";
import { createLogger } from "@/lib/core";
import type { SupportedLanguage } from "@/lib/core/language";
import {
  buildPlanAndDocsPrompt,
  PLAN_AND_DOCS_PROMPT_VERSION,
} from "@/prompts/recruiter/plan-and-docs";
import type {
  ResourcePlan,
  ScenarioDoc,
} from "@/types";
import { z } from "zod";
import { Type } from "@google/genai";

const logger = createLogger("lib:scenarios:plan-and-docs-generator");

const MAX_ATTEMPTS = 3;

const planResourceSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["repository", "csv", "document"]),
  label: z.string().min(1),
  filename: z.string().min(1),
  objective: z.string().min(10),
  candidateUsage: z.string().min(10),
  targetRowCount: z.number().int().min(0).optional(),
  dataShape: z.string().optional(),
});

const planSchema = z.object({
  resources: z.array(planResourceSchema).length(3),
  qualityCriteria: z.array(z.string().min(5)).min(3).max(6),
});

const docSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  filename: z.string().min(1),
  objective: z.string().min(10),
  markdown: z.string().min(500), // ~100 words minimum guard; prompt asks for 700
});

const planAndDocsSchema = z.object({
  plan: planSchema,
  docs: z.array(docSchema).length(3),
});

export type PlanAndDocsResult = {
  plan: ResourcePlan;
  docs: ScenarioDoc[];
  _meta: {
    promptVersion: string;
    model: string;
    attempts: number;
  };
  _debug: {
    promptText: string;
    responseText: string;
  };
};

export interface GeneratePlanAndDocsInput {
  companyName: string;
  companyDescription: string;
  taskDescription: string;
  techStack: string[];
  roleName: string;
  seniorityLevel: string;
  archetypeName: string;
  resourceType: "repo" | "data";
  coworkers: Array<{ name: string; role: string }>;
  language: SupportedLanguage;
  scaffoldLayout?: {
    name: string;
    description: string;
    baselineFiles: string[];
  };
}

export async function generatePlanAndDocs(
  input: GeneratePlanAndDocsInput
): Promise<PlanAndDocsResult> {
  const promptText = buildPlanAndDocsPrompt(input);

  // Gemini structured-output schema (mirrors planAndDocsSchema).
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      plan: {
        type: Type.OBJECT,
        properties: {
          resources: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING },
                label: { type: Type.STRING },
                filename: { type: Type.STRING },
                objective: { type: Type.STRING },
                candidateUsage: { type: Type.STRING },
                targetRowCount: { type: Type.NUMBER },
                dataShape: { type: Type.STRING },
              },
              required: ["id", "type", "label", "filename", "objective", "candidateUsage"],
            },
          },
          qualityCriteria: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["resources", "qualityCriteria"],
      },
      docs: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            filename: { type: Type.STRING },
            objective: { type: Type.STRING },
            markdown: { type: Type.STRING },
          },
          required: ["id", "name", "filename", "objective", "markdown"],
        },
      },
    },
    required: ["plan", "docs"],
  };

  let lastError: unknown;
  let lastResponseText = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      // Stream the response so the underlying connection stays active. Pro
      // calls with structured output + 3 long markdown docs can take 60-90s,
      // which sometimes hits Node's default undici headers timeout (5min) or
      // upstream load-balancer timeouts when the model pauses to think.
      const stream = await wrapAICall(
        () =>
          gemini.models.generateContentStream({
            model: PRO_MODEL,
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            config: {
              responseMimeType: "application/json",
              responseSchema,
              temperature: 0.4,
            },
          }),
        {
          model: PRO_MODEL,
          promptType: "RESOURCE_PIPELINE_PLAN_AND_DOCS",
          promptVersion: PLAN_AND_DOCS_PROMPT_VERSION,
        }
      );

      const chunks: string[] = [];
      for await (const chunk of stream) {
        if (chunk.text) chunks.push(chunk.text);
      }
      const responseText = chunks.join("");
      lastResponseText = responseText;

      const parsed = JSON.parse(responseText);
      const validated = planAndDocsSchema.parse(parsed);

      return {
        plan: validated.plan,
        docs: validated.docs,
        _meta: {
          promptVersion: PLAN_AND_DOCS_PROMPT_VERSION,
          model: PRO_MODEL,
          attempts: attempt,
        },
        _debug: { promptText, responseText },
      };
    } catch (err) {
      lastError = err;
      logger.warn("plan-and-docs attempt failed", {
        attempt,
        err: String(err),
      });
      // Backoff before retry — gives transient network blips time to recover.
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }

  throw new Error(
    `generatePlanAndDocs failed after ${MAX_ATTEMPTS} attempts: ${String(lastError)} (last response: ${lastResponseText.slice(0, 500)})`
  );
}
