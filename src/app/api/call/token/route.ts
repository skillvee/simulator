import { auth } from "@/auth";
import { db } from "@/server/db";
import { generateEphemeralToken } from "@/lib/ai/gemini";
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
import { CallTokenRequestSchema } from "@/lib/schemas";

// Check if a coworker is a manager based on role
function isManager(role: string): boolean {
  return role.toLowerCase().includes("manager");
}

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
    const memory = await buildCoworkerMemory(
      coworkerConversations,
      coworker.name
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

    // Determine if this is a defense call
    // Defense mode is triggered when:
    // 1. A PR has been submitted (assessment.prUrl is set)
    // 2. The coworker being called is the manager
    const isDefenseCall = Boolean(assessment.prUrl) && isManager(coworker.role);

    let systemInstruction: string;

    if (isDefenseCall) {
      // Build defense prompt for PR review call
      // Format all conversations for summary context
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
        // Screen analysis and code review may not be available yet
        screenAnalysisSummary: "",
        ciStatusSummary: "CI status will be checked after the call.",
        codeReviewSummary: "",
      };

      systemInstruction = buildDefensePrompt(defenseContext);
    } else {
      // Use regular coworker voice prompt
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
    // Use coworker's configured voice, or fall back to default
    const token = await generateEphemeralToken({
      systemInstruction,
      voiceName: coworker.voiceName || undefined,
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
    console.error("Error generating call token:", err);
    return error("Failed to initialize call", 500);
  }
}
