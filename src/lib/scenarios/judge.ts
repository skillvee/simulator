/**
 * Step 4 — LLM judge for the v2 resource pipeline.
 *
 * Calls Gemini 3.1 Pro with `thinkingLevel: "high"` and a structured
 * `responseSchema`. Returns a `JudgeVerdict` the orchestrator uses to gate
 * `pipelineMeta.status = "passed"`.
 *
 * Streams the response so we don't hit Node's 5-minute headers timeout when
 * thinking takes a while.
 */

import { gemini } from "@/lib/ai/gemini";
import { PRO_MODEL } from "@/lib/ai/gemini-config";
import { wrapAICall } from "@/lib/ai/errors";
import { createLogger } from "@/lib/core";
import { Type, ThinkingLevel } from "@google/genai";
import {
  buildJudgePrompt,
  JUDGE_PROMPT_VERSION,
  type JudgePromptInput,
} from "@/prompts/recruiter/judge";
import type { JudgeVerdict } from "@/types";
import { z } from "zod";

const logger = createLogger("lib:scenarios:judge");

const judgeOutputSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(1),
  summary: z.string().min(10),
  blockingIssues: z.array(z.string()).max(10),
  missingEvidence: z.array(z.string()).max(10),
  retryInstructions: z.string().optional(),
});

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    passed: { type: Type.BOOLEAN },
    score: { type: Type.NUMBER },
    summary: { type: Type.STRING },
    blockingIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
    missingEvidence: { type: Type.ARRAY, items: { type: Type.STRING } },
    retryInstructions: { type: Type.STRING },
  },
  required: ["passed", "score", "summary", "blockingIssues", "missingEvidence"],
};

export async function judgeArtifacts(
  input: JudgePromptInput
): Promise<JudgeVerdict> {
  const promptText = buildJudgePrompt(input);

  logger.info("Running judge", {
    artifactKind: input.artifactSummary.kind,
    docCount: input.docs.length,
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
          temperature: 0.2,
        },
      }),
    {
      model: PRO_MODEL,
      promptType: "RESOURCE_PIPELINE_JUDGE",
      promptVersion: JUDGE_PROMPT_VERSION,
    }
  );

  let fullText = "";
  for await (const chunk of stream) {
    if (chunk.text) fullText += chunk.text;
  }

  const parsed = JSON.parse(fullText);
  const verdict = judgeOutputSchema.parse(parsed);

  logger.info("Judge verdict", {
    passed: verdict.passed,
    score: verdict.score,
    blockingCount: verdict.blockingIssues.length,
  });

  return verdict;
}
