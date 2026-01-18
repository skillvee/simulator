import { auth } from "@/auth";
import { db } from "@/server/db";
import { generateEphemeralToken } from "@/lib/gemini";
import {
  parseCoworkerKnowledge,
  type CoworkerPersona,
} from "@/lib/coworker-persona";
import {
  buildCoworkerMemory,
  formatMemoryForPrompt,
  buildCrossCoworkerContext,
  type ChatMessage,
  type ConversationWithMeta,
} from "@/lib/conversation-memory";
import { buildVoicePrompt } from "@/prompts";
import { success, error } from "@/lib/api-response";
import { validateRequest } from "@/lib/api-validation";
import { CallTokenRequestSchema } from "@/lib/schemas";

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
      knowledge: parseCoworkerKnowledge(coworker.knowledge),
      avatarUrl: coworker.avatarUrl,
    };

    // Use centralized voice prompt with natural phone call guidelines
    const systemInstruction = buildVoicePrompt(
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
    });
  } catch (err) {
    console.error("Error generating call token:", err);
    return error("Failed to initialize call", 500);
  }
}
