import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseGitHubPrUrl,
  fetchGitHubPrContent,
  closeGitHubPr,
  cleanupPrAfterAssessment,
  fetchPrCiStatus,
  formatCiStatusForPrompt,
  type PrCiStatus,
  type CheckRun,
} from "./github";

// Mock env module (now in @/lib/core)
vi.mock("@/lib/core", () => ({
  env: {
    GITHUB_TOKEN: "mock-token",
  },
}));

describe("parseGitHubPrUrl", () => {
  it("should parse a valid GitHub PR URL", () => {
    const result = parseGitHubPrUrl("https://github.com/owner/repo/pull/123");
    expect(result).toEqual({
      owner: "owner",
      repo: "repo",
      pullNumber: 123,
    });
  });

  it("should parse a GitHub PR URL with hyphens in owner/repo", () => {
    const result = parseGitHubPrUrl(
      "https://github.com/my-org/my-repo-name/pull/456"
    );
    expect(result).toEqual({
      owner: "my-org",
      repo: "my-repo-name",
      pullNumber: 456,
    });
  });

  it("should return null for non-GitHub URLs", () => {
    expect(
      parseGitHubPrUrl("https://gitlab.com/owner/repo/-/merge_requests/123")
    ).toBeNull();
    expect(
      parseGitHubPrUrl("https://bitbucket.org/owner/repo/pull-requests/123")
    ).toBeNull();
  });

  it("should return null for invalid GitHub URLs", () => {
    expect(parseGitHubPrUrl("https://github.com/owner/repo")).toBeNull();
    expect(
      parseGitHubPrUrl("https://github.com/owner/repo/issues/123")
    ).toBeNull();
    expect(parseGitHubPrUrl("https://github.com/owner/repo/pull/")).toBeNull();
    expect(parseGitHubPrUrl("not-a-url")).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(parseGitHubPrUrl("")).toBeNull();
  });
});

describe("fetchGitHubPrContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should return error for non-GitHub URL", async () => {
    const result = await fetchGitHubPrContent(
      "https://gitlab.com/owner/repo/-/merge_requests/123"
    );
    expect(result.provider).toBe("unknown");
    expect(result.fetchError).toBe("Not a valid GitHub PR URL");
  });

  it("should fetch PR content successfully", async () => {
    const mockPrData = {
      title: "Test PR",
      body: "Test body",
      state: "open",
      head: { ref: "feature-branch" },
      base: { ref: "main" },
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      commits: 5,
      additions: 100,
      deletions: 50,
      changed_files: 3,
      user: { login: "test-user" },
    };

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPrData),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("diff content here"),
      });

    const result = await fetchGitHubPrContent(
      "https://github.com/owner/repo/pull/123"
    );

    expect(result.provider).toBe("github");
    expect(result.title).toBe("Test PR");
    expect(result.body).toBe("Test body");
    expect(result.state).toBe("open");
    expect(result.headRef).toBe("feature-branch");
    expect(result.baseRef).toBe("main");
    expect(result.commits).toBe(5);
    expect(result.additions).toBe(100);
    expect(result.deletions).toBe(50);
    expect(result.changedFiles).toBe(3);
    expect(result.author).toBe("test-user");
    expect(result.diff).toBe("diff content here");
    expect(result.fetchError).toBeUndefined();
  });

  it("should handle GitHub API error", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const result = await fetchGitHubPrContent(
      "https://github.com/owner/repo/pull/999"
    );

    expect(result.fetchError).toBe("GitHub API error: 404 Not Found");
  });

  it("should handle network errors", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );

    const result = await fetchGitHubPrContent(
      "https://github.com/owner/repo/pull/123"
    );

    expect(result.fetchError).toBe("Network error");
  });
});

