import { success, error } from "@/lib/api";
import { validateRequest } from "@/lib/api";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { VoiceSessionLogSchema } from "@/lib/schemas";
import { createLogger } from "@/lib/core";
import type { Prisma } from "@prisma/client";

const logger = createLogger("server:api:call:log");

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  const validated = await validateRequest(request, VoiceSessionLogSchema);
  if ("error" in validated) return validated.error;

  const {
    assessmentId,
    coworkerId,
    startTime,
    endTime,
    transcript,
    connectionEvents,
    tokenName,
    errorMessage: voiceError,
    durationMs,
  } = validated.data;

  try {
    // Verify the assessment exists and belongs to the user
    const assessment = await db.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: session.user.id,
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404, "NOT_FOUND");
    }

    const voiceSession = await db.voiceSession.create({
      data: {
        assessmentId,
        coworkerId,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        transcript: transcript as unknown as Prisma.InputJsonValue,
        connectionEvents:
          connectionEvents as unknown as Prisma.InputJsonValue,
        tokenName: tokenName ?? null,
        errorMessage: voiceError ?? null,
        durationMs: durationMs ?? null,
      },
    });

    return success({ voiceSession: { id: voiceSession.id } }, 201);
  } catch (err) {
    logger.error("Error logging voice session", { err });
    return error("Failed to log voice session", 500);
  }
}
