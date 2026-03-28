/**
 * Eval Judge — 3 independent Gemini Pro judges grade responses
 *
 * Each judge evaluates anonymously (doesn't see the prompt, only the output).
 * Scores on 5 dimensions: naturalness, roleAccuracy, brevity, contextAwareness, infoDiscipline.
 */

import { GoogleGenAI } from "@google/genai";
import type { Judgment, JudgmentScores } from "./types";

const JUDGE_MODEL = "gemini-3.1-pro-preview";

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
}): string {
  const mediaLabel = context.media === "chat" ? "Slack" : "phone call";

  return `You are evaluating a simulated workplace conversation for realism. Be strict but fair.

## Scenario
A new employee at ${context.companyName} is interacting with a coworker on ${mediaLabel}.

The coworker is: ${context.coworkerName}, ${context.coworkerRole}.
Personality: ${context.coworkerPersonality}

${context.conversationHistory ? `## Prior Messages\n${context.conversationHistory}\n` : "## No prior messages — this is the first interaction."}

## Latest Exchange
${context.userMessage.startsWith("[") ? `[System trigger: ${context.userMessage}]` : `User: ${context.userMessage}`}
Coworker: ${context.response}

## Evaluation Criteria
${context.criteria}

## Rate each dimension from 1 (worst) to 5 (best):

1. **Naturalness**: Does this sound like a real person on ${mediaLabel}? Not an AI assistant, not a corporate bot. Real humans are casual, use slang, are sometimes terse.
   - 1: Clearly AI-generated, robotic, overly helpful
   - 3: Mostly natural but some AI-isms ("I'd be happy to help", "Great question!")
   - 5: Completely natural, would fool a real person

2. **Role Accuracy**: Does the coworker stay in their role? A PM shouldn't give engineering advice. A non-manager shouldn't assign tasks or brief the user on their work.
   - 1: Acting as a completely different role
   - 3: Mostly in role but bleeds into other areas
   - 5: Perfectly in role

3. **Brevity**: Is the response length appropriate for ${mediaLabel}? Slack messages should be 1-3 sentences. Phone calls should be conversational turns, not monologues.
   - 1: Way too long, essay-length
   - 3: Acceptable but could be shorter
   - 5: Perfectly concise

4. **Context Awareness**: Does the response correctly use/reference conversation history? Does it avoid hallucinating conversations that didn't happen?
   - 1: Ignores history or references things that didn't happen
   - 3: Uses some history but misses key context
   - 5: Perfect use of available context

5. **Information Discipline**: Does the coworker avoid volunteering information that wasn't asked for? A casual "hey" should get a casual "hey" back, not a project briefing.
   - 1: Dumps everything they know unprompted
   - 3: Mostly restrained but volunteers some extra info
   - 5: Shares only what was specifically asked for

Respond ONLY with valid JSON (no markdown fences):
{"naturalness": N, "roleAccuracy": N, "brevity": N, "contextAwareness": N, "infoDiscipline": N, "reasoning": "2-3 sentences explaining your scores"}`;
}

/**
 * Run 3 independent judges on a single response.
 * Uses the same model but independent calls for unbiased evaluation.
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
}): Promise<Judgment[]> {
  const gemini = new GoogleGenAI({ apiKey: context.apiKey });
  const prompt = buildJudgePrompt(context);

  // Run 3 judges — stagger start by 1s each to avoid rate limits
  const judgePromises = ["judge-1", "judge-2", "judge-3"].map(async (judgeId, i) => {
    // Stagger judge calls to stay under rate limits
    if (i > 0) await new Promise((r) => setTimeout(r, i * 1500));

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await gemini.models.generateContent({
          model: JUDGE_MODEL,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            temperature: 0.3,
          },
        });

        const text = result.text?.trim() || "";
        const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const scores: JudgmentScores = JSON.parse(cleaned);

        for (const key of ["naturalness", "roleAccuracy", "brevity", "contextAwareness", "infoDiscipline"] as const) {
          if (typeof scores[key] !== "number" || scores[key] < 1 || scores[key] > 5) {
            scores[key] = 3;
          }
        }

        return { judgeId, ...scores } as Judgment;
      } catch (err) {
        const isRateLimit = err instanceof Error && (err.message.includes("429") || err.message.includes("RESOURCE_EXHAUSTED") || err.message.includes("quota"));
        if (isRateLimit && attempt < maxRetries - 1) {
          const delay = (attempt + 1) * 15000; // 15s, 30s backoff
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        console.error(`Judge ${judgeId} failed:`, err instanceof Error ? err.message : err);
        return {
          judgeId,
          naturalness: 3, roleAccuracy: 3, brevity: 3, contextAwareness: 3, infoDiscipline: 3,
          reasoning: `Judge ${judgeId} failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        } as Judgment;
      }
    }
    // Unreachable but TypeScript needs it
    return { judgeId, naturalness: 3, roleAccuracy: 3, brevity: 3, contextAwareness: 3, infoDiscipline: 3, reasoning: "Exhausted retries" } as Judgment;
  });

  return Promise.all(judgePromises);
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
    // Flag if any dimension has >2 point disagreement
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
