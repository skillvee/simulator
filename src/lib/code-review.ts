import { gemini } from "@/lib/gemini";
import { fetchGitHubPrContent, type PrSnapshot } from "@/lib/github";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

// ============================================================================
// Code Review Analysis Schemas
// ============================================================================

/**
 * Schema for individual code quality findings
 */
export const codeQualityFindingSchema = z.object({
  category: z.enum([
    "naming",
    "structure",
    "complexity",
    "duplication",
    "error_handling",
    "documentation",
    "performance",
    "type_safety",
    "formatting",
    "other",
  ]),
  severity: z.enum(["critical", "major", "minor", "suggestion"]),
  description: z.string(),
  fileHint: z.string().optional(), // Which file/area this applies to
  recommendation: z.string().optional(),
});

/**
 * Schema for pattern analysis findings
 */
export const patternFindingSchema = z.object({
  pattern: z.string(), // e.g., "Repository Pattern", "Dependency Injection"
  usage: z.enum(["correct", "partial", "incorrect", "missing"]),
  notes: z.string(),
  isStrength: z.boolean(),
});

/**
 * Schema for security findings
 */
export const securityFindingSchema = z.object({
  category: z.enum([
    "injection",
    "authentication",
    "authorization",
    "data_exposure",
    "cryptography",
    "input_validation",
    "dependency",
    "configuration",
    "other",
  ]),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  description: z.string(),
  fileHint: z.string().optional(),
  recommendation: z.string(),
});

/**
 * Schema for maintainability assessment
 */
export const maintainabilityAssessmentSchema = z.object({
  score: z.number().min(1).max(5),
  readability: z.number().min(1).max(5),
  modularity: z.number().min(1).max(5),
  testability: z.number().min(1).max(5),
  notes: z.array(z.string()),
});

/**
 * Full code review response schema
 */
export const codeReviewResponseSchema = z.object({
  // Overall scores (1-5 scale)
  overallScore: z.number().min(1).max(5),
  codeQualityScore: z.number().min(1).max(5),
  patternScore: z.number().min(1).max(5),
  securityScore: z.number().min(1).max(5),
  maintainabilityScore: z.number().min(1).max(5),

  // Detailed findings
  codeQualityFindings: z.array(codeQualityFindingSchema),
  patternFindings: z.array(patternFindingSchema),
  securityFindings: z.array(securityFindingSchema),
  maintainability: maintainabilityAssessmentSchema,

  // Summary
  summary: z.object({
    strengths: z.array(z.string()),
    areasForImprovement: z.array(z.string()),
    overallAssessment: z.string(),
    testCoverage: z.enum([
      "comprehensive",
      "adequate",
      "minimal",
      "none",
      "unknown",
    ]),
    codeStyleConsistency: z.enum(["excellent", "good", "fair", "poor"]),
    aiToolUsageEvident: z.boolean(),
  }),

  // File-level analysis
  filesAnalyzed: z.number(),
  linesChanged: z.object({
    additions: z.number(),
    deletions: z.number(),
  }),
});

export type CodeQualityFinding = z.infer<typeof codeQualityFindingSchema>;
export type PatternFinding = z.infer<typeof patternFindingSchema>;
export type SecurityFinding = z.infer<typeof securityFindingSchema>;
export type MaintainabilityAssessment = z.infer<
  typeof maintainabilityAssessmentSchema
>;
export type CodeReviewResponse = z.infer<typeof codeReviewResponseSchema>;

// ============================================================================
// Code Review Data Interface (for storage)
// ============================================================================

// Re-export CodeReviewData from centralized types for backwards compatibility
export type { CodeReviewData } from "@/types";
import type { CodeReviewData } from "@/types";

// Code review prompt is now centralized in src/prompts/analysis/code-review.ts
import { buildCodeReviewContext } from "@/prompts/analysis/code-review";

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Analyzes a PR's code using Gemini AI
 * @param prUrl - The GitHub PR URL to analyze
 * @param prSnapshot - Optional pre-fetched PR snapshot
 * @returns Code review analysis results
 */
