import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { generateEphemeralToken } from "@/lib/gemini";
import {
  buildCoworkerSystemPrompt,
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

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { assessmentId, coworkerId } = body;

    if (!assessmentId || !coworkerId) {
      return NextResponse.json(
        { error: "Assessment ID and Coworker ID are required" },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    // Get coworker persona
    const coworker = await db.coworker.findFirst({
      where: {
        id: coworkerId,
        scenarioId: assessment.scenarioId,
      },
    });

    if (!coworker) {
      return NextResponse.json({ error: "Coworker not found" }, { status: 404 });
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
    const memory = await buildCoworkerMemory(coworkerConversations, coworker.name);
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

    const baseSystemPrompt = buildCoworkerSystemPrompt(persona, {
      companyName: assessment.scenario.companyName,
      candidateName: session.user.name || undefined,
      taskDescription: assessment.scenario.taskDescription,
      techStack: assessment.scenario.techStack,
    });

    // Combine base prompt with memory context and voice-specific instructions
    const systemInstruction = `${baseSystemPrompt}${memoryContext}${crossCoworkerContext}

## Voice Conversation Guidelines
- You're now on a voice call with the candidate
- Keep responses conversational and natural for voice
- Use occasional filler words like "um", "you know", "let me think"
- Pause naturally between thoughts
- Keep responses concise - voice conversations work better with shorter exchanges
- If the candidate asks you to repeat something, do so patiently

Start the call by greeting them naturally.`;

    // Generate ephemeral token for client-side connection
    const token = await generateEphemeralToken({
      systemInstruction,
    });

    return NextResponse.json({
      token,
      assessmentId: assessment.id,
      coworkerId: coworker.id,
      coworkerName: coworker.name,
      coworkerRole: coworker.role,
    });
  } catch (error) {
    console.error("Error generating call token:", error);
    return NextResponse.json(
      { error: "Failed to initialize call" },
      { status: 500 }
    );
  }
}
