/**
 * Rubric-Based Evaluation Prompt Builder
 *
 * Generates evaluation prompts dynamically from database rubric data.
 * Supports role-family-specific dimensions, behavioral anchors, and red flags.
 *
 * @version 2.0.0
 * @since 2026-02-06
 */

export const RUBRIC_EVALUATION_PROMPT_VERSION = "3.0.0";

// ============================================================================
// Types for rubric data passed into prompt builder
// ============================================================================

export interface RubricLevelData {
  level: number;
  label: string;
  pattern: string;
  evidence: string[];
}

export interface DimensionWithRubric {
  slug: string;
  name: string;
  description: string;
  isUniversal: boolean;
  levels: RubricLevelData[];
}

export interface RedFlagData {
  slug: string;
  name: string;
  description: string;
}

export interface RubricPromptInput {
  roleFamilyName: string;
  roleFamilySlug: string;
  dimensions: DimensionWithRubric[];
  redFlags: RedFlagData[];
  videoContext?: {
    videoDurationMinutes?: number;
    taskDescription?: string;
    expectedOutcomes?: string[];
  };
}

// ============================================================================
// Prompt Builder
// ============================================================================

/**
 * Builds a dimension rubric section for the prompt.
 */
function buildDimensionSection(
  dim: DimensionWithRubric,
  index: number
): string {
  const header = `### ${index + 1}. ${dim.slug.toUpperCase()} — ${dim.name}
${dim.description}
`;

  const levels = dim.levels
    .sort((a, b) => a.level - b.level)
    .map((lvl) => {
      const evidenceBullets = lvl.evidence
        .map((e) => `  - ${e}`)
        .join("\n");
      return `**Level ${lvl.level} — ${lvl.label}**

*Pattern: ${lvl.pattern}*

Evidence may include:
${evidenceBullets}`;
    })
    .join("\n\n");

  return `${header}\n${levels}`;
}

/**
 * Builds the red flags section.
 */
function buildRedFlagsSection(redFlags: RedFlagData[]): string {
  if (redFlags.length === 0) return "";

  const flags = redFlags
    .map((f) => `- **${f.name}** (\`${f.slug}\`): ${f.description}`)
    .join("\n");

  return `## RED FLAGS

These are binary indicators (present/not present). Report ANY that are observed, regardless of dimension scores.

${flags}`;
}

/**
 * Builds the JSON output schema based on the dimensions.
 */
function buildOutputSchema(
  dimensions: DimensionWithRubric[],
  redFlags: RedFlagData[]
): string {
  const dimScores = dimensions
    .map(
      (d) => `    "${d.slug}": {
      "score": "<integer 1-4 or null if insufficient evidence>",
      "summary": "<1 sentence summarizing this dimension's performance — e.g. 'Quickly breaks ambiguous problems into structured subcomponents.'>",
      "confidence": "high" | "medium" | "low",
      "rationale": "<why this score was given, with specific evidence>",
      "observable_behaviors": [
        { "timestamp": "MM:SS", "behavior": "<specific observed behavior at this timestamp>" },
        { "timestamp": "MM:SS", "behavior": "<specific observed behavior at this timestamp>" }
      ],
      "trainable_gap": "<boolean - true if this is a skill that can be improved>",
      "green_flags": ["<positive signal 1>"],
      "red_flags": ["<concern 1>"]
    }`
    )
    .join(",\n");

  const redFlagSchema =
    redFlags.length > 0
      ? `  "detected_red_flags": [
    {
      "slug": "<red flag slug from the list above>",
      "evidence": "<specific evidence observed>",
      "timestamps": ["MM:SS"]
    }
  ],`
      : `  "detected_red_flags": [],`;

  return `\`\`\`json
{
  "evaluation_version": "${RUBRIC_EVALUATION_PROMPT_VERSION}",
  "overall_score": "<number 1.0-4.0, one decimal place — weighted average of non-null dimension scores>",
  "dimension_scores": {
${dimScores}
  },
${redFlagSchema}
  "top_strengths": [
    {
      "dimension": "<dimension name>",
      "score": "<integer 1-4>",
      "description": "<1-2 sentence explanation of why this is a strength, referencing specific evidence>"
    }
  ],
  "growth_areas": [
    {
      "dimension": "<dimension name>",
      "score": "<integer 1-4>",
      "description": "<1-2 sentence explanation of the gap and what improvement looks like>"
    }
  ],
  "overall_summary": "<MUST BE 5-8 COMPLETE SENTENCES. A comprehensive narrative paragraph that synthesizes the candidate's performance across all dimensions. Include: (1) Their overall approach to the task. (2) Their standout technical capabilities. (3) How they handled challenges or unknowns. (4) Their collaboration and communication style. (5) Problem-solving methodology. (6) Areas where they excelled. (7) Growth opportunities. (8) Final readiness assessment. This should read like a real hiring committee summary, not a list of scores. MINIMUM 5 SENTENCES, MAXIMUM 8 SENTENCES.>",
  "evaluation_confidence": "high" | "medium" | "low",
  "insufficient_evidence_notes": "<explanation if any dimensions could not be fully evaluated, or null>"
}
\`\`\``;
}

