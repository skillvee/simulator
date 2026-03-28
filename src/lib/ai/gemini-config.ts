// Client-safe Gemini configuration - constants, types, and voices
// NOTE: This file is safe to import in client components
// For the actual Gemini client, import from "./gemini" (server-only)

// Model for live voice conversations
export const LIVE_MODEL = "gemini-2.5-flash-native-audio-latest";

// Model for text-based AI operations (CV parsing, assessments, chat, etc.)
export const TEXT_MODEL = "gemini-3-flash-preview";

// Default voice for voice calls and fallback
export const DEFAULT_VOICE = "Aoede";

// Available Gemini Live voices by gender (for UI selection)
export const GEMINI_VOICES = {
  male: [
    { name: "Orus", description: "Firm" },
    { name: "Puck", description: "Upbeat" },
    { name: "Fenrir", description: "Excitable" },
    { name: "Charon", description: "Informative" },
    { name: "Iapetus", description: "Clear" },
  ],
  female: [
    { name: "Aoede", description: "Breezy" },
    { name: "Leda", description: "Youthful" },
    { name: "Callirrhoe", description: "Easy-going" },
    { name: "Vindemiatrix", description: "Gentle" },
    { name: "Despina", description: "Smooth" },
  ],
} as const;

// All voice names for validation
export const ALL_VOICE_NAMES = [
  ...GEMINI_VOICES.male.map((v) => v.name),
  ...GEMINI_VOICES.female.map((v) => v.name),
] as const;

export type VoiceName = (typeof ALL_VOICE_NAMES)[number];

// Re-export TranscriptMessage from centralized types for backwards compatibility
export type { TranscriptMessage } from "@/types";
