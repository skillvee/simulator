/**
 * Conversation Memory System
 *
 * Provides summarization and context injection for coworker conversations.
 * Ensures coworkers remember prior interactions within an assessment session.
 */

import { gemini } from "./gemini";
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
 * @param options - Optional config (e.g. maxRecentMessages for voice calls
 *   which can only inject context via systemInstruction, not history)
 * @returns Memory context object
 */
export async function buildCoworkerMemory(
  conversations: ConversationWithMeta[],
  coworkerName: string,
  options?: { maxRecentMessages?: number; skipSummary?: boolean }
): Promise<CoworkerMemory> {
  const maxRecent = options?.maxRecentMessages ?? MAX_RECENT_MESSAGES;

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
  const recentMessages = allMessages.slice(-maxRecent);

  // If we have enough messages, generate a summary of earlier ones
  // skipSummary: avoids a second Gemini call on the hot path (chat responses).
  // The recent-messages window is usually sufficient context for short chats.
  let summary: string | null = null;
  if (!options?.skipSummary && totalMessageCount > MIN_MESSAGES_FOR_SUMMARY) {
    // Messages to summarize (everything except recent)
    const messagesToSummarize = allMessages.slice(
      0,
      totalMessageCount > maxRecent ? -maxRecent : totalMessageCount
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

/**
 * Build conversation summary prompt with context.
 * Summary depth scales with conversation size so longer histories
 * retain more detail (important for voice calls where summary is the
 * only way to inject older context).
 */
function buildConversationSummaryPrompt(
  coworkerName: string,
  conversationText: string,
  messageCount: number
): string {
  const sentenceGuidance =
    messageCount > 30
      ? "6-10 sentences. Include specific technical details, decisions made, and any unresolved questions."
      : messageCount > 15
        ? "4-6 sentences. Include key decisions and important details shared."
        : "2-4 sentences";

  return `Summarize the following conversation between a job candidate and ${coworkerName} (a coworker).
Focus on:
- Key topics discussed and decisions made
- Important technical details and information shared
- Questions the candidate asked and answers given
- Commitments, action items, or follow-ups mentioned

Keep the summary concise (${sentenceGuidance}). Write from ${coworkerName}'s perspective (e.g., "We discussed...", "They asked about...").

Conversation:
${conversationText}

Summary:`;
}

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

  const prompt = buildConversationSummaryPrompt(coworkerName, conversationText, messages.length);

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
    "\n**CRITICAL INCREMENTAL SHARING RULES:**",
    "- If the candidate asks about something you discussed before, BUILD on what you already told them",
    "- Say things like 'As I mentioned...' or 'Building on what we discussed...' when referencing past topics",
    "- If they ask about the SAME topic again, share NEW details you didn't mention before",
    "- NEVER repeat the exact same information - always add something new or go deeper",
    "- Example: If you previously said 'We use Redis for caching', next time say 'The Redis setup I mentioned also handles our pub/sub for real-time updates'",
    "\nContinue the conversation naturally, always building on prior discussions. Don't repeat information unless specifically asked to clarify."
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
          lastUserMessage.text.slice(0, 60) +
          (lastUserMessage.text.length > 60 ? "..." : "");
        otherInteractions.push(
          `- The candidate has talked with ${coworkerName} (${messageCount} messages). Last topic hint: "${preview}"`
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

**IMPORTANT RULES about cross-coworker awareness:**
- You can acknowledge that the candidate has been talking to specific coworkers listed above (e.g., "I heard you were talking to Alex")
- If the candidate ASKS "who have I been chatting with?" — ONLY list the coworkers named above. Do NOT list team members they haven't talked to
- Do NOT independently confirm specific technical details from another person's private conversation. If the candidate says "Alex told me about X", you may acknowledge they talked, but share your OWN perspective on X (not echoing what Alex said)
- Do NOT pry into their conversations with others`;
}

/**
 * Format all conversations into a summary string for context
 * Used for defense call to provide conversation history context
 *
 * @param allConversations - All conversations in the assessment
 * @param coworkerMap - Map of coworker IDs to names
 * @returns Formatted summary of all conversations
 */
export function formatConversationsForSummary(
  allConversations: ConversationWithMeta[],
  coworkerMap: Map<string, string>
): string {
  if (allConversations.length === 0) {
    return "No conversations recorded.";
  }

  const summaries: string[] = [];

  for (const conv of allConversations) {
    if (conv.messages.length === 0) continue;

    const coworkerName = conv.coworkerId
      ? coworkerMap.get(conv.coworkerId) || "Coworker"
      : "Unknown";
    const convType = conv.type === "voice" ? "call" : "chat";

    // Get key messages (first and last few)
    const keyMessages: string[] = [];
    const msgs = conv.messages;

    // First 2 messages
    for (let i = 0; i < Math.min(2, msgs.length); i++) {
      const m = msgs[i];
      const role = m.role === "user" ? "Candidate" : coworkerName;
      keyMessages.push(`${role}: ${m.text.slice(0, 150)}${m.text.length > 150 ? "..." : ""}`);
    }

    // Last 2 messages (if different from first 2)
    if (msgs.length > 4) {
      keyMessages.push("...");
      for (let i = Math.max(2, msgs.length - 2); i < msgs.length; i++) {
        const m = msgs[i];
        const role = m.role === "user" ? "Candidate" : coworkerName;
        keyMessages.push(`${role}: ${m.text.slice(0, 150)}${m.text.length > 150 ? "..." : ""}`);
      }
    } else if (msgs.length > 2) {
      for (let i = 2; i < msgs.length; i++) {
        const m = msgs[i];
        const role = m.role === "user" ? "Candidate" : coworkerName;
        keyMessages.push(`${role}: ${m.text.slice(0, 150)}${m.text.length > 150 ? "..." : ""}`);
      }
    }

    summaries.push(`\n### ${convType} with ${coworkerName} (${msgs.length} messages)\n${keyMessages.join("\n")}`);
  }

  return summaries.join("\n");
}