export async function analyzeCodeReview(
  prUrl: string,
  prSnapshot?: PrSnapshot
): Promise<CodeReviewResponse> {
  // Fetch PR content if not provided
  const pr = prSnapshot || (await fetchGitHubPrContent(prUrl));

  if (pr.fetchError) {
    // Return a minimal response if we can't fetch the PR
    return {
      overallScore: 3,
      codeQualityScore: 3,
      patternScore: 3,
      securityScore: 3,
      maintainabilityScore: 3,
      codeQualityFindings: [],
      patternFindings: [],
      securityFindings: [],
      maintainability: {
        score: 3,
        readability: 3,
        modularity: 3,
        testability: 3,
        notes: [`Unable to analyze: ${pr.fetchError}`],
      },
      summary: {
        strengths: [],
        areasForImprovement: [],
        overallAssessment: `Unable to fetch PR for analysis: ${pr.fetchError}`,
        testCoverage: "unknown",
        codeStyleConsistency: "fair",
        aiToolUsageEvident: false,
      },
      filesAnalyzed: 0,
      linesChanged: { additions: 0, deletions: 0 },
    };
  }

  if (!pr.diff || pr.diff.length === 0) {
    return {
      overallScore: 3,
      codeQualityScore: 3,
      patternScore: 3,
      securityScore: 3,
      maintainabilityScore: 3,
      codeQualityFindings: [],
      patternFindings: [],
      securityFindings: [],
      maintainability: {
        score: 3,
        readability: 3,
        modularity: 3,
        testability: 3,
        notes: ["No diff content available for analysis"],
      },
      summary: {
        strengths: [],
        areasForImprovement: [],
        overallAssessment: "No code changes found in this PR.",
        testCoverage: "unknown",
        codeStyleConsistency: "fair",
        aiToolUsageEvident: false,
      },
      filesAnalyzed: 0,
      linesChanged: { additions: 0, deletions: 0 },
    };
  }

  // Build context for analysis using centralized prompt
  const contextText = buildCodeReviewContext({
    title: pr.title,
    body: pr.body,
    author: pr.author,
    changedFiles: pr.changedFiles,
    additions: pr.additions,
    deletions: pr.deletions,
    commits: pr.commits,
    diff: pr.diff,
  });

  // Call Gemini for analysis
  const result = await gemini.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user" as const,
        parts: [{ text: contextText }],
      },
    ],
  });

  const responseText = result.text;
  if (!responseText) {
    throw new Error("No response from Gemini for code review analysis");
  }

  // Parse and validate the response
  const cleanedResponse = responseText
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  const parsed = JSON.parse(cleanedResponse);
  const validated = codeReviewResponseSchema.parse(parsed);

  return validated;
}

/**
 * Builds the code review data object for database storage
 */
export function buildCodeReviewData(
  prUrl: string,
  analysis: CodeReviewResponse
): CodeReviewData {
  return {
    prUrl,
    analyzedAt: new Date().toISOString(),

    overallScore: analysis.overallScore,
    codeQualityScore: analysis.codeQualityScore,
    patternScore: analysis.patternScore,
    securityScore: analysis.securityScore,
    maintainabilityScore: analysis.maintainabilityScore,

    codeQualityFindings: analysis.codeQualityFindings,
    patternFindings: analysis.patternFindings,
    securityFindings: analysis.securityFindings,
    maintainability: analysis.maintainability,

    summary: analysis.summary,

    filesAnalyzed: analysis.filesAnalyzed,
    linesAdded: analysis.linesChanged.additions,
    linesDeleted: analysis.linesChanged.deletions,

    aiAnalysis: {
      ...analysis,
      analyzedAt: new Date().toISOString(),
    },
  };
}

/**
 * Formats code review results for inclusion in prompts/reports
 */
export function formatCodeReviewForPrompt(review: CodeReviewData): string {
  let result = `## Code Review Analysis\n\n`;
  result += `**Overall Score: ${review.overallScore}/5**\n`;
  result += `- Code Quality: ${review.codeQualityScore}/5\n`;
  result += `- Patterns/Architecture: ${review.patternScore}/5\n`;
  result += `- Security: ${review.securityScore}/5\n`;
  result += `- Maintainability: ${review.maintainabilityScore}/5\n\n`;

  result += `### Summary\n${review.summary.overallAssessment}\n\n`;

  if (review.summary.strengths.length > 0) {
    result += `### Strengths\n`;
    review.summary.strengths.forEach((s) => {
      result += `- ${s}\n`;
    });
    result += `\n`;
  }

  if (review.summary.areasForImprovement.length > 0) {
    result += `### Areas for Improvement\n`;
    review.summary.areasForImprovement.forEach((a) => {
      result += `- ${a}\n`;
    });
    result += `\n`;
  }

  result += `### Metrics\n`;
  result += `- Files Analyzed: ${review.filesAnalyzed}\n`;
  result += `- Lines Added: ${review.linesAdded}, Deleted: ${review.linesDeleted}\n`;
  result += `- Test Coverage: ${review.summary.testCoverage}\n`;
  result += `- Code Style Consistency: ${review.summary.codeStyleConsistency}\n`;
  result += `- AI Tool Usage Evident: ${review.summary.aiToolUsageEvident ? "Yes" : "No"}\n`;

  // Include critical/major findings
  const criticalFindings = review.codeQualityFindings.filter(
    (f) => f.severity === "critical" || f.severity === "major"
  );
  if (criticalFindings.length > 0) {
    result += `\n### Key Code Quality Findings\n`;
    criticalFindings.forEach((f) => {
      result += `- [${f.severity.toUpperCase()}] ${f.category}: ${f.description}\n`;
    });
  }

  const securityIssues = review.securityFindings.filter(
    (f) => f.severity === "critical" || f.severity === "high"
  );
  if (securityIssues.length > 0) {
    result += `\n### Security Concerns\n`;
    securityIssues.forEach((f) => {
      result += `- [${f.severity.toUpperCase()}] ${f.category}: ${f.description}\n`;
    });
  }

  return result;
}

/**
 * Converts CodeReviewData to Prisma JSON input
 */
export function codeReviewToPrismaJson(
  review: CodeReviewData
): Prisma.InputJsonValue {
  return review as unknown as Prisma.InputJsonValue;
}
