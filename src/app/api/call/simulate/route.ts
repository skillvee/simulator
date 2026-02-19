/**
 * POST /api/call/simulate
 *
 * Text-based simulation of voice calls for QA testing.
 * Uses the same defense/voice prompts but via Gemini Flash text instead of Gemini Live audio.
 * This allows automated testing of defense call content quality without requiring
 * a microphone or real-time audio streaming.
 */

import { auth } from "@/auth";
import { db } from "@/server/db";
import { gemini } from "@/lib/ai/gemini";
import {
  buildCoworkerMemory,
  formatMemoryForPrompt,
  buildCrossCoworkerContext,
  formatConversationsForSummary,
} from "@/lib/ai/conversation-memory";
import { parseCoworkerKnowledge } from "@/lib/ai";
import type { CoworkerPersona, ChatMessage, ConversationWithMeta } from "@/types";
import { buildVoicePrompt, buildDefensePrompt, type DefenseContext } from "@/prompts";
import { success, error, validateRequest } from "@/lib/api";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const CHAT_MODEL = "gemini-3-flash-preview";

const SimulateCallSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID is required"),
  coworkerId: z.string().min(1, "Coworker ID is required"),
  message: z.string().min(1, "Message is required"),
});

function isManager(role: string): boolean {
  return role.toLowerCase().includes("manager");
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  const validated = await validateRequest(request, SimulateCallSchema);
  if ("error" in validated) return validated.error;
  const { assessmentId, coworkerId, message } = validated.data;

  // Verify assessment belongs to user
  const assessment = await db.assessment.findFirst({
    where: {
      id: assessmentId,
      userId: session.user.id,
    },
    include: {
      scenario: true,
    },
  });

  if (!assessment) {
    return error("Assessment not found", 404, "NOT_FOUND");
  }

  // Get coworker
  const coworker = await db.coworker.findFirst({
    where: {
      id: coworkerId,
      scenarioId: assessment.scenarioId,
    },
  });

  if (!coworker) {
    return error("Coworker not found", 404, "NOT_FOUND");
  }

  // Get all conversations for memory context
  const allConversations = await db.conversation.findMany({
    where: { assessmentId },
    include: {
      coworker: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const coworkerConversations: ConversationWithMeta[] = allConversations
    .filter((c) => c.coworkerId === coworkerId)
    .map((c) => ({
      type: c.type as "text" | "voice",
      coworkerId: c.coworkerId,
      messages: (c.transcript as unknown as ChatMessage[]) || [],
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

  const memory = await buildCoworkerMemory(coworkerConversations, coworker.name);
  const memoryContext = formatMemoryForPrompt(memory, coworker.name);

  const coworkerMap = new Map<string, string>();
  for (const c of allConversations) {
    if (c.coworker) {
      coworkerMap.set(c.coworker.id, c.coworker.name);
    }
  }
  const crossCoworkerContext = buildCrossCoworkerContext(
    allConversations.map((c) => ({
      type: c.type as "text" | "voice",
      coworkerId: c.coworkerId,
      messages: (c.transcript as unknown as ChatMessage[]) || [],
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    coworkerId,
    coworkerMap
  );

  // Build persona
  const persona: CoworkerPersona = {
    name: coworker.name,
    role: coworker.role,
    personaStyle: coworker.personaStyle,
    personality: coworker.personality as CoworkerPersona["personality"],
    knowledge: parseCoworkerKnowledge(coworker.knowledge),
    avatarUrl: coworker.avatarUrl,
  };

  // Build system prompt — defense if PR submitted + manager, otherwise regular voice
  const isDefenseCall = Boolean(assessment.prUrl) && isManager(coworker.role);
  let systemPrompt: string;

  if (isDefenseCall) {
    const allConvsMapped = allConversations.map((c) => ({
      type: c.type as "text" | "voice",
      coworkerId: c.coworkerId,
      messages: (c.transcript as unknown as ChatMessage[]) || [],
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    const conversationSummary = formatConversationsForSummary(
      allConvsMapped,
      coworkerMap
    );

    const defenseContext: DefenseContext = {
      managerName: coworker.name,
      managerRole: coworker.role,
      companyName: assessment.scenario.companyName,
      candidateName: session.user.name || undefined,
      taskDescription: assessment.scenario.taskDescription,
      techStack: assessment.scenario.techStack,
      repoUrl: assessment.scenario.repoUrl || "",
      prUrl: assessment.prUrl!,
      conversationSummary,
      screenAnalysisSummary: "",
      ciStatusSummary: "CI status not available in simulation mode.",
      codeReviewSummary: "",
    };

    systemPrompt = buildDefensePrompt(defenseContext);
  } else {
    systemPrompt = buildVoicePrompt(
      persona,
      {
        companyName: assessment.scenario.companyName,
        candidateName: session.user.name || undefined,
        taskDescription: assessment.scenario.taskDescription,
        techStack: assessment.scenario.techStack,
      },
      memoryContext,
      crossCoworkerContext
    );
  }

  // Get existing voice conversation for history
  const existingVoiceConversation = allConversations.find(
    (c) => c.coworkerId === coworkerId && c.type === "voice"
  );
  const existingMessages = existingVoiceConversation
    ? (existingVoiceConversation.transcript as unknown as ChatMessage[])
    : [];

  // Build Gemini history
  const history = existingMessages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  // Generate response via Gemini Flash (text, not audio)
  const response = await gemini.models.generateContent({
    model: CHAT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `[SYSTEM INSTRUCTIONS — Follow these throughout the conversation]\n\n${systemPrompt}\n\n[END SYSTEM INSTRUCTIONS]\n\nPlease acknowledge you understand and are ready to have this call in character.`,
          },
        ],
      },
      {
        role: "model",
        parts: [{ text: "I understand. I'm ready to have this call in character." }],
      },
      ...history,
      {
        role: "user",
        parts: [{ text: message }],
      },
    ],
  });

  const responseText = response.text || "Sorry, I didn't catch that. Could you say that again?";
  const timestamp = new Date().toISOString();

  // Save to voice conversation
  const userMessage: ChatMessage = {
    role: "user",
    text: message,
    timestamp,
  };
  const modelMessage: ChatMessage = {
    role: "model",
    text: responseText,
    timestamp: new Date().toISOString(),
  };

  const newTranscript = [...existingMessages, userMessage, modelMessage];

  if (existingVoiceConversation) {
    await db.conversation.update({
      where: { id: existingVoiceConversation.id },
      data: { transcript: newTranscript as unknown as Prisma.InputJsonValue },
    });
  } else {
    await db.conversation.create({
      data: {
        assessmentId,
        coworkerId,
        type: "voice",
        transcript: newTranscript as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return success({
    response: responseText,
    timestamp: modelMessage.timestamp,
    isDefenseCall,
  });
}