describe("closeGitHubPr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should return error for non-GitHub URL", async () => {
    const result = await closeGitHubPr(
      "https://gitlab.com/owner/repo/-/merge_requests/123"
    );
    expect(result.success).toBe(false);
    expect(result.action).toBe("none");
    expect(result.message).toContain("Not a GitHub PR URL");
  });

  it("should close PR successfully", async () => {
    const mockPrData = {
      title: "Test PR",
      body: "Test body",
      state: "open",
      head: { ref: "feature" },
      base: { ref: "main" },
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      commits: 1,
      additions: 10,
      deletions: 5,
      changed_files: 1,
      user: { login: "test" },
    };

    (global.fetch as ReturnType<typeof vi.fn>)
      // First call: fetch PR content
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPrData),
      })
      // Second call: fetch diff
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("diff"),
      })
      // Third call: close PR
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ state: "closed" }),
      });

    const result = await closeGitHubPr(
      "https://github.com/owner/repo/pull/123"
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe("closed");
    expect(result.message).toContain("Successfully closed PR #123");
    expect(result.prSnapshot).toBeDefined();
    expect(result.prSnapshot?.title).toBe("Test PR");

    // Verify PATCH call was made with correct body
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/owner/repo/pulls/123",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ state: "closed" }),
      })
    );
  });

  it("should handle close failure with preserved snapshot", async () => {
    const mockPrData = {
      title: "Test PR",
      body: "Body",
      state: "open",
      head: { ref: "feature" },
      base: { ref: "main" },
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      commits: 1,
      additions: 10,
      deletions: 5,
      changed_files: 1,
      user: { login: "test" },
    };

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPrData),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("diff"),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: () => Promise.resolve({ message: "No permission" }),
      });

    const result = await closeGitHubPr(
      "https://github.com/owner/repo/pull/123"
    );

    expect(result.success).toBe(false);
    expect(result.action).toBe("error");
    expect(result.message).toContain("403");
    // Snapshot should still be preserved even if close fails
    expect(result.prSnapshot).toBeDefined();
    expect(result.prSnapshot?.title).toBe("Test PR");
  });
});

describe("cleanupPrAfterAssessment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should cleanup GitHub PR", async () => {
    const mockPrData = {
      title: "Test PR",
      body: "Body",
      state: "open",
      head: { ref: "feature" },
      base: { ref: "main" },
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      commits: 1,
      additions: 10,
      deletions: 5,
      changed_files: 1,
      user: { login: "test" },
    };

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPrData),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("diff"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ state: "closed" }),
      });

    const result = await cleanupPrAfterAssessment(
      "https://github.com/owner/repo/pull/123"
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe("closed");
  });

  it("should handle GitLab PR (not supported for cleanup)", async () => {
    const result = await cleanupPrAfterAssessment(
      "https://gitlab.com/owner/repo/-/merge_requests/123"
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe("none");
    expect(result.message).toContain("Non-GitHub PR");
    expect(result.prSnapshot?.provider).toBe("gitlab");
  });

  it("should handle Bitbucket PR (not supported for cleanup)", async () => {
    const result = await cleanupPrAfterAssessment(
      "https://bitbucket.org/owner/repo/pull-requests/123"
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe("none");
    expect(result.prSnapshot?.provider).toBe("bitbucket");
  });
});

describe("fetchGitHubPrContent without token", () => {
  it("should return error when GITHUB_TOKEN is not set", async () => {
    // Reset module to test without token
    vi.resetModules();
    vi.doMock("@/lib/core", () => ({
      env: {
        GITHUB_TOKEN: undefined,
      },
    }));

    const { fetchGitHubPrContent: fetchWithoutToken } =
      await import("./github");
    const result = await fetchWithoutToken(
      "https://github.com/owner/repo/pull/123"
    );

    expect(result.fetchError).toContain("GITHUB_TOKEN not configured");
  });
});

// ============================================================================
// CI STATUS TESTS
// ============================================================================

