// Server-only Gemini client and utilities
// NOTE: Do NOT import this file in client components - use gemini-config.ts instead
import { GoogleGenAI, Modality } from "@google/genai";
import { env } from "@/lib/core/env";
import { LIVE_MODEL, DEFAULT_VOICE } from "./gemini-config";

// Re-export client-safe config for backwards compatibility in server code
export * from "./gemini-config";

// Server-side Gemini client (uses API key with v1alpha for token support)
export const gemini = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
  httpOptions: { apiVersion: "v1alpha" },
});

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
