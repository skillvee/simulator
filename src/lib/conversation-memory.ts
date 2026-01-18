/**
 * Conversation Memory System
 *
 * Provides summarization and context injection for coworker conversations.
 * Ensures coworkers remember prior interactions within an assessment session.
 */

import { gemini } from "@/lib/gemini";
import type {
  ChatMessage,
  ConversationWithMeta,
  CoworkerMemory,
} from "@/types";

// Re-export types for backwards compatibility
export type { ChatMessage, ConversationWithMeta, CoworkerMemory } from "@/types";

// Summarization model - use Flash for speed
const SUMMARY_MODEL = "gemini-3-flash-preview";

// Maximum messages to include verbatim (recent context)
const MAX_RECENT_MESSAGES = 10;

// Minimum messages before triggering summarization
const MIN_MESSAGES_FOR_SUMMARY = 5;

/**
 * Build memory context for a coworker based on prior conversations
 *
 * @param conversations - All conversations with this coworker (text + voice)
 * @param coworkerName - Name of the coworker for personalized summary
 * @returns Memory context object
 */
export async function buildCoworkerMemory(
  conversations: ConversationWithMeta[],
  coworkerName: string
): Promise<CoworkerMemory> {
  // Flatten all messages across conversations
  const allMessages: ChatMessage[] = [];
  for (const conv of conversations) {
    if (Array.isArray(conv.messages)) {
      allMessages.push(...conv.messages);
    }
  }

  const totalMessageCount = allMessages.length;
  const hasPriorConversations = totalMessageCount > 0;

  if (!hasPriorConversations) {
    return {
      summary: null,
      recentMessages: [],
      totalMessageCount: 0,
      hasPriorConversations: false,
    };
  }

  // Get recent messages for immediate context
  const recentMessages = allMessages.slice(-MAX_RECENT_MESSAGES);

  // If we have enough messages, generate a summary of earlier ones
  let summary: string | null = null;
  if (totalMessageCount > MIN_MESSAGES_FOR_SUMMARY) {
    // Messages to summarize (everything except recent)
    const messagesToSummarize = allMessages.slice(
      0,
      -MAX_RECENT_MESSAGES > 0 ? -MAX_RECENT_MESSAGES : totalMessageCount
    );

    if (messagesToSummarize.length > 0) {
      summary = await summarizeConversation(messagesToSummarize, coworkerName);
    }
  }

  return {
    summary,
    recentMessages,
    totalMessageCount,
    hasPriorConversations,
  };
}

// Conversation summary prompt is now centralized in src/prompts/analysis/assessment.ts
import { buildConversationSummaryPrompt } from "@/prompts/analysis/assessment";

/**
 * Generate a summary of conversation messages using Gemini
 *
 * @param messages - Messages to summarize
 * @param coworkerName - Name of the coworker for context
 * @returns Summary string
 */
async function summarizeConversation(
  messages: ChatMessage[],
  coworkerName: string
): Promise<string> {
  const conversationText = messages
    .map((m) => `${m.role === "user" ? "Candidate" : coworkerName}: ${m.text}`)
    .join("\n");

  // Use centralized prompt builder
  const prompt = buildConversationSummaryPrompt(coworkerName, conversationText);

  try {
    const response = await gemini.models.generateContent({
      model: SUMMARY_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    return response.text || "";
  } catch (error) {
    console.error("Error summarizing conversation:", error);
    // Fallback: return a basic summary
    return `We have had ${messages.length} previous exchanges.`;
  }
}

/**
 * Format memory context for injection into a coworker's system prompt
 *
 * @param memory - Memory context object
 * @param coworkerName - Name of the coworker
 * @returns Formatted string for system prompt
 */
export function formatMemoryForPrompt(
  memory: CoworkerMemory,
  _coworkerName: string
): string {
  if (!memory.hasPriorConversations) {
    return "";
  }

  const sections: string[] = ["\n## Prior Conversation History"];
  sections.push(
    "You have had previous conversations with this candidate. Remember and reference these when relevant."
  );

  // Add summary if available
  if (memory.summary) {
    sections.push(`\n### Summary of Earlier Conversations\n${memory.summary}`);
  }

  // Add recent messages
  if (memory.recentMessages.length > 0) {
    sections.push("\n### Recent Messages");
    const formattedMessages = memory.recentMessages
      .map((m) => `${m.role === "user" ? "Candidate" : "You"}: ${m.text}`)
      .join("\n");
    sections.push(formattedMessages);
  }

  sections.push(
    "\nContinue the conversation naturally, referencing prior discussions when relevant. Don't repeat information you've already shared unless asked."
  );

  return sections.join("\n");
}

/**
 * Build memory context for all coworkers in an assessment
 * Useful for providing cross-coworker awareness (e.g., "Alex mentioned you were working on X")
 *
 * @param allConversations - All conversations in the assessment (including HR interview)
 * @param currentCoworkerId - Current coworker's ID (to exclude from "other coworkers")
 * @param coworkerMap - Map of coworker IDs to names
 * @returns Formatted context about other conversations
 */
export function buildCrossCoworkerContext(
  allConversations: ConversationWithMeta[],
  currentCoworkerId: string,
  coworkerMap: Map<string, string>
): string {
  // Get conversations with OTHER coworkers (not current, not HR interview)
  const otherCoworkerConversations = allConversations.filter(
    (c) => c.coworkerId !== null && c.coworkerId !== currentCoworkerId
  );

  if (otherCoworkerConversations.length === 0) {
    return "";
  }

  // Build brief context about other interactions
  const otherInteractions: string[] = [];

  for (const conv of otherCoworkerConversations) {
    const coworkerName = coworkerMap.get(conv.coworkerId!) || "a coworker";
    const messageCount = conv.messages.length;

    if (messageCount > 0) {
      // Get the last topic discussed (simplified)
      const lastUserMessage = [...conv.messages]
        .reverse()
        .find((m) => m.role === "user");
      if (lastUserMessage) {
        const preview =
          lastUserMessage.text.slice(0, 100) +
          (lastUserMessage.text.length > 100 ? "..." : "");
        otherInteractions.push(
          `- The candidate has also been talking with ${coworkerName} (${messageCount} messages). Recent topic: "${preview}"`
        );
      }
    }
  }

  if (otherInteractions.length === 0) {
    return "";
  }

  return `\n## Context About Other Conversations
The candidate has been reaching out to other team members. This is normal and encouraged.
${otherInteractions.join("\n")}

You can acknowledge these interactions if relevant (e.g., "I heard you were talking to Alex about..."), but don't pry into their conversations with others.`;
}
