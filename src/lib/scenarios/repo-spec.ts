/**
 * RepoSpec — Structured specification for AI-generated assessment repositories.
 *
 * The AI generates a RepoSpec JSON, then a deterministic builder materializes
 * it into a GitHub repo on top of a clean scaffold. This separation ensures:
 * - Scaffolds guarantee compilable code (npm install && npm run build works)
 * - AI only generates creative/domain content (stubs, TODOs, docs, issues)
 * - The intermediate format is testable, cacheable, and debuggable
 */

import { z } from "zod";
import { createLogger } from "@/lib/core";

const logger = createLogger("lib:scenarios:repo-spec");

// ---------------------------------------------------------------------------
// Scaffold definitions
// ---------------------------------------------------------------------------

export const SCAFFOLD_IDS = ["nextjs-ts", "express-ts"] as const;
export type ScaffoldId = (typeof SCAFFOLD_IDS)[number];

export interface Scaffold {
  id: ScaffoldId;
  name: string;
  repoTemplate: string; // GitHub org/repo for the clean scaffold
  matchesTechStack: string[];
  description: string;
  devCommand: string;
  installCommand: string;
  testCommand: string;
  /**
   * Files the scaffold ships with. Used to:
   *   1. Tell the planner what's already in the repo (so docs don't claim
   *      missing files).
   *   2. Tell the spec generator what NOT to re-create.
   */
  baselineFiles: string[];
  /**
   * Short, planner-readable description of how the codebase is laid out.
   * Embedded in the plan-and-docs prompt so the model writes paths that
   * actually exist in the repo (e.g. `src/app/` for App Router scaffolds).
   */
  layoutDescription: string;
}

export const SCAFFOLDS: Scaffold[] = [
  {
    id: "nextjs-ts",
    name: "Next.js + TypeScript + Prisma",
    repoTemplate: "skillvee/scaffold-nextjs-ts",
    matchesTechStack: [
      "nextjs", "next.js", "next", "react", "typescript", "ts",
      "frontend", "fullstack", "full-stack", "prisma", "tailwind",
      "monorepo",
    ],
    description: "Clean Next.js 15 + TypeScript + Prisma + Tailwind scaffold",
    devCommand: "npm run dev",
    installCommand: "npm install",
    testCommand: "npm test",
    baselineFiles: [
      ".gitignore",
      "README.md",
      "eslint.config.mjs",
      "next.config.ts",
      "package.json",
      "package-lock.json",
      "postcss.config.mjs",
      "prisma.config.ts",
      "prisma/schema.prisma",
      "src/app/globals.css",
      "src/app/layout.tsx",
      "src/app/page.tsx",
      "tsconfig.json",
      "vitest.config.ts",
    ],
    layoutDescription: `Next.js 15 with the **App Router** (\`src/app/\`, NOT \`src/pages/\`).
- Server code lives under \`src/app/api/<route>/route.ts\` for API endpoints, and \`src/app/<page>/page.tsx\` for pages.
- The scaffold ships with \`prisma/schema.prisma\`, \`src/app/layout.tsx\`, \`src/app/page.tsx\`, \`package.json\`, \`tsconfig.json\`, \`next.config.ts\`, \`eslint.config.mjs\`, \`vitest.config.ts\`. Don't tell the candidate to create these.
- There is **no** \`docker-compose.yml\` and **no** \`prisma/seed.ts\` in the scaffold. If your task assumes them, the spec generator will need to add them.
- Common idioms in this stack: tRPC routers under \`src/server/routers/\`, Prisma client at \`src/lib/prisma.ts\` or \`src/server/db.ts\`, shared utilities under \`src/lib/\`.`,
  },
  {
    id: "express-ts",
    name: "Express + TypeScript + Prisma",
    repoTemplate: "skillvee/scaffold-express-ts",
    matchesTechStack: [
      "express", "node", "nodejs", "node.js", "backend", "api",
      "rest", "typescript", "ts",
    ],
    description: "Clean Express + TypeScript + Prisma scaffold",
    devCommand: "npm run dev",
    installCommand: "npm install",
    testCommand: "npm test",
    baselineFiles: [
      ".gitignore",
      "README.md",
      "package.json",
      "package-lock.json",
      "prisma/schema.prisma",
      "src/index.ts",
      "tsconfig.json",
      "vitest.config.ts",
    ],
    layoutDescription: `Plain Express + TypeScript server.
- Entry point is \`src/index.ts\`. Add routes under \`src/routes/\` and services under \`src/services/\`.
- The scaffold ships with \`prisma/schema.prisma\`, \`src/index.ts\`, \`package.json\`, \`tsconfig.json\`, \`vitest.config.ts\`. Don't tell the candidate to create these.
- There is **no** \`docker-compose.yml\` and **no** \`prisma/seed.ts\` in the scaffold.`,
  },
];

