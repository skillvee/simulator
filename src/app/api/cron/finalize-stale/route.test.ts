import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssessmentStatus } from "@prisma/client";

const mockFindMany = vi.fn();
const mockFinalizeAssessment = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

// Mock the helper at its deep path. The route imports it via the barrel; the
// barrel re-exports from this file, so this mock intercepts both.
vi.mock("@/lib/analysis/finalize-assessment", () => ({
  finalizeAssessment: (...args: unknown[]) => mockFinalizeAssessment(...args),
}));

vi.mock("@/lib/core", () => ({
  createLogger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
  }),
}));

vi.mock("@/lib/core/env", () => ({
  env: { CRON_SECRET: "test-secret" },
}));

import { GET } from "./route";

const NOW = new Date("2026-04-26T12:00:00Z").getTime();
const MEDIUM_CAP_MIN = 75;
const GRACE_MIN = 30;

describe("GET /api/cron/finalize-stale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
    mockFinalizeAssessment.mockResolvedValue({
      ok: true,
      assessment: {} as never,
      timing: {} as never,
      videoAssessment: { triggered: true, hasRecording: true },
      profilePhoto: { generated: true, imageUrl: null },
    });
  });

  function withAuth(secret = "test-secret"): Request {
    return new Request("http://localhost/api/cron/finalize-stale", {
      method: "GET",
      headers: { authorization: `Bearer ${secret}` },
    });
  }

  it("rejects requests without the correct CRON_SECRET", async () => {
    mockFindMany.mockResolvedValue([]);
    const response = await GET(withAuth("wrong-secret"));
    expect(response.status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("finalizes assessments past cap+grace", async () => {
    const stale = new Date(
      NOW - (MEDIUM_CAP_MIN + GRACE_MIN + 5) * 60_000
    );
    mockFindMany.mockResolvedValue([
      {
        id: "stale-1",
        status: AssessmentStatus.WORKING,
        workingStartedAt: stale,
        walkthroughStartedAt: null,
        scenario: { simulationDepth: "medium" },
      },
    ]);

    const response = await GET(withAuth());
    expect(response.status).toBe(200);
    const json = await response.json();

    expect(mockFinalizeAssessment).toHaveBeenCalledTimes(1);
    expect(mockFinalizeAssessment).toHaveBeenCalledWith("stale-1");
    expect(json.finalized).toBe(1);
    expect(json.failed).toBe(0);
  });

  it("skips assessments still within cap+grace", async () => {
    const fresh = new Date(NOW - 30 * 60_000); // 30 min in
    mockFindMany.mockResolvedValue([
      {
        id: "fresh-1",
        status: AssessmentStatus.WORKING,
        workingStartedAt: fresh,
        walkthroughStartedAt: null,
        scenario: { simulationDepth: "medium" },
      },
    ]);

    const response = await GET(withAuth());
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(mockFinalizeAssessment).not.toHaveBeenCalled();
    expect(json.stale).toBe(0);
  });

  it("excludes active walkthroughs (started within grace) even when working past cap", async () => {
    const past = new Date(NOW - (MEDIUM_CAP_MIN + GRACE_MIN + 60) * 60_000);
    const recentWalkthrough = new Date(NOW - 5 * 60_000);
    mockFindMany.mockResolvedValue([
      {
        id: "active-walk",
        status: AssessmentStatus.WALKTHROUGH_CALL,
        workingStartedAt: past,
        walkthroughStartedAt: recentWalkthrough,
        scenario: { simulationDepth: "medium" },
      },
    ]);

    const response = await GET(withAuth());
    const json = await response.json();
    expect(mockFinalizeAssessment).not.toHaveBeenCalled();
    expect(json.stale).toBe(0);
  });

  it("includes stale walkthroughs (started more than grace ago)", async () => {
    const past = new Date(NOW - (MEDIUM_CAP_MIN + GRACE_MIN + 60) * 60_000);
    const oldWalkthrough = new Date(NOW - (GRACE_MIN + 10) * 60_000);
    mockFindMany.mockResolvedValue([
      {
        id: "stale-walk",
        status: AssessmentStatus.WALKTHROUGH_CALL,
        workingStartedAt: past,
        walkthroughStartedAt: oldWalkthrough,
        scenario: { simulationDepth: "medium" },
      },
    ]);

    const response = await GET(withAuth());
    const json = await response.json();
    expect(mockFinalizeAssessment).toHaveBeenCalledWith("stale-walk");
    expect(json.finalized).toBe(1);
  });

  it("reports per-row failures without throwing", async () => {
    const stale = new Date(NOW - (MEDIUM_CAP_MIN + GRACE_MIN + 5) * 60_000);
    mockFindMany.mockResolvedValue([
      {
        id: "broken-1",
        status: AssessmentStatus.WORKING,
        workingStartedAt: stale,
        walkthroughStartedAt: null,
        scenario: { simulationDepth: "medium" },
      },
    ]);
    mockFinalizeAssessment.mockResolvedValueOnce({
      ok: false,
      code: "NOT_FOUND",
      message: "Assessment not found",
    });

    const response = await GET(withAuth());
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.finalized).toBe(0);
    expect(json.failed).toBe(1);
    expect(json.failures[0]).toEqual({
      id: "broken-1",
      reason: "NOT_FOUND: Assessment not found",
    });
  });
});
