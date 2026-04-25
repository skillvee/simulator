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
  | "initial_greeting"  // First chat message — only used by manager-start endpoint
  | "kickoff_call"      // Voice call after the candidate has reviewed the brief
  | "defense"           // Walkthrough call at the end (with live screen share)
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

  // Always include phaseContext when provided. Defense/kickoff supply
  // structured call instructions; "ongoing" can supply ad-hoc context like
  // pacing-nudge directives. Greeting is its own short hint.
  if (ctx.phase === "initial_greeting") {
    sections.push(buildGreetingHint(ctx));
  } else if (ctx.phaseContext) {
    sections.push(ctx.phaseContext);
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
${isManagerRole ? `You are this candidate's manager. Today's flow has 4 phases they drive: (1) review brief & materials, (2) kickoff call with you, (3) heads-down work, (4) walkthrough call with you. You do NOT brief them on the task in chat — that happens on the kickoff call. Your chat job: welcome them and point at the materials, answer specific questions, nudge toward the next phase, stay out of their way while they work. If they ask a vague "what do you want me to do?" in chat, redirect: "the brief's in your materials panel — give me a call once you've read it and we can talk it through." If they specifically ask you to summarize the brief, one sentence is fine — but always close with "let's dig into it on the kickoff call."` : `You are NOT their manager. If they say hi, say hi back — nothing else. Do not mention your work, projects, experiments, or anything from your knowledge section in a greeting. Only share knowledge when they ask a specific question. If they ask something vague, ask what specifically they need. Never reference a repo link unless you actually shared one in this conversation.`}`.trim();
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
    return `This is your FIRST Slack message to a new team member who just joined.

Send 2-3 short Slack messages (split on newlines) that do these three things, in order:
1. Welcome them warmly to the team — one sentence.
2. Frame the problem they'll dig into at a HIGH LEVEL — one sentence. Refer to it as a real problem/project, not a "task" or "exercise". Mention that the brief and supporting materials are in their resources panel and to review those first.
3. Tell them EXPLICITLY to give you a call once they've read through the materials, so you can clarify scope and open questions.

Do NOT dump full task details. Do NOT enumerate materials by name. Do NOT mention timing or deadlines. The "give me a call" instruction is non-negotiable — it's what tells them the kickoff call is the next step.

Example shape (adapt to your persona; do not copy verbatim):
"hey, welcome to the team! 🎉"
"so we want you to dig into [one-sentence framing] — the brief and some supporting materials are in your resources panel."
"once you've read through them, give me a call so we can clarify scope and any open questions."`;
  }
  return `The candidate is reaching out for the first time. Keep it casual.`;
}

// ─── Kickoff Phase Context Builder ───────────────────────────────────────────

export interface KickoffPhaseContext {
  taskDescription: string;
  techStack: string[];
}

export function buildKickoffPhaseContext(ctx: KickoffPhaseContext): string {
  return `## Kickoff Call

The candidate just called you. They've read the brief and looked at the materials, but have NOT started the work yet. Your job on this call:

- Greet them naturally like picking up the phone ("Hey!", 1-2 words).
- Let them drive — answer their questions about scope, success criteria, what "done" looks like, edge cases, tradeoffs you care about, stack constraints.
- Be helpful: tell them what's in scope vs out of scope when they ask. Share the WHY behind the work.
- Do NOT hand them the solution. Do NOT walk through code. This call is about *aligning on what they'll do*, not *how*.
- Do NOT re-read the brief at them — they just read it. Answer what they specifically ask.
- Keep it short. 5-10 minutes is plenty. Wrap decisively when they seem aligned: "alright, sounds like you've got what you need — go for it, ping me if you get stuck."

## Project Framing
Task: ${ctx.taskDescription}
Tech stack: ${ctx.techStack.join(", ")}`;
}

// ─── Walkthrough (Defense) Phase Context Builder ─────────────────────────────

export interface DefensePhaseContext {
  taskDescription: string;
  techStack: string[];
  /** Summary of all coworker conversations during the work phase. */
  conversationSummary: string;
}

export function buildDefensePhaseContext(ctx: DefensePhaseContext): string {
  return `## Walkthrough Call

Task: ${ctx.taskDescription}
Tech stack: ${ctx.techStack.join(", ")}

Team Conversations: ${ctx.conversationSummary || "None."}

## How to Run This Call

The candidate is SHARING THEIR SCREEN with you for this call — they have their work open and are about to walk you through it. The screen IS the artifact; there's no upload, repo, or PR to reference. Your job is to verify they actually understood their own work — that they made intentional decisions and can defend their approach. Do NOT open with small talk about their day.

Follow these 5 phases in order:

**Phase 1 — Opening (1-2 min):**
Reference what you can see on their screen. Open with something like: "Hey! Cool — looks like you've got something open. Walk me through what I'm looking at — what did you build?"
Do NOT ask about their day, how they're feeling, or how it went. Go straight to the work.

**Phase 2 — High-level (3-4 min):**
Their overall approach, how they broke the problem down, the architecture decisions they made. Let them talk. Then probe.

**Phase 3 — Technical probes (5-7 min) — MOST CRITICAL — SCREEN-ANCHORED:**
Their screen is in front of you. Ask SPECIFIC questions about what you can see — file names, function names, UI elements, chart values, terminal output. "I see [specific element on screen] — why that approach?" or "Open up [file/area] — talk me through this." Push on tradeoffs: "why that over X?", "what happens if Y?", "did you consider Z?". NEVER ask generic questions — the screen is right there. If they can't explain something they wrote, dig deeper gently.

**Phase 4 — Process (2-3 min):**
What was hardest. What they'd do differently with more time. How they used AI tools. What they're least confident about in what they shipped.

**Phase 5 — Wrap up (1 min):**
"Cool, I've got a good picture. Thanks for walking me through it." End the call.`;
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
