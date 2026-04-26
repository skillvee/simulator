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
  category: "manager" | "non-manager" | "edge-case" | "voice" | "pacing";
  language?: "en" | "es"; // Language for scenario, defaults to "en"

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

  // Single-turn: the user message to respond to
  userMessage: string;

  // Multi-turn: config for simulated conversation (if set, userMessage is ignored)
  multiTurn?: MultiTurnConfig;

  // Judge criteria — what to evaluate
  criteria: string;
}

// ─── Multi-Turn Conversation Types ───────────────────────────────────────────

export interface MultiTurnConfig {
  candidatePersona: string;
  candidateFirstMessage?: string;
  coworkerSpeaksFirst: boolean;
  maxTurns: number;
  scenarioContext: string;
}

export interface ConversationTurn {
  role: "candidate" | "coworker";
  text: string;
}

export interface ConversationTranscript {
  turns: ConversationTurn[];
  durationMs: number;
}

// ─── Judge Types ─────────────────────────────────────────────────────────────

export interface JudgmentScores {
  naturalness: number;      // 1-5
  roleAccuracy: number;     // 1-5 (persona consistency)
  brevity: number;          // 1-5
  contextAwareness: number; // 1-5 (conversational flow)
  infoDiscipline: number;   // 1-5
  aiIsms: number;           // 1-5 (absence of AI writing patterns)
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
  aiIsms: number;
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
  category?: "manager" | "non-manager" | "edge-case" | "voice" | "pacing";
  language?: "en" | "es";
  scenarioIds?: string[];
  verbose?: boolean;
}
