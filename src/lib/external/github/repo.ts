import { getGitHubHeaders, getGitHubToken, parseGitHubPrUrl } from "./client";
import { type PrSnapshot, fetchGitHubPrContent } from "./pr";

/**
 * Result of PR cleanup operation
 */
export interface PrCleanupResult {
  success: boolean;
  action: "closed" | "none" | "error";
  message: string;
  prSnapshot?: PrSnapshot;
}

/**
 * Closes a GitHub PR
 * Note: GitHub doesn't allow PR deletion via API, only closing
 */
export async function closeGitHubPr(prUrl: string): Promise<PrCleanupResult> {
  const parsed = parseGitHubPrUrl(prUrl);
  if (!parsed) {
    return {
      success: false,
      action: "none",
      message: "Not a GitHub PR URL - only GitHub PRs can be closed",
    };
  }

  const token = getGitHubToken();
  if (!token) {
    return {
      success: false,
      action: "error",
      message: "GITHUB_TOKEN not configured - cannot close PR",
    };
  }

  const { owner, repo, pullNumber } = parsed;

  try {
    // First, fetch the PR content for historical preservation
    const prSnapshot = await fetchGitHubPrContent(prUrl);

    // Close the PR by updating its state
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
      {
        method: "PATCH",
        headers: {
          ...getGitHubHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          state: "closed",
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        action: "error",
        message: `GitHub API error: ${response.status} ${response.statusText}${errorData.message ? ` - ${errorData.message}` : ""}`,
        prSnapshot,
      };
    }

    return {
      success: true,
      action: "closed",
      message: `Successfully closed PR #${pullNumber} in ${owner}/${repo}`,
      prSnapshot,
    };
  } catch (error) {
    return {
      success: false,
      action: "error",
      message:
        error instanceof Error ? error.message : "Unknown error closing PR",
    };
  }
}

/**
 * Main function to clean up a PR after assessment
 * 1. Fetches PR content for historical reference
 * 2. Closes the PR (GitHub only - can't delete via API)
 * Returns snapshot for storage regardless of close success
 */
export async function cleanupPrAfterAssessment(
  prUrl: string
): Promise<PrCleanupResult> {
  if (prUrl.includes("github.com")) {
    return closeGitHubPr(prUrl);
  }

  // For non-GitHub PRs, just return a snapshot placeholder
  return {
    success: true,
    action: "none",
    message:
      "Non-GitHub PR - cleanup not supported, content snapshot not available",
    prSnapshot: {
      url: prUrl,
      provider: prUrl.includes("gitlab")
        ? "gitlab"
        : prUrl.includes("bitbucket")
          ? "bitbucket"
          : "unknown",
      fetchedAt: new Date().toISOString(),
      fetchError: "Only GitHub PR cleanup is currently supported",
    },
  };
}