/**
 * Builds the complete evaluation prompt from rubric data.
 *
 * @param input - Rubric data loaded from the database
 * @returns Complete evaluation prompt string
 */
export function buildRubricEvaluationPrompt(input: RubricPromptInput): string {
  const { roleFamilyName, dimensions, redFlags, videoContext } = input;

  const dimensionSections = dimensions
    .map((d, i) => buildDimensionSection(d, i))
    .join("\n\n---\n\n");

  const redFlagsSection = buildRedFlagsSection(redFlags);

  const outputSchema = buildOutputSchema(dimensions, redFlags);

  const videoContextSection = videoContext
    ? `
---

## VIDEO CONTEXT

${videoContext.videoDurationMinutes ? `- Video Duration: ${videoContext.videoDurationMinutes} minutes` : ""}
${videoContext.taskDescription ? `- Task Description: ${videoContext.taskDescription}` : ""}
${videoContext.expectedOutcomes?.length ? `- Expected Outcomes:\n${videoContext.expectedOutcomes.map((o) => `  - ${o}`).join("\n")}` : ""}

---
`
    : "";

  return `You are an objective, evidence-based evaluator assessing a candidate's recorded work session for a **${roleFamilyName}** role. Your evaluation must be fair, consistent, and grounded exclusively in observable behaviors.

## CRITICAL RULES

### Evidence Requirements
- You MUST cite specific timestamps (MM:SS format) for EVERY behavior you score
- Each observable behavior MUST be paired with its specific timestamp as a {timestamp, behavior} object
- You MUST only evaluate behaviors that are DIRECTLY OBSERVABLE in the recording
- You MUST NOT infer, assume, or hallucinate any behaviors not visible in the recording
- If a dimension cannot be evaluated due to insufficient evidence, score it as null and set confidence to "low"

### Scoring Principles
- Each dimension is scored on a **1-4 scale** (Foundational → Expert)
- Each level describes a **pattern of capability**, illustrated by example behaviors
- The candidate does NOT need to demonstrate every example — they need to show enough evidence that fits the pattern
- Score based on the **pattern description**, use the evidence bullets as reference points
- Each dimension MUST be scored independently of other dimensions

### Prohibited Assumptions
- NO seniority assumptions based on appearance, speech patterns, or demographics
- NO role assumptions about background, experience, or job history
- NO implicit bias: evaluate only observable behaviors

---

## ${dimensions.length}-DIMENSION RUBRIC (${roleFamilyName})

${dimensionSections}

---

${redFlagsSection}

${videoContextSection}

## OUTPUT REQUIREMENTS

You MUST respond with ONLY a valid JSON object matching this exact schema. No additional text, markdown formatting, or explanation outside the JSON.

${outputSchema}

## VALIDATION CHECKLIST

Before outputting your evaluation, verify:
- [ ] Every scored dimension has at least one observable_behavior with a timestamp
- [ ] Each observable_behavior is a {timestamp, behavior} object, NOT a plain string
- [ ] Every dimension has a concise 1-sentence summary
- [ ] No behaviors are cited that weren't visible in the recording
- [ ] Scores are independent (a score in one area doesn't influence another)
- [ ] No assumptions about candidate seniority or background
- [ ] overall_score is the weighted average of all non-null dimension scores
- [ ] top_strengths contains 2-4 items from highest-scoring dimensions
- [ ] growth_areas contains 1-3 items from lowest-scoring dimensions
- [ ] overall_summary is a comprehensive narrative paragraph (5-8 sentences), not a list
- [ ] JSON is valid and matches the schema exactly
- [ ] Confidence is set to "low" for any dimension with limited evidence

IMPORTANT: Return ONLY valid JSON. No additional text, explanation, or markdown code blocks around the response.`;
}
