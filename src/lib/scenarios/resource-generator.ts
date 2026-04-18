/**
 * Resource Generator
 *
 * Auto-generates scenario resources (repos, databases, spreadsheets, dashboards, etc.)
 * based on the task description, tech stack, and company context.
 */

import { gemini } from "@/lib/ai/gemini";
import { createLogger } from "@/lib/core";
import { buildLanguageInstruction, type SupportedLanguage } from "@/lib/core/language";
import {
  RESOURCE_GENERATOR_SYSTEM_PROMPT,
  RESOURCE_GENERATOR_PROMPT_VERSION,
} from "@/prompts/recruiter/resource-generator";
import type { ScenarioResource } from "@/types";
import { z } from "zod";
import { Type } from "@google/genai";

const logger = createLogger("lib:scenarios:resource-generator");

const GENERATION_MODEL = "gemini-3-pro-preview";
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

/** Minimum content length (characters) by resource type — enforced as validation errors.
 *  Rule of thumb: ~5-6 chars per word, so 2500 chars ≈ 450 words. */
const MIN_CONTENT_LENGTH: Record<string, number> = {
  document: 2500,
  repository: 2500,
  api: 2000,
  dashboard: 2000,
  spreadsheet: 1500,
  database: 2000,
  custom: 1500,
};

const resourceSchema = z.object({
  type: z.enum(VALID_RESOURCE_TYPES),
  label: z.string().min(1),
  credentials: z.string().nullish().transform((v) => v ?? undefined),
  instructions: z.string().nullish().transform((v) => v ?? undefined),
  content: z.string().min(1500, "Resource content must be at least 1500 characters"),
});

export type GenerateResourcesInput = {
  companyName: string;
  taskDescription: string;
  techStack: string[];
  /** The candidate's role name, e.g. "Senior Backend Engineer", "Product Manager" */
  roleName: string;
  /** The candidate's seniority level */
  seniorityLevel: string;
  language: SupportedLanguage;
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
      const languageInstruction = buildLanguageInstruction(input.language);
      const systemInstruction = languageInstruction
        ? `${languageInstruction}\n\n${RESOURCE_GENERATOR_SYSTEM_PROMPT}`
        : RESOURCE_GENERATOR_SYSTEM_PROMPT;

      const response = await gemini.models.generateContent({
        model: GENERATION_MODEL,
        config: {
          systemInstruction,
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

      let resources = parseAndValidateResources(responseText);
      validateRoleSpecificResources(resources, input.roleName);

      // Post-processing: deterministic cleanup
      resources = postProcessResources(resources);

      // Targeted code patch for engineering roles with missing references
      const { isEngineeringRole } = getRoleCategories(input.roleName);
      if (isEngineeringRole) {
        const missingRefs = findMissingCodeReferences(resources, input.taskDescription);
        if (missingRefs.length > 0) {
          logger.info("Detected missing code references, patching", {
            missing: missingRefs,
          });
          resources = await patchMissingCode(resources, missingRefs, input);
        }
      }

      // Add language field to each resource
      const resourcesWithLanguage = resources.map(resource => ({
        ...resource,
        language: input.language,
      }));

      return {
        resources: resourcesWithLanguage,
        _meta: {
          promptVersion: RESOURCE_GENERATOR_PROMPT_VERSION,
          generatedAt: new Date().toISOString(),
        },
        _debug: {
          promptText: `[System Instruction]\n${systemInstruction}\n\n[User Message]\n${contextPrompt}`,
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
      !lower.includes("machine learning") &&
      !lower.includes("qa") &&
      !lower.includes("test automation") &&
      !lower.includes("quality"),
    isSecurityRole:
      lower.includes("security") ||
      lower.includes("pen test") ||
      lower.includes("appsec"),
  };
}

/**
 * Detect code-like content in a resource.
 * Gemini JSON schema mode often avoids triple backticks in JSON strings,
 * so we also check for inline code (`code`), function signatures, shell commands, etc.
 */
function hasCodeLikeContent(content: string): boolean {
  // Fenced code blocks (ideal case)
  if (/```/.test(content)) return true;
  // Inline code with function-like patterns: `functionName()`, `module.method()`
  if (/`[a-zA-Z_]\w*(\.\w+)*\([^)]*\)`/.test(content)) return true;
  // Shell commands in inline code: `npm install`, `git clone`, `docker run`, etc.
  if (/`(npm|yarn|pnpm|pip|go|cargo|docker|kubectl|terraform|git|curl|make)\s/.test(content)) return true;
  // Function/method definitions (various languages)
  if (/\b(function|func|def|fn|async|export|class|impl)\s+\w+/.test(content)) return true;
  // Code-like lines with common patterns: import/require, arrows, variable assignments
  if (/\b(import|require|from|const|let|var|val)\s+\w+/.test(content)) return true;
  return false;
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
    // Check for code content — fenced blocks OR inline code patterns
    // (Gemini JSON mode often avoids triple backticks in JSON strings)
    const hasCodeContent = repos.some((r) => hasCodeLikeContent(r.content ?? ""));
    if (!hasCodeContent) {
      throw new Error(
        `Engineering role "${roleName}" requires repository with code snippets (function definitions, commands, or inline code)`
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
    const hasCodeSnippet = docs.some((r) => hasCodeLikeContent(r.content ?? ""));
    if (!hasCodeSnippet) {
      throw new Error(
        `Security role "${roleName}" requires document with code snippets showing vulnerabilities`
      );
    }
  }
}

// ─── Post-Processing Pipeline ───────────────────────────────────────
// Deterministic cleanup that runs on every generated resource set.
// Catches issues the prompt can't reliably prevent.

/**
 * Strip external URLs from resource content.
 */
function stripExternalUrls(content: string): string {
  let cleaned = content.replace(
    /\[([^\]]+)\]\((?:https?:\/\/|git@)[^)]+\)/g,
    "$1"
  );
  cleaned = cleaned.replace(
    /`?git\s+clone\s+\S+`?/g,
    "`# repo already cloned locally`"
  );
  cleaned = cleaned.replace(
    /(?:https?:\/\/|git@)[^\s)>\]]+/g,
    "(see internal documentation)"
  );
  return cleaned;
}

