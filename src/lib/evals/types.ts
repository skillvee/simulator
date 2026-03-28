/**
 * Eval System Types
 *
 * Types for the LLM eval system that tests simulation prompt quality.
 */

import type { CoworkerPersona } from "@/types";
import type { SimulationPhase } from "@/prompts/build-agent-prompt";

// ─── Scenario Definition ─────────────────────────────────────────────────────

export interface EvalScenario {
  id: string;
  name: string;
  category: "manager" | "non-manager" | "edge-case";

  // Inputs for buildAgentPrompt
  agent: CoworkerPersona;
  companyName: string;
  techStack: string[];
  taskDescription?: string;
  candidateName: string;
  conversationHistory: string;
  crossAgentContext: string;
  phase: SimulationPhase;
  phaseContext?: string;
  media: "chat" | "voice";

  // The user message to generate a response to
  userMessage: string;

  // Judge criteria — what to evaluate
  criteria: string;
}

// ─── Judge Types ─────────────────────────────────────────────────────────────

export interface JudgmentScores {
  naturalness: number;      // 1-5
  roleAccuracy: number;     // 1-5
  brevity: number;          // 1-5
  contextAwareness: number; // 1-5
  infoDiscipline: number;   // 1-5
  reasoning: string;
}

export interface Judgment extends JudgmentScores {
  judgeId: string; // "judge-1", "judge-2", "judge-3"
}

// ─── Result Types ────────────────────────────────────────────────────────────

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  category: string;
  prompt: string;
  userMessage: string;
  response: string;
  generationMs: number;
  judgments: Judgment[];
  // Aggregated (median of 3 judges)
  naturalness: number;
  roleAccuracy: number;
  brevity: number;
  contextAwareness: number;
  infoDiscipline: number;
  overallScore: number;
  flagged: boolean;
}

export interface EvalRunResult {
  id: string;
  name: string;
  promptVersion: string;
  model: string;
  scenarioCount: number;
  overallScore: number;
  results: ScenarioResult[];
  completedAt: string;
}

// ─── Runner Options ──────────────────────────────────────────────────────────

export interface RunEvalOptions {
  name?: string;
  category?: "manager" | "non-manager" | "edge-case";
  scenarioIds?: string[];
  verbose?: boolean;
}
