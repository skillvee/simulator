import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { gemini } from "@/lib/gemini";
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
import type { Prisma } from "@prisma/client";

// Gemini Flash model for text chat
const CHAT_MODEL = "gemini-2.0-flash";

/**
 * POST /api/chat
 * Send a message to a coworker and get a response from Gemini Flash
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { assessmentId, coworkerId, message } = body;

  if (!assessmentId || !coworkerId || !message) {
    return NextResponse.json(
      { error: "Missing required fields: assessmentId, coworkerId, message" },
      { status: 400 }
    );
  }

  // Verify assessment belongs to user and get scenario context
  const assessment = await db.assessment.findFirst({
    where: {
      id: assessmentId,
      userId: session.user.id,
    },
    include: {
      scenario: true,
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

  // Get existing text conversation with this specific coworker
  const existingConversation = allConversations.find(
    (c) => c.coworkerId === coworkerId && c.type === "text"
  );

  const existingMessages = existingConversation
    ? (existingConversation.transcript as unknown as ChatMessage[])
    : [];

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

  // Build memory context for this coworker
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

  // Combine base prompt with memory context
  const systemPrompt = `${baseSystemPrompt}${memoryContext}${crossCoworkerContext}`;

  // Build history for Gemini - include system prompt as first message
  const history = existingMessages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  // Generate response from Gemini Flash
  // Include system prompt as the first user message to set persona
  const response = await gemini.models.generateContent({
    model: CHAT_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: `[SYSTEM INSTRUCTIONS - Follow these throughout the conversation]\n\n${systemPrompt}\n\n[END SYSTEM INSTRUCTIONS]\n\nPlease acknowledge you understand and are ready to chat in character.` }],
      },
      {
        role: "model",
        parts: [{ text: "I understand. I'm ready to chat as this coworker." }],
      },
      ...history,
      {
        role: "user",
        parts: [{ text: message }],
      },
    ],
  });

  const responseText = response.text || "I'm sorry, I couldn't generate a response.";
  const timestamp = new Date().toISOString();

  // Create new messages
  const userMessage: ChatMessage = {
    role: "user",
    text: message,
    timestamp,
  };
  const modelMessage: ChatMessage = {
    role: "model",
    text: responseText,
    timestamp: new Date().toISOString(),
  };

  const newTranscript = [...existingMessages, userMessage, modelMessage];

  // Save to database
  if (existingConversation) {
    await db.conversation.update({
      where: { id: existingConversation.id },
      data: { transcript: newTranscript as unknown as Prisma.InputJsonValue },
    });
  } else {
    await db.conversation.create({
      data: {
        assessmentId,
        coworkerId,
        type: "text",
        transcript: newTranscript as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return NextResponse.json({
    response: responseText,
    timestamp: modelMessage.timestamp,
  });
}

/**
 * GET /api/chat
 * Retrieve chat history with a coworker
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const assessmentId = searchParams.get("assessmentId");
  const coworkerId = searchParams.get("coworkerId");

  if (!assessmentId || !coworkerId) {
    return NextResponse.json(
      { error: "Missing required parameters: assessmentId, coworkerId" },
      { status: 400 }
    );
  }

  // Verify assessment belongs to user
  const assessment = await db.assessment.findFirst({
    where: {
      id: assessmentId,
      userId: session.user.id,
    },
  });

  if (!assessment) {
    return NextResponse.json(
      { error: "Assessment not found" },
      { status: 404 }
    );
  }

  // Get conversation
  const conversation = await db.conversation.findFirst({
    where: {
      assessmentId,
      coworkerId,
      type: "text",
    },
  });

  const messages = conversation
    ? (conversation.transcript as unknown as ChatMessage[])
    : [];

  return NextResponse.json({ messages });
}
