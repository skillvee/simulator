/**
 * Coworker Types
 *
 * Types for AI coworker personas with distinct personalities
 * and knowledge that candidates must discover through conversation.
 */

/**
 * A piece of knowledge that a coworker holds.
 * Candidates must ask the right questions to discover this information.
 */
export interface CoworkerKnowledge {
  /** Topic area (e.g., "api_authentication", "deployment_process") */
  topic: string;
  /** Keywords/phrases that trigger this knowledge when asked */
  triggerKeywords: string[];
  /** The full information the coworker will share when asked appropriately */
  response: string;
  /** Whether this is critical info the candidate MUST discover */
  isCritical: boolean;
}

/**
 * Personality traits that affect how a coworker communicates
 */
export type PersonalityStyle =
  | "formal" // Professional, structured, uses proper terminology
  | "casual" // Friendly, uses slang, emoji-friendly
  | "technical" // Deep technical details, precise language
  | "supportive" // Encouraging, offers help proactively
  | "busy"; // Brief responses, prefers async communication

/**
 * Full coworker persona data structure for system prompt generation
 */
export interface CoworkerPersona {
  name: string;
  role: string;
  /** Communication style description (stored in DB) */
  personaStyle: string;
  /** Specific knowledge they hold (stored as JSON in DB) */
  knowledge: CoworkerKnowledge[];
  /** Optional avatar URL */
  avatarUrl?: string | null;
}

/**
 * Decorative team member for sidebar display.
 * These members appear offline and are not interactive.
 */
export interface DecorativeTeamMember {
  /** Display name */
  name: string;
  /** Job title/role */
  role: string;
  /** Avatar initials (derived from name if not provided) */
  initials?: string;
}
