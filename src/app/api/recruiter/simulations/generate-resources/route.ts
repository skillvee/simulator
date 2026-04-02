import { auth } from "@/auth";
import { success, error, validationError } from "@/lib/api";
import { createLogger } from "@/lib/core";
import { z } from "zod";
import {
  generateResources,
  type GenerateResourcesInput,
} from "@/lib/scenarios/resource-generator";
import { logGenerationStep } from "@/lib/scenarios/generation-logger";
import { RESOURCE_GENERATOR_PROMPT_VERSION } from "@/prompts/recruiter/resource-generator";

const logger = createLogger("api:recruiter:generate-resources");

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

const requestSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  taskDescription: z.string().min(1, "Task description is required"),
  techStack: z
    .array(z.string())
    .min(1, "Tech stack must have at least one item"),
  roleName: z.string().min(1, "Role name is required"),
  seniorityLevel: z.string().min(1, "Seniority level is required"),
  creationLogId: z.string().optional(),
});

/**
 * POST /api/recruiter/simulations/generate-resources
 * Auto-generate 1-4 resources based on task and company context.
 * Available to RECRUITER and ADMIN roles.
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

    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { creationLogId, ...resourceInput } = validation.data;
    const input: GenerateResourcesInput = resourceInput;

    // Start generation step logging if creationLogId is provided
    const tracker = creationLogId
      ? await logGenerationStep({
          creationLogId,
          stepName: "generate_resources",
          modelUsed: "gemini-3-flash-preview",
          promptVersion: RESOURCE_GENERATOR_PROMPT_VERSION,
          inputData: input as unknown as Record<string, unknown>,
        })
      : null;

    try {
      const result = await generateResources(input);

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
    logger.error("Resource generation error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return error("Resource generation failed", 500);
  }
}
