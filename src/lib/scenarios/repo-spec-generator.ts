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
import { createLogger } from "@/lib/core";

const logger = createLogger("lib:scenarios:repo-spec-generator");

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
 * @param options - Optional v2-pipeline context (plan + docs + judgeFeedback)
 * @returns Validated RepoSpec ready for the builder
 * @throws Error if generation fails after all attempts
 */
export async function generateRepoSpec(
  metadata: ScenarioMetadata,
  options: { extraContext?: string } = {}
): Promise<GenerateRepoSpecResponse> {
  const scaffold = selectScaffold(metadata.techStack);
  const baseContext = buildContextPrompt(metadata, scaffold.id);
  const contextPrompt = options.extraContext
    ? `${baseContext}\n\n## Additional Context (v2 plan / judge feedback)\n\n${options.extraContext}`
    : baseContext;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      logger.info("Generation attempt started", {
        attempt,
        maxAttempts: MAX_GENERATION_ATTEMPTS,
        companyName: metadata.companyName,
      });

      const retryNote = lastError
        ? `\n\n## Previous attempt failed validation\n\nFix this exact issue in your output:\n\n  ${lastError.message}\n\nIf the missing file should exist, add it to \`files[]\`. If the import is wrong, change the import path. Do not regenerate from scratch — just fix the specific issue.`
        : "";

      const response = await gemini.models.generateContent({
        model: GENERATION_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${REPO_SPEC_GENERATOR_PROMPT}\n\n## Context for Generation\n\n${contextPrompt}${retryNote}`,
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

      logger.info("Generation succeeded", {
        fileCount: spec.files.length,
        commitCount: spec.commitHistory.length,
        issueCount: spec.issues.length,
      });

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
        logger.warn("Generation attempt failed, retrying", {
          attempt,
          error: lastError.message,
        });
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
        logger.info("Auto-adding missing .env.example referenced in README");
        spec.files.push({
          path: ".env.example",
          content: "# Environment Variables\n\n# Database\nDATABASE_URL=postgresql://user:password@localhost:5432/dbname\n\n# Redis\nREDIS_URL=redis://localhost:6379\n\n# API Keys\n# API_KEY=your-api-key-here\n\n# Feature Flags\nENABLE_FEATURE_X=false\n",
          purpose: "config",
          addedInCommit: 0
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
        const withExt = [resolved, `${resolved}.ts`, `${resolved}.tsx`, `${resolved}/index.ts`];
        if (withExt.some((p) => filePaths.has(p))) continue;
        if (tryAutoCreateScaffoldStub(spec, filePaths, resolved)) continue;
        throw new Error(
          `File "${file.path}" imports "${importPath}" which resolves to "${resolved}" but file not found in spec.`
        );
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
      if (withExt.some((p) => filePaths.has(p))) continue;
      if (tryAutoCreateScaffoldStub(spec, filePaths, aliasPath)) continue;
      throw new Error(
        `File "${file.path}" imports "@/${match[1]}" which resolves to "${aliasPath}" but file not found in spec.`
      );
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
 * Stubs for canonical scaffold-baseline files the model commonly imports
 * but forgets to define (Prisma client, tRPC bootstrap, etc). Keyed by the
 * resolved-without-extension path. Anything not in this table still throws
 * — we don't want auto-create to mask real hallucinations.
 */
const PRISMA_STUB = `import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const db = prisma;
export default prisma;
`;

const TRPC_STUB = `import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { prisma } from '@/lib/prisma';

export interface Context {
  prisma: typeof prisma;
  userId?: string;
}

export const createContext = async (): Promise<Context> => ({ prisma });

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx });
});
`;

const TRPC_CLIENT_STUB = `import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();
`;

const LOGGER_STUB = `type Level = 'info' | 'warn' | 'error' | 'debug';

function log(level: Level, msg: string, data?: unknown) {
  // eslint-disable-next-line no-console
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(\`[\${level}] \${msg}\`, data ?? '');
}

export const logger = {
  info: (msg: string, data?: unknown) => log('info', msg, data),
  warn: (msg: string, data?: unknown) => log('warn', msg, data),
  error: (msg: string, data?: unknown) => log('error', msg, data),
  debug: (msg: string, data?: unknown) => log('debug', msg, data),
};
`;

const SCAFFOLD_STUBS: Record<string, string> = {
  "src/lib/prisma": PRISMA_STUB,
  "src/lib/db": PRISMA_STUB,
  "src/server/db": PRISMA_STUB,
  "src/server/prisma": PRISMA_STUB,
  "src/server/trpc": TRPC_STUB,
  "src/lib/trpc": TRPC_STUB,
  "src/server/api/trpc": TRPC_STUB,
  "src/utils/trpc": TRPC_CLIENT_STUB,
  "src/lib/trpc-client": TRPC_CLIENT_STUB,
  "src/lib/logger": LOGGER_STUB,
  "src/server/logger": LOGGER_STUB,
};

function tryAutoCreateScaffoldStub(
  spec: RepoSpec,
  filePaths: Set<string>,
  resolved: string
): boolean {
  const stub = SCAFFOLD_STUBS[resolved];
  if (!stub) return false;
  const path = `${resolved}.ts`;
  logger.info("Auto-adding missing scaffold stub", { path });
  spec.files.push({
    path,
    content: stub,
    purpose: "working",
    addedInCommit: 0,
  });
  filePaths.add(path);
  return true;
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
