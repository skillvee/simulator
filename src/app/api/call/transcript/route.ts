import { success, error } from "@/lib/api";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createLogger } from "@/lib/core";

const logger = createLogger("server:api:call:transcript");

const transcriptSchema = z.object({
  assessmentId: z.string(),
  coworkerId: z.string(),
  transcript: z.array(
    z.object({
      role: z.enum(["user", "model"]),
      text: z.string(),
      timestamp: z.string(),
    })
  ),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const body = await request.json();
    const parsed = transcriptSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid request body", 400);
    }

    const { assessmentId, coworkerId, transcript } = parsed.data;

    // Verify the assessment belongs to the user
    const assessment = await db.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: session.user.id,
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404);
    }

    // Verify coworker exists for this assessment's scenario
    const coworker = await db.coworker.findFirst({
      where: {
        id: coworkerId,
        scenarioId: assessment.scenarioId,
      },
    });

    if (!coworker) {
      return error("Coworker not found", 404);
    }

    // Check if there's already a voice conversation for this coworker
    const existingConversation = await db.conversation.findFirst({
      where: {
        assessmentId,
        coworkerId,
        type: "voice",
      },
    });

    // Cast transcript to Prisma-compatible JSON type
    const transcriptJson = transcript as unknown as Prisma.InputJsonValue;

    if (existingConversation) {
      // Append to existing conversation
      const existingTranscript =
        (existingConversation.transcript as unknown as Array<{
          role: string;
          text: string;
          timestamp: string;
        }>) || [];
      const mergedTranscript = [
        ...existingTranscript,
        ...transcript,
      ] as unknown as Prisma.InputJsonValue;

      await db.conversation.update({
        where: { id: existingConversation.id },
        data: {
          transcript: mergedTranscript,
        },
      });
    } else {
      // Create a new conversation record
      await db.conversation.create({
        data: {
          assessmentId,
          coworkerId,
          type: "voice",
          transcript: transcriptJson,
        },
      });
    }

    return success({});
  } catch (err) {
    logger.error("Error saving transcript", { err });
    return error("Failed to save transcript", 500);
  }
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const assessmentId = searchParams.get("assessmentId");
  const coworkerId = searchParams.get("coworkerId");

  if (!assessmentId || !coworkerId) {
    return error("Assessment ID and Coworker ID are required", 400);
  }

  try {
    // Verify the assessment belongs to the user
    const assessment = await db.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: session.user.id,
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404);
    }

    // Get the voice conversation
    const conversation = await db.conversation.findFirst({
      where: {
        assessmentId,
        coworkerId,
        type: "voice",
      },
    });

    return success({
      transcript: conversation?.transcript || [],
    });
  } catch (err) {
    logger.error("Error fetching transcript", { err });
    return error("Failed to fetch transcript", 500);
  }
}
