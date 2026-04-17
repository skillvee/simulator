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
import { buildAgentPrompt } from "@/prompts/build-agent-prompt";
import { success, error, validateRequest } from "@/lib/api";
import { ChatRequestSchema } from "@/lib/schemas";
import { sanitizeForStorage } from "@/lib/sanitization";
import { isManager } from "@/lib/utils/coworker";
import { createLogger, isAssessmentExpired } from "@/lib/core";
import type { SimulationDepth } from "@/types";
import { logAICall } from "@/lib/analysis";

const logger = createLogger("server:api:chat");

// Gemini Flash model for text chat
const CHAT_MODEL = "gemini-3-flash-preview";

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

  // Only allow chat during WORKING status
  if (assessment.status !== AssessmentStatus.WORKING) {
    return error(
      `Cannot chat when assessment is in ${assessment.status} status`,
      400
    );
  }

  // Check if the assessment time window has expired
  const chatDepth = (assessment.scenario.simulationDepth || "medium") as SimulationDepth;
  if (isAssessmentExpired(assessment.workingStartedAt, chatDepth)) {
    return error(
      "Assessment time has expired",
      400,
      "ASSESSMENT_EXPIRED"
    );
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

  // Get existing text conversation(s) with this specific coworker
  // Use the one with the most messages to guard against duplicate conversations
  // created by race conditions between manager-start and first user message
  const textConversations = allConversations.filter(
    (c) => c.coworkerId === coworkerId && c.type === "text"
  );
  const existingConversation = textConversations.length > 1
    ? textConversations.reduce((best, c) => {
        const bestLen = ((best.transcript as unknown as ChatMessage[]) || []).length;
        const cLen = ((c.transcript as unknown as ChatMessage[]) || []).length;
        return cLen > bestLen ? c : best;
      })
    : textConversations[0] ?? null;

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
  const memory = await buildCoworkerMemory(
    coworkerConversations,
    coworker.name,
    {}
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

  // Build coworker persona
  const isCoworkerManager = isManager(coworker.role);
  const persona: CoworkerPersona = {
    name: coworker.name,
    role: coworker.role,
    personaStyle: coworker.personaStyle,
    personality: coworker.personality as CoworkerPersona["personality"],
    knowledge: parseCoworkerKnowledge(coworker.knowledge),
    avatarUrl: coworker.avatarUrl,
  };

  // Extract resource labels for manager awareness
  const resourceLabels = Array.isArray(assessment.scenario.resources)
    ? (assessment.scenario.resources as unknown as Array<{ label: string }>).map((r) => r.label)
    : undefined;

  // Build unified system prompt — let the LLM decide what to do based on context
  const systemPrompt = buildAgentPrompt({
    companyName: assessment.scenario.companyName,
    techStack: assessment.scenario.techStack,
    agent: persona,
    taskDescription: isCoworkerManager ? assessment.scenario.taskDescription : undefined,
    candidateName: session.user.name || undefined,
    conversationHistory: memoryContext,
    crossAgentContext: crossCoworkerContext,
    phase: "ongoing",
    media: "chat",
    resourceLabels: isCoworkerManager ? resourceLabels : undefined,
  });

  // Build history for Gemini - include system prompt as first message
  const history = existingMessages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  const contents = buildGeminiContents(systemPrompt, history, message);

  // Start AI call tracking for observability
  const promptText = contents.map(c => c.parts.map(p => p.text).join("")).join("\n");
  const tracker = await logAICall({
    assessmentId,
    endpoint: "/api/chat",
    promptText,
    modelVersion: CHAT_MODEL,
    promptType: "CHAT",
    promptVersion: "1.0",
    modelUsed: CHAT_MODEL,
  });

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

      let streamFailed = false;

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
        logger.error("Gemini stream error", { err });
        streamFailed = true;

        // Detect rate limiting (429) from Gemini
        const isRateLimited =
          err instanceof Error &&
          (err.message.includes("429") ||
            err.message.toLowerCase().includes("rate") ||
            err.message.toLowerCase().includes("resource_exhausted"));

        const streamError = err instanceof Error ? err : new Error(String(err));
        if (isRateLimited) {
          streamError.message = "RATE_LIMITED";
        }
        await tracker.fail(streamError).catch((logErr: unknown) =>
          logger.error("Failed to log AI call failure", { logErr })
        );

        if (!responseText) {
          responseText = "Sorry, I couldn't respond right now. Try again?";
        }
      }

      // If no text was generated, use fallback and log empty response
      if (!responseText) {
        responseText = "I'm sorry, I couldn't generate a response.";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "chunk", text: responseText })}\n\n`)
        );

        if (!streamFailed) {
          await tracker.complete({
            responseText: "",
            statusCode: 200,
            errorMessage: "Empty response from Gemini stream — no text chunks received",
          }).catch((logErr: unknown) =>
            logger.error("Failed to log AI call empty response", { logErr })
          );
        }
      } else if (!streamFailed) {
        // Success path — log the completed call
        await tracker.complete({
          responseText,
          statusCode: 200,
        }).catch((logErr: unknown) =>
          logger.error("Failed to log AI call completion", { logErr })
        );
      }

      const modelTimestamp = new Date().toISOString();
      const modelMessage: ChatMessage = {
        role: "model",
        text: responseText,
        timestamp: modelTimestamp,
      };

      const newTranscript: ChatMessage[] = [...existingMessages, userMessage, modelMessage];

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
          })}\n\n`
        )
      );

      // Wait for DB save before closing the stream
      await savePromise.catch((err: unknown) =>
        logger.error("Failed to save conversation", { err })
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

  // Get existing conversation(s) — pick the one with the most messages
  // to guard against duplicates from manager-start / first-message race conditions
  const conversations = await db.conversation.findMany({
    where: {
      assessmentId,
      coworkerId,
      type: "text",
    },
    orderBy: { createdAt: "asc" },
  });

  const conversation = conversations.length > 1
    ? conversations.reduce((best, c) => {
        const bestLen = ((best.transcript as unknown as ChatMessage[]) || []).length;
        const cLen = ((c.transcript as unknown as ChatMessage[]) || []).length;
        return cLen > bestLen ? c : best;
      })
    : conversations[0] ?? null;

  const messages = conversation
    ? (conversation.transcript as unknown as ChatMessage[])
    : [];

  return success({ messages });
}
