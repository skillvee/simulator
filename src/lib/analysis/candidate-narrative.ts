/**
 * Candidate-facing narrative generator.
 *
 * Runs a second, cheap Gemini Flash pass over the already-computed rubric
 * evaluation to produce the softened, growth-framed recap that the candidate
 * sees on the results page. Recruiter-facing data stays untouched.
 *
 * Returns null on any failure — caller falls back to the legacy behavior in
 * results-transformer (which still reads from the recruiter summary). Worth
 * noting: that fallback is imperfect, which is exactly why this pass exists.
 */
import { gemini, TEXT_MODEL } from "@/lib/ai/gemini";
import { createLogger } from "@/lib/core";
import {
  buildCandidateFeedbackPrompt,
  CANDIDATE_FEEDBACK_PROMPT_VERSION,
  type CandidateFeedbackInput,
} from "@/prompts";
import { logAICall } from "@/lib/analysis/ai-call-logging";
import type { RubricAssessmentOutput } from "@/types";

const logger = createLogger("analysis:candidate-narrative");

export interface CandidateNarrativeResult {
  candidateSummary: string;
  candidateObservations: string[];
}

export interface GenerateCandidateNarrativeOptions {
  assessmentId: string;
  rubricOutput: RubricAssessmentOutput;
  scenarioName?: string;
  companyName?: string;
  roleFamilyName?: string;
  candidateName?: string;
  language?: string;
}

function cleanJsonResponse(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```json")) s = s.slice(7);
  if (s.startsWith("```")) s = s.slice(3);
  if (s.endsWith("```")) s = s.slice(0, -3);
  return s.trim();
}

function parseResponse(raw: string): CandidateNarrativeResult | null {
  try {
    const parsed = JSON.parse(cleanJsonResponse(raw)) as {
      candidate_summary?: unknown;
      candidate_observations?: unknown;
    };
    const summary =
      typeof parsed.candidate_summary === "string"
        ? parsed.candidate_summary.trim()
        : "";
    const observations = Array.isArray(parsed.candidate_observations)
      ? parsed.candidate_observations
          .filter((o): o is string => typeof o === "string")
          .map((o) => o.trim())
          .filter(Boolean)
      : [];

    if (!summary) return null;
    return { candidateSummary: summary, candidateObservations: observations };
  } catch (err) {
    logger.warn("Failed to parse candidate narrative JSON", {
      err: String(err),
      preview: raw.slice(0, 200),
    });
    return null;
  }
}

export async function generateCandidateNarrative(
  options: GenerateCandidateNarrativeOptions
): Promise<CandidateNarrativeResult | null> {
  const { assessmentId, rubricOutput, ...promptContext } = options;

  const promptInput: CandidateFeedbackInput = {
    rubricOutput,
    ...promptContext,
  };
  const prompt = buildCandidateFeedbackPrompt(promptInput);

  const tracker = await logAICall({
    assessmentId,
    endpoint: "internal:candidate-narrative",
    promptText: prompt,
    modelVersion: TEXT_MODEL,
    promptType: "candidate-feedback",
    promptVersion: CANDIDATE_FEEDBACK_PROMPT_VERSION,
    modelUsed: TEXT_MODEL,
  });

  try {
    const result = await gemini.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.5,
        // Gemini 3 Flash counts thinking tokens against maxOutputTokens, so 600
        // truncates mid-sentence. 4096 leaves comfortable headroom for thinking
        // plus a 3-5 sentence summary + 6 short observations.
        maxOutputTokens: 4096,
      },
    });

    const responseText = result.text;
    if (!responseText) {
      await tracker.complete({ statusCode: 502, errorMessage: "empty-response" });
      logger.warn("Candidate narrative: empty response from Gemini", { assessmentId });
      return null;
    }

    await tracker.complete({ responseText, statusCode: 200 });

    const parsed = parseResponse(responseText);
    if (!parsed) {
      logger.warn("Candidate narrative: unparseable response", { assessmentId });
      return null;
    }
    return parsed;
  } catch (err) {
    await tracker.fail(err instanceof Error ? err : new Error(String(err)));
    logger.warn("Candidate narrative generation failed", {
      assessmentId,
      err: String(err),
    });
    return null;
  }
}
