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
import { createLogger } from "@/lib/core";

const logger = createLogger("lib:chat:greeting-generator");

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
  /** When true, generates a post-call written reference instead of a call invitation */
  postVoiceKickoff?: boolean;
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
      postVoiceKickoff: context.postVoiceKickoff,
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

    const staggered = toStaggeredMessages(messages);

    // Append the repo link as a separate system-delivered message
    if (context.repoUrl) {
      staggered.push({
        role: "model" as const,
        text: context.repoUrl,
        timestamp: new Date(
          new Date(staggered[staggered.length - 1].timestamp).getTime() + 3000
        ).toISOString(),
      });
    }

    return staggered;
  } catch (err) {
    logger.warn("Gemini failed, using fallback", { error: err instanceof Error ? err.message : String(err) });
    return generateFallbackGreetings(context);
  }
}

/**
 * Fallback: hardcoded greeting messages used when Gemini is unavailable.
 * Note: Message 1 (welcome) is now handled by the instant message in the hook,
 * so these start with the task briefing.
 */
function generateFallbackGreetings(context: GreetingContext): ChatMessage[] {
  const {
    userName,
    managerName,
    companyName,
    repoUrl,
    taskDescription,
  } = context;

  // Suppress unused variable warnings — kept in signature for API compatibility
  void userName;
  void managerName;
  void companyName;

  const repoNote = repoUrl
    ? `Sending you the repo now — check the GitHub Issues for the full rundown.`
    : `Your repo is still being set up, I'll share the link once it's ready.`;

  const texts: string[] = context.postVoiceKickoff
    ? [
        `As we discussed — ${taskDescription.slice(0, 150)}${taskDescription.length > 150 ? "..." : ""} ${repoNote}`,
        `Ping me if you get stuck on anything!`,
      ]
    : [
        `${taskDescription.slice(0, 200)}${taskDescription.length > 200 ? "..." : ""} ${repoNote}`,
        `Check the GitHub Issues and README to get the full picture.`,
        `Take your time going through everything — then give me a call when you're ready to chat through any questions.`,
      ];

  const staggered = toStaggeredMessages(texts);

  // Append repo link as a separate message
  if (repoUrl) {
    staggered.push({
      role: "model" as const,
      text: repoUrl,
      timestamp: new Date(
        new Date(staggered[staggered.length - 1].timestamp).getTime() + 3000
      ).toISOString(),
    });
  }

  return staggered;
}
