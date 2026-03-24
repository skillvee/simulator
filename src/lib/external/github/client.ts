import { env } from "@/lib/core/env";

const GITHUB_API_VERSION = "2022-11-28";

/**
 * Standard headers for GitHub API requests
 */
export function getGitHubHeaders(
  accept = "application/vnd.github+json"
): HeadersInit {
  const token = env.GITHUB_TOKEN;
  return {
    Authorization: `Bearer ${token}`,
    Accept: accept,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };
}

/**
 * Returns the GitHub token or null if not configured
 */
export function getGitHubToken(): string | undefined {
  return env.GITHUB_TOKEN;
}

/**
 * Parses a GitHub PR URL to extract owner, repo, and pull number
 * Returns null if the URL doesn't match GitHub PR format
 */
export function parseGitHubPrUrl(url: string): {
  owner: string;
  repo: string;
  pullNumber: number;
} | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("github.com")) {
      return null;
    }

    // Match: /owner/repo/pull/123
    const match = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) {
      return null;
    }

    return {
      owner: match[1],
      repo: match[2],
      pullNumber: parseInt(match[3], 10),
    };
  } catch {
    return null;
  }
}

/**
 * Status of a single check run (e.g., a test job)
 */
export interface CheckRun {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion:
    | "success"
    | "failure"
    | "cancelled"
    | "skipped"
    | "neutral"
    | "timed_out"
    | "action_required"
    | null;
  startedAt?: string;
  completedAt?: string;
  htmlUrl?: string;
  output?: {
    title?: string;
    summary?: string;
    text?: string;
  };
}

/**
 * Combined CI status for a PR
 */
export interface PrCiStatus {
  prUrl: string;
  fetchedAt: string;
  overallStatus: "pending" | "success" | "failure" | "unknown";
  checksCount: number;
  checksCompleted: number;
  checksPassed: number;
  checksFailed: number;
  checks: CheckRun[];
  testResults?: {
    totalTests?: number;
    passedTests?: number;
    failedTests?: number;
    skippedTests?: number;
    testSummary?: string;
  };
  fetchError?: string;
}

/**
 * Formats CI status for inclusion in prompts/reports
 */
export function formatCiStatusForPrompt(ciStatus: PrCiStatus): string {
  if (ciStatus.fetchError) {
    return `CI Status: Unable to fetch (${ciStatus.fetchError})`;
  }

  if (ciStatus.checksCount === 0) {
    return "CI Status: No CI checks found for this PR";
  }

  let result = `CI Status: ${ciStatus.overallStatus.toUpperCase()}\n`;
  result += `- Checks: ${ciStatus.checksCompleted}/${ciStatus.checksCount} completed\n`;
  result += `- Passed: ${ciStatus.checksPassed}, Failed: ${ciStatus.checksFailed}\n`;

  if (ciStatus.testResults) {
    const tr = ciStatus.testResults;
    result += `\nTest Results:\n`;
    if (tr.totalTests !== undefined) {
      result += `- Total: ${tr.totalTests} tests\n`;
    }
    if (tr.passedTests !== undefined) {
      result += `- Passed: ${tr.passedTests}\n`;
    }
    if (tr.failedTests !== undefined && tr.failedTests > 0) {
      result += `- Failed: ${tr.failedTests}\n`;
    }
    if (tr.skippedTests !== undefined && tr.skippedTests > 0) {
      result += `- Skipped: ${tr.skippedTests}\n`;
    }
  }

  // List failed checks
  const failedChecks = ciStatus.checks.filter(
    (c) =>
      c.status === "completed" &&
      (c.conclusion === "failure" || c.conclusion === "timed_out")
  );
  if (failedChecks.length > 0) {
    result += `\nFailed Checks:\n`;
    failedChecks.forEach((check) => {
      result += `- ${check.name}: ${check.conclusion}\n`;
    });
  }

  return result;
}
