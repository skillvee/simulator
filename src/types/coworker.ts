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

/** How warm and approachable the coworker is */
export type WarmthLevel = "welcoming" | "neutral" | "guarded";

/** How freely the coworker shares information */
export type HelpfulnessLevel =
  | "generous"
  | "balanced"
  | "requires-justification";

/** How much the coworker writes per message */
export type VerbosityLevel = "verbose" | "moderate" | "terse";

/** How strongly the coworker pushes their own opinions */
export type OpinionStrengthLevel = "opinionated" | "neutral" | "deferring";

/** Current mood/context affecting behavior during the assessment */
export type CoworkerMood =
  | "neutral"
  | "stressed-about-deadline"
  | "upbeat-after-launch"
  | "frustrated-with-unrelated-thing"
  | "focused-and-busy";

/** How the coworker relates to the candidate */
export type RelationshipDynamic =
  | "mentoring"
  | "peer-collaborative"
  | "slightly-territorial"
  | "indifferent";

/**
 * Structured personality dimensions for a coworker.
 * These replace the free-text personaStyle with concrete, prompt-actionable fields.
 */
export interface CoworkerPersonality {
  warmth: WarmthLevel;
  helpfulness: HelpfulnessLevel;
  verbosity: VerbosityLevel;
  opinionStrength: OpinionStrengthLevel;
  mood: CoworkerMood;
  relationshipDynamic: RelationshipDynamic;
  /** 1-2 specific things that annoy this coworker */
  petPeeves: string[];
}

/**
 * Full coworker persona data structure for system prompt generation
 */
export interface CoworkerPersona {
  name: string;
  role: string;
  /** Communication style description (stored in DB) */
  personaStyle: string;
  /** Structured personality dimensions (stored as JSON in DB) */
  personality?: CoworkerPersonality | null;
  /** Specific knowledge they hold (stored as JSON in DB) */
  knowledge: CoworkerKnowledge[];
  /** Optional avatar URL */
  avatarUrl?: string | null;
  /** Gemini Live voice name for calls (e.g., "Orus", "Aoede") */
  voiceName?: string | null;
}

/**
 * Status schedule entry defining when a coworker's status changes
 */
export interface StatusScheduleEntry {
  /** Availability status */
  status: "online" | "away" | "in-meeting" | "offline";
  /** Status message shown below role (e.g., "In a design review") */
  statusMessage: string;
  /** Minutes after assessment start when this status begins */
  startMinutes: number;
}

/**
 * Decorative team member for sidebar display.
 * These members appear as "away" or "in-meeting" and respond with a single canned message.
 */
export interface DecorativeTeamMember {
  /** Display name */
  name: string;
  /** Job title/role */
  role: string;
  /** Avatar initials (derived from name if not provided) */
  initials?: string;
  /** Optional avatar URL */
  avatarUrl?: string;
  /** Status message shown in chat banner (e.g., "In a meeting until 10:45 AM") */
  statusMessage?: string;
  /** Availability state - affects status indicator color */
  availability?: "online" | "away" | "in-meeting" | "offline";
  /** One-time auto-reply sent after user's first message. Use {managerName} placeholder. */
  cannedResponse?: string;
  /** Optional schedule of status changes over time during assessment */
  statusSchedule?: StatusScheduleEntry[];
}
