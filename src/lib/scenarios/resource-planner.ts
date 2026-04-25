/**
 * Resource Planner
 *
 * First step of the iterative resource pipeline. Given the task, role, and
 * company context, produces a structured plan naming each resource the
 * candidate needs and the concrete keyFacts each resource must carry.
 *
 * The plan is the source of truth for the per-resource generator and the
 * final verifier — both check their work against it.
 */

import { gemini } from "@/lib/ai/gemini";
import { createLogger } from "@/lib/core";
import { buildLanguageInstruction, type SupportedLanguage } from "@/lib/core/language";
import {
  RESOURCE_PLANNER_SYSTEM_PROMPT,
  RESOURCE_PLANNER_PROMPT_VERSION,
} from "@/prompts/recruiter/resource-planner";
import { z } from "zod";
import { Type } from "@google/genai";

const logger = createLogger("lib:scenarios:resource-planner");

const PLANNER_MODEL = "gemini-3-pro-preview";
const MAX_PLAN_ATTEMPTS = 2;

const VALID_RESOURCE_TYPES = [
  "repository",
  "database",
  "spreadsheet",
  "api",
  "dashboard",
  "document",
  "custom",
] as const;

export type PlannedResourceType = (typeof VALID_RESOURCE_TYPES)[number];

export interface PlannedResource {
  type: PlannedResourceType;
  label: string;
  purpose: string;
  keyFacts: string[];
}

export interface ResourcePlan {
  resources: PlannedResource[];
}

export interface PlanResourcesInput {
  companyName: string;
  taskDescription: string;
  techStack: string[];
  roleName: string;
  seniorityLevel: string;
  language: SupportedLanguage;
}

export interface PlanResourcesResult {
  plan: ResourcePlan;
  _debug: {
    promptText: string;
    responseText: string;
    attempts: number;
  };
}

const plannedResourceSchema = z.object({
  type: z.enum(VALID_RESOURCE_TYPES),
  label: z.string().min(1),
  purpose: z.string().min(1),
  keyFacts: z
    .array(z.string().min(1))
    .min(3, "Each resource must have at least 3 keyFacts")
    .max(12, "Each resource must have at most 12 keyFacts"),
});

const planSchema = z.object({
  resources: z
    .array(plannedResourceSchema)
    .min(1, "Plan must include at least 1 resource")
    .max(5, "Plan must include at most 5 resources"),
});

export async function planResources(
  input: PlanResourcesInput
): Promise<PlanResourcesResult> {
  const contextPrompt = buildPlannerPrompt(input);
  const languageInstruction = buildLanguageInstruction(input.language);
  const systemInstruction = languageInstruction
    ? `${languageInstruction}\n\n${RESOURCE_PLANNER_SYSTEM_PROMPT}`
    : RESOURCE_PLANNER_SYSTEM_PROMPT;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_PLAN_ATTEMPTS; attempt++) {
    try {
      const response = await gemini.models.generateContent({
        model: PLANNER_MODEL,
        config: {
          systemInstruction,
          temperature: 0.5,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              resources: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      enum: [...VALID_RESOURCE_TYPES],
                    },
                    label: { type: Type.STRING },
                    purpose: { type: Type.STRING },
                    keyFacts: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ["type", "label", "purpose", "keyFacts"],
                },
              },
            },
            required: ["resources"],
          },
        },
        contents: [{ role: "user", parts: [{ text: contextPrompt }] }],
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini planner");
      }

      const parsed = JSON.parse(cleanJson(responseText));
      const result = planSchema.safeParse(parsed);
      if (!result.success) {
        throw new Error(`Invalid plan: ${result.error.message}`);
      }

      validateRoleSpecificPlan(result.data, input.roleName);

      return {
        plan: result.data,
        _debug: {
          promptText: `[System Instruction]\n${systemInstruction}\n\n[User Message]\n${contextPrompt}`,
          responseText,
          attempts: attempt,
        },
      };
    } catch (err) {
      lastError =
        err instanceof SyntaxError
          ? new Error(`Failed to parse planner JSON: ${err.message}`)
          : err instanceof Error
            ? err
            : new Error(String(err));

      if (attempt < MAX_PLAN_ATTEMPTS) {
        logger.warn("Resource plan attempt failed, retrying", {
          attempt,
          error: lastError.message,
        });
        continue;
      }
    }
  }

  throw lastError ?? new Error("Failed to plan resources");
}

function buildPlannerPrompt(input: PlanResourcesInput): string {
  return `Plan the resources for this simulation scenario.

## Candidate Profile
- **Role:** ${input.roleName}
- **Seniority:** ${input.seniorityLevel}

## Company
- **Name:** ${input.companyName}
- **Tech Stack:** ${input.techStack.join(", ")}

## Task (written in the manager's voice — this is what the candidate was told)
${input.taskDescription}

## Your Job
Produce a plan (NOT the content) listing 2-5 resources the candidate needs to complete this task. Each resource entry must include type, label, purpose, and 4-8 specific keyFacts the resource must carry.

Walk through the task step-by-step as the candidate would. At each step, list the concrete information they need. Group those into resources that match how a real workplace organizes information.`;
}

function getRoleCategories(roleName: string) {
  const lower = roleName.toLowerCase();
  return {
    isDataRole:
      lower.includes("data analyst") ||
      lower.includes("data scientist") ||
      lower.includes("data engineer") ||
      lower.includes("ml engineer") ||
      lower.includes("machine learning") ||
      lower.includes("analytics engineer"),
    isEngineeringRole:
      (lower.includes("engineer") || lower.includes("developer")) &&
      !lower.includes("data") &&
      !lower.includes("security") &&
      !lower.includes("ml") &&
      !lower.includes("machine learning") &&
      !lower.includes("qa") &&
      !lower.includes("test automation") &&
      !lower.includes("quality") &&
      !lower.includes("analytics"),
    isSecurityRole:
      lower.includes("security") ||
      lower.includes("pen test") ||
      lower.includes("appsec"),
  };
}

/**
 * Fail fast if the plan doesn't meet role-specific requirements.
 * Triggers a retry rather than letting the generator waste calls producing
 * resources we already know won't pass validation.
 */
function validateRoleSpecificPlan(plan: ResourcePlan, roleName: string): void {
  const { isDataRole, isEngineeringRole, isSecurityRole } =
    getRoleCategories(roleName);

  if (isDataRole) {
    const hasData = plan.resources.some(
      (r) => r.type === "spreadsheet" || r.type === "database"
    );
    if (!hasData) {
      throw new Error(
        `Data role "${roleName}" plan missing spreadsheet or database resource`
      );
    }
  }

  if (isEngineeringRole) {
    const hasRepo = plan.resources.some((r) => r.type === "repository");
    if (!hasRepo) {
      throw new Error(
        `Engineering role "${roleName}" plan missing repository resource`
      );
    }
  }

  if (isSecurityRole) {
    const hasDoc = plan.resources.some((r) => r.type === "document");
    if (!hasDoc) {
      throw new Error(
        `Security role "${roleName}" plan missing document resource`
      );
    }
  }
}

function cleanJson(text: string): string {
  let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return cleaned.trim();
}

export { RESOURCE_PLANNER_PROMPT_VERSION };
