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

// targetRowCount: the model has a bad habit of looping on long numeric
// fields ("180000000000…0)") which breaks JSON parsing. We accept either a
// number or a string and coerce + clamp here so a malformed number doesn't
// blow up the whole pipeline.
const planResourceSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["repository", "csv", "document"]),
  label: z.string().min(1),
  filename: z.string().min(1),
  objective: z.string().min(10),
  candidateUsage: z.string().min(10),
  targetRowCount: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return undefined;
      const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
      if (!Number.isFinite(n) || n < 0) return undefined;
      return Math.min(Math.max(Math.round(n), 30), 2000);
    }),
  dataShape: z.string().optional(),
});

const planSchema = z.object({
  resources: z.array(planResourceSchema).min(2).max(5),
  qualityCriteria: z.array(z.string().min(5)).min(3).max(6),
});

const docSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  filename: z.string().min(1),
  objective: z.string().min(10),
  // ~30 words minimum guard. The prompt now asks for 150-400 hurried words,
  // not the old 700-word corporate templates, so the floor moves down.
  markdown: z.string().min(120),
});

// Doc count: repo = 1, data = 1 or 2. Bound at [1, 2] so over-eager models
// don't slip the old 3-doc template back in.
const planAndDocsSchema = z.object({
  plan: planSchema,
  docs: z.array(docSchema).min(1).max(2),
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
                // STRING (not NUMBER) deliberately — Pro sometimes loops on
                // numeric tokens producing "180000000…0)" which kills the
                // parse. We coerce to a number in Zod after parsing.
                targetRowCount: { type: Type.STRING },
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
      // Higher temperature on retries — sometimes the model gets stuck in a
      // token-repetition loop (e.g. emitting `1800000000…` for a number) and
      // a different sampling temperature unsticks it.
      const temperature = 0.4 + (attempt - 1) * 0.15;
      const stream = await wrapAICall(
        () =>
          gemini.models.generateContentStream({
            model: PRO_MODEL,
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            config: {
              responseMimeType: "application/json",
              responseSchema,
              temperature,
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

      // Extract the JSON object — the model occasionally tails extra prose
      // or repeats characters in long numeric fields. Slice to the first
      // balanced { … } block before parsing.
      const cleaned = extractJsonObject(responseText);
      const parsed = JSON.parse(cleaned);
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

/**
 * Pull the first balanced { … } block from a response. Handles common
 * failures: the model returning JSON wrapped in fences, or trailing prose
 * after the object closes.
 */
function extractJsonObject(text: string): string {
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  const firstBrace = cleaned.indexOf("{");
  if (firstBrace === -1) return cleaned;
  cleaned = cleaned.slice(firstBrace);

  // Walk forward tracking brace depth, ignoring braces inside strings.
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (c === "\\") {
      escaped = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return cleaned.slice(0, i + 1);
    }
  }
  return cleaned;
}
