/**
 * Step 5 — Coworker grounder for the v2 resource pipeline.
 *
 * Refreshes existing coworker `knowledge` against the finalized bundle so
 * personas can't reference files / DB engines / schemas that don't exist.
 *
 * Identity (name, role, persona style, voice, demographics, avatar) is
 * preserved — the caller MUST update only the `knowledge` field per
 * coworker. Output order matches input order so callers can zip back.
 */

import { gemini } from "@/lib/ai/gemini";
import { PRO_MODEL } from "@/lib/ai/gemini-config";
import { wrapAICall } from "@/lib/ai/errors";
import { createLogger } from "@/lib/core";
import { Type, ThinkingLevel } from "@google/genai";
import {
  buildCoworkerGrounderPrompt,
  COWORKER_GROUNDER_PROMPT_VERSION,
  type CoworkerGrounderPromptInput,
  type CoworkerIdentity,
} from "@/prompts/recruiter/coworker-grounder";
import { z } from "zod";

const logger = createLogger("lib:scenarios:coworker-grounder");

const knowledgeEntrySchema = z.object({
  topic: z.string().min(1),
  triggerKeywords: z.array(z.string().min(1)).min(1).max(10),
  response: z.string().min(1),
  isCritical: z.boolean(),
});

const grounderOutputSchema = z.object({
  coworkers: z.array(
    z.object({
      coworkerId: z.string().min(1),
      knowledge: z.array(knowledgeEntrySchema).min(1).max(8),
    })
  ),
});

export type CoworkerKnowledgeEntry = z.infer<typeof knowledgeEntrySchema>;

export interface CoworkerKnowledgeUpdate {
  coworkerId: string;
  knowledge: CoworkerKnowledgeEntry[];
}

export interface GroundCoworkerInput {
  scenarioId: string;
  scenario: CoworkerGrounderPromptInput["scenario"];
  plan: CoworkerGrounderPromptInput["plan"];
  docs: CoworkerGrounderPromptInput["docs"];
  artifactSummary: CoworkerGrounderPromptInput["artifactSummary"];
  coworkers: CoworkerIdentity[];
}

export interface GroundCoworkerResult {
  updates: CoworkerKnowledgeUpdate[];
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    coworkers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          coworkerId: { type: Type.STRING },
          knowledge: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                triggerKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                response: { type: Type.STRING },
                isCritical: { type: Type.BOOLEAN },
              },
              required: ["topic", "triggerKeywords", "response", "isCritical"],
            },
          },
        },
        required: ["coworkerId", "knowledge"],
      },
    },
  },
  required: ["coworkers"],
};

export async function groundCoworkerKnowledge(
  input: GroundCoworkerInput
): Promise<GroundCoworkerResult> {
  if (input.coworkers.length === 0) {
    return { updates: [] };
  }

  const promptText = buildCoworkerGrounderPrompt({
    scenario: input.scenario,
    plan: input.plan,
    docs: input.docs,
    artifactSummary: input.artifactSummary,
    coworkers: input.coworkers,
  });

  logger.info("Running coworker grounder", {
    scenarioId: input.scenarioId,
    coworkerCount: input.coworkers.length,
    artifactKind: input.artifactSummary.kind,
  });

  const stream = await wrapAICall(
    () =>
      gemini.models.generateContentStream({
        model: PRO_MODEL,
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          temperature: 0.3,
        },
      }),
    {
      model: PRO_MODEL,
      promptType: "RESOURCE_PIPELINE_COWORKER_GROUNDER",
      promptVersion: COWORKER_GROUNDER_PROMPT_VERSION,
    }
  );

  let fullText = "";
  for await (const chunk of stream) {
    if (chunk.text) fullText += chunk.text;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fullText);
  } catch (err) {
    throw new Error(
      `coworker-grounder: model returned non-JSON (len=${fullText.length}): ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const result = grounderOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `coworker-grounder: schema validation failed: ${result.error.message}`
    );
  }

  const updates = alignToInputOrder(input.coworkers, result.data.coworkers);

  logger.info("coworker grounder complete", {
    scenarioId: input.scenarioId,
    coworkerCount: updates.length,
    totalKnowledgeEntries: updates.reduce((n, u) => n + u.knowledge.length, 0),
  });

  return { updates };
}

/**
 * Re-order the model's output to match the input list and verify every
 * coworker is present. The prompt asks the model to preserve order, but
 * Gemini occasionally reorders or drops one — fail loudly so the caller can
 * retry rather than silently writing partial data.
 */
function alignToInputOrder(
  inputs: CoworkerIdentity[],
  outputs: Array<{ coworkerId: string; knowledge: CoworkerKnowledgeEntry[] }>
): CoworkerKnowledgeUpdate[] {
  const byId = new Map(outputs.map((o) => [o.coworkerId, o]));
  const aligned: CoworkerKnowledgeUpdate[] = [];
  const missing: string[] = [];

  for (const input of inputs) {
    const out = byId.get(input.id);
    if (!out) {
      missing.push(`${input.name} (${input.id})`);
      continue;
    }
    aligned.push({ coworkerId: input.id, knowledge: out.knowledge });
  }

  if (missing.length > 0) {
    throw new Error(
      `coworker-grounder: model output missing entries for ${missing.length} coworker(s): ${missing.join(", ")}`
    );
  }

  return aligned;
}
