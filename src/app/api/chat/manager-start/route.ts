/**
 * POST /api/chat/manager-start
 *
 * Generates the manager's first message via LLM and persists it.
 * Replaces the old hardcoded greeting + Gemini blast approach.
 *
 * GET /api/chat/manager-start
 *
 * Check if a text conversation with the manager already exists.
 */

import { auth } from "@/auth";
import { db } from "@/server/db";
import { AssessmentStatus } from "@prisma/client";
import { gemini } from "@/lib/ai/gemini";
import {
  buildCoworkerMemory,
  formatMemoryForPrompt,
  buildCrossCoworkerContext,
} from "@/lib/ai/conversation-memory";
import { parseCoworkerKnowledge } from "@/lib/ai";
import { buildAgentPrompt } from "@/prompts/build-agent-prompt";
import { success, error, validateRequest } from "@/lib/api";
import { z } from "zod";
import type { ChatMessage, CoworkerPersona, ConversationWithMeta } from "@/types";
import type { Prisma } from "@prisma/client";
import { isManager } from "@/lib/utils/coworker";
import { createLogger } from "@/lib/core";

const logger = createLogger("api:chat:manager-start");

const GREETING_MODEL = "gemini-3-flash-preview";

const ManagerStartRequestSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID is required"),
});

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

  // Verify assessment belongs to user
  const assessment = await db.assessment.findFirst({
    where: {
      id: assessmentId,
      userId: session.user.id,
    },
    include: {
      scenario: {
        include: { coworkers: true },
      },
    },
  });

  if (!assessment) {
    return error("Assessment not found", 404, "NOT_FOUND");
  }

  // Only start messages for WELCOME or WORKING status
  if (
    assessment.status !== AssessmentStatus.WELCOME &&
    assessment.status !== AssessmentStatus.WORKING
  ) {
    return error("Cannot start manager messages for completed assessments", 400, "INVALID_STATUS");
  }

  // Find the manager coworker
  const managerCoworker = findManagerCoworker(assessment.scenario.coworkers);
  if (!managerCoworker) {
    return error("No coworkers configured for this scenario", 400, "NO_COWORKERS");
  }

  // Check if a text conversation with the manager already exists (idempotency)
  const existingConversation = await db.conversation.findFirst({
    where: {
      assessmentId,
      coworkerId: managerCoworker.id,
      type: "text",
    },
  });

  if (existingConversation) {
    const messages = (existingConversation.transcript as unknown as ChatMessage[]) || [];
    if (messages.length > 0) {
      return success({ alreadyStarted: true, managerId: managerCoworker.id, managerName: managerCoworker.name });
    }
  }

  // Build context for LLM greeting generation
  const allConversations = await db.conversation.findMany({
    where: { assessmentId },
    include: { coworker: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const coworkerConversations: ConversationWithMeta[] = allConversations
    .filter((c) => c.coworkerId === managerCoworker.id)
    .map((c) => ({
      type: c.type as "text" | "voice",
      coworkerId: c.coworkerId,
      messages: (c.transcript as unknown as ChatMessage[]) || [],
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

  const memory = await buildCoworkerMemory(coworkerConversations, managerCoworker.name, {});
  const memoryContext = formatMemoryForPrompt(memory, managerCoworker.name);

  const coworkerMap = new Map<string, string>();
  for (const c of allConversations) {
    if (c.coworker) coworkerMap.set(c.coworker.id, c.coworker.name);
  }
  const crossAgentContext = buildCrossCoworkerContext(
    allConversations.map((c) => ({
      type: c.type as "text" | "voice",
      coworkerId: c.coworkerId,
      messages: (c.transcript as unknown as ChatMessage[]) || [],
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    managerCoworker.id,
    coworkerMap
  );


  const persona: CoworkerPersona = {
    name: managerCoworker.name,
    role: managerCoworker.role,
    personaStyle: managerCoworker.personaStyle,
    personality: managerCoworker.personality as CoworkerPersona["personality"],
    knowledge: parseCoworkerKnowledge(managerCoworker.knowledge),
    avatarUrl: managerCoworker.avatarUrl,
  };

  // Use initial_greeting phase — this is the only place it's needed
  const phase = "initial_greeting" as const;

  const systemPrompt = buildAgentPrompt({
    companyName: assessment.scenario.companyName,
    techStack: assessment.scenario.techStack,
    agent: persona,
    taskDescription: assessment.scenario.taskDescription,
    candidateName: session.user.name || undefined,
    conversationHistory: memoryContext,
    crossAgentContext,
    phase,
    media: "chat",
  });

  // Generate greeting via LLM
  let greetingText: string;
  try {
    const response = await gemini.models.generateContent({
      model: GREETING_MODEL,
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "I understand my role. I'll send my first message now." }] },
        { role: "user", parts: [{ text: "Go ahead — send your first Slack message to the candidate." }] },
      ],
    });

    greetingText = response.text?.trim() || "";
    if (!greetingText) throw new Error("Empty response");
  } catch (err) {
    logger.warn("LLM greeting generation failed, using fallback", { error: err instanceof Error ? err.message : String(err) });
    const firstName = managerCoworker.name.split(" ")[0];
    greetingText = `Hey! Welcome to the team! I'm ${firstName} — how's it going, got everything set up ok?`;
  }

  const greetingMessage: ChatMessage = {
    role: "model",
    text: greetingText,
    timestamp: new Date().toISOString(),
  };

  // Persist the greeting
  if (existingConversation) {
    await db.conversation.update({
      where: { id: existingConversation.id },
      data: { transcript: [greetingMessage] as unknown as Prisma.InputJsonValue },
    });
  } else {
    await db.conversation.create({
      data: {
        assessmentId,
        coworkerId: managerCoworker.id,
        type: "text",
        transcript: [greetingMessage] as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // Transition WELCOME → WORKING
  if (assessment.status === AssessmentStatus.WELCOME) {
    await db.assessment.update({
      where: { id: assessmentId },
      data: { status: AssessmentStatus.WORKING },
    });
  }

  return success({
    alreadyStarted: false,
    greeting: greetingText,
    managerId: managerCoworker.id,
    managerName: managerCoworker.name,
  });
}

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

  const assessment = await db.assessment.findFirst({
    where: {
      id: assessmentId,
      userId: session.user.id,
    },
    include: {
      scenario: {
        include: { coworkers: true },
      },
    },
  });

  if (!assessment) {
    return error("Assessment not found", 404, "NOT_FOUND");
  }

  const managerCoworker = findManagerCoworker(assessment.scenario.coworkers);
  if (!managerCoworker) {
    return success({ hasConversation: false, managerId: null, managerName: null, status: assessment.status });
  }

  // Check for existing text conversation with the manager
  const existingConversation = await db.conversation.findFirst({
    where: {
      assessmentId,
      coworkerId: managerCoworker.id,
      type: "text",
    },
  });

  const messages = existingConversation
    ? (existingConversation.transcript as unknown as ChatMessage[]) || []
    : [];

  return success({
    hasConversation: messages.length > 0,
    managerId: managerCoworker.id,
    managerName: managerCoworker.name,
    status: assessment.status,
  });
}
