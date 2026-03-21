import { getGitHubHeaders, getGitHubToken, parseGitHubPrUrl } from "./client";

/**
 * PR content snapshot for historical reference
 */
export interface PrSnapshot {
  url: string;
  provider: "github" | "gitlab" | "bitbucket" | "unknown";
  fetchedAt: string;
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
  diff?: string;
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

  const token = getGitHubToken();
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
      { headers: getGitHubHeaders() }
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
      { headers: getGitHubHeaders("application/vnd.github.v3.diff") }
    );

    let diff: string | undefined;
    if (diffResponse.ok) {
      diff = await diffResponse.text();
      // Truncate very large diffs (limit to ~500KB)
      if (diff.length > 500000) {
        diff =
          diff.substring(0, 500000) +
          "\n\n[DIFF TRUNCATED - original was " +
          diff.length +
          " bytes]";
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
      fetchError:
        error instanceof Error ? error.message : "Unknown error fetching PR",
    };
  }
}
