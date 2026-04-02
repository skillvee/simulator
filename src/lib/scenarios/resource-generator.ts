/**
 * Resource Generator
 *
 * Auto-generates scenario resources (repos, databases, spreadsheets, dashboards, etc.)
 * based on the task description, tech stack, and company context.
 */

import { gemini } from "@/lib/ai/gemini";
import { createLogger } from "@/lib/core";
import {
  RESOURCE_GENERATOR_SYSTEM_PROMPT,
  RESOURCE_GENERATOR_PROMPT_VERSION,
} from "@/prompts/recruiter/resource-generator";
import type { ScenarioResource } from "@/types";
import { z } from "zod";
import { Type } from "@google/genai";

const logger = createLogger("lib:scenarios:resource-generator");

const GENERATION_MODEL = "gemini-3-flash-preview";
const MAX_GENERATION_ATTEMPTS = 3;

const VALID_RESOURCE_TYPES = [
  "repository",
  "database",
  "spreadsheet",
  "api",
  "dashboard",
  "document",
  "custom",
] as const;

/** Minimum content length (characters) by resource type — enforced as validation errors */
const MIN_CONTENT_LENGTH: Record<string, number> = {
  document: 1200,
  repository: 1200,
  api: 1200,
  dashboard: 900,
  spreadsheet: 750,
  database: 900,
  custom: 600,
};

const resourceSchema = z.object({
  type: z.enum(VALID_RESOURCE_TYPES),
  label: z.string().min(1),
  url: z.string().optional(),
  credentials: z.string().optional(),
  instructions: z.string().optional(),
  content: z.string().min(600, "Resource content must be at least 600 characters"),
});

export type GenerateResourcesInput = {
  companyName: string;
  taskDescription: string;
  techStack: string[];
  /** The candidate's role name, e.g. "Senior Backend Engineer", "Product Manager" */
  roleName: string;
  /** The candidate's seniority level */
  seniorityLevel: string;
};

export type GenerateResourcesResponse = {
  resources: ScenarioResource[];
  _meta: {
    promptVersion: string;
    generatedAt: string;
  };
  _debug: {
    promptText: string;
    responseText: string;
    attempts: number;
  };
};

/**
 * Generate 1-4 resources that a candidate needs to complete the simulation task.
 */
export async function generateResources(
  input: GenerateResourcesInput
): Promise<GenerateResourcesResponse> {
  const contextPrompt = buildContextPrompt(input);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      const response = await gemini.models.generateContent({
        model: GENERATION_MODEL,
        config: {
          systemInstruction: RESOURCE_GENERATOR_SYSTEM_PROMPT,
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  enum: [...VALID_RESOURCE_TYPES],
                  description: "The type of resource",
                },
                label: {
                  type: Type.STRING,
                  description: "Concise document title",
                },
                credentials: {
                  type: Type.STRING,
                  description: "Access credentials or instructions",
                  nullable: true,
                },
                instructions: {
                  type: Type.STRING,
                  description:
                    "Brief note on what to look for in this resource",
                  nullable: true,
                },
                content: {
                  type: Type.STRING,
                  description:
                    "Full markdown document body — this is what the candidate reads. Must be VERY substantial: 700+ words for documents/repos/APIs, 500+ words for dashboards/databases, 400+ words for spreadsheets. Include markdown tables with 8+ data rows, specific numbers, cross-references to other resources, and realistic details. End each resource with a 'See Also' section referencing the other generated resources by name.",
                },
              },
              required: ["type", "label", "content"],
            },
          },
        },
        contents: [
          {
            role: "user",
            parts: [{ text: contextPrompt }],
          },
        ],
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini");
      }

      const resources = parseAndValidateResources(responseText);
      validateRoleSpecificResources(resources, input.roleName);

      return {
        resources,
        _meta: {
          promptVersion: RESOURCE_GENERATOR_PROMPT_VERSION,
          generatedAt: new Date().toISOString(),
        },
        _debug: {
          promptText: `[System Instruction]\n${RESOURCE_GENERATOR_SYSTEM_PROMPT}\n\n[User Message]\n${contextPrompt}`,
          responseText,
          attempts: attempt,
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
        logger.warn("Resource generation attempt failed, retrying", {
          attempt,
          error: lastError.message,
        });
        continue;
      }
    }
  }

  throw lastError ?? new Error("Failed to generate resources");
}

function getRoleCategories(roleName: string) {
  const lower = roleName.toLowerCase();
  return {
    isDataRole:
      lower.includes("data analyst") ||
      lower.includes("data scientist") ||
      lower.includes("data engineer") ||
      lower.includes("ml engineer") ||
      lower.includes("machine learning"),
    isEngineeringRole:
      (lower.includes("engineer") || lower.includes("developer")) &&
      !lower.includes("data") &&
      !lower.includes("security") &&
      !lower.includes("ml") &&
      !lower.includes("machine learning"),
    isSecurityRole:
      lower.includes("security") ||
      lower.includes("pen test") ||
      lower.includes("appsec"),
  };
}

