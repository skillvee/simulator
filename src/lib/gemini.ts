import { GoogleGenAI, Modality } from "@google/genai";
import { env } from "@/lib/env";

// Server-side Gemini client (uses API key with v1alpha for token support)
export const gemini = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
  httpOptions: { apiVersion: "v1alpha" },
});

// Model for live voice conversations
// Must match an available model from the Gemini API
export const LIVE_MODEL = "gemini-2.5-flash-native-audio-latest";

// Model for text-based AI operations (CV parsing, assessments, chat, etc.)
export const TEXT_MODEL = "gemini-3-flash-preview";

// Re-export HR interview prompt from centralized prompts module
// Note: The new prompt is more natural and conversational
export { HR_INTERVIEW_SYSTEM_PROMPT as HR_PERSONA_SYSTEM_PROMPT } from "@/prompts/hr/interview";

// Default voice for HR interviews and fallback
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

// Generate an ephemeral token for client-side Gemini Live connections
export async function generateEphemeralToken(config?: {
  systemInstruction?: string;
  voiceName?: string;
}): Promise<string> {
  const voiceName = config?.voiceName || DEFAULT_VOICE;

  const response = await gemini.authTokens.create({
    config: {
      uses: 1,
      liveConnectConstraints: {
        model: LIVE_MODEL,
        config: {
          systemInstruction: config?.systemInstruction,
          responseModalities: [Modality.AUDIO],
          // Enable transcription for both input (user speech) and output (model speech)
          // This is REQUIRED for transcript capture - must be set here, not just client-side
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
      },
    },
  });

  if (!response.name) {
    throw new Error("Failed to generate ephemeral token");
  }

  return response.name;
}

// Re-export TranscriptMessage from centralized types for backwards compatibility
export type { TranscriptMessage } from "@/types";
