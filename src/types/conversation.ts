/**
 * Conversation Types
 *
 * Types for chat messages and voice transcripts used across
 * the assessment platform.
 */

/**
 * Emoji reaction on a chat message (like Slack reactions)
 */
export interface MessageReaction {
  emoji: string;      // "👀", "👍", "👋"
  reactorName: string; // coworker name who reacted
}

/**
 * Chat message type used in text-based coworker conversations
 */
export interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: string;
  reactions?: MessageReaction[];  // Optional reactions on this message
}

/**
 * Transcript message type for voice conversations
 * Similar to ChatMessage but specifically for voice call transcripts
 */
export interface TranscriptMessage {
  role: "user" | "model";
  text: string;
  timestamp: string;
}

/**
 * Conversation with metadata (used by conversation memory system)
 */
export interface ConversationWithMeta {
  type: "text" | "voice";
  coworkerId: string | null;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Memory context for a coworker (used for conversation continuity)
 */
export interface CoworkerMemory {
  /** Summary of all prior conversations with this coworker */
  summary: string | null;
  /** Recent messages for immediate context (last N messages) */
  recentMessages: ChatMessage[];
  /** Total message count across all conversations */
  totalMessageCount: number;
  /** Whether this coworker has had prior conversations */
  hasPriorConversations: boolean;
}
