/**
 * Eval Judge — 3 independent Gemini 2.5 Pro judges with thinking enabled
 *
 * Research-backed design:
 * - Flaws-first prompting to combat agreeableness bias
 * - Calibration examples with low scores to anchor expectations
 * - Rubric at top, content at bottom (lost-in-the-middle effect)
 * - Thinking budget enabled for deeper reasoning
 * - AI-isms dimension based on Wikipedia:Signs_of_AI_writing
 */

import { GoogleGenAI } from "@google/genai";
import type { Judgment, JudgmentScores } from "./types";

const JUDGE_MODEL = "gemini-2.5-pro";
const THINKING_BUDGET = 4096;

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
1: Obviously AI — overly helpful, essay-length, formally structured
2: Mostly AI — too thorough, suspiciously well-organized
3: Mixed — some natural elements but noticeable AI patterns
4: Mostly natural — sounds human with minor imperfections
5: Completely natural — would fool a real coworker

**Persona consistency** — Does the coworker's unique personality come through?
1: Generic — could be anyone
2: Weak — personality barely visible
3: Moderate — some personality but inconsistent
4: Strong — personality clear and consistent
5: Excellent — distinctive voice matching the described personality

**Brevity** — Is the response length appropriate for ${mediaLabel}?
1: Way too long — essay where 1-2 sentences would do
2: Too long — unnecessary elaboration
3: Acceptable but could be tighter
4: Good length — concise and appropriate
5: Perfect — exactly as long as a real person would write

**Conversational flow** — Does it address what the user actually said?
1: Ignores user's message, launches into unrelated content
2: Loosely related but misses the point or tone
3: Addresses topic but misses emotional/social cues
4: Good — responds to both content and tone
5: Excellent — picks up on nuance naturally

**Information discipline** — Does it avoid volunteering unrequested information?
1: Dumps everything unprompted
2: Volunteers significant unrequested details
3: Mostly restrained but includes some extras
4: Good — answers what was asked with minimal extras
5: Perfect — shares only what was specifically requested

**AI-isms** — Is the text FREE of telltale AI writing patterns?
Score LOW if you detect ANY of these:
- Filler phrases: "Great question!", "I'd be happy to help", "Happy to help you", "Absolutely!", "That's a great point"
- Overly enthusiastic: "I'm so excited to...", "love that you're...", "fantastic question"
- Corporate buzzwords: "leverage", "align", "synergy", "deep dive", "unpack", "navigate"
- AI vocabulary: "delve", "crucial", "pivotal", "tapestry", "landscape", "meticulous", "foster", "underscore", "showcase", "vibrant"
- Formulaic structures: "Not just X, but also Y", "Whether it's X or Y", rule-of-three lists
- Copula avoidance: "serves as", "represents", "features", "offers" instead of simple "is"
- Over-qualification: "It's worth noting that", "It's important to mention", "I should point out"
- Collaborative language: "Let's explore", "Let's dive in", "Let's unpack"
- Excessive em dashes and semicolons
- Starting with "So," or "Well," when not natural for the persona

1: Multiple obvious AI patterns — reads like ChatGPT
2: Several AI-isms present — feels machine-generated
3: A few AI patterns but mostly natural
4: Minor AI traces — one or two patterns max
5: Zero AI patterns — reads like genuine human writing

## Calibration Examples

Example A (overall: 2/5, AI-isms: 1/5):
User: "Hey! Just started today"
Response: "Welcome to the team! I'm so excited to have you here. We're really diving deep into some fascinating Reels experiments right now. Let me know if you need help navigating anything — I'd be happy to walk you through the landscape of our current projects!"
Why: "diving deep", "fascinating", "navigating", "landscape", "I'd be happy to" — packed with AI-isms.

Example B (overall: 5/5, AI-isms: 5/5):
User: "Hey! Just started today"
Response: "Hey! Welcome aboard."
Why: Zero AI patterns. Exactly what a real person would type on Slack.

Example C (overall: 3/5, AI-isms: 3/5):
User: "What's the status of the experiment?"
Response: "Great question! The notification test is showing some really interesting results. Engagement is up, but I should point out that the push-disable rate is concerning."
Why: "Great question!" and "I should point out" are AI-isms. "really interesting" is filler.

## Scenario Context
The coworker is: ${context.coworkerName}, ${context.coworkerRole} at ${context.companyName}.
Personality: ${context.coworkerPersonality}

## Evaluation Criteria
${context.criteria}

## Conversation
${isVoiceMultiTurn
  ? `Full multi-turn phone call transcript:\n\n${context.response}`
  : `${context.conversationHistory ? `Prior messages:\n${context.conversationHistory}\n` : "(No prior messages — first interaction)"}
${context.userMessage.startsWith("[") ? `[System: ${context.userMessage}]` : `User: ${context.userMessage}`}

**Response being evaluated:**
${context.response}`}

## Your Evaluation

First, list 1-3 specific flaws${isVoiceMultiTurn ? " in the COWORKER's behavior" : ""}. Quote any AI-isms you find verbatim. Then score.

Respond as JSON only (no markdown fences):
{"flaws": "...", "naturalness": N, "personaConsistency": N, "brevity": N, "conversationalFlow": N, "infoDiscipline": N, "aiIsms": N, "reasoning": "1-2 sentences"}`;
}

/**
 * Run 3 independent judges on a single response with thinking enabled.
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

  // Run 3 judges — minimal stagger (gemini-2.5-pro has 150 RPM)
  const judgePromises = ["judge-1", "judge-2", "judge-3"].map(async (judgeId, i) => {
    if (i > 0) await new Promise((r) => setTimeout(r, i * 500));

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await gemini.models.generateContent({
          model: JUDGE_MODEL,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            temperature: 0.2,
            thinkingConfig: {
              thinkingBudget: THINKING_BUDGET,
            },
          },
        });

        const text = result.text?.trim() || "";
        const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const raw = JSON.parse(cleaned);

        const scores: JudgmentScores = {
          naturalness: clampScore(raw.naturalness),
          roleAccuracy: clampScore(raw.personaConsistency),
          brevity: clampScore(raw.brevity),
          contextAwareness: clampScore(raw.conversationalFlow),
          infoDiscipline: clampScore(raw.infoDiscipline),
          aiIsms: clampScore(raw.aiIsms),
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
          naturalness: 3, roleAccuracy: 3, brevity: 3, contextAwareness: 3, infoDiscipline: 3, aiIsms: 3,
          reasoning: `Judge failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        } as Judgment;
      }
    }
    return { judgeId, naturalness: 3, roleAccuracy: 3, brevity: 3, contextAwareness: 3, infoDiscipline: 3, aiIsms: 3, reasoning: "Exhausted retries" } as Judgment;
  });

  return Promise.all(judgePromises);
}

function clampScore(val: unknown): number {
  const n = typeof val === "number" ? val : 3;
  return Math.max(1, Math.min(5, Math.round(n)));
}

/**
 * Aggregate 3 judge scores using median.
 */
export function aggregateJudgments(judgments: Judgment[]): {
  naturalness: number;
  roleAccuracy: number;
  brevity: number;
  contextAwareness: number;
  infoDiscipline: number;
  aiIsms: number;
  overallScore: number;
  flagged: boolean;
} {
  const median = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[1];
  };

  const dims = ["naturalness", "roleAccuracy", "brevity", "contextAwareness", "infoDiscipline", "aiIsms"] as const;
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
    aiIsms: scores.aiIsms,
    overallScore: Math.round(overallScore * 100) / 100,
    flagged,
  };
}