describe("fetchPrCiStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should return error for non-GitHub PR URL", async () => {
    const result = await fetchPrCiStatus(
      "https://gitlab.com/owner/repo/-/merge_requests/123"
    );
    expect(result.fetchError).toBe("Not a valid GitHub PR URL");
    expect(result.overallStatus).toBe("unknown");
  });

  it("should fetch CI status successfully with all checks passing", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            head: { sha: "abc123" },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            check_runs: [
              {
                id: 1,
                name: "test",
                status: "completed",
                conclusion: "success",
                started_at: "2024-01-01T00:00:00Z",
                completed_at: "2024-01-01T00:05:00Z",
                html_url: "https://github.com/owner/repo/runs/1",
              },
              {
                id: 2,
                name: "lint",
                status: "completed",
                conclusion: "success",
                started_at: "2024-01-01T00:00:00Z",
                completed_at: "2024-01-01T00:02:00Z",
                html_url: "https://github.com/owner/repo/runs/2",
              },
            ],
          }),
      });

    const result = await fetchPrCiStatus(
      "https://github.com/owner/repo/pull/123"
    );

    expect(result.overallStatus).toBe("success");
    expect(result.checksCount).toBe(2);
    expect(result.checksCompleted).toBe(2);
    expect(result.checksPassed).toBe(2);
    expect(result.checksFailed).toBe(0);
    expect(result.fetchError).toBeUndefined();
  });

  it("should detect pending status when checks are in progress", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            head: { sha: "abc123" },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            check_runs: [
              {
                id: 1,
                name: "test",
                status: "in_progress",
                conclusion: null,
              },
            ],
          }),
      });

    const result = await fetchPrCiStatus(
      "https://github.com/owner/repo/pull/123"
    );

    expect(result.overallStatus).toBe("pending");
    expect(result.checksCompleted).toBe(0);
  });

  it("should detect failure when any check fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            head: { sha: "abc123" },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            check_runs: [
              {
                id: 1,
                name: "test",
                status: "completed",
                conclusion: "success",
              },
              {
                id: 2,
                name: "lint",
                status: "completed",
                conclusion: "failure",
              },
            ],
          }),
      });

    const result = await fetchPrCiStatus(
      "https://github.com/owner/repo/pull/123"
    );

    expect(result.overallStatus).toBe("failure");
    expect(result.checksFailed).toBe(1);
    expect(result.checksPassed).toBe(1);
  });

  it("should handle GitHub API errors gracefully", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const result = await fetchPrCiStatus(
      "https://github.com/owner/repo/pull/123"
    );

    expect(result.fetchError).toBe("GitHub API error: 404 Not Found");
    expect(result.overallStatus).toBe("unknown");
  });

  it("should extract test results from check output", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            head: { sha: "abc123" },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            check_runs: [
              {
                id: 1,
                name: "test",
                status: "completed",
                conclusion: "success",
                output: {
                  title: "Tests passed",
                  summary: "45 passed, 2 failed, 3 skipped. Total: 50 tests",
                },
              },
            ],
          }),
      });

    const result = await fetchPrCiStatus(
      "https://github.com/owner/repo/pull/123"
    );

    expect(result.testResults).toBeDefined();
    expect(result.testResults?.passedTests).toBe(45);
    expect(result.testResults?.failedTests).toBe(2);
    expect(result.testResults?.skippedTests).toBe(3);
    expect(result.testResults?.totalTests).toBe(50);
  });

  it("should handle missing head SHA", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}), // No head.sha
    });

    const result = await fetchPrCiStatus(
      "https://github.com/owner/repo/pull/123"
    );

    expect(result.fetchError).toBe("Could not determine PR head commit SHA");
  });

  it("should handle Checks API error", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            head: { sha: "abc123" },
          }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });

    const result = await fetchPrCiStatus(
      "https://github.com/owner/repo/pull/123"
    );

    expect(result.fetchError).toBe("GitHub Checks API error: 403 Forbidden");
  });

  it("should return unknown status when no checks exist", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            head: { sha: "abc123" },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            check_runs: [],
          }),
      });

    const result = await fetchPrCiStatus(
      "https://github.com/owner/repo/pull/123"
    );

    expect(result.overallStatus).toBe("unknown");
    expect(result.checksCount).toBe(0);
  });
});

