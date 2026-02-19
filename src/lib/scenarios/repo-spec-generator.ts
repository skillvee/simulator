/**
 * Repo Spec Generator
 *
 * Uses Gemini Flash to generate a RepoSpec JSON from scenario metadata.
 * The RepoSpec is then passed to the repo-builder to materialize on GitHub.
 *
 * Follows the same pattern as task-generator and coworker-generator:
 * build context prompt → call Gemini → parse JSON → validate with Zod → retry on failure.
 */

import { gemini } from "@/lib/ai/gemini";
import {
  REPO_SPEC_GENERATOR_PROMPT,
  REPO_SPEC_GENERATOR_PROMPT_VERSION,
} from "@/prompts/recruiter/repo-spec-generator";
import {
  repoSpecSchema,
  selectScaffold,
  type RepoSpec,
  type ScenarioMetadata,
} from "./repo-spec";

const GENERATION_MODEL = "gemini-3-flash-preview";
const MAX_GENERATION_ATTEMPTS = 2;

export interface GenerateRepoSpecResponse {
  spec: RepoSpec;
  _meta: {
    promptVersion: string;
    generatedAt: string;
    attempts: number;
  };
}

/**
 * Generate a complete RepoSpec from scenario metadata.
 *
 * @param metadata - Scenario context (company, task, tech stack, coworkers)
 * @returns Validated RepoSpec ready for the builder
 * @throws Error if generation fails after all attempts
 */
export async function generateRepoSpec(
  metadata: ScenarioMetadata
): Promise<GenerateRepoSpecResponse> {
  const scaffold = selectScaffold(metadata.techStack);
  const contextPrompt = buildContextPrompt(metadata, scaffold.id);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      console.log(
        `[generateRepoSpec] Attempt ${attempt}/${MAX_GENERATION_ATTEMPTS} for "${metadata.companyName}"`
      );

      const response = await gemini.models.generateContent({
        model: GENERATION_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${REPO_SPEC_GENERATOR_PROMPT}\n\n## Context for Generation\n\n${contextPrompt}`,
              },
            ],
          },
        ],
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini");
      }

      const spec = parseAndValidateSpec(responseText);

      // Additional consistency checks
      validateInternalConsistency(spec);

      console.log(
        `[generateRepoSpec] Success: ${spec.files.length} files, ${spec.commitHistory.length} commits, ${spec.issues.length} issues`
      );

      return {
        spec,
        _meta: {
          promptVersion: REPO_SPEC_GENERATOR_PROMPT_VERSION,
          generatedAt: new Date().toISOString(),
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
        console.warn(
          `[generateRepoSpec] Attempt ${attempt} failed: ${lastError.message}, retrying...`
        );
        continue;
      }
    }
  }

  throw lastError ?? new Error("Failed to generate repo spec");
}

/**
 * Build the context prompt from scenario metadata.
 */
function buildContextPrompt(
  metadata: ScenarioMetadata,
  scaffoldId: string
): string {
  const coworkerList = metadata.coworkers
    .map((c) => {
      const criticalKnowledge = c.knowledge
        .filter((k) => k.isCritical)
        .map((k) => `    - ${k.topic}: ${k.response}`)
        .join("\n");

      return `- **${c.name}** (${c.role}): ${c.personaStyle}\n  Critical knowledge:\n${criticalKnowledge}`;
    })
    .join("\n\n");

  return `**Company Name:** ${metadata.companyName}
**Company Description:** ${metadata.companyDescription}
**Scenario Name:** ${metadata.name}
**Target Level:** ${metadata.targetLevel}
**Tech Stack:** ${metadata.techStack.join(", ")}
**Scaffold:** ${scaffoldId}

**Task Description (written as manager speaking to candidate):**
${metadata.taskDescription}

**Team Members (coworkers the candidate will interact with):**
${coworkerList}

Generate a complete RepoSpec for this scenario. The repo should feel like a real codebase at ${metadata.companyName}, not a toy exercise. Use the coworker names as git authors and issue commenters. Make the project name something that fits ${metadata.companyName}'s domain.`;
}

/**
 * Parse and validate the AI-generated JSON into a RepoSpec.
 */
function parseAndValidateSpec(responseText: string): RepoSpec {
  const cleaned = cleanJsonResponse(responseText);
  const parsed = JSON.parse(cleaned);

  const result = repoSpecSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid RepoSpec: ${issues}`);
  }

  return result.data;
}

/**
 * Validate internal consistency of a RepoSpec.
 * Ensures cross-references between files, commits, issues, and authors are valid.
 */
function validateInternalConsistency(spec: RepoSpec): void {
  const authorNames = new Set(spec.authors.map((a) => a.name));
  const maxCommitIndex = spec.commitHistory.length - 1;

  // Every commit author must exist in authors
  for (const commit of spec.commitHistory) {
    if (!authorNames.has(commit.authorName)) {
      throw new Error(
        `Commit author "${commit.authorName}" not found in authors list`
      );
    }
  }

  // Every file's addedInCommit must be a valid commit index
  for (const file of spec.files) {
    if (file.addedInCommit > maxCommitIndex) {
      throw new Error(
        `File "${file.path}" references commit index ${file.addedInCommit} but only ${spec.commitHistory.length} commits exist`
      );
    }
  }

  // Every issue comment author must exist in authors
  for (const issue of spec.issues) {
    for (const comment of issue.comments) {
      if (!authorNames.has(comment.authorName)) {
        throw new Error(
          `Issue comment author "${comment.authorName}" not found in authors list`
        );
      }
    }
  }

  // Exactly one main task issue
  const mainTaskIssues = spec.issues.filter((i) => i.isMainTask);
  if (mainTaskIssues.length !== 1) {
    throw new Error(
      `Expected exactly 1 main task issue, found ${mainTaskIssues.length}`
    );
  }

  // Main task issue must be open
  if (mainTaskIssues[0].state !== "open") {
    throw new Error("Main task issue must be open");
  }
}

/**
 * Clean JSON response by removing markdown code fences and extracting the JSON object.
 */
function cleanJsonResponse(text: string): string {
  let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");

  // Extract the outermost { ... }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  return cleaned.trim();
}
