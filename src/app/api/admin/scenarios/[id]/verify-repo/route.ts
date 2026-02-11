import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { env } from "@/lib/core";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  // Fetch the scenario
  const scenario = await db.scenario.findUnique({
    where: { id },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const result: VerifyResult = {
    accessible: false,
    repoUrl: scenario.repoUrl ?? "",
  };

  // Parse the GitHub URL
  if (!scenario.repoUrl) {
    return NextResponse.json({
      ...result,
      error: "No repository URL set for this scenario",
    });
  }
  const parsed = parseGitHubRepoUrl(scenario.repoUrl);
  if (!parsed) {
    return NextResponse.json({
      ...result,
      error:
        "Only GitHub repositories are currently supported for verification",
    });
  }

  const { owner, repo } = parsed;
  const token = env.GITHUB_TOKEN;

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
      return NextResponse.json({
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

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      ...result,
      error:
        error instanceof Error ? error.message : "Failed to verify repository",
    });
  }
}
