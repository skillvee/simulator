/**
 * POST /api/recruiter/simulations/generate-task
 *
 * Auto-generate 2-3 realistic work challenge options based on role and company context.
 * Available to RECRUITER and ADMIN roles only.
 */

import { auth } from "@/auth";
import { success, error, validationError } from "@/lib/api";
import { createLogger } from "@/lib/core";
import {
  generateCodingTask,
  type GenerateCodingTaskInput,
} from "@/lib/scenarios/task-generator";
import { logGenerationStep } from "@/lib/scenarios/generation-logger";
import { TASK_GENERATOR_PROMPT_VERSION } from "@/prompts/recruiter/task-generator";
import { z } from "zod";

const logger = createLogger("api:recruiter:generate-task");

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

/**
 * Request body schema
 */
const requestSchema = z.object({
  roleName: z.string().min(1, "Role name is required"),
  seniorityLevel: z.enum(["junior", "mid", "senior", "staff", "principal"]),
  techStack: z.array(z.string()).min(1, "Tech stack is required"),
  keyResponsibilities: z
    .array(z.string())
    .min(1, "Key responsibilities are required"),
  domainContext: z.string().min(1, "Domain context is required"),
  companyName: z.string().min(1, "Company name is required"),
  simulationDepth: z.enum(["short", "medium", "long"]).optional().default("medium"),
  creationLogId: z.string().optional(),
});

export async function POST(request: Request) {
  // Check authentication
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      return validationError(validationResult.error);
    }

    const { creationLogId, ...taskInput } = validationResult.data;
    const input: GenerateCodingTaskInput = {
      ...taskInput,
      simulationDepth: taskInput.simulationDepth,
    };

    // Start generation step logging if creationLogId is provided
    const tracker = creationLogId
      ? await logGenerationStep({
          creationLogId,
          stepName: "generate_tasks",
          modelUsed: "gemini-3-flash-preview",
          promptVersion: TASK_GENERATOR_PROMPT_VERSION,
          inputData: input as unknown as Record<string, unknown>,
        })
      : null;

    try {
      // Generate task options
      const result = await generateCodingTask(input);

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
    logger.error("Task generation error", { error: err instanceof Error ? err.message : String(err) });
    return error("Task generation failed", 500);
  }
}
