import { auth } from "@/auth";
import { db } from "@/server/db";
import { gemini } from "@/lib/ai/gemini";
import {
  buildCoworkerMemory,
  formatMemoryForPrompt,
  buildCrossCoworkerContext,
} from "@/lib/ai/conversation-memory";
import { parseCoworkerKnowledge } from "@/lib/ai";
import type { CoworkerPersona, ChatMessage, ConversationWithMeta } from "@/types";
import type { Prisma } from "@prisma/client";
import { AssessmentStatus } from "@prisma/client";
import {
  buildChatPrompt,
  buildCallNudgeInstruction,
  buildPRAcknowledgmentContext,
  INVALID_PR_PROMPT,
  DUPLICATE_PR_PROMPT,
} from "@/prompts";
import { success, error, validateRequest } from "@/lib/api";
import { ChatRequestSchema } from "@/lib/schemas";
import { isValidPrUrl } from "@/lib/external";
import { sanitizeForStorage } from "@/lib/sanitization";

// Gemini Flash model for text chat
const CHAT_MODEL = "gemini-3-flash-preview";

// Check if a coworker is a manager based on role
function isManager(role: string): boolean {
  return role.toLowerCase().includes("manager");
}

// Extract potential PR URL from a message
function extractPrUrl(message: string): string | null {
  // Pattern to match URLs in the message
  const urlPattern = /https?:\/\/[^\s<>"]+/g;
  const urls = message.match(urlPattern);

  if (!urls) return null;

  // Check each URL for PR pattern
  for (const url of urls) {
    if (isValidPrUrl(url)) {
      return url;
    }
  }

  return null;
}

/**
 * Build the Gemini contents array for a chat message.
 * Extracts the shared pattern of system instructions + history + user message.
 */
function buildGeminiContents(
  systemPrompt: string,
  history: Array<{ role: string; parts: Array<{ text: string }> }>,
  message: string,
  extraTurns?: Array<{ role: string; parts: Array<{ text: string }> }>
) {
  return [
    {
      role: "user",
      parts: [
        {
          text: `[SYSTEM INSTRUCTIONS - Follow these throughout the conversation]\n\n${systemPrompt}\n\n[END SYSTEM INSTRUCTIONS]\n\nPlease acknowledge you understand and are ready to chat in character.`,
        },
      ],
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
    ...(extraTurns || []),
  ];
}

/**
 * POST /api/chat
 * Send a message to a coworker and get a streamed response from Gemini Flash.
 * Returns an SSE stream so the client can show text as it arrives.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  const validated = await validateRequest(request, ChatRequestSchema);
  if ("error" in validated) return validated.error;
  const { assessmentId, coworkerId } = validated.data;
  // Sanitize message to prevent XSS attacks
  const message = sanitizeForStorage(validated.data.message);

  // --- Parallel DB queries (assessment + conversations run concurrently) ---
  const [assessment, allConversations] = await Promise.all([
    db.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: session.user.id,
      },
      include: {
        scenario: true,
      },
    }),
    db.conversation.findMany({
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
    }),
  ]);

  if (!assessment) {
    return error("Assessment not found", 404, "NOT_FOUND");
  }

  // Coworker query needs scenarioId from assessment — runs after first batch
  const coworker = await db.coworker.findFirst({
    where: {
      id: coworkerId,
      scenarioId: assessment.scenarioId,
    },
  });

  if (!coworker) {
    return error("Coworker not found", 404, "NOT_FOUND");
  }

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

  // Build memory context — skipSummary avoids a second Gemini call
  const memory = await buildCoworkerMemory(
    coworkerConversations,
    coworker.name,
    { skipSummary: true }
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

  // Use centralized chat prompt with Slack-like conversation guidelines
  let systemPrompt = buildChatPrompt(
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

  // Nudge non-manager coworkers to suggest a call after 3 user messages
  const userMessageCount = existingMessages.filter(m => m.role === "user").length;
  if (!isManager(coworker.role) && userMessageCount === 2) {
    systemPrompt += buildCallNudgeInstruction();
  }

  // Build history for Gemini - include system prompt as first message
  const history = existingMessages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  // Check if this is a manager and the message contains a PR link
  const isCoworkerManager = isManager(coworker.role);
  const extractedPrUrl = extractPrUrl(message);
  let prSubmitted = false;

  // Check if a PR URL has already been saved for this assessment
  const prAlreadySaved = !!assessment.prUrl;

  // Determine extra turns and PR state based on context
  let extraTurns: Array<{ role: string; parts: Array<{ text: string }> }> | undefined;

  if (isCoworkerManager && extractedPrUrl) {
    if (assessment.status === AssessmentStatus.WORKING) {
      if (prAlreadySaved) {
        extraTurns = [
          { role: "model", parts: [{ text: "Let me respond to this PR link they shared." }] },
          { role: "user", parts: [{ text: DUPLICATE_PR_PROMPT }] },
        ];
      } else {
        await db.assessment.update({
          where: { id: assessmentId },
          data: { prUrl: extractedPrUrl },
        });
        prSubmitted = true;

        const prAckPrompt = buildPRAcknowledgmentContext(extractedPrUrl);
        extraTurns = [
          { role: "model", parts: [{ text: "Let me respond appropriately to this PR submission." }] },
          { role: "user", parts: [{ text: prAckPrompt }] },
        ];
      }
    }
    // If not WORKING status, no extra turns — just normal response
  } else if (isCoworkerManager && message.toLowerCase().includes("pr") && message.toLowerCase().includes("http")) {
    extraTurns = [
      { role: "model", parts: [{ text: "Let me respond helpfully about the PR link." }] },
      { role: "user", parts: [{ text: INVALID_PR_PROMPT }] },
    ];
  }

  const contents = buildGeminiContents(systemPrompt, history, message, extraTurns);
  const timestamp = new Date().toISOString();

  const userMessage: ChatMessage = {
    role: "user",
    text: message,
    timestamp,
  };

  // --- Stream the Gemini response via SSE ---
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let responseText = "";

      try {
        const streamIterator = await gemini.models.generateContentStream({
          model: CHAT_MODEL,
          contents,
        });

        for await (const chunk of streamIterator) {
          const text = chunk.text || "";
          if (text) {
            responseText += text;
            // Send each chunk as an SSE data event
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`)
            );
          }
        }
      } catch (err) {
        console.error("Gemini stream error:", err);
        if (!responseText) {
          responseText = "Sorry, I couldn't respond right now. Try again?";
        }
      }

      // If no text was generated, use fallback
      if (!responseText) {
        responseText = "I'm sorry, I couldn't generate a response.";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "chunk", text: responseText })}\n\n`)
        );
      }

      const modelTimestamp = new Date().toISOString();
      const modelMessage: ChatMessage = {
        role: "model",
        text: responseText,
        timestamp: modelTimestamp,
      };

      const newTranscript = [...existingMessages, userMessage, modelMessage];

      // Save to database (don't block the stream on this)
      const savePromise = existingConversation
        ? db.conversation.update({
            where: { id: existingConversation.id },
            data: { transcript: newTranscript as unknown as Prisma.InputJsonValue },
          })
        : db.conversation.create({
            data: {
              assessmentId,
              coworkerId,
              type: "text",
              transcript: newTranscript as unknown as Prisma.InputJsonValue,
            },
          });

      // Send the final "done" event with metadata
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "done",
            timestamp: modelTimestamp,
            prSubmitted,
            defenseCallRequired: isCoworkerManager && (prSubmitted || prAlreadySaved),
          })}\n\n`
        )
      );

      // Wait for DB save before closing the stream
      await savePromise.catch((err: unknown) =>
        console.error("Failed to save conversation:", err)
      );

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * GET /api/chat
 * Retrieve chat history with a coworker
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const assessmentId = searchParams.get("assessmentId");
  const coworkerId = searchParams.get("coworkerId");

  if (!assessmentId || !coworkerId) {
    return error(
      "Missing required parameters: assessmentId, coworkerId",
      400
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
    return error("Assessment not found", 404, "NOT_FOUND");
  }

  // Get coworker to check if it's a manager
  const coworker = await db.coworker.findFirst({
    where: {
      id: coworkerId,
      scenarioId: assessment.scenarioId,
    },
  });

  if (!coworker) {
    return error("Coworker not found", 404, "NOT_FOUND");
  }

  // Get existing conversation
  // Note: Manager greeting messages are now handled by POST /api/chat/manager-start (RF-015)
  // which is triggered after a 5-10 second delay for a more realistic feel
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

  return success({ messages });
}
