import { auth } from "@/auth";
import { gemini } from "@/lib/ai/gemini";
import {
  buildCompleteSystemPrompt,
  parseExtractionFromResponse,
  cleanResponseForDisplay,
  applyExtraction,
  type ScenarioBuilderData,
} from "@/lib/scenarios";
import { success, error, validateRequest } from "@/lib/api";
import { ScenarioBuilderRequestSchema } from "@/lib/schemas";

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

// Gemini Flash model for text chat
const CHAT_MODEL = "gemini-3-flash-preview";

/**
 * POST /api/admin/scenarios/builder
 * Send a message to the scenario builder AI and get a response
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "ADMIN") {
    return error("Admin access required", 403);
  }

  const validated = await validateRequest(request, ScenarioBuilderRequestSchema);
  if ("error" in validated) return validated.error;
  const { message, history, scenarioData } = validated.data;

  // Build the system prompt with current scenario state
  const builderData = (scenarioData || {}) as ScenarioBuilderData;
  const systemPrompt = buildCompleteSystemPrompt(builderData);

  // Build conversation history for Gemini
  const conversationHistory = (history || []).map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  try {
    // Generate response from Gemini Flash
    const response = await gemini.models.generateContent({
      model: CHAT_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `[SYSTEM INSTRUCTIONS - Follow these throughout the conversation]\n\n${systemPrompt}\n\n[END SYSTEM INSTRUCTIONS]\n\nPlease acknowledge you understand and are ready to help build a scenario.`,
            },
          ],
        },
        {
          role: "model",
          parts: [
            {
              text: "I understand. I'm ready to help you create a new assessment scenario. Let me know what kind of scenario you'd like to build!",
            },
          ],
        },
        ...conversationHistory,
        {
          role: "user",
          parts: [{ text: message }],
        },
      ],
    });

    const responseText =
      response.text || "I'm sorry, I couldn't generate a response.";
    const timestamp = new Date().toISOString();

    // Parse any extracted data from the response
    const extraction = parseExtractionFromResponse(responseText);
    const cleanedResponse = cleanResponseForDisplay(responseText);

    // Apply extracted data to get updated scenario state
    const updatedScenarioData = extraction
      ? applyExtraction(builderData, extraction)
      : builderData;

    return success({
      response: cleanedResponse,
      timestamp,
      scenarioData: updatedScenarioData,
      extraction,
    });
  } catch (err) {
    console.error("Gemini API error:", err);
    return error("Failed to generate response", 500);
  }
}

/**
 * GET /api/admin/scenarios/builder
 * Get the initial greeting message from the builder
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "ADMIN") {
    return error("Admin access required", 403);
  }

  const systemPrompt = buildCompleteSystemPrompt({});

  try {
    // Generate initial greeting
    const response = await gemini.models.generateContent({
      model: CHAT_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `[SYSTEM INSTRUCTIONS - Follow these throughout the conversation]\n\n${systemPrompt}\n\n[END SYSTEM INSTRUCTIONS]\n\nStart the conversation with a friendly greeting and ask what kind of scenario they'd like to create. Be concise and welcoming.`,
            },
          ],
        },
      ],
    });

    const responseText =
      response.text ||
      "Hello! I'm here to help you create a new assessment scenario. What kind of scenario would you like to build?";
    const cleanedResponse = cleanResponseForDisplay(responseText);

    return success({
      greeting: cleanedResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Gemini API error:", err);
    // Return a fallback greeting
    return success({
      greeting:
        "Hello! I'm here to help you create a new assessment scenario. Let's start with the basics - what's the name for this scenario and what company will candidates be 'joining'?",
      timestamp: new Date().toISOString(),
    });
  }
}