/**
 * Clean dangling references to external tools the candidate can't access.
 */
function cleanDanglingReferences(content: string): string {
  let cleaned = content;

  // Slack channel action references: "reach out on #channel" → "reach out to your coworkers"
  cleaned = cleaned.replace(
    /(?:reach out (?:to|on|in|via)|contact|ping|ask in|post (?:to|in)|check)\s+#[\w-]+/gi,
    (match) => match.replace(/#[\w-]+/, "your coworkers")
  );

  // Standalone Slack channel in contact/on-call sections
  cleaned = cleaned.replace(
    /(?:Slack(?:\s+channel)?:\s*)#[\w-]+/gi,
    "Slack channel (ask your coworkers)"
  );

  // PagerDuty/OpsGenie references
  cleaned = cleaned.replace(
    /(?:PagerDuty|OpsGenie|incident\.io)\s+(?:rotation|schedule|escalation|under)[^.\n]*/gi,
    "on-call rotation (ask your manager)"
  );

  // "Check the [monitoring tool] dashboard" → point to provided resources
  cleaned = cleaned.replace(
    /(?:check|see|view|open|visit|go to|navigate to)\s+(?:the\s+)?(?:Grafana|Datadog|Kibana|Splunk|New Relic|CloudWatch|Prometheus)\s+(?:dashboard|board|console|UI)[^.\n]*/gi,
    "see the metrics in the dashboard resource"
  );

  // "Open the JIRA/Linear board" → point to known issues
  cleaned = cleaned.replace(
    /(?:check|see|view|open|visit)\s+(?:the\s+)?(?:JIRA|Linear|Asana|Trello|Shortcut)\s+(?:board|project|sprint|backlog)[^.\n]*/gi,
    "see the known issues listed above"
  );

  // Bare ticket references without inline context: "JIRA-1234" not followed by ": description"
  cleaned = cleaned.replace(
    /\b((?:JIRA|TICKET|LINEAR|ISSUE|BUG|TASK|SRE|INFRA|ENG)-\d+)\b(?!\s*[:—–-]\s*\S)/g,
    "$1 (see context above)"
  );

  return cleaned;
}

/**
 * Fix "See Also" sections to only reference resources that actually exist in the set.
 */
function fixSeeAlsoReferences(
  content: string,
  otherLabels: string[]
): string {
  const seeAlsoPattern = /(\*\*See Also:\*\*|\*\*Related:\*\*|## See Also|## Related)/i;
  const seeAlsoMatch = content.match(seeAlsoPattern);
  if (!seeAlsoMatch) return content;

  const seeAlsoIdx = content.lastIndexOf(seeAlsoMatch[0]);
  const beforeSeeAlso = content.slice(0, seeAlsoIdx);
  const seeAlsoSection = content.slice(seeAlsoIdx);

  // Check if any existing labels are referenced
  const hasValidRef = otherLabels.some((label) => {
    const shortLabel = label.slice(0, Math.min(20, label.length)).toLowerCase();
    return seeAlsoSection.toLowerCase().includes(shortLabel);
  });

  if (!hasValidRef && otherLabels.length > 0) {
    // Rewrite See Also with actual labels
    const refList = otherLabels.map((l) => `- ${l}`).join("\n");
    return `${beforeSeeAlso}---\n\n**See Also:**\n${refList}`;
  }

  return content;
}

/**
 * Extract file/function/hook names from a task description.
 * Only meaningful for engineering roles.
 */
function extractCodeReferences(taskDescription: string): string[] {
  const refs: string[] = [];

  // File paths: src/something/file.ts
  const filePaths = taskDescription.match(
    /(?:src|lib|app|components|hooks|features|modules|utils|services|handlers)\/[\w/./-]+\.\w+/g
  );
  if (filePaths) refs.push(...filePaths);

  // React hooks: useXxx
  const hooks = taskDescription.match(/\buse[A-Z]\w+/g);
  if (hooks) refs.push(...hooks);

  // Component/class names in backticks: `CommentCard`, `BidHandler`
  const backticked = taskDescription.match(/`([A-Z]\w+)`/g);
  if (backticked) refs.push(...backticked.map((q) => q.replace(/`/g, "")));

  // Named patterns: "the XyzHandler", "the processPayment function"
  const namedCode = taskDescription.match(
    /(?:the\s+)`?(\w+(?:Handler|Service|Controller|Processor|Manager|Factory|Provider|Client|Worker|Queue|Pipeline|Resolver|Middleware))`?/gi
  );
  if (namedCode) {
    refs.push(
      ...namedCode.map((m) =>
        m.replace(/^the\s+/i, "").replace(/`/g, "")
      )
    );
  }

  return [...new Set(refs)];
}

/**
 * Check if repository resources contain code for files/functions
 * mentioned in the task. Returns names that are missing.
 */
function findMissingCodeReferences(
  resources: ScenarioResource[],
  taskDescription: string
): string[] {
  const codeRefs = extractCodeReferences(taskDescription);
  if (codeRefs.length === 0) return [];

  const allContent = resources.map((r) => r.content ?? "").join("\n");

  return codeRefs.filter((ref) => {
    // Get the base name (e.g., "useComments" from "src/hooks/useComments.ts")
    const baseName = ref.split("/").pop()?.replace(/\.\w+$/, "") ?? ref;
    return !allContent.toLowerCase().includes(baseName.toLowerCase());
  });
}

/**
 * Full post-processing pipeline for a resource set.
 */
function postProcessResources(
  resources: ScenarioResource[]
): ScenarioResource[] {
  const allLabels = resources.map((r) => r.label);

  return resources.map((r) => {
    let content = r.content ?? "";
    content = stripExternalUrls(content);
    content = cleanDanglingReferences(content);
    content = fixSeeAlsoReferences(content, allLabels.filter((l) => l !== r.label));
    return { ...r, content };
  });
}

/**
 * Targeted regeneration: if the task mentions specific code that's missing
 * from the resources, ask the LLM to add it to the repository resource.
 * Only runs for engineering roles when post-processing detects gaps.
 */
async function patchMissingCode(
  resources: ScenarioResource[],
  missingRefs: string[],
  input: GenerateResourcesInput
): Promise<ScenarioResource[]> {
  const repoIdx = resources.findIndex((r) => r.type === "repository");
  if (repoIdx === -1) return resources;

  const repo = resources[repoIdx];
  const missingList = missingRefs.slice(0, 5).join(", "); // Cap at 5 to keep prompt short

  logger.info("Patching missing code references into repository resource", {
    missing: missingList,
    repoLabel: repo.label,
  });

  try {
    const response = await gemini.models.generateContent({
      model: GENERATION_MODEL,
      config: {
        temperature: 0.3,
        responseMimeType: "text/plain",
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are updating a repository README for a ${input.roleName} simulation.

The task asks the candidate to work on: ${missingList}

But the current README doesn't include the implementation code for these. The candidate can ONLY see what's in this document — they cannot browse the codebase.

Here is the current README content:
${repo.content}

Add a new section called "## Key Source Files" BEFORE the "Known Issues" or "See Also" section. Include realistic implementation code snippets (20-40 lines each) for: ${missingList}

Return the COMPLETE updated README content. Do not remove any existing content. Do not add any URLs.`,
            },
          ],
        },
      ],
    });

    const patchedContent = response.text;
    if (patchedContent && patchedContent.length > (repo.content ?? "").length) {
      const updated = [...resources];
      updated[repoIdx] = { ...repo, content: stripExternalUrls(patchedContent) };
      return updated;
    }
  } catch (error) {
    logger.warn("Failed to patch missing code, using original resources", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return resources;
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

    // Strip any external URLs that slipped through despite prompt instructions
    result.data.content = stripExternalUrls(result.data.content);

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
3. **Everything must be internally consistent.** If the dashboard shows a metric at 2.14%, the memo discussing that metric must cite 2.14%. Names, dates, and systems must match across all resources.
4. **ZERO external URLs.** The candidate reads these resources inline — they cannot click links or visit websites. Do NOT include git clone URLs, GitHub links, Grafana/Datadog dashboard links, JIRA/Linear links, Confluence/Notion links, or ANY http/https/git@ URL. For repos, start Quick Start with local commands (npm install, mvn install, etc.) — the code is already cloned. Reference other information by naming the resource (e.g., "See the Auction Service Logging resource") not by URL.`;
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