/** Count markdown table data rows (exclude header separators) */
function countTableDataRows(content: string): number {
  const lines = content.split("\n");
  let dataRows = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    // Match table rows but exclude separator rows (|---|---|)
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && !/^\|[\s-:|]+\|$/.test(trimmed)) {
      dataRows++;
    }
  }
  // Subtract header rows (one per table — estimate by counting separator rows)
  const separatorRows = lines.filter((l) =>
    /^\s*\|[\s-:]+\|/.test(l) && /^[\s|:-]+$/.test(l.trim())
  ).length;
  return Math.max(0, dataRows - separatorRows);
}

/**
 * Validate that the generated resources meet role-specific requirements.
 * Throws if requirements aren't met (triggers retry).
 */
function validateRoleSpecificResources(
  resources: ScenarioResource[],
  roleName: string
): void {
  const { isDataRole, isEngineeringRole, isSecurityRole } =
    getRoleCategories(roleName);

  if (isDataRole) {
    const dataResources = resources.filter(
      (r) => r.type === "spreadsheet" || r.type === "database"
    );
    if (dataResources.length === 0) {
      throw new Error(
        `Data role "${roleName}" requires at least one spreadsheet or database resource`
      );
    }
    const maxRows = Math.max(
      ...dataResources.map((r) => countTableDataRows(r.content ?? ""))
    );
    if (maxRows < 15) {
      throw new Error(
        `Data role "${roleName}" requires spreadsheet/database with 15+ data rows, found ${maxRows}`
      );
    }
  }

  if (isEngineeringRole) {
    const repos = resources.filter((r) => r.type === "repository");
    if (repos.length === 0) {
      throw new Error(
        `Engineering role "${roleName}" requires at least one repository resource`
      );
    }
    const hasSetup = repos.some((r) =>
      /quick start|getting started|setup|install/i.test(r.content ?? "")
    );
    if (!hasSetup) {
      throw new Error(
        `Engineering role "${roleName}" requires repository with setup/quick-start instructions`
      );
    }
    const hasCodeBlock = repos.some((r) => /```/.test(r.content ?? ""));
    if (!hasCodeBlock) {
      throw new Error(
        `Engineering role "${roleName}" requires repository with at least one code snippet`
      );
    }
  }

  if (isSecurityRole) {
    const docs = resources.filter((r) => r.type === "document");
    if (docs.length === 0) {
      throw new Error(
        `Security role "${roleName}" requires at least one document resource`
      );
    }
    const hasCodeSnippet = docs.some((r) => /```/.test(r.content ?? ""));
    if (!hasCodeSnippet) {
      throw new Error(
        `Security role "${roleName}" requires document with code snippets showing vulnerabilities`
      );
    }
  }
}

function parseAndValidateResources(responseText: string): ScenarioResource[] {
  const cleanedText = cleanJsonResponse(responseText);
  const parsed = JSON.parse(cleanedText);

  if (!Array.isArray(parsed)) {
    throw new Error("Response is not an array");
  }

  if (parsed.length === 0) {
    throw new Error("No resources generated");
  }

  if (parsed.length > 4) {
    logger.warn("Too many resources generated, trimming to 4", {
      count: parsed.length,
    });
    parsed.length = 4;
  }

  const resources: ScenarioResource[] = parsed.map((resource, index) => {
    const result = resourceSchema.safeParse(resource);
    if (!result.success) {
      throw new Error(
        `Invalid resource at index ${index}: ${result.error.message}`
      );
    }

    // Enforce minimum content length per resource type — triggers retry
    const minLength = MIN_CONTENT_LENGTH[result.data.type] ?? 400;
    if (result.data.content.length < minLength) {
      throw new Error(
        `Resource "${result.data.label}" (${result.data.type}) content too short: ${result.data.content.length} chars, minimum ${minLength} required`
      );
    }

    return result.data;
  });

  return resources;
}

function buildContextPrompt(input: GenerateResourcesInput): string {
  return `Generate resources for this simulation scenario.

## Candidate Profile
- **Role:** ${input.roleName}
- **Seniority:** ${input.seniorityLevel}

## Company
- **Name:** ${input.companyName}
- **Tech Stack:** ${input.techStack.join(", ")}

## Task (written in the manager's voice — this is what the candidate was told)
${input.taskDescription}

## Your Job
Analyze the task above and identify what static reference materials this candidate needs to do the work. Think about:
- What data or metrics do they need to look at?
- What existing system documentation would help them understand the current state?
- What specs, schemas, or API docs would they need to reference?
- What decisions or context from previous work is relevant?

Generate ONLY the resources that fill real information gaps. Every resource must have substantial, realistic content.

## Critical Requirements
1. **Content must be LONG and DETAILED.** Each resource content field must be 500+ words. Tables must have 8+ data rows with specific numbers. No short stubs.
2. **Resources must cross-reference each other.** End every resource with a "See Also" section listing the other resources by their exact label. Within the body, reference data and concepts from other resources (e.g., "As shown in the [GPU Fleet Dashboard], current utilization is...").
3. **Everything must be internally consistent.** If the dashboard shows a metric at 2.14%, the memo discussing that metric must cite 2.14%. Names, dates, and systems must match across all resources.`;
}


function cleanJsonResponse(text: string): string {
  let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return cleaned.trim();
}
