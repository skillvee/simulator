import { auth } from "@/auth";
import { db } from "@/server/db";
import type { ChatMessage } from "@/types";
import type { Prisma } from "@prisma/client";
import { success, error, validateRequest } from "@/lib/api";
import { z } from "zod";

// Schema for proactive message request
const ProactiveMessageSchema = z.object({
  assessmentId: z.string(),
  coworkerId: z.string(),
  message: z.string(),
});

/**
 * POST /api/chat/proactive
 * Save a proactive message from a coworker to the conversation history
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  const validated = await validateRequest(request, ProactiveMessageSchema);
  if ("error" in validated) return validated.error;
  const { assessmentId, coworkerId, message } = validated.data;

  // Verify assessment belongs to user
  const assessment = await db.assessment.findFirst({
    where: {
      id: assessmentId,
      userId: session.user.id,
    },
  });

  if (!assessment) {
    return error("Assessment not found", 404, "NOT_FOUND");
  }

  // Verify coworker exists in this assessment's scenario
  const coworker = await db.coworker.findFirst({
    where: {
      id: coworkerId,
      scenarioId: assessment.scenarioId,
    },
  });

  if (!coworker) {
    return error("Coworker not found", 404, "NOT_FOUND");
  }

  // Get existing text conversation with this coworker
  const existingConversation = await db.conversation.findFirst({
    where: {
      assessmentId,
      coworkerId,
      type: "text",
    },
  });

  const existingMessages = existingConversation
    ? (existingConversation.transcript as unknown as ChatMessage[])
    : [];

  const timestamp = new Date().toISOString();

  // Create the proactive message (as a model-role message)
  const modelMessage: ChatMessage = {
    role: "model",
    text: message,
    timestamp,
  };

  const newTranscript = [...existingMessages, modelMessage];

  // Save to database
  if (existingConversation) {
    await db.conversation.update({
      where: { id: existingConversation.id },
      data: { transcript: newTranscript as unknown as Prisma.InputJsonValue },
    });
  } else {
    await db.conversation.create({
      data: {
        assessmentId,
        coworkerId,
        type: "text",
        transcript: newTranscript as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return success({
    success: true,
    timestamp,
  });
}
