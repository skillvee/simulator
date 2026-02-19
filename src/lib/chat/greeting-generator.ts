/**
 * Manager Greeting Generator
 *
 * Generates initial greeting messages for the manager chat interface.
 * Uses Gemini to produce natural, persona-aware messages.
 * Falls back to hardcoded templates if Gemini fails.
 */

import type { ChatMessage, CoworkerPersonality } from "@/types";
import { gemini, TEXT_MODEL } from "@/lib/ai/gemini";
import {
  buildGreetingPrompt,
  type GreetingPromptContext,
  type TeamMemberIntro,
} from "@/prompts/manager/greeting";

/**
 * Context required to generate manager greeting messages
 */
export interface GreetingContext {
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

/**
 * Convert an array of message strings into ChatMessage objects with staggered timestamps.
 */
function toStaggeredMessages(texts: string[]): ChatMessage[] {
  const baseTimestamp = new Date();
  return texts.map((text, i) => ({
    role: "model" as const,
    text,
    timestamp: new Date(
      baseTimestamp.getTime() + i * 3000
    ).toISOString(),
  }));
}

/**
 * Generates the manager's initial greeting messages using Gemini.
 * Falls back to hardcoded messages if AI generation fails.
 */
export async function generateManagerGreetings(
  context: GreetingContext
): Promise<ChatMessage[]> {
  try {
    const promptContext: GreetingPromptContext = {
      userName: context.userName,
      managerName: context.managerName,
      managerRole: context.managerRole,
      companyName: context.companyName,
      repoUrl: context.repoUrl,
      taskDescription: context.taskDescription,
      personaStyle: context.personaStyle,
      personality: context.personality,
      teammates: context.teammates,
    };

    const prompt = buildGreetingPrompt(promptContext);

    const response = await gemini.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = response.text;
    if (!text) throw new Error("Empty Gemini response");

    // Strip markdown fences if present
    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const messages: string[] = JSON.parse(cleaned);

    // Validate: must be an array of 2-3 strings
    if (
      !Array.isArray(messages) ||
      messages.length < 2 ||
      messages.length > 3 ||
      !messages.every((m) => typeof m === "string" && m.length > 0)
    ) {
      throw new Error(
        `Invalid greeting format: got ${Array.isArray(messages) ? messages.length : typeof messages} items`
      );
    }

    return toStaggeredMessages(messages);
  } catch (err) {
    console.warn(
      "[generateManagerGreetings] Gemini failed, using fallback:",
      err
    );
    return generateFallbackGreetings(context);
  }
}

/**
 * Fallback: hardcoded greeting messages used when Gemini is unavailable.
 */
function generateFallbackGreetings(context: GreetingContext): ChatMessage[] {
  const {
    userName,
    managerName,
    managerRole,
    companyName,
    repoUrl,
    taskDescription,
    teammates,
  } = context;

  const repoNote = repoUrl
    ? `I've put everything into a repo for you here: ${repoUrl} — check the GitHub Issues for the full rundown.`
    : `Your repo is still being set up, I'll share the link once it's ready.`;

  const texts: string[] = [
    `Hey ${userName}! Welcome to ${companyName}! I'm ${managerName}, your ${managerRole} — excited to have you on the team.`,
    `${taskDescription.slice(0, 200)}${taskDescription.length > 200 ? "..." : ""} ${repoNote} Let me know if you have any questions!`,
  ];

  if (teammates && teammates.length > 0) {
    const introductions = teammates
      .map((t) => `${t.name} (${t.role})`)
      .join(" and ");
    texts.push(
      `Oh and ${introductions} are around if you need help — don't hesitate to ping them!`
    );
  }

  return toStaggeredMessages(texts);
}
