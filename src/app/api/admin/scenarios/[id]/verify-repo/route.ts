import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Parses a GitHub repo URL to extract owner and repo name
 */
function parseGitHubRepoUrl(
  url: string
): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("github.com")) {
      return null;
    }

    // Match: /owner/repo or /owner/repo.git
    const match = parsed.pathname.match(/^\/([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (!match) {
      return null;
    }

    return {
      owner: match[1],
      repo: match[2],
    };
  } catch {
    return null;
  }
}

interface RepoInfo {
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  description?: string;
}

interface VerifyResult {
  accessible: boolean;
  repoUrl: string;
  repoInfo?: RepoInfo;
  hasReadme?: boolean;
  error?: string;
}

/**
 * GET /api/admin/scenarios/[id]/verify-repo
 * Verify that a scenario's repo is accessible (admin only)
 */
export async function GET(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "ADMIN") {
    return error("Admin access required", 403);
  }

  const { id } = await context.params;

  // Fetch the scenario
  const scenario = await db.scenario.findUnique({
    where: { id },
  });

  if (!scenario) {
    return error("Scenario not found", 404);
  }

  const result: VerifyResult = {
    accessible: false,
    repoUrl: scenario.repoUrl ?? "",
  };

  // Parse the GitHub URL
  if (!scenario.repoUrl) {
    return success({
      ...result,
      error: "No repository URL set for this scenario",
    });
  }
  const parsed = parseGitHubRepoUrl(scenario.repoUrl);
  if (!parsed) {
    return success({
      ...result,
      error:
        "Only GitHub repositories are currently supported for verification",
    });
  }

  const { owner, repo } = parsed;
  // Use GITHUB_ORG_TOKEN (same token used for provisioning) to access private repos
  const token = process.env.GITHUB_ORG_TOKEN;

  if (!token) {
    return success({
      ...result,
      error: "GITHUB_ORG_TOKEN is not configured. Cannot verify private repositories.",
    });
  }

  try {
    // Fetch repo info from GitHub API
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!repoResponse.ok) {
      return success({
        ...result,
        error: `Repository not accessible: ${repoResponse.status} ${repoResponse.statusText}`,
      });
    }

    const repoData = await repoResponse.json();

    result.accessible = true;
    result.repoInfo = {
      fullName: repoData.full_name,
      isPrivate: repoData.private,
      defaultBranch: repoData.default_branch,
      description: repoData.description,
    };

    // Check for README.md
    try {
      const readmeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      result.hasReadme = readmeResponse.ok;
    } catch {
      result.hasReadme = false;
    }

    return success(result);
  } catch (err) {
    console.error("Repository verification error:", err);
    return success({
      ...result,
      error: "Failed to verify repository",
    });
  }
}
