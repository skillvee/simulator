/**
 * Eval Judge — 3 independent Gemini Pro judges grade responses
 *
 * Research-backed design:
 * - Flaws-first prompting to combat agreeableness bias
 * - Calibration examples with low scores to anchor expectations
 * - Rubric at top, content at bottom (lost-in-the-middle effect)
 * - Moderate language to avoid amplifying positional bias
 *
 * Sources:
 * - "Beyond Consensus: Mitigating Agreeableness Bias" (2025)
 * - "Lost in the Middle" (Liu et al.)
 * - "Evaluating Scoring Bias in LLM-as-a-Judge" (Li et al., 2025)
 */

import { GoogleGenAI } from "@google/genai";
import type { Judgment, JudgmentScores } from "./types";

const JUDGE_MODEL = "gemini-2.5-pro";

function buildJudgePrompt(context: {
  coworkerName: string;
  coworkerRole: string;
  coworkerPersonality: string;
  companyName: string;
  media: "chat" | "voice";
  conversationHistory: string;
  userMessage: string;
  response: string;
  criteria: string;
  isMultiTurn?: boolean;
}): string {
  const mediaLabel = context.media === "chat" ? "Slack" : "phone call";
  const isVoiceMultiTurn = context.isMultiTurn && context.media === "voice";

  return `You are a strict evaluator of simulated workplace conversations. Your job is to find problems.

## Scoring Rubric (1-5)

**Naturalness** — Does this sound like a real person on ${mediaLabel}?
1: Obviously AI — uses phrases like "I'd be happy to help", "Great question!", or writes essay-length responses
2: Mostly AI — formally structured, overly helpful, too thorough
3: Mixed — some natural elements but noticeable AI patterns
4: Mostly natural — sounds human with minor imperfections
5: Completely natural — would fool a real coworker

**Persona consistency** — Does the coworker's unique personality come through?
1: Generic — could be anyone, no personality
2: Weak — mentions personality traits but doesn't embody them
3: Moderate — some personality but inconsistent
4: Strong — personality is clear and consistent
5: Excellent — distinctive voice that matches the described personality

**Brevity** — Is the response length appropriate for ${mediaLabel}?
1: Way too long — essay or multiple paragraphs where 1-2 sentences would do
2: Too long — includes unnecessary elaboration
3: Acceptable but could be tighter
4: Good length — concise and appropriate
5: Perfect — exactly as long as a real person would write

**Conversational flow** — Does the response actually address what the user said?
1: Ignores user's message entirely, launches into unrelated content
2: Loosely related but misses the user's actual point or tone
3: Addresses the topic but misses emotional/social cues
4: Good — responds to both content and tone
5: Excellent — picks up on nuance, responds naturally to what was said

**Information discipline** — Does the coworker avoid volunteering unrequested information?
1: Dumps everything they know unprompted — full project briefing in response to "hi"
2: Volunteers significant unrequested details
3: Mostly restrained but includes some extra context
4: Good discipline — answers what was asked with minimal extras
5: Perfect — shares only what was specifically requested

## Calibration Examples

Example A (score: 2/5 overall):
User: "Hey! Just started today, nice to meet you"
Response: "Welcome to the team! We're really excited about the Reels notification experiment we've been running. DAU is up 2% but push-disables are concerning in the 18-24 cohort. Let me know if you need help with the data analysis!"
Why low: Dumps project details in response to a simple greeting. No real person would do this.

Example B (score: 5/5 overall):
User: "Hey! Just started today, nice to meet you"
Response: "Hey! Welcome aboard."
Why high: Brief, natural, doesn't volunteer anything. Exactly what a real coworker would say.

Example C (score: 3/5 overall):
User: "What table should I query for notification data?"
Response: "You'll want to look at dim_notification_events — it has all the push notification triggers including actions and platforms. Also, I should mention there's a known logging bug on Android 14.2 that might affect your numbers, and the pipeline runs hourly with a 45-minute lag, so make sure you account for data freshness."
Why medium: Correctly answers the question but volunteers extra details (bug, pipeline timing) that weren't asked for.

## Scenario Context
The coworker is: ${context.coworkerName}, ${context.coworkerRole} at ${context.companyName}.
Personality: ${context.coworkerPersonality}

## Evaluation Criteria
${context.criteria}

## Conversation
${isVoiceMultiTurn
  ? `This is a FULL multi-turn phone call transcript:\n\n${context.response}`
  : `${context.conversationHistory ? `Prior messages:\n${context.conversationHistory}\n` : "(No prior messages — first interaction)"}
${context.userMessage.startsWith("[") ? `[System: ${context.userMessage}]` : `User: ${context.userMessage}`}

**Response being evaluated:**
${context.response}`}

## Your Evaluation

First, list 1-3 specific flaws or weaknesses${isVoiceMultiTurn ? " in the COWORKER's behavior across the conversation" : " in this response"} (or write "No significant flaws" if genuinely excellent). ${isVoiceMultiTurn ? "Pay special attention to the coworker's FIRST message — does it make sense as a conversation opener, or does it respond to something that wasn't said?" : ""}Then provide your scores.

Respond as JSON only (no markdown fences):
{"flaws": "...", "naturalness": N, "personaConsistency": N, "brevity": N, "conversationalFlow": N, "infoDiscipline": N, "reasoning": "1-2 sentences summarizing your assessment"}`;
}

