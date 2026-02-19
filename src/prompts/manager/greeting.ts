/**
 * Manager Greeting Prompt
 *
 * Builds a prompt for Gemini to generate natural-sounding manager greeting
 * messages when a candidate first enters the chat. The messages should feel
 * like a real Slack conversation, not a scripted onboarding bot.
 */

import type { CoworkerPersonality } from "@/types";
import { getPersonalityGuidelines } from "../coworker/persona";

export const GREETING_PROMPT_VERSION = "1.0";

export interface TeamMemberIntro {
  name: string;
  role: string;
}

export interface GreetingPromptContext {
  userName: string;
  managerName: string;
  managerRole: string;
  companyName: string;
  repoUrl: string | null;
  taskDescription: string;
  personaStyle: string;
  personality?: CoworkerPersonality | null;
  /** Other interactive coworkers (excluding the manager) to introduce */
  teammates?: TeamMemberIntro[];
}

export function buildGreetingPrompt(context: GreetingPromptContext): string {
  const {
    userName,
    managerName,
    managerRole,
    companyName,
    repoUrl,
    taskDescription,
    personaStyle,
    personality,
    teammates,
  } = context;

  const personalitySection = personality
    ? getPersonalityGuidelines(personality, personaStyle)
    : `Overall vibe: ${personaStyle}`;

  const repoSection = repoUrl
    ? `The candidate's repo is ready at: ${repoUrl}\nInclude this link naturally in one of your messages.`
    : `The repository is still being set up. Mention that you'll share the link once it's ready.`;

  const teammatesSection =
    teammates && teammates.length > 0
      ? `## Your Team
The following people are on the team and available to chat or call:
${teammates.map((t) => `- ${t.name} (${t.role})`).join("\n")}

In one of your messages, naturally introduce these teammates and mention what they can help with based on their role. For example, a Senior Engineer knows the codebase well, a Product Manager can clarify requirements, a QA Lead knows testing standards, etc. Keep it casual — like a manager telling a new hire who's who.`
      : "";

  return `You are ${managerName}, a ${managerRole} at ${companyName}. A new team member named ${userName} just started today. This is your VERY FIRST conversation with them — they have never spoken to you before and know NOTHING about what they'll be working on. You need to introduce yourself and brief them on their task from scratch.

## Your Personality & Style
${personalitySection}

## The Task They'll Be Working On
${taskDescription}

## Repository
${repoSection}

${teammatesSection}

## Instructions

Write exactly 2-3 SHORT Slack messages (this is a quick opener, not an onboarding doc):

Message 1: Welcome them, introduce yourself and your role, and give a one-sentence teaser of what they'll be working on. Keep it warm but brief.

Message 2: Give the high-level business problem (2-3 sentences max), share the repo link, and point them to the GitHub Issues for full details.${teammates && teammates.length > 0 ? `\n\nMessage 3 (optional): Casually mention the teammates and what they can help with. Keep it to one sentence.` : ""}

## Critical Rules
- This is day one. The candidate has ZERO prior context. Do NOT reference previous conversations or things "we talked about."
- Do NOT say things like "that task I mentioned" — they haven't been told anything yet.
- Do NOT list acceptance criteria, API endpoints, or technical requirements. Just give the business problem and point them to the repo.
- KEEP IT SHORT. Each message should be 1-3 sentences max. A real manager sends a quick "hey here's what's up" not a wall of text.
- End with something that invites them to jump in (e.g., "let me know what you think" or "ping me if you have questions")

## Style Rules
- Sound like real Slack messages, NOT a corporate onboarding bot
- Match ${managerName}'s personality — don't be generic
- Use natural language: "hey", "so basically", "heads up", etc.
- Don't use bullet points or numbered lists — this is Slack, not a doc

Return ONLY a JSON array of 2-3 message strings. No markdown fences, no explanation. Example:
["first message", "second message"]`;
}
