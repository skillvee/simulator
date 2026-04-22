import { auth } from "@/auth";
import { success, error, validationError } from "@/lib/api";
import { createLogger } from "@/lib/core";
import { z } from "zod";
import {
  generateCoworkers,
  type GenerateCoworkersInput,
} from "@/lib/scenarios/coworker-generator";
import { type SupportedLanguage } from "@/lib/core/language";
import { logGenerationStep } from "@/lib/scenarios/generation-logger";
import { COWORKER_GENERATOR_PROMPT_VERSION } from "@/prompts/recruiter/coworker-generator";

const logger = createLogger("api:recruiter:generate-coworkers");

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

/**
 * Request body schema for coworker generation
 */
const requestSchema = z.object({
  roleName: z.string().min(1, "Role name is required"),
  seniorityLevel: z.enum(["junior", "mid", "senior", "staff", "principal"]),
  companyName: z.string().min(1, "Company name is required"),
  companyDescription: z.string().min(1, "Company description is required"),
  techStack: z.array(z.string()).min(1, "Tech stack must have at least one item"),
  taskDescription: z.string().min(1, "Task description is required"),
  keyResponsibilities: z.array(z.string()).min(1, "Key responsibilities must have at least one item"),
  language: z.enum(["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"]).optional(),
  creationLogId: z.string().optional(),
});

/**
 * POST /api/recruiter/simulations/generate-coworkers
 * Auto-generate 2-3 realistic coworkers based on role and company context
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

  try {
    const body = await request.json();

    // Validate request body
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { creationLogId, ...coworkerInput } = validation.data;
    const input: GenerateCoworkersInput = {
      ...coworkerInput,
      language: coworkerInput.language as SupportedLanguage | undefined,
    };

    // Start generation step logging if creationLogId is provided
    const tracker = creationLogId
      ? await logGenerationStep({
          creationLogId,
          stepName: "generate_coworkers",
          modelUsed: "gemini-3-flash-preview",
          promptVersion: COWORKER_GENERATOR_PROMPT_VERSION,
          inputData: input as unknown as Record<string, unknown>,
        })
      : null;

    try {
      // Generate coworkers
      const result = await generateCoworkers(input);

      await tracker?.complete({
        promptText: result._debug.promptText,
        responseText: result._debug.responseText,
        outputData: result as unknown as Record<string, unknown>,
        attempts: result._debug.attempts,
      });

      return success(result);
    } catch (genErr) {
      await tracker?.fail(genErr instanceof Error ? genErr : new Error(String(genErr)));
      throw genErr;
    }
  } catch (err) {
    logger.error("Coworker generation error", { error: err instanceof Error ? err.message : String(err) });
    return error("Coworker generation failed", 500);
  }
}
