/**
 * Task Generator
 *
 * Auto-generates 2-3 realistic work challenge options based on role and company context.
 */

import { gemini } from "@/lib/ai/gemini";
import {
  TASK_GENERATOR_PROMPT_V1,
  TASK_GENERATOR_PROMPT_VERSION,
} from "@/prompts/recruiter/task-generator";
import { z } from "zod";

const GENERATION_MODEL = "gemini-3-flash-preview";
const MAX_GENERATION_ATTEMPTS = 3; // Increased for better resilience against transient failures

/**
 * Schema for a single task option
 */
export const taskOptionSchema = z.object({
  summary: z.string().min(1),
  recruiterSummary: z.string().min(1),
  description: z.string().min(1),
});

/**
 * Schema for the task generation response
 */
export const taskGenerationResponseSchema = z.object({
  taskOptions: z.array(taskOptionSchema).min(2).max(3),
});

/**
 * Input parameters for task generation
 */
export type GenerateCodingTaskInput = {
  roleName: string;
  seniorityLevel: "junior" | "mid" | "senior" | "staff" | "principal";
  techStack: string[];
  keyResponsibilities: string[];
  domainContext: string;
  companyName: string;
};

/**
 * A single task option
 */
export type TaskOption = z.infer<typeof taskOptionSchema>;

/**
 * Response from task generation
 */
export type GenerateCodingTaskResponse = {
  taskOptions: TaskOption[];
  _meta: {
    promptVersion: string;
    generatedAt: string;
  };
};

/**
 * Generate 2-3 realistic work challenge options based on role and company context
 *
 * Each task option includes:
 * - summary: 1-line description for display
 * - description: 2-4 paragraphs written as a manager assigning work
 *
 * Tasks are:
 * - Written in manager voice (not test questions)
 * - Completable in 60-90 minutes
 * - Domain-specific (fintech → payments, e-commerce → cart, etc)
 * - Calibrated to seniority level (junior: well-scoped, senior: ambiguous)
 * - Deliberately vague to force collaboration with coworkers
 *
 * @param input Role and company context
 * @returns Array of 2-3 task options
 * @throws Error if generation fails or response is invalid
 */
export async function generateCodingTask(
  input: GenerateCodingTaskInput
): Promise<GenerateCodingTaskResponse> {
  // Build the context prompt
  const contextPrompt = buildContextPrompt(input);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      // Generate tasks using Gemini Flash
      const response = await gemini.models.generateContent({
        model: GENERATION_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${TASK_GENERATOR_PROMPT_V1}\n\n## Context for Generation\n\n${contextPrompt}`,
              },
            ],
          },
        ],
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini");
      }

      // Clean response (remove markdown fences if present)
      const cleanedText = cleanJsonResponse(responseText);

      // Parse and validate the JSON
      const parsed = JSON.parse(cleanedText);

      // Validate against schema
      const result = taskGenerationResponseSchema.safeParse(parsed);
      if (!result.success) {
        throw new Error(
          `Invalid task generation response: ${result.error.message}`
        );
      }

      const { taskOptions } = result.data;

      // Additional validation: each task description should be 2-4 paragraphs (roughly)
      for (const task of taskOptions) {
        if (task.description.length < 100) {
          throw new Error(
            `Task description too short (${task.description.length} chars): "${task.summary}"`
          );
        }
        // Ensure summary is concise (1-line)
        if (task.summary.length > 100) {
          throw new Error(
            `Task summary too long (${task.summary.length} chars): should be 1 line`
          );
        }
      }

      return {
        taskOptions,
        _meta: {
          promptVersion: TASK_GENERATOR_PROMPT_VERSION,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      lastError =
        error instanceof SyntaxError
          ? new Error(`Failed to parse JSON response: ${error.message}`)
          : error instanceof Error
            ? error
            : new Error(String(error));

      if (attempt < MAX_GENERATION_ATTEMPTS) {
        console.warn(
          `Task generation attempt ${attempt} failed: ${lastError.message}, retrying...`
        );
        continue;
      }
    }
  }

  throw lastError ?? new Error("Failed to generate coding task");
}

/**
 * Build the context prompt from input parameters
 */
function buildContextPrompt(input: GenerateCodingTaskInput): string {
  return `**Role Name:** ${input.roleName}
**Seniority Level:** ${input.seniorityLevel}
**Company Name:** ${input.companyName}
**Domain Context:** ${input.domainContext}
**Tech Stack:** ${input.techStack.join(", ")}
**Key Responsibilities:**
${input.keyResponsibilities.map((r) => `- ${r}`).join("\n")}

Now generate 2-3 work challenge options appropriate for this role and context.`;
}

/**
 * Clean JSON response by removing markdown code fences
 */
function cleanJsonResponse(text: string): string {
  // Remove markdown fences (both ```json and ``` variants)
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  // Trim whitespace
  return cleaned.trim();
}
