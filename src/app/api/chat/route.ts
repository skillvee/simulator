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
  buildPRAcknowledgmentContext,
  INVALID_PR_PROMPT,
  DUPLICATE_PR_PROMPT,
} from "@/prompts";
import { success, error, validateRequest } from "@/lib/api";
import { ChatRequestSchema } from "@/lib/schemas";
import { isValidPrUrl } from "@/lib/external";

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
 * POST /api/chat
 * Send a message to a coworker and get a response from Gemini Flash
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  const validated = await validateRequest(request, ChatRequestSchema);
  if ("error" in validated) return validated.error;
  const { assessmentId, coworkerId, message } = validated.data;

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

  // Use centralized chat prompt with Slack-like conversation guidelines
  const systemPrompt = buildChatPrompt(
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

  // Build history for Gemini - include system prompt as first message
  const history = existingMessages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  // Check if this is a manager and the message contains a PR link
  const isCoworkerManager = isManager(coworker.role);
  const extractedPrUrl = extractPrUrl(message);
  let prSubmitted = false;
  let responseText: string;

  // Check if a PR URL has already been saved for this assessment
  const prAlreadySaved = !!assessment.prUrl;

  // If manager and PR link detected, validate and potentially process it
  if (isCoworkerManager && extractedPrUrl) {
    // Check if assessment is in WORKING status
    if (assessment.status === AssessmentStatus.WORKING) {
      // Check if this is a duplicate PR submission
      if (prAlreadySaved) {
        // PR already saved - don't overwrite, respond naturally without "call me" prompt
        const response = await gemini.models.generateContent({
          model: CHAT_MODEL,
          contents: [
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
              parts: [
                { text: "I understand. I'm ready to chat as this coworker." },
              ],
            },
            ...history,
            {
              role: "user",
              parts: [{ text: message }],
            },
            {
              role: "model",
              parts: [
                {
                  text: "Let me respond to this PR link they shared.",
                },
              ],
            },
            {
              role: "user",
              parts: [{ text: DUPLICATE_PR_PROMPT }],
            },
          ],
        });

        responseText =
          response.text ||
          "Got it! I already have your PR - ready whenever you want to hop on a call!";
      } else {
        // First PR submission - save and trigger call prompt
        await db.assessment.update({
          where: { id: assessmentId },
          data: {
            prUrl: extractedPrUrl,
          },
        });
        prSubmitted = true;

        // Generate an acknowledgment response from the manager
        const prAckPrompt = buildPRAcknowledgmentContext(extractedPrUrl);

        const response = await gemini.models.generateContent({
          model: CHAT_MODEL,
          contents: [
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
              parts: [
                { text: "I understand. I'm ready to chat as this coworker." },
              ],
            },
            ...history,
            {
              role: "user",
              parts: [{ text: message }],
            },
            {
              role: "model",
              parts: [
                {
                  text: "Let me respond appropriately to this PR submission.",
                },
              ],
            },
            {
              role: "user",
              parts: [{ text: prAckPrompt }],
            },
          ],
        });

        responseText =
          response.text ||
          "Awesome, thanks for submitting! Let me take a quick look at your PR and I'll call you in a moment to discuss.";
      }
    } else {
      // Assessment not in WORKING status - can't accept PR
      const response = await gemini.models.generateContent({
        model: CHAT_MODEL,
        contents: [
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
            parts: [
              { text: "I understand. I'm ready to chat as this coworker." },
            ],
          },
          ...history,
          {
            role: "user",
            parts: [{ text: message }],
          },
        ],
      });
      responseText =
        response.text || "I'm sorry, I couldn't generate a response.";
    }
  } else if (isCoworkerManager && message.toLowerCase().includes("pr") && message.toLowerCase().includes("http")) {
    // User tried to submit a PR but it wasn't a valid PR URL
    const response = await gemini.models.generateContent({
      model: CHAT_MODEL,
      contents: [
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
          parts: [
            { text: "I understand. I'm ready to chat as this coworker." },
          ],
        },
        ...history,
        {
          role: "user",
          parts: [{ text: message }],
        },
        {
          role: "model",
          parts: [{ text: "Let me respond helpfully about the PR link." }],
        },
        {
          role: "user",
          parts: [{ text: INVALID_PR_PROMPT }],
        },
      ],
    });

    responseText =
      response.text ||
      "Hmm, I don't see a valid PR link there. Could you share the GitHub, GitLab, or Bitbucket pull request URL?";
  } else {
    // Regular message - generate normal response
    const response = await gemini.models.generateContent({
      model: CHAT_MODEL,
      contents: [
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
      ],
    });

    responseText =
      response.text || "I'm sorry, I couldn't generate a response.";
  }

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

  return success({
    response: responseText,
    timestamp: modelMessage.timestamp,
    prSubmitted,
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
