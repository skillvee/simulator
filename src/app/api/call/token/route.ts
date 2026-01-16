import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { generateEphemeralToken } from "@/lib/gemini";
import {
  buildCoworkerSystemPrompt,
  parseCoworkerKnowledge,
  type CoworkerPersona,
} from "@/lib/coworker-persona";
import type { Prisma } from "@prisma/client";

// Chat message type (same as text chat)
interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: string;
}

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

    // Get prior conversation history (both text and voice) for context
    const priorConversations = await db.conversation.findMany({
      where: {
        assessmentId,
        coworkerId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Build conversation history summary
    let conversationHistorySummary = "";
    if (priorConversations.length > 0) {
      const allMessages: ChatMessage[] = [];
      for (const conv of priorConversations) {
        const transcript = conv.transcript as unknown as ChatMessage[];
        if (Array.isArray(transcript)) {
          allMessages.push(...transcript);
        }
      }

      if (allMessages.length > 0) {
        // Include recent messages for context (last 20 messages)
        const recentMessages = allMessages.slice(-20);
        conversationHistorySummary = `

## Prior Conversation History
You have had previous conversations with this candidate. Here's a summary of recent messages:

${recentMessages.map((m) => `${m.role === "user" ? "Candidate" : "You"}: ${m.text}`).join("\n")}

Continue the conversation naturally, referencing prior discussions when relevant.`;
      }
    }

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

    // Add voice-specific instructions
    const systemInstruction = `${baseSystemPrompt}
${conversationHistorySummary}

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