// ---------------------------------------------------------------------------
// Zod schemas for RepoSpec (validated from AI output)
// ---------------------------------------------------------------------------

export const authorSpecSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().min(1),
});

export const issueCommentSpecSchema = z.object({
  authorName: z.string().min(1),
  body: z.string().min(1),
});

export const issueSpecSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(10),
  labels: z.array(z.string()).default([]),
  state: z.enum(["open", "closed"]),
  isMainTask: z.boolean(),
  comments: z.array(issueCommentSpecSchema).default([]),
});

export const fileSpecSchema = z.object({
  path: z.string().min(1),
  content: z.string(), // Can be empty for placeholder files
  purpose: z.enum(["stub", "working", "test", "doc", "config"]),
  addedInCommit: z.number().int().min(0),
});

export const commitSpecSchema = z.object({
  message: z.string().min(1),
  authorName: z.string().min(1),
  authorEmail: z.string().email(),
  daysAgo: z.number().int().min(0),
});

export const repoSpecSchema = z.object({
  projectName: z.string().min(1),
  projectDescription: z.string().min(1),
  scaffoldId: z.enum(SCAFFOLD_IDS),
  readmeContent: z.string().min(50),
  files: z.array(fileSpecSchema).min(3),
  commitHistory: z.array(commitSpecSchema).min(3),
  issues: z.array(issueSpecSchema).min(2),
  authors: z.array(authorSpecSchema).min(2),
});

// ---------------------------------------------------------------------------
// TypeScript types (inferred from Zod)
// ---------------------------------------------------------------------------

export type AuthorSpec = z.infer<typeof authorSpecSchema>;
export type IssueCommentSpec = z.infer<typeof issueCommentSpecSchema>;
export type IssueSpec = z.infer<typeof issueSpecSchema>;
export type FileSpec = z.infer<typeof fileSpecSchema>;
export type CommitSpec = z.infer<typeof commitSpecSchema>;
export type RepoSpec = z.infer<typeof repoSpecSchema>;

// ---------------------------------------------------------------------------
// Input type for the generation pipeline
// ---------------------------------------------------------------------------

export interface ScenarioMetadata {
  name: string;
  companyName: string;
  companyDescription: string;
  taskDescription: string;
  techStack: string[];
  targetLevel: string;
  coworkers: Array<{
    name: string;
    role: string;
    personaStyle: string;
    knowledge: Array<{
      topic: string;
      triggerKeywords: string[];
      response: string;
      isCritical: boolean;
    }>;
  }>;
}

// ---------------------------------------------------------------------------
// Scaffold selection (replaces template selection)
// ---------------------------------------------------------------------------

/**
 * Select the best scaffold based on tech stack overlap.
 * Falls back to the first scaffold (Next.js) if no match found.
 */
export function selectScaffold(techStack: string[]): Scaffold {
  if (!techStack || techStack.length === 0) {
    logger.warn("No tech stack provided, using fallback");
    return SCAFFOLDS[0];
  }

  const normalizedStack = techStack.map((t) => t.toLowerCase().trim());

  const scores = SCAFFOLDS.map((scaffold) => {
    const matchCount = scaffold.matchesTechStack.filter((keyword) =>
      normalizedStack.some(
        (tech) => tech.includes(keyword) || keyword.includes(tech)
      )
    ).length;
    return { scaffold, matchCount };
  });

  scores.sort((a, b) => b.matchCount - a.matchCount);

  if (scores[0].matchCount === 0) {
    logger.warn("No scaffold matches for tech stack, using fallback", { techStack: techStack.join(", ") });
    return SCAFFOLDS[0];
  }

  logger.info("Selected scaffold for tech stack", { scaffold: scores[0].scaffold.name, matchCount: scores[0].matchCount, techStack: techStack.join(", ") });

  return scores[0].scaffold;
}

/**
 * Check if a scenario's tech stack requires a GitHub repository.
 */
export function needsRepo(techStack: string[]): boolean {
  if (!techStack || techStack.length === 0) return false;

  const normalizedStack = techStack.map((t) => t.toLowerCase().trim());

  return SCAFFOLDS.some((scaffold) =>
    scaffold.matchesTechStack.some((keyword) =>
      normalizedStack.some(
        (tech) => tech.includes(keyword) || keyword.includes(tech)
      )
    )
  );
}
