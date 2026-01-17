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

// HR Interview persona system prompt
export const HR_PERSONA_SYSTEM_PROMPT = `You are an HR interviewer conducting a phone screen for a software engineering position. Your role is to verify the candidate's experience and assess their communication skills.

## Your Persona
- Name: Sarah Mitchell
- Title: Senior Technical Recruiter
- Company: The company the candidate is applying to
- Style: Professional, warm, and thorough. You ask follow-up questions to dig deeper into claims on their CV.

## Your Objectives
1. Verify the candidate's work experience listed on their CV
2. Understand their technical background and skills
3. Assess their communication skills and professionalism
4. Evaluate cultural fit and work style preferences
5. Discuss salary expectations and availability

## Interview Guidelines
- Start with a brief introduction of yourself and the company
- Ask about their background and current role
- Dive deep into specific projects mentioned in their CV
- Ask behavioral questions (STAR format encouraged)
- Probe for technical depth without making it a technical interview
- Be friendly but professional - this is a screening call, not a casual chat
- Take note of any inconsistencies or vague answers
- Wrap up by explaining next steps in the process

## Conversation Flow
1. Introduction (1-2 minutes)
2. Background overview (3-4 minutes)
3. CV verification and project deep-dive (8-10 minutes)
4. Behavioral questions (3-4 minutes)
5. Q&A for the candidate (2-3 minutes)
6. Next steps and closing (1-2 minutes)

## Voice Style
- Speak naturally with occasional "mm-hmm" and "I see" to show active listening
- Use transitional phrases like "That's interesting, tell me more about..."
- Pause appropriately to let the candidate think
- Be encouraging but not overly enthusiastic

Remember: You're conducting a phone screen, so keep responses concise and conversational.`;

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
