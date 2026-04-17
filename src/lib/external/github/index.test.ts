import { describe, it, expect, vi } from "vitest";
import {
  parseGitHubPrUrl,
  formatCiStatusForPrompt,
  type CheckRun,
} from "./index";
import type { PrCiStatus } from "./client";

vi.mock("@/lib/core/env", () => ({
  env: {
    GITHUB_TOKEN: "mock-token",
  },
}));

vi.mock("@/lib/core", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
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