/**
 * Run 3 independent judges on a single response.
 */
export async function judgeResponse(context: {
  coworkerName: string;
  coworkerRole: string;
  coworkerPersonality: string;
  companyName: string;
  media: "chat" | "voice";
  conversationHistory: string;
  userMessage: string;
  response: string;
  criteria: string;
  apiKey: string;
  isMultiTurn?: boolean;
}): Promise<Judgment[]> {
  const gemini = new GoogleGenAI({ apiKey: context.apiKey });
  const prompt = buildJudgePrompt(context);

  // Run 3 judges — stagger start by 2s each to avoid rate limits
  const judgePromises = ["judge-1", "judge-2", "judge-3"].map(async (judgeId, i) => {
    if (i > 0) await new Promise((r) => setTimeout(r, i * 2000));

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await gemini.models.generateContent({
          model: JUDGE_MODEL,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            temperature: 0.2, // Low for consistency
          },
        });

        const text = result.text?.trim() || "";
        const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const raw = JSON.parse(cleaned);

        // Map new dimension names to standard interface
        const scores: JudgmentScores = {
          naturalness: clampScore(raw.naturalness),
          roleAccuracy: clampScore(raw.personaConsistency), // mapped to old field name for DB compat
          brevity: clampScore(raw.brevity),
          contextAwareness: clampScore(raw.conversationalFlow), // mapped
          infoDiscipline: clampScore(raw.infoDiscipline),
          reasoning: `${raw.flaws || ""} ${raw.reasoning || ""}`.trim(),
        };

        return { judgeId, ...scores } as Judgment;
      } catch (err) {
        const isRateLimit = err instanceof Error && (err.message.includes("429") || err.message.includes("RESOURCE_EXHAUSTED") || err.message.includes("quota"));
        if (isRateLimit && attempt < maxRetries - 1) {
          const delay = (attempt + 1) * 15000;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        console.error(`Judge ${judgeId} failed:`, err instanceof Error ? err.message : err);
        return {
          judgeId,
          naturalness: 3, roleAccuracy: 3, brevity: 3, contextAwareness: 3, infoDiscipline: 3,
          reasoning: `Judge failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        } as Judgment;
      }
    }
    return { judgeId, naturalness: 3, roleAccuracy: 3, brevity: 3, contextAwareness: 3, infoDiscipline: 3, reasoning: "Exhausted retries" } as Judgment;
  });

  return Promise.all(judgePromises);
}

function clampScore(val: unknown): number {
  const n = typeof val === "number" ? val : 3;
  return Math.max(1, Math.min(5, Math.round(n)));
}

/**
 * Aggregate 3 judge scores using median (resistant to outliers).
 * Also detects disagreements (>2 point spread on any dimension).
 */
export function aggregateJudgments(judgments: Judgment[]): {
  naturalness: number;
  roleAccuracy: number;
  brevity: number;
  contextAwareness: number;
  infoDiscipline: number;
  overallScore: number;
  flagged: boolean;
} {
  const median = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[1]; // Middle of 3
  };

  const dims = ["naturalness", "roleAccuracy", "brevity", "contextAwareness", "infoDiscipline"] as const;
  const scores: Record<string, number> = {};
  let flagged = false;

  for (const dim of dims) {
    const values = judgments.map((j) => j[dim]);
    scores[dim] = median(values);
    if (Math.max(...values) - Math.min(...values) > 2) {
      flagged = true;
    }
  }

  const overallScore = dims.reduce((sum, dim) => sum + scores[dim], 0) / dims.length;

  return {
    naturalness: scores.naturalness,
    roleAccuracy: scores.roleAccuracy,
    brevity: scores.brevity,
    contextAwareness: scores.contextAwareness,
    infoDiscipline: scores.infoDiscipline,
    overallScore: Math.round(overallScore * 100) / 100,
    flagged,
  };
}
