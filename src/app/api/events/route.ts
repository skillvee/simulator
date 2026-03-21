import { success, error, validateRequest } from "@/lib/api";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { CandidateEventBatchSchema } from "@/lib/schemas";
import { createLogger } from "@/lib/core";
import type { Prisma } from "@prisma/client";

const logger = createLogger("server:api:events");

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  const validated = await validateRequest(request, CandidateEventBatchSchema);
  if ("error" in validated) return validated.error;

  const { assessmentId, events } = validated.data;

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

    const created = await db.candidateEvent.createMany({
      data: events.map((event) => ({
        assessmentId,
        eventType: event.eventType,
        timestamp: new Date(event.timestamp),
        metadata: (event.metadata as unknown as Prisma.InputJsonValue) ?? undefined,
      })),
    });

    return success({ count: created.count }, 201);
  } catch (err) {
    logger.error("Error logging candidate events", { err });
    return error("Failed to log candidate events", 500);
  }
}
