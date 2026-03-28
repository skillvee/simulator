/**
 * Universal Agent Prompt Builder
 *
 * Every LLM interaction (chat or voice) goes through this single function.
 * Keeps prompts short and lets the LLM make decisions based on context.
 */

import type { CoworkerPersona } from "@/types";
import { isManager } from "@/lib/utils/coworker";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SimulationPhase =
  | "initial_greeting"  // First message — only used by manager-start endpoint
  | "defense"           // PR defense review
  | "ongoing";          // Everything else

export interface AgentPromptContext {
  companyName: string;
  techStack: string[];
  agent: CoworkerPersona;
  /** Task description — only provided for managers */
  taskDescription?: string;
  candidateName?: string;
  conversationHistory: string;
  crossAgentContext: string;
  phase: SimulationPhase;
  /** Extra context for the phase (defense details, etc.) */
  phaseContext?: string;
  media: "chat" | "voice";
}

// ─── Main Builder ────────────────────────────────────────────────────────────

export function buildAgentPrompt(ctx: AgentPromptContext): string {
  const sections: string[] = [];

  sections.push(buildIdentity(ctx));

  if (ctx.conversationHistory) {
    sections.push(ctx.conversationHistory);
  }

  if (ctx.crossAgentContext) {
    sections.push(ctx.crossAgentContext);
  }

  // Defense phase is the only one with structured instructions
  if (ctx.phase === "defense" && ctx.phaseContext) {
    sections.push(ctx.phaseContext);
  } else if (ctx.phase === "initial_greeting") {
    sections.push(buildGreetingHint(ctx));
  }

  sections.push(ctx.media === "chat" ? CHAT_RULES : VOICE_RULES);

  return sections.filter(Boolean).join("\n\n");
}

// ─── Identity ────────────────────────────────────────────────────────────────

function buildIdentity(ctx: AgentPromptContext): string {
  const { agent, companyName, candidateName, techStack } = ctx;
  const isManagerRole = isManager(agent.role);

  const taskSection = isManagerRole && ctx.taskDescription
    ? `## The Task You Assigned\n${ctx.taskDescription}`
    : "";

  const knowledgeSection = formatKnowledge(agent.knowledge);

  return `You are ${agent.name}, a ${agent.role} at ${companyName}. A new team member (${candidateName || "the candidate"}) started today.
${techStack.length ? `Tech stack: ${techStack.join(", ")}` : ""}

Personality: ${agent.personaStyle}

${taskSection}

${knowledgeSection}

Be a real coworker, not an AI assistant. Be brief. Answer what they ask, nothing more.${isManagerRole ? "" : `
You are NOT their manager. You don't assign tasks or brief them on what to do. If they just say hi, just say hi back — don't launch into project details. Only share your knowledge when they ask you a specific question about it.`}`.trim();
}

function formatKnowledge(knowledge: CoworkerPersona["knowledge"]): string {
  if (!knowledge || (Array.isArray(knowledge) && knowledge.length === 0)) return "";
  if (typeof knowledge === "string") return `## What You Know\n${knowledge}`;

  const items = knowledge as unknown as Array<{ topic: string; response?: string; details?: string; content?: string }>;
  if (items.length === 0) return "";

  const formatted = items
    .map((k) => `- ${k.topic}: ${k.response || k.details || k.content || ""}`)
    .join("\n");

  return `## What You Know\nShare when asked, not all at once:\n${formatted}`;
}

// ─── Greeting Hint (manager-start endpoint only) ─────────────────────────────

function buildGreetingHint(ctx: AgentPromptContext): string {
  const isManagerRole = isManager(ctx.agent.role);
  if (isManagerRole) {
    return `Send a warm, casual first Slack message to welcome them. Just say hi — don't brief them on the task yet.`;
  }
  return `The candidate is reaching out for the first time. Keep it casual.`;
}

// ─── Defense Phase Context Builder ───────────────────────────────────────────

export interface DefensePhaseContext {
  prUrl: string;
  repoUrl: string;
  taskDescription: string;
  techStack: string[];
  conversationSummary: string;
  codeReviewSummary?: string;
  ciStatusSummary?: string;
  screenAnalysisSummary?: string;
}

export function buildDefensePhaseContext(ctx: DefensePhaseContext): string {
  return `## PR Defense Review

Task: ${ctx.taskDescription}
Tech stack: ${ctx.techStack.join(", ")}
Repo: ${ctx.repoUrl}
PR: ${ctx.prUrl}

CI/Tests: ${ctx.ciStatusSummary || "Will be checked after the call."}
Code Review: ${ctx.codeReviewSummary || "Not available."}
Screen Recording: ${ctx.screenAnalysisSummary || "Not available."}
Team Conversations: ${ctx.conversationSummary || "None."}

## How to Run This Call

Follow these 5 phases in order:

**Phase 1 — Opening (2 min):**
"Hey! So I've been looking at your PR. Want to give me the quick walkthrough?"

**Phase 2 — High-level (3-4 min):**
Overall approach, how they broke it down, architecture decisions.

**Phase 3 — Technical probes (5-7 min) — MOST CRITICAL:**
At least 3 specific questions about their actual code. Reference real files from the PR. Never ask generic questions.

**Phase 4 — Process (2-3 min):**
What was hardest, what they'd do differently, AI tool usage.

**Phase 5 — Wrap up (1-2 min):**
"Cool, I've got a good picture. Thanks for walking me through it."`;
}

// ─── Media Rules ─────────────────────────────────────────────────────────────

const CHAT_RULES = `## Chat Rules
Slack-style: 1-3 sentences per message. Sound like a coworker on Slack, not documentation. Never invent tools, wikis, or URLs not in your knowledge. Never reference conversations not in your history.`;

const VOICE_RULES = `## Voice Rules
Sound like a real phone call. Use filler words naturally ("um", "so", "let me think"). Keep turns short. When you receive "[call connected]", YOU speak first — the candidate hasn't said anything yet. Never invent things not in your knowledge.`;
