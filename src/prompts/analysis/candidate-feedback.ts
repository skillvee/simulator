/**
 * Candidate-Facing Feedback Prompt Builder
 *
 * Produces a warm, growth-framed recap that the candidate reads immediately
 * after finishing an assessment. This is NOT the evaluation that goes to
 * recruiters — it's the coaching-voice version, stripped of verdicts and
 * scorecard language.
 *
 * Source signal comes from the already-generated rubric evaluation, so this
 * prompt stays grounded in real observed behavior and doesn't invent praise.
 *
 * @version 1.0.0
 */

import { buildLanguageInstruction, type SupportedLanguage } from "@/lib/core/language";
import type { RubricAssessmentOutput } from "@/types";

export const CANDIDATE_FEEDBACK_PROMPT_VERSION = "1.0.0";

export interface CandidateFeedbackInput {
  rubricOutput: RubricAssessmentOutput;
  scenarioName?: string;
  companyName?: string;
  roleFamilyName?: string;
  candidateName?: string;
  language?: string;
}

/**
 * Builds a compact, evidence-grounded source block from the rubric output.
 * We deliberately omit raw red-flag slugs and numeric scores: the model only
 * needs enough signal to tell "what went well" from "what needs growth", not
 * the full scorecard. Keeps the prompt short and reduces the chance of
 * judgmental language leaking through.
 */
function buildEvidenceBlock(rubric: RubricAssessmentOutput): string {
  const strengths = rubric.topStrengths
    .map((s) => `- ${s.description}`)
    .join("\n");

  const growth = rubric.growthAreas
    .map((g) => `- ${g.description}`)
    .join("\n");

  const positiveMoments = rubric.dimensionScores
    .flatMap((d) => (d.greenFlags ?? []).map((f) => `- ${f}`))
    .slice(0, 8)
    .join("\n");

  const observed = rubric.dimensionScores
    .flatMap((d) =>
      (d.observableBehaviors ?? []).slice(0, 2).map((b) => `- [${b.timestamp}] ${b.behavior}`)
    )
    .slice(0, 10)
    .join("\n");

  return `## EVIDENCE SUMMARY (from the rubric evaluation — do not quote verbatim)

### What came through strongly
${strengths || "- (nothing stood out yet)"}

### Areas where there is room to grow
${growth || "- (none flagged)"}

### Positive moments observed
${positiveMoments || "- (none captured)"}

### Observable behaviors with timestamps
${observed || "- (none captured)"}

### Evaluator's internal summary (for context — do NOT echo its tone)
${rubric.overallSummary}`;
}

export function buildCandidateFeedbackPrompt(
  input: CandidateFeedbackInput
): string {
  const {
    rubricOutput,
    scenarioName,
    companyName,
    roleFamilyName,
    candidateName,
    language,
  } = input;

  const evidenceBlock = buildEvidenceBlock(rubricOutput);

  const langInstruction =
    language && language !== "en"
      ? `\n\n## LANGUAGE\n\n${buildLanguageInstruction(language as SupportedLanguage)}\n\nWrite the entire output in the candidate's language. Keep JSON keys in English.`
      : "";

  const contextLines = [
    candidateName ? `- Candidate: ${candidateName}` : null,
    scenarioName ? `- Scenario: ${scenarioName}` : null,
    companyName ? `- Company: ${companyName}` : null,
    roleFamilyName ? `- Role family: ${roleFamilyName}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are a warm, honest career coach writing a short recap for a candidate who just finished a simulated work session. The candidate will read this immediately after submitting. They put in effort to be here — honor that — but do not fabricate praise the evidence doesn't support.

## CONTEXT
${contextLines || "- (none)"}

${evidenceBlock}

## VOICE AND TONE RULES

- Write TO the candidate in second person ("you", "your approach"). Never "the candidate" or "they".
- Be honest but kind. NEVER use any of: "not ready", "fails", "failed", "poor", "weak", "lacks", "lacking", "deeply flawed", "massive growth opportunity", "non-existent", "refused to engage", "misrepresented", "vague and disjointed".
- Frame gaps as forward-looking invitations: "room to grow in X", "next time, try Y", "worth practicing Z". Never as deficits or verdicts.
- Do NOT include a readiness assessment, hiring recommendation, verdict, grade, or any comparison to other candidates.
- Do NOT mention scores, rubrics, dimensions, red flags, green flags, trainable gaps, or evaluation machinery.
- If the session evidence is thin or the performance was weak, lead with acknowledgment of effort and what was attempted, then offer ONE concrete next step. Do not pad with false praise.
- If the session evidence is strong, celebrate specifically what came through and why it matters — grounded in the evidence block above.
- Stay concrete. Reference what actually happened (paraphrase, don't quote evidence text verbatim).

## OUTPUT FORMAT

Return ONLY valid JSON matching this shape. No markdown code blocks, no commentary.

{
  "candidate_summary": "<3-5 sentence warm, growth-framed recap in second person. Must follow the voice rules above.>",
  "candidate_observations": [
    "<3-6 short phrases, each describing a moment or habit the candidate can recognize. 4-10 words each. Action-oriented or noun-phrase style, e.g. 'Explored the repo before writing code' or 'Asked clarifying questions early'. Must be honest — include neutral-but-true phrasings like 'Spent time reviewing the prompt' when performance was thin. Never frame as a deficit.>"
  ]
}${langInstruction}

Return ONLY the JSON object.`;
}
