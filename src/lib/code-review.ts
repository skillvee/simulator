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
    testCoverage: z.enum(["comprehensive", "adequate", "minimal", "none", "unknown"]),
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
export type MaintainabilityAssessment = z.infer<typeof maintainabilityAssessmentSchema>;
export type CodeReviewResponse = z.infer<typeof codeReviewResponseSchema>;

// ============================================================================
// Code Review Data Interface (for storage)
// ============================================================================

export interface CodeReviewData {
  prUrl: string;
  analyzedAt: string;

  // Overall scores
  overallScore: number;
  codeQualityScore: number;
  patternScore: number;
  securityScore: number;
  maintainabilityScore: number;

  // Detailed findings
  codeQualityFindings: CodeQualityFinding[];
  patternFindings: PatternFinding[];
  securityFindings: SecurityFinding[];
  maintainability: MaintainabilityAssessment;

  // Summary
  summary: CodeReviewResponse["summary"];

  // Metrics
  filesAnalyzed: number;
  linesAdded: number;
  linesDeleted: number;

  // Full AI analysis (for debugging/future reference)
  aiAnalysis: object;
}

// ============================================================================
// Code Review Prompt
// ============================================================================

const CODE_REVIEW_PROMPT = `You are an expert senior software engineer conducting a thorough code review. Analyze the provided PR diff and evaluate it based on:

1. **Code Quality**: Naming conventions, code structure, complexity, duplication, error handling, documentation, performance, type safety, formatting
2. **Patterns & Architecture**: Correct use of design patterns, architectural decisions, abstraction levels
3. **Security**: Potential vulnerabilities (injection, auth issues, data exposure, etc.)
4. **Maintainability**: Readability, modularity, testability, long-term maintenance concerns

Provide a balanced review that identifies both strengths and areas for improvement.

## Context
- This is code written by a candidate during a developer assessment
- They had limited time (typically 1-2 hours)
- Focus on fundamental quality, not perfection
- Look for signs of good engineering judgment
- Consider whether they added appropriate tests

## Response Format
Respond in JSON format with the following structure:
{
  "overallScore": <1-5, overall quality score>,
  "codeQualityScore": <1-5, code quality score>,
  "patternScore": <1-5, pattern/architecture score>,
  "securityScore": <1-5, security score>,
  "maintainabilityScore": <1-5, maintainability score>,

  "codeQualityFindings": [
    {
      "category": "<naming|structure|complexity|duplication|error_handling|documentation|performance|type_safety|formatting|other>",
      "severity": "<critical|major|minor|suggestion>",
      "description": "<specific description of the finding>",
      "fileHint": "<which file or area this applies to>",
      "recommendation": "<how to improve this>"
    }
  ],

  "patternFindings": [
    {
      "pattern": "<pattern name>",
      "usage": "<correct|partial|incorrect|missing>",
      "notes": "<explanation>",
      "isStrength": <true if this is a positive finding>
    }
  ],

  "securityFindings": [
    {
      "category": "<injection|authentication|authorization|data_exposure|cryptography|input_validation|dependency|configuration|other>",
      "severity": "<critical|high|medium|low|info>",
      "description": "<specific security concern>",
      "fileHint": "<which file or area>",
      "recommendation": "<how to fix or mitigate>"
    }
  ],

  "maintainability": {
    "score": <1-5>,
    "readability": <1-5>,
    "modularity": <1-5>,
    "testability": <1-5>,
    "notes": ["<observation 1>", "<observation 2>"]
  },

  "summary": {
    "strengths": ["<strength 1>", "<strength 2>"],
    "areasForImprovement": ["<area 1>", "<area 2>"],
    "overallAssessment": "<2-3 sentence summary of the code quality>",
    "testCoverage": "<comprehensive|adequate|minimal|none|unknown>",
    "codeStyleConsistency": "<excellent|good|fair|poor>",
    "aiToolUsageEvident": <true if there are signs of AI-generated code>
  },

  "filesAnalyzed": <number of files>,
  "linesChanged": {
    "additions": <lines added>,
    "deletions": <lines deleted>
  }
}

## Scoring Guidelines
- 5: Exceptional - production-ready, excellent practices
- 4: Good - minor improvements possible, solid work
- 3: Adequate - functional with some issues
- 2: Below expectations - significant issues
- 1: Unacceptable - fundamental problems

## Important Notes
- Be fair but thorough
- Consider the time constraints
- Highlight both positives and negatives
- Be specific in recommendations
- If the diff is empty or very small, note this in the assessment
- If no security issues found, return an empty securityFindings array with securityScore of 4-5

IMPORTANT: Return ONLY valid JSON, no additional text or markdown formatting.

## PR Information
`;

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
  const pr = prSnapshot || await fetchGitHubPrContent(prUrl);

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

  // Build context for analysis
  const contextText = `${CODE_REVIEW_PROMPT}
Title: ${pr.title || "No title"}
Description: ${pr.body || "No description provided"}
Author: ${pr.author || "Unknown"}
Files Changed: ${pr.changedFiles || "Unknown"}
Additions: ${pr.additions || 0}
Deletions: ${pr.deletions || 0}
Commits: ${pr.commits || "Unknown"}

## Diff Content
\`\`\`diff
${pr.diff}
\`\`\`
`;

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
