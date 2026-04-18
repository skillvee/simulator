/**
 * Universal Agent Prompt Builder
 *
 * Every LLM interaction (chat or voice) goes through this single function.
 * Keeps prompts short and lets the LLM make decisions based on context.
 */

import type { CoworkerPersona } from "@/types";
import { isManager } from "@/lib/utils/coworker";
import { type SupportedLanguage, buildLanguageInstruction, LANGUAGES } from "@/lib/core/language";

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
  /** Labels of resources visible in the candidate's sidebar (e.g. "GitHub Repository", "Data Warehouse") */
  resourceLabels?: string[];
  /** Language for AI responses */
  language: SupportedLanguage;
}

// ─── Main Builder ────────────────────────────────────────────────────────────

export function buildAgentPrompt(ctx: AgentPromptContext): string {
  const sections: string[] = [];

  // Add language instruction first if non-English
  const langInstruction = buildLanguageInstruction(ctx.language);
  if (langInstruction) {
    sections.push(langInstruction);
  }

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

  sections.push(ctx.media === "chat" ? CHAT_RULES : buildVoiceRules(ctx.language));

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

  const resourcesNote = isManagerRole && ctx.resourceLabels && ctx.resourceLabels.length > 0
    ? `\nThe candidate already has these resources pinned in their sidebar: ${ctx.resourceLabels.join(", ")}. Don't repeat URLs or access info that's already there — if they ask "where is the repo?" just say "check your sidebar" or "should be in your resources panel." Focus on the WHY and WHAT, not the WHERE.`
    : "";

  return `You are ${agent.name}, a ${agent.role} at ${companyName}. A new team member (${candidateName || "the candidate"}) started today.
${techStack.length ? `Tech stack: ${techStack.join(", ")}` : ""}

Personality: ${agent.personaStyle}

${taskSection}
${resourcesNote}

${knowledgeSection}

Be a real coworker, not an AI assistant. Keep messages short — 1-2 sentences on Slack, brief turns on calls.
Never say: "Great question", "Happy to help", "I'd be happy to", "That's awesome", "absolutely", "I'm so excited/stoked", "love that", "fantastic". These are AI patterns — real coworkers just answer directly.
CRITICAL: Never volunteer information from the "What You Know" section unless the candidate specifically asks about that topic. Answer ONLY the question asked — do not add extra tips, related info, or "also" suggestions. One question = one answer.
${isManagerRole ? `Respond to the person first, then the work. After the initial greeting exchange (1-2 messages of small talk), naturally transition to the task — say something like "So let me fill you in on what we need you to look at today..." and give the high-level problem in plain language. A real manager would just tell them, not wait to be asked. If they seem overwhelmed or nervous, reassure them first and share the task in your next message. If they ask something vague ("tell me everything"), ask what specifically they want to know. Never repeat the repo URL if you already shared it.` : `You are NOT their manager. If they say hi, say hi back — nothing else. Do not mention your work, projects, experiments, or anything from your knowledge section in a greeting. Only share knowledge when they ask a specific question. If they ask something vague, ask what specifically they need. Never reference a repo link unless you actually shared one in this conversation.`}`.trim();
}

function formatKnowledge(knowledge: CoworkerPersona["knowledge"]): string {
  if (!knowledge || (Array.isArray(knowledge) && knowledge.length === 0)) return "";
  if (typeof knowledge === "string") return `## What You Know\n${knowledge}`;

  const items = knowledge as unknown as Array<{ topic: string; response?: string; details?: string; content?: string }>;
  if (items.length === 0) return "";

  const formatted = items
    .map((k) => `- ${k.topic}: ${k.response || k.details || k.content || ""}`)
    .join("\n");

  return `## What You Know (NEVER volunteer — only share the specific item when the candidate asks about that exact topic)\n${formatted}`;
}

// ─── Greeting Hint (manager-start endpoint only) ─────────────────────────────

function buildGreetingHint(ctx: AgentPromptContext): string {
  const isManagerRole = isManager(ctx.agent.role);
  if (isManagerRole) {
    return `Send a warm, casual first Slack message (1-2 sentences). Just say hi and ask how they're doing. Do NOT mention the task, project, or any work details — that comes later when they ask.`;
  }
  return `The candidate is reaching out for the first time. Keep it casual.`;
}

// ─── Defense Phase Context Builder ───────────────────────────────────────────

export interface DefensePhaseContext {
  repoUrl: string;
  taskDescription: string;
  techStack: string[];
  conversationSummary: string;
  codeReviewSummary?: string;
  screenAnalysisSummary?: string;
}

export function buildDefensePhaseContext(ctx: DefensePhaseContext): string {
  return `## Work Review Call

Task: ${ctx.taskDescription}
Tech stack: ${ctx.techStack.join(", ")}
${ctx.repoUrl ? `Repo: ${ctx.repoUrl}` : ""}

Code Review: ${ctx.codeReviewSummary || "Not available."}
Screen Recording: ${ctx.screenAnalysisSummary || "Not available."}
Team Conversations: ${ctx.conversationSummary || "None."}

## How to Run This Call

Follow these 5 phases in order:

**Phase 1 — Opening (2 min):**
"Hey! So I've been looking at your work. Want to give me the quick walkthrough?"

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
Slack-style: 1-2 sentences per message. Never invent tools, wikis, or URLs not in your knowledge. If asked about something you already answered, just give the answer — don't re-explain the reasoning.`;

function buildVoiceRules(language: SupportedLanguage): string {
  const voiceRules = LANGUAGES[language].voiceRules;
  const fillers = LANGUAGES[language].fillers;

  const rulesList = voiceRules.map(rule => `- ${rule}`).join("\n");
  const fillerExamples = language === "en"
    ? `("${fillers.slice(0, 3).join('", "')}")`
    : `("${fillers.slice(0, 4).join('", "')}", etc.)`;

  return `## Voice Rules
Sound like a real phone call. Use filler words naturally ${fillerExamples}. Keep turns short. Never read out URLs or links on a call — say "I'll drop the link in Slack" instead.

${rulesList}

YOU must speak first when the call starts. Greet the candidate naturally like picking up the phone: "Hey!", "Yo, what's going on?", etc. Keep it to 1-2 words. Do NOT wait for the candidate to speak first.`;
}
