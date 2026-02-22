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

  // --- Semantic validation: cross-reference checks ---
  const filePaths = new Set(spec.files.map((f) => f.path));

  // Check README doesn't reference files that don't exist
  const readmeFileRefs = Array.from(
    spec.readmeContent.matchAll(
      /(?:\.env\.example|(?:src|docs|tests|prisma)\/[\w./-]+\.\w+)/g
    )
  );
  for (const match of readmeFileRefs) {
    const ref = match[0];
    if (!filePaths.has(ref)) {
      // Special handling for .env.example - auto-create if referenced in README
      if (ref === ".env.example") {
        console.log("[validateInternalConsistency] Auto-adding missing .env.example referenced in README");
        spec.files.push({
          path: ".env.example",
          content: "# Environment Variables\n\n# Database\nDATABASE_URL=postgresql://user:password@localhost:5432/dbname\n\n# Redis\nREDIS_URL=redis://localhost:6379\n\n# API Keys\n# API_KEY=your-api-key-here\n\n# Feature Flags\nENABLE_FEATURE_X=false\n",
          addedInCommit: 0,
          isStub: false
        });
        filePaths.add(".env.example");
      } else {
        throw new Error(
          `README references "${ref}" but file not found in spec. Add it to files[] or remove the reference.`
        );
      }
    }
  }

  // Check issue bodies and comments don't reference phantom files
  for (const issue of spec.issues) {
    const allText = [
      issue.body,
      ...issue.comments.map((c) => c.body),
    ].join("\n");

    // Match backtick-wrapped file paths and bare src/ paths
    const issueFileRefs = Array.from(
      allText.matchAll(
        /`((?:src|docs|tests|prisma)\/[\w./-]+\.\w+)`|((?:src|docs|tests|prisma)\/[\w./-]+\.\w+)/g
      )
    );
    for (const match of issueFileRefs) {
      const ref = match[1] || match[2];
      if (!filePaths.has(ref)) {
        throw new Error(
          `Issue "${issue.title}" references "${ref}" but file not found in spec. Add it to files[] or remove the reference.`
        );
      }
    }
  }

  // Check code imports reference files that exist in the spec
  for (const file of spec.files) {
    if (!file.path.endsWith(".ts") && !file.path.endsWith(".tsx")) continue;

    // Match relative imports: import ... from '../lib/db' or './utils'
    const relativeImports = Array.from(
      file.content.matchAll(
        /(?:import|from)\s+['"](\.[^'"]+)['"]/g
      )
    );
    for (const match of relativeImports) {
      const importPath = match[1];
      const resolved = resolveRelativeImport(file.path, importPath);
      if (resolved && !filePaths.has(resolved)) {
        // Also check with common extensions
        const withExt = [resolved, `${resolved}.ts`, `${resolved}.tsx`, `${resolved}/index.ts`];
        if (!withExt.some((p) => filePaths.has(p))) {
          throw new Error(
            `File "${file.path}" imports "${importPath}" which resolves to "${resolved}" but file not found in spec.`
          );
        }
      }
    }

    // Match alias imports: import ... from '@/lib/db'
    const aliasImports = Array.from(
      file.content.matchAll(
        /(?:import|from)\s+['"]@\/([^'"]+)['"]/g
      )
    );
    for (const match of aliasImports) {
      const aliasPath = `src/${match[1]}`;
      const withExt = [aliasPath, `${aliasPath}.ts`, `${aliasPath}.tsx`, `${aliasPath}/index.ts`];
      if (!withExt.some((p) => filePaths.has(p))) {
        throw new Error(
          `File "${file.path}" imports "@/${match[1]}" which resolves to "${aliasPath}" but file not found in spec.`
        );
      }
    }
  }

  // Check for duplicate file paths
  if (filePaths.size !== spec.files.length) {
    const seen = new Set<string>();
    for (const file of spec.files) {
      if (seen.has(file.path)) {
        throw new Error(`Duplicate file path: "${file.path}"`);
      }
      seen.add(file.path);
    }
  }
}

/**
 * Resolve a relative import path against a source file's directory.
 * e.g., resolveRelativeImport("src/services/webhook.ts", "../lib/db") → "src/lib/db"
 */
function resolveRelativeImport(
  sourcePath: string,
  importPath: string
): string | null {
  const parts = sourcePath.split("/");
  parts.pop(); // remove filename

  for (const segment of importPath.split("/")) {
    if (segment === "..") {
      if (parts.length === 0) return null;
      parts.pop();
    } else if (segment !== ".") {
      parts.push(segment);
    }
  }

  return parts.join("/");
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
