/**
 * Multi-Turn Conversation Simulator
 *
 * Simulates a voice call by alternating between a candidate LLM
 * and the coworker agent. Produces a full transcript for judging.
 */

import { GoogleGenAI } from "@google/genai";
import type { MultiTurnConfig, ConversationTurn, ConversationTranscript } from "./types";

const MODEL = "gemini-3-flash-preview";

/**
 * Run a simulated multi-turn conversation.
 *
 * For voice calls: coworker speaks first (responds to [call connected]).
 * For chat: candidate speaks first.
 */
export async function runMultiTurnConversation(
  coworkerPrompt: string,
  config: MultiTurnConfig,
  apiKey: string
): Promise<ConversationTranscript> {
  const gemini = new GoogleGenAI({ apiKey });
  const turns: ConversationTurn[] = [];
  const startMs = Date.now();

  // Build candidate simulator prompt
  const candidateSystemPrompt = `You are simulating a candidate in a workplace conversation for testing purposes.

${config.candidatePersona}

Context: ${config.scenarioContext}

Rules:
- Stay in character as described above
- Keep responses natural and brief (1-3 sentences for chat, short spoken turns for calls)
- React to what the coworker actually says — don't follow a script
- If the coworker asks you a question, answer it in character
- You can ask follow-up questions naturally
- Do NOT break character or mention that this is a simulation

Respond with ONLY your next message. No quotes, no "Candidate:" prefix.`;

  // Coworker speaks first in voice calls
  if (config.coworkerSpeaksFirst) {
    const coworkerResponse = await generateCoworkerTurn(
      gemini, coworkerPrompt, turns, "[call connected]"
    );
    turns.push({ role: "coworker", text: coworkerResponse });
  } else if (config.candidateFirstMessage) {
    turns.push({ role: "candidate", text: config.candidateFirstMessage });
  }

  // Alternate turns until maxTurns
  for (let i = turns.length; i < config.maxTurns; i++) {
    const nextRole = getNextRole(turns);

    if (nextRole === "candidate") {
      const candidateMessage = await generateCandidateTurn(
        gemini, candidateSystemPrompt, turns
      );
      turns.push({ role: "candidate", text: candidateMessage });
    } else {
      const lastCandidateMessage = turns.filter(t => t.role === "candidate").pop()?.text || "";
      const coworkerResponse = await generateCoworkerTurn(
        gemini, coworkerPrompt, turns, lastCandidateMessage
      );
      turns.push({ role: "coworker", text: coworkerResponse });
    }
  }

  return {
    turns,
    durationMs: Date.now() - startMs,
  };
}

function getNextRole(turns: ConversationTurn[]): "candidate" | "coworker" {
  if (turns.length === 0) return "candidate";
  return turns[turns.length - 1].role === "coworker" ? "candidate" : "coworker";
}

async function generateCoworkerTurn(
  gemini: GoogleGenAI,
  systemPrompt: string,
  previousTurns: ConversationTurn[],
  currentUserMessage: string
): Promise<string> {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
    { role: "user", parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "I understand my role. I'm ready." }] },
  ];

  // Add conversation history
  for (const turn of previousTurns) {
    contents.push({
      role: turn.role === "candidate" ? "user" : "model",
      parts: [{ text: turn.text }],
    });
  }

  // Add current message if not already in turns
  if (!previousTurns.length || previousTurns[previousTurns.length - 1].role !== "candidate") {
    contents.push({ role: "user", parts: [{ text: currentUserMessage }] });
  }

  const result = await gemini.models.generateContent({ model: MODEL, contents });
  return result.text?.trim() || "(no response)";
}

async function generateCandidateTurn(
  gemini: GoogleGenAI,
  candidatePrompt: string,
  previousTurns: ConversationTurn[]
): Promise<string> {
  const conversationSoFar = previousTurns
    .map(t => `${t.role === "candidate" ? "You" : "Coworker"}: ${t.text}`)
    .join("\n");

  const prompt = `${candidatePrompt}

Conversation so far:
${conversationSoFar || "(conversation just started)"}

Your next message:`;

  const result = await gemini.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  return result.text?.trim() || "(no response)";
}
