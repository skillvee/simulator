import { env } from "@/lib/env";

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
 * PR content snapshot for historical reference
 */
export interface PrSnapshot {
  url: string;
  provider: "github" | "gitlab" | "bitbucket" | "unknown";
  fetchedAt: string;
  // GitHub-specific fields
  title?: string;
  body?: string;
  state?: string;
  headRef?: string;
  baseRef?: string;
  createdAt?: string;
  updatedAt?: string;
  commits?: number;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
  author?: string;
  // Diff content
  diff?: string;
  // Error info if fetch failed
  fetchError?: string;
}

/**
 * Fetches PR content from GitHub for historical preservation
 * Returns a snapshot of the PR data before deletion
 */
export async function fetchGitHubPrContent(prUrl: string): Promise<PrSnapshot> {
  const snapshot: PrSnapshot = {
    url: prUrl,
    provider: "github",
    fetchedAt: new Date().toISOString(),
  };

  const parsed = parseGitHubPrUrl(prUrl);
  if (!parsed) {
    return {
      ...snapshot,
      provider: "unknown",
      fetchError: "Not a valid GitHub PR URL",
    };
  }

  const token = env.GITHUB_TOKEN;
  if (!token) {
    return {
      ...snapshot,
      fetchError: "GITHUB_TOKEN not configured - cannot fetch PR content",
    };
  }

  const { owner, repo, pullNumber } = parsed;

  try {
    // Fetch PR metadata
    const prResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!prResponse.ok) {
      return {
        ...snapshot,
        fetchError: `GitHub API error: ${prResponse.status} ${prResponse.statusText}`,
      };
    }

    const prData = await prResponse.json();

    // Fetch diff content
    const diffResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3.diff",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    let diff: string | undefined;
    if (diffResponse.ok) {
      diff = await diffResponse.text();
      // Truncate very large diffs (limit to ~500KB)
      if (diff.length > 500000) {
        diff = diff.substring(0, 500000) + "\n\n[DIFF TRUNCATED - original was " + diff.length + " bytes]";
      }
    }

    return {
      ...snapshot,
      title: prData.title,
      body: prData.body,
      state: prData.state,
      headRef: prData.head?.ref,
      baseRef: prData.base?.ref,
      createdAt: prData.created_at,
      updatedAt: prData.updated_at,
      commits: prData.commits,
      additions: prData.additions,
      deletions: prData.deletions,
      changedFiles: prData.changed_files,
      author: prData.user?.login,
      diff,
    };
  } catch (error) {
    return {
      ...snapshot,
      fetchError: error instanceof Error ? error.message : "Unknown error fetching PR",
    };
  }
}

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
 * Branch deletion could be added if needed
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

  const token = env.GITHUB_TOKEN;
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
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
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
      message: error instanceof Error ? error.message : "Unknown error closing PR",
    };
  }
}

/**
 * Main function to clean up a PR after assessment
 * 1. Fetches PR content for historical reference
 * 2. Closes the PR (GitHub only - can't delete via API)
 * Returns snapshot for storage regardless of close success
 */
export async function cleanupPrAfterAssessment(prUrl: string): Promise<PrCleanupResult> {
  // Determine provider
  if (prUrl.includes("github.com")) {
    return closeGitHubPr(prUrl);
  }

  // For non-GitHub PRs, just fetch what we can for the snapshot
  // GitLab and Bitbucket would need their own API integrations
  return {
    success: true,
    action: "none",
    message: "Non-GitHub PR - cleanup not supported, content snapshot not available",
    prSnapshot: {
      url: prUrl,
      provider: prUrl.includes("gitlab") ? "gitlab" : prUrl.includes("bitbucket") ? "bitbucket" : "unknown",
      fetchedAt: new Date().toISOString(),
      fetchError: "Only GitHub PR cleanup is currently supported",
    },
  };
}
