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

// Generate an ephemeral token for client-side Gemini Live connections
export async function generateEphemeralToken(config?: {
  systemInstruction?: string;
}): Promise<string> {
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
                voiceName: "Aoede", // Professional female voice
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

// Transcript message type
export interface TranscriptMessage {
  role: "user" | "model";
  text: string;
  timestamp: string;
}
