/**
 * Simulation Generation Step Logger
 *
 * Logs each AI generation step during simulation creation (parse JD, generate tasks,
 * generate coworkers, generate resources) with full prompt/response capture for
 * debugging and prompt improvement.
 */

import { db } from "@/server/db";
import { createLogger } from "@/lib/core";

const logger = createLogger("lib:scenarios:generation-logger");

export type StepName =
  | "parse_jd"
  | "generate_tasks"
  | "generate_coworkers"
  | "generate_resources"
  | "provision_repo"
  // v2 resource pipeline
  | "generate_plan"
  | "generate_artifacts"
  | "validate_artifacts"
  | "judge_artifacts"
  | "ground_coworkers";

export interface LogGenerationStepOptions {
  creationLogId: string;
  stepName: StepName;
  modelUsed?: string;
  promptVersion?: string;
  promptText?: string;
  inputData?: Record<string, unknown>;
}

export interface GenerationStepTracker {
  id: string;
  startTime: Date;
  /** Record a successful completion with the AI response and parsed output */
  complete: (result: {
    promptText?: string;
    responseText?: string;
    outputData?: Record<string, unknown>;
    attempts?: number;
  }) => Promise<void>;
  /** Record a failure */
  fail: (error: Error, details?: { attempts?: number }) => Promise<void>;
}

/**
 * Start tracking a generation step. Returns a tracker to complete or fail.
 *
 * @example
 * ```typescript
 * const tracker = await logGenerationStep({
 *   creationLogId: "clxyz...",
 *   stepName: "generate_tasks",
 *   modelUsed: "gemini-3-flash-preview",
 *   promptVersion: "1.1",
 *   promptText: fullPrompt,
 *   inputData: { roleName, techStack },
 * });
 *
 * try {
 *   const result = await generateCodingTask(input);
 *   await tracker.complete({
 *     responseText: rawResponse,
 *     outputData: result,
 *   });
 * } catch (error) {
 *   await tracker.fail(error);
 * }
 * ```
 */
export async function logGenerationStep(
  options: LogGenerationStepOptions
): Promise<GenerationStepTracker> {
  const startTime = new Date();

  let step;
  try {
    step = await db.simulationGenerationStep.create({
      data: {
        creationLogId: options.creationLogId,
        stepName: options.stepName,
        status: "started",
        modelUsed: options.modelUsed,
        promptVersion: options.promptVersion,
        promptText: options.promptText,
        inputData: options.inputData as never,
      },
    });
  } catch (err) {
    // Don't let logging failures break the generation pipeline
    logger.error("Failed to create generation step log", {
      err: String(err),
      stepName: options.stepName,
    });
    // Return a no-op tracker
    return createNoOpTracker();
  }

  const complete: GenerationStepTracker["complete"] = async (result) => {
    try {
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startTime.getTime();
      await db.simulationGenerationStep.update({
        where: { id: step.id },
        data: {
          status: "completed",
          ...(result.promptText ? { promptText: result.promptText } : {}),
          responseText: result.responseText,
          outputData: result.outputData as never,
          durationMs,
          attempts: result.attempts ?? 1,
          completedAt,
        },
      });
    } catch (err) {
      logger.error("Failed to update generation step log", {
        err: String(err),
        stepId: step.id,
      });
    }
  };

  const fail: GenerationStepTracker["fail"] = async (error, details) => {
    try {
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startTime.getTime();
      await db.simulationGenerationStep.update({
        where: { id: step.id },
        data: {
          status: "failed",
          errorMessage: error.message,
          errorDetails: { stack: error.stack } as never,
          durationMs,
          attempts: details?.attempts ?? 1,
          completedAt,
        },
      });
    } catch (err) {
      logger.error("Failed to update generation step log with failure", {
        err: String(err),
        stepId: step.id,
      });
    }
  };

  return {
    id: step.id,
    startTime,
    complete,
    fail,
  };
}

function createNoOpTracker(): GenerationStepTracker {
  return {
    id: "noop",
    startTime: new Date(),
    complete: async () => {},
    fail: async () => {},
  };
}