describe("formatCiStatusForPrompt", () => {
  it("should format error status", () => {
    const status: PrCiStatus = {
      prUrl: "https://github.com/owner/repo/pull/123",
      fetchedAt: new Date().toISOString(),
      overallStatus: "unknown",
      checksCount: 0,
      checksCompleted: 0,
      checksPassed: 0,
      checksFailed: 0,
      checks: [],
      fetchError: "Token not configured",
    };

    const result = formatCiStatusForPrompt(status);
    expect(result).toContain("Unable to fetch");
    expect(result).toContain("Token not configured");
  });

  it("should format no checks status", () => {
    const status: PrCiStatus = {
      prUrl: "https://github.com/owner/repo/pull/123",
      fetchedAt: new Date().toISOString(),
      overallStatus: "unknown",
      checksCount: 0,
      checksCompleted: 0,
      checksPassed: 0,
      checksFailed: 0,
      checks: [],
    };

    const result = formatCiStatusForPrompt(status);
    expect(result).toContain("No CI checks found");
  });

  it("should format successful status with test results", () => {
    const status: PrCiStatus = {
      prUrl: "https://github.com/owner/repo/pull/123",
      fetchedAt: new Date().toISOString(),
      overallStatus: "success",
      checksCount: 2,
      checksCompleted: 2,
      checksPassed: 2,
      checksFailed: 0,
      checks: [
        {
          id: 1,
          name: "test",
          status: "completed",
          conclusion: "success",
        },
      ],
      testResults: {
        totalTests: 50,
        passedTests: 48,
        failedTests: 0,
        skippedTests: 2,
      },
    };

    const result = formatCiStatusForPrompt(status);
    expect(result).toContain("SUCCESS");
    expect(result).toContain("2/2 completed");
    expect(result).toContain("Passed: 2");
    expect(result).toContain("Total: 50 tests");
    expect(result).toContain("Passed: 48");
  });

  it("should list failed checks", () => {
    const failedCheck: CheckRun = {
      id: 1,
      name: "lint",
      status: "completed",
      conclusion: "failure",
    };

    const status: PrCiStatus = {
      prUrl: "https://github.com/owner/repo/pull/123",
      fetchedAt: new Date().toISOString(),
      overallStatus: "failure",
      checksCount: 2,
      checksCompleted: 2,
      checksPassed: 1,
      checksFailed: 1,
      checks: [
        failedCheck,
        {
          id: 2,
          name: "test",
          status: "completed",
          conclusion: "success",
        },
      ],
    };

    const result = formatCiStatusForPrompt(status);
    expect(result).toContain("FAILURE");
    expect(result).toContain("Failed Checks:");
    expect(result).toContain("lint: failure");
  });

  it("should not show failed checks section when no failures", () => {
    const status: PrCiStatus = {
      prUrl: "https://github.com/owner/repo/pull/123",
      fetchedAt: new Date().toISOString(),
      overallStatus: "success",
      checksCount: 1,
      checksCompleted: 1,
      checksPassed: 1,
      checksFailed: 0,
      checks: [
        {
          id: 1,
          name: "test",
          status: "completed",
          conclusion: "success",
        },
      ],
      testResults: {
        totalTests: 50,
        passedTests: 50,
        failedTests: 0,
      },
    };

    const result = formatCiStatusForPrompt(status);
    // Should not have "Failed Checks:" section when no checks failed
    expect(result).not.toContain("Failed Checks:");
    // The summary line always shows "Passed: X, Failed: Y" format
    expect(result).toContain("Passed: 1, Failed: 0");
  });
});
