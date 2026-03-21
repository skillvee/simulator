import { auth } from "@/auth";
import { db } from "@/server/db";
import { generateEphemeralToken } from "@/lib/ai/gemini";
import { GEMINI_VOICES } from "@/lib/ai/gemini-config";
import {
  buildCoworkerMemory,
  formatMemoryForPrompt,
  buildCrossCoworkerContext,
  formatConversationsForSummary,
} from "@/lib/ai/conversation-memory";
import { parseCoworkerKnowledge } from "@/lib/ai";
import { inferDemographics } from "@/lib/avatar";
import type { CoworkerPersona, ChatMessage, ConversationWithMeta } from "@/types";
import { buildVoicePrompt, buildDefensePrompt, type DefenseContext, buildKickoffVoicePrompt } from "@/prompts";
import { success, error, validateRequest } from "@/lib/api";
import { CallTokenRequestSchema } from "@/lib/schemas";
import { isManager } from "@/lib/utils/coworker";
import { createLogger } from "@/lib/core";

const logger = createLogger("server:api:call:token");

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const validated = await validateRequest(request, CallTokenRequestSchema);
    if ("error" in validated) return validated.error;
    const { assessmentId, coworkerId } = validated.data;

    // Fetch the assessment and verify ownership
    const assessment = await db.assessment.findFirst({
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
    });

    if (!assessment) {
      return error("Assessment not found", 404, "NOT_FOUND");
    }

    // Get coworker persona
    const coworker = await db.coworker.findFirst({
      where: {
        id: coworkerId,
        scenarioId: assessment.scenarioId,
      },
    });

    if (!coworker) {
      return error("Coworker not found", 404, "NOT_FOUND");
    }

    // Get ALL conversations for this assessment (for cross-coworker context)
    const allConversations = await db.conversation.findMany({
      where: {
        assessmentId,
      },
      include: {
        coworker: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Get all conversations with this coworker (text + voice) for memory
    const coworkerConversations: ConversationWithMeta[] = allConversations
      .filter((c) => c.coworkerId === coworkerId)
      .map((c) => ({
        type: c.type as "text" | "voice",
        coworkerId: c.coworkerId,
        messages: (c.transcript as unknown as ChatMessage[]) || [],
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

    // Build memory context for this coworker (with summarization)
    // Voice calls get more recent messages since Gemini Live can only
    // receive context via systemInstruction (no history param).
    const memory = await buildCoworkerMemory(
      coworkerConversations,
      coworker.name,
      { maxRecentMessages: 20 }
    );
    const memoryContext = formatMemoryForPrompt(memory, coworker.name);

    // Build cross-coworker context (awareness of other conversations)
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

    // Build coworker persona for system prompt
    const persona: CoworkerPersona = {
      name: coworker.name,
      role: coworker.role,
      personaStyle: coworker.personaStyle,
      personality: coworker.personality as CoworkerPersona["personality"],
      knowledge: parseCoworkerKnowledge(coworker.knowledge),
      avatarUrl: coworker.avatarUrl,
    };

    // Determine call type: defense, kickoff, or regular
    const isManagerCoworker = isManager(coworker.role);
    const isDefenseCall = Boolean(assessment.prUrl) && isManagerCoworker;
    const isKickoffCall = !assessment.prUrl && !assessment.managerMessagesStarted && isManagerCoworker;

    let systemInstruction: string;

    if (isDefenseCall) {
      // Build defense prompt for PR review call
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
        repoUrl: assessment.repoUrl || "",
        prUrl: assessment.prUrl!,
        conversationSummary,
        // Screen analysis and code review may not be available yet
        screenAnalysisSummary: "",
        ciStatusSummary: "CI status will be checked after the call.",
        codeReviewSummary: "",
      };

      systemInstruction = buildDefensePrompt(defenseContext);
    } else if (isKickoffCall) {
      // First call with the manager — explain the task from scratch
      // Fetch all coworkers to provide teammate context (prevents hallucinated names)
      const allCoworkers = await db.coworker.findMany({
        where: { scenarioId: assessment.scenarioId },
        select: { id: true, name: true, role: true },
      });
      const teammates = allCoworkers
        .filter((c) => c.id !== coworkerId)
        .map((c) => ({ name: c.name, role: c.role }));

      systemInstruction = buildKickoffVoicePrompt({
        managerName: coworker.name,
        managerRole: coworker.role,
        companyName: assessment.scenario.companyName,
        candidateName: session.user.name || undefined,
        taskDescription: assessment.scenario.taskDescription,
        techStack: assessment.scenario.techStack,
        repoUrl: assessment.repoUrl || "",
        personaStyle: coworker.personaStyle,
        personality: coworker.personality as import("@/types").CoworkerPersonality | null,
        teammates,
      });
    } else {
      // Regular coworker voice prompt (mid-work calls, non-manager calls)
      systemInstruction = buildVoicePrompt(
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

    // Generate ephemeral token for client-side connection
    // Use coworker's configured voice, or infer from name gender
    let voiceName = coworker.voiceName || undefined;
    if (!voiceName) {
      const { gender } = inferDemographics(coworker.name);
      const voices = gender === "male" ? GEMINI_VOICES.male : GEMINI_VOICES.female;
      // Pick a deterministic voice based on name hash
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
      isDefenseCall,
    });
  } catch (err) {
    logger.error("Error generating call token", { err });
    return error("Failed to initialize call", 500);
  }
}
