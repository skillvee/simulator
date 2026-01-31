/**
 * POST /api/chat/manager-start
 *
 * RF-015: Triggers manager auto-start messages for an assessment.
 * Called after a 5-10 second delay when a candidate first lands on the chat page.
 *
 * Returns the messages that should be displayed, allowing the client to
 * stagger their display with typing indicators for a realistic feel.
 */

import { auth } from "@/auth";
import { db } from "@/server/db";
import { AssessmentStatus } from "@prisma/client";
import { generateManagerGreetings } from "@/lib/chat/greeting-generator";
import { success, error, validateRequest } from "@/lib/api";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const ManagerStartRequestSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID is required"),
});

/**
 * Check if a coworker is a manager based on role
 */
function isManager(role: string): boolean {
  return role.toLowerCase().includes("manager");
}

/**
 * Find the manager coworker from a list of coworkers.
 * Returns the first coworker with "manager" in their role, or the first coworker as fallback.
 */
function findManagerCoworker<T extends { id: string; role: string }>(
  coworkers: T[]
): T | undefined {
  const manager = coworkers.find((c) => isManager(c.role));
  return manager || coworkers[0];
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  const validated = await validateRequest(request, ManagerStartRequestSchema);
  if ("error" in validated) return validated.error;
  const { assessmentId } = validated.data;

  // Verify assessment belongs to user and get scenario context
  const assessment = await db.assessment.findFirst({
    where: {
      id: assessmentId,
      userId: session.user.id,
    },
    include: {
      scenario: {
        include: {
          coworkers: true,
        },
      },
    },
  });

  if (!assessment) {
    return error("Assessment not found", 404, "NOT_FOUND");
  }

  // Check if manager messages have already been started
  if (assessment.managerMessagesStarted) {
    return success({
      alreadyStarted: true,
      messages: [],
    });
  }

  // Only start messages for WELCOME or WORKING status
  if (
    assessment.status !== AssessmentStatus.WELCOME &&
    assessment.status !== AssessmentStatus.WORKING
  ) {
    return error(
      "Cannot start manager messages for completed assessments",
      400,
      "INVALID_STATUS"
    );
  }

  // Find the manager coworker
  const managerCoworker = findManagerCoworker(assessment.scenario.coworkers);
  if (!managerCoworker) {
    return error("No coworkers configured for this scenario", 400, "NO_COWORKERS");
  }

  // Generate greeting messages
  const greetingMessages = generateManagerGreetings({
    userName: session.user.name || "there",
    managerName: managerCoworker.name,
    managerRole: managerCoworker.role,
    companyName: assessment.scenario.companyName,
    repoUrl: assessment.scenario.repoUrl,
    taskDescription: assessment.scenario.taskDescription,
  });

  // Check if conversation already exists with this manager
  const existingConversation = await db.conversation.findFirst({
    where: {
      assessmentId,
      coworkerId: managerCoworker.id,
      type: "text",
    },
  });

  // Save greeting messages to database
  if (existingConversation) {
    // Append to existing conversation
    const existingMessages = (existingConversation.transcript as unknown as { role: string; text: string; timestamp: string }[]) || [];
    await db.conversation.update({
      where: { id: existingConversation.id },
      data: {
        transcript: [...existingMessages, ...greetingMessages] as unknown as Prisma.InputJsonValue,
      },
    });
  } else {
    // Create new conversation
    await db.conversation.create({
      data: {
        assessmentId,
        coworkerId: managerCoworker.id,
        type: "text",
        transcript: greetingMessages as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // Mark manager messages as started and update status to WORKING if needed
  await db.assessment.update({
    where: { id: assessmentId },
    data: {
      managerMessagesStarted: true,
      ...(assessment.status === AssessmentStatus.WELCOME && {
        status: AssessmentStatus.WORKING,
      }),
    },
  });

  return success({
    alreadyStarted: false,
    messages: greetingMessages,
    managerId: managerCoworker.id,
    managerName: managerCoworker.name,
  });
}

/**
 * GET /api/chat/manager-start
 *
 * Check if manager messages have been started for an assessment.
 * Used by the client to determine if it should trigger the messages.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const assessmentId = searchParams.get("assessmentId");

  if (!assessmentId) {
    return error("Missing required parameter: assessmentId", 400);
  }

  // Verify assessment belongs to user
  const assessment = await db.assessment.findFirst({
    where: {
      id: assessmentId,
      userId: session.user.id,
    },
    include: {
      scenario: {
        include: {
          coworkers: true,
        },
      },
    },
  });

  if (!assessment) {
    return error("Assessment not found", 404, "NOT_FOUND");
  }

  // Find manager coworker
  const managerCoworker = findManagerCoworker(assessment.scenario.coworkers);

  return success({
    managerMessagesStarted: assessment.managerMessagesStarted,
    managerId: managerCoworker?.id || null,
    managerName: managerCoworker?.name || null,
    status: assessment.status,
  });
}
