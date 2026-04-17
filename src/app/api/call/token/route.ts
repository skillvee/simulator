import { auth } from "@/auth";
import { db } from "@/server/db";
import { generateEphemeralToken } from "@/lib/ai/gemini";
import { GEMINI_VOICES } from "@/lib/ai/gemini-config";
import {
  buildCoworkerMemory,
  formatMemoryForPrompt,
  buildCrossCoworkerContext,
} from "@/lib/ai/conversation-memory";
import { parseCoworkerKnowledge } from "@/lib/ai";
import { inferDemographics } from "@/lib/avatar";
import type { CoworkerPersona, ChatMessage, ConversationWithMeta } from "@/types";
import { AssessmentStatus } from "@prisma/client";
import { success, error, validateRequest } from "@/lib/api";
import { CallTokenRequestSchema } from "@/lib/schemas";
import { isManager } from "@/lib/utils/coworker";
import { createLogger } from "@/lib/core";
import { buildAgentPrompt } from "@/prompts/build-agent-prompt";

const logger = createLogger("server:api:call:token");

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const validated = await validateRequest(request, CallTokenRequestSchema);
    if ("error" in validated) return validated.error;
    const { assessmentId, coworkerId, isPostSubmission } = validated.data;

    // Fetch assessment, coworker, and conversations in parallel
    const [assessment, allConversations] = await Promise.all([
      db.assessment.findFirst({
        where: {
          id: assessmentId,
          userId: session.user.id,
        },
        include: {
          scenario: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      db.conversation.findMany({
        where: { assessmentId },
        include: {
          coworker: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!assessment) {
      return error("Assessment not found", 404, "NOT_FOUND");
    }

    // Reject calls for completed assessments
    if (assessment.status === AssessmentStatus.COMPLETED) {
      return error("Assessment is completed", 400);
    }

    // Coworker query needs scenarioId from assessment, so it runs after
    const coworker = await db.coworker.findFirst({
      where: {
        id: coworkerId,
        scenarioId: assessment.scenarioId,
      },
    });

    if (!coworker) {
      return error("Coworker not found", 404, "NOT_FOUND");
    }

    // Build memory context (voice gets more recent messages)
    const coworkerConversations: ConversationWithMeta[] = allConversations
      .filter((c) => c.coworkerId === coworkerId)
      .map((c) => ({
        type: c.type as "text" | "voice",
        coworkerId: c.coworkerId,
        messages: (c.transcript as unknown as ChatMessage[]) || [],
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

    const memory = await buildCoworkerMemory(
      coworkerConversations,
      coworker.name,
      {}
    );
    const memoryContext = formatMemoryForPrompt(memory, coworker.name);

    // Build cross-coworker context
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
    const isManagerCoworker = isManager(coworker.role);
    const persona: CoworkerPersona = {
      name: coworker.name,
      role: coworker.role,
      personaStyle: coworker.personaStyle,
      personality: coworker.personality as CoworkerPersona["personality"],
      knowledge: parseCoworkerKnowledge(coworker.knowledge),
      avatarUrl: coworker.avatarUrl,
    };

    // Defense calls removed — PR submission flow no longer used

    // Extract resource labels for manager awareness
    const resourceLabels = Array.isArray(assessment.scenario.resources)
      ? (assessment.scenario.resources as unknown as Array<{ label: string }>).map((r) => r.label)
      : undefined;

    // Build unified system prompt
    const systemInstruction = buildAgentPrompt({
      companyName: assessment.scenario.companyName,
      techStack: assessment.scenario.techStack,
      agent: persona,
      taskDescription: isManagerCoworker ? assessment.scenario.taskDescription : undefined,
      candidateName: session.user.name || undefined,
      conversationHistory: memoryContext,
      crossAgentContext: crossCoworkerContext,
      phase: "ongoing",
      media: "voice",
      resourceLabels: isManagerCoworker ? resourceLabels : undefined,
    });

    // Generate ephemeral token
    let voiceName = coworker.voiceName || undefined;
    if (!voiceName) {
      const { gender } = inferDemographics(coworker.name);
      const voices = gender === "male" ? GEMINI_VOICES.male : GEMINI_VOICES.female;
      const hash = coworker.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      voiceName = voices[hash % voices.length].name;
    }
    const token = await generateEphemeralToken({
      systemInstruction,
      voiceName,
    });

    return success({
      token,
      assessmentId: assessment.id,
      coworkerId: coworker.id,
      coworkerName: coworker.name,
      coworkerRole: coworker.role,
      isDefenseCall: false,
    });
  } catch (err) {
    logger.error("Error generating call token", { err });
    return error("Failed to initialize call", 500);
  }
}
