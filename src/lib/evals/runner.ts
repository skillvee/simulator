/**
 * Eval Runner — orchestrates scenario generation, judging, and storage
 *
 * Flow: for each scenario → build prompt → call Gemini Flash → judge with 3x Gemini Pro → store results
 *
 * Supports custom prompt overrides for A/B testing prompt changes.
 */

import { GoogleGenAI } from "@google/genai";
import { buildAgentPrompt } from "@/prompts/build-agent-prompt";
import { DEFAULT_LANGUAGE } from "@/lib/core/language";
import { EVAL_SCENARIOS } from "./scenarios";
import { judgeResponse, aggregateJudgments } from "./judge";
import { runMultiTurnConversation } from "./multi-turn";
import type { EvalScenario, ScenarioResult, RunEvalOptions } from "./types";

const GENERATION_MODEL = "gemini-3-flash-preview";

export interface RunnerConfig {
  apiKey: string;
  /** Override the prompt builder — for testing new prompt versions */
  promptOverride?: (scenario: EvalScenario) => string;
  /** Callback for progress updates */
  onProgress?: (completed: number, total: number, scenarioName: string) => void;
}

/**
 * Run the eval suite.
 * Returns results for all scenarios (or a filtered subset).
 */
export async function runEvalSuite(
  options: RunEvalOptions,
  config: RunnerConfig
): Promise<{
  results: ScenarioResult[];
  overallScore: number;
  promptVersion: string;
}> {
  // Filter scenarios
  let scenarios = [...EVAL_SCENARIOS];
  if (options.category) {
    scenarios = scenarios.filter((s) => s.category === options.category);
  }
  if (options.language) {
    scenarios = scenarios.filter((s) => s.language === options.language);
  }
  if (options.scenarioIds?.length) {
    scenarios = scenarios.filter((s) => options.scenarioIds!.includes(s.id));
  }

  const gemini = new GoogleGenAI({ apiKey: config.apiKey });
  const promptVersion = config.promptOverride ? "custom-override" : "production";

  // Run scenarios in parallel batches of 5 for speed
  // gemini-2.5-pro has 150 RPM — plenty of headroom
  const BATCH_SIZE = 5;
  const results: ScenarioResult[] = [];
  let completed = 0;

  for (let batchStart = 0; batchStart < scenarios.length; batchStart += BATCH_SIZE) {
    const batch = scenarios.slice(batchStart, batchStart + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (scenario) => {
        const result = await runSingleScenario(scenario, gemini, config);
        completed++;
        config.onProgress?.(completed, scenarios.length, scenario.name);

        if (options.verbose) {
          const scoreStr = `${result.overallScore.toFixed(1)}/5`;
          const flag = result.flagged ? " ⚠️ FLAGGED" : "";
          console.log(`  [${completed}/${scenarios.length}] ${scenario.name}: ${scoreStr}${flag}`);
        }

        return result;
      })
    );

    for (let i = 0; i < batchResults.length; i++) {
      const settled = batchResults[i];
      if (settled.status === "fulfilled") {
        results.push(settled.value);
      } else {
        const scenario = batch[i];
        console.error(`  FAILED: ${scenario.name} -`, settled.reason);
        results.push({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          category: scenario.category,
          prompt: "FAILED TO GENERATE",
          userMessage: scenario.userMessage,
          response: `Error: ${settled.reason instanceof Error ? settled.reason.message : "Unknown error"}`,
          generationMs: 0,
          judgments: [],
          naturalness: 0, roleAccuracy: 0, brevity: 0, contextAwareness: 0, infoDiscipline: 0, aiIsms: 0,
          overallScore: 0,
          flagged: true,
        });
      }
    }
  }

  const overallScore = results.length > 0
    ? Math.round((results.reduce((sum, r) => sum + r.overallScore, 0) / results.length) * 100) / 100
    : 0;

  return { results, overallScore, promptVersion };
}

async function runSingleScenario(
  scenario: EvalScenario,
  gemini: GoogleGenAI,
  config: RunnerConfig
): Promise<ScenarioResult> {
  // Step 1: Build prompt (production or override)
  const prompt = config.promptOverride
    ? config.promptOverride(scenario)
    : buildAgentPrompt({
        companyName: scenario.companyName,
        techStack: scenario.techStack,
        agent: scenario.agent,
        taskDescription: scenario.taskDescription,
        candidateName: scenario.candidateName,
        conversationHistory: scenario.conversationHistory,
        crossAgentContext: scenario.crossAgentContext,
        phase: scenario.phase,
        phaseContext: scenario.phaseContext,
        media: scenario.media,
        language: scenario.language || DEFAULT_LANGUAGE,  // Use scenario-specific language if set
      });

  // Step 2: Generate response
  const startMs = Date.now();
  let response: string;
  let generationMs: number;

  if (scenario.multiTurn) {
    // Multi-turn: simulate full conversation
    const transcript = await runMultiTurnConversation(
      prompt,
      scenario.multiTurn,
      config.apiKey
    );
    // Format transcript as readable text for judging
    response = transcript.turns
      .map((t) => `${t.role === "candidate" ? "Candidate" : "Coworker"}: ${t.text}`)
      .join("\n\n");
    generationMs = transcript.durationMs;
  } else {
    // Single-turn: generate one response
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
      { role: "user", parts: [{ text: prompt }] },
    ];

    if (!scenario.userMessage.startsWith("[")) {
      contents.push(
        { role: "model", parts: [{ text: "I understand my role. I'm ready." }] },
        { role: "user", parts: [{ text: scenario.userMessage }] },
      );
    }

    const result = await gemini.models.generateContent({
      model: GENERATION_MODEL,
      contents,
    });

    response = result.text?.trim() || "(empty response)";
    generationMs = Date.now() - startMs;
  }

  // Step 3: Judge the response with 3 independent judges
  const judgments = await judgeResponse({
    coworkerName: scenario.agent.name,
    coworkerRole: scenario.agent.role,
    coworkerPersonality: scenario.agent.personaStyle,
    companyName: scenario.companyName,
    media: scenario.media,
    conversationHistory: scenario.conversationHistory,
    userMessage: scenario.userMessage,
    response,
    criteria: scenario.criteria,
    apiKey: config.apiKey,
    isMultiTurn: !!scenario.multiTurn,
  });

  // Step 4: Aggregate scores
  const aggregated = aggregateJudgments(judgments);

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    category: scenario.category,
    prompt,
    userMessage: scenario.userMessage,
    response,
    generationMs,
    judgments,
    ...aggregated,
  };
}

/**
 * Get all scenario IDs and names for reference.
 */
export function listScenarios(): Array<{ id: string; name: string; category: string }> {
  return EVAL_SCENARIOS.map((s) => ({ id: s.id, name: s.name, category: s.category }));
}
