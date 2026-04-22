import { auth } from "@/auth";
import { success, error, validateRequest } from "@/lib/api";
import { ScenarioBuilderRequestSchema } from "@/lib/schemas";
import { createLogger } from "@/lib/core";
import { DEFAULT_LANGUAGE, type SupportedLanguage } from "@/lib/core/language";
import { gemini } from "@/lib/ai/gemini";
import {
  buildCompleteSystemPrompt,
  parseExtractionFromResponse,
  cleanResponseForDisplay,
  applyExtraction,
  type ScenarioBuilderData,
} from "@/lib/scenarios";

const logger = createLogger("api:recruiter:builder");

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

// Gemini Flash model for text chat
const CHAT_MODEL = "gemini-3-flash-preview";

/**
 * POST /api/recruiter/simulations/builder
 * Send a message to the simulation builder AI and get a response
 * Available to RECRUITER and ADMIN roles
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  const validated = await validateRequest(request, ScenarioBuilderRequestSchema);
  if ("error" in validated) return validated.error;
  const { message, history, scenarioData, language } = validated.data;

  // Build the system prompt with current scenario state
  const builderData = (scenarioData || {}) as ScenarioBuilderData;
  const lang = (language as SupportedLanguage) || DEFAULT_LANGUAGE;
  const systemPrompt = buildCompleteSystemPrompt(builderData, lang);

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
    logger.error("Gemini API error", { error: err instanceof Error ? err.message : String(err) });
    return error("Failed to generate response", 500);
  }
}

/**
 * GET /api/recruiter/simulations/builder
 * Get the initial greeting message from the builder
 * Available to RECRUITER and ADMIN roles
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  const systemPrompt = buildCompleteSystemPrompt({}, DEFAULT_LANGUAGE);

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
    logger.error("Gemini API error", { error: err instanceof Error ? err.message : String(err) });
    // Return a fallback greeting
    return success({
      greeting:
        "Hello! I'm here to help you create a new assessment scenario. Let's start with the basics - what's the name for this scenario and what company will candidates be 'joining'?",
      timestamp: new Date().toISOString(),
    });
  }
}
