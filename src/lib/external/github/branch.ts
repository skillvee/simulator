import {
  getGitHubHeaders,
  getGitHubToken,
  parseGitHubPrUrl,
  type CheckRun,
  type PrCiStatus,
} from "./client";

/**
 * Fetches the CI check status for a GitHub PR
 * Uses the GitHub Checks API to get check run status
 */
export async function fetchPrCiStatus(prUrl: string): Promise<PrCiStatus> {
  const status: PrCiStatus = {
    prUrl,
    fetchedAt: new Date().toISOString(),
    overallStatus: "unknown",
    checksCount: 0,
    checksCompleted: 0,
    checksPassed: 0,
    checksFailed: 0,
    checks: [],
  };

  const parsed = parseGitHubPrUrl(prUrl);
  if (!parsed) {
    return {
      ...status,
      fetchError: "Not a valid GitHub PR URL",
    };
  }

  const token = getGitHubToken();
  if (!token) {
    return {
      ...status,
      fetchError: "GITHUB_TOKEN not configured - cannot fetch CI status",
    };
  }

  const { owner, repo, pullNumber } = parsed;

  try {
    // First, get the PR to find the head SHA
    const prResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
      { headers: getGitHubHeaders() }
    );

    if (!prResponse.ok) {
      return {
        ...status,
        fetchError: `GitHub API error: ${prResponse.status} ${prResponse.statusText}`,
      };
    }

    const prData = await prResponse.json();
    const headSha = prData.head?.sha;

    if (!headSha) {
      return {
        ...status,
        fetchError: "Could not determine PR head commit SHA",
      };
    }

    // Fetch check runs for the head commit
    const checksResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${headSha}/check-runs`,
      { headers: getGitHubHeaders() }
    );

    if (!checksResponse.ok) {
      return {
        ...status,
        fetchError: `GitHub Checks API error: ${checksResponse.status} ${checksResponse.statusText}`,
      };
    }

    const checksData = await checksResponse.json();
    const checkRuns: CheckRun[] = (checksData.check_runs || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (run: any) => ({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        htmlUrl: run.html_url,
        output: run.output
          ? {
              title: run.output.title,
              summary: run.output.summary,
              text: run.output.text,
            }
          : undefined,
      })
    );

    // Calculate summary statistics
    const checksCount = checkRuns.length;
    const checksCompleted = checkRuns.filter(
      (r) => r.status === "completed"
    ).length;
    const checksPassed = checkRuns.filter(
      (r) => r.status === "completed" && r.conclusion === "success"
    ).length;
    const checksFailed = checkRuns.filter(
      (r) =>
        r.status === "completed" &&
        (r.conclusion === "failure" || r.conclusion === "timed_out")
    ).length;

    // Determine overall status
    let overallStatus: PrCiStatus["overallStatus"] = "unknown";
    if (checksCount === 0) {
      overallStatus = "unknown";
    } else if (checksCompleted < checksCount) {
      overallStatus = "pending";
    } else if (checksFailed > 0) {
      overallStatus = "failure";
    } else if (checksPassed === checksCount) {
      overallStatus = "success";
    }

    // Extract test results from check outputs (if available)
    let testResults: PrCiStatus["testResults"] | undefined;
    const testCheck = checkRuns.find(
      (r) =>
        r.name.toLowerCase().includes("test") ||
        r.name.toLowerCase().includes("ci")
    );
    if (testCheck?.output?.summary) {
      const summary = testCheck.output.summary;
      const passedMatch = summary.match(/(\d+)\s*(?:passed|✓)/i);
      const failedMatch = summary.match(/(\d+)\s*(?:failed|✗)/i);
      const skippedMatch = summary.match(/(\d+)\s*(?:skipped|⊘)/i);
      const totalMatch = summary.match(/(\d+)\s*(?:total|tests?)/i);

      if (passedMatch || failedMatch || totalMatch) {
        testResults = {
          passedTests: passedMatch ? parseInt(passedMatch[1], 10) : undefined,
          failedTests: failedMatch ? parseInt(failedMatch[1], 10) : undefined,
          skippedTests: skippedMatch
            ? parseInt(skippedMatch[1], 10)
            : undefined,
          totalTests: totalMatch ? parseInt(totalMatch[1], 10) : undefined,
          testSummary: summary.substring(0, 500),
        };
      }
    }

    return {
      ...status,
      overallStatus,
      checksCount,
      checksCompleted,
      checksPassed,
      checksFailed,
      checks: checkRuns,
      testResults,
    };
  } catch (error) {
    return {
      ...status,
      fetchError:
        error instanceof Error
          ? error.message
          : "Unknown error fetching CI status",
    };
  }
}