import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock functions need to be defined before vi.mock
const mockAuth = vi.fn();
const mockUserFindUnique = vi.fn();
const mockGetAnalytics = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/server/db", () => ({
  db: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}));

vi.mock("@/lib/core", () => ({
  getAnalytics: (...args: unknown[]) => mockGetAnalytics(...args),
  TimePeriodSchema: {
    safeParse: (value: string) => {
      const validPeriods = [
        "today",
        "yesterday",
        "last7days",
        "last30days",
        "last90days",
        "all",
      ];
      if (validPeriods.includes(value)) {
        return { success: true, data: value };
      }
      return { success: false, error: new Error("Invalid period") };
    },
  },
}));

// Import after mocks
import { GET } from "./route";

describe("GET /api/admin/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/analytics?period=last30days"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 if session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {} });

    const request = new Request(
      "http://localhost/api/admin/analytics?period=last30days"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockUserFindUnique.mockResolvedValue({ role: "USER" });

    const request = new Request(
      "http://localhost/api/admin/analytics?period=last30days"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 403 if user not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockUserFindUnique.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/analytics?period=last30days"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 400 for invalid period", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123" },
    });
    mockUserFindUnique.mockResolvedValue({ role: "ADMIN" });

    const request = new Request(
      "http://localhost/api/admin/analytics?period=invalid"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid period");
  });

  it("returns analytics data for valid admin request", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123" },
    });
    mockUserFindUnique.mockResolvedValue({ role: "ADMIN" });

    const mockAnalyticsData = {
      overview: {
        totalUsers: 100,
        totalAssessments: 50,
        completedAssessments: 20,
        activeAssessments: 10,
        completionRate: 40,
        avgCompletionTimeMinutes: 60,
      },
      trends: {
        signups: [{ date: "2024-01-01", count: 5 }],
        assessmentStarts: [{ date: "2024-01-01", count: 3 }],
        assessmentCompletions: [{ date: "2024-01-01", count: 2 }],
      },
      phaseDurations: [],
      statusDistribution: [],
      completionFunnel: [],
      period: "last30days",
      generatedAt: "2024-01-01T00:00:00Z",
    };
    mockGetAnalytics.mockResolvedValue(mockAnalyticsData);

    const request = new Request(
      "http://localhost/api/admin/analytics?period=last30days"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.overview.totalUsers).toBe(100);
    expect(data.period).toBe("last30days");
    expect(mockGetAnalytics).toHaveBeenCalledWith("last30days");
  });

  it("defaults to last30days when no period provided", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123" },
    });
    mockUserFindUnique.mockResolvedValue({ role: "ADMIN" });
    mockGetAnalytics.mockResolvedValue({
      period: "last30days",
      generatedAt: "2024-01-01T00:00:00Z",
    });

    const request = new Request("http://localhost/api/admin/analytics");
    await GET(request);

    expect(mockGetAnalytics).toHaveBeenCalledWith("last30days");
  });

  it("accepts all valid period values", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123" },
    });
    mockUserFindUnique.mockResolvedValue({ role: "ADMIN" });
    mockGetAnalytics.mockResolvedValue({ period: "today", generatedAt: "" });

    const periods = [
      "today",
      "yesterday",
      "last7days",
      "last30days",
      "last90days",
      "all",
    ];

    for (const period of periods) {
      vi.clearAllMocks();
      mockAuth.mockResolvedValue({
        user: { id: "admin-123" },
      });
      mockUserFindUnique.mockResolvedValue({ role: "ADMIN" });
      mockGetAnalytics.mockResolvedValue({
        period,
        generatedAt: "",
      });

      const request = new Request(
        `http://localhost/api/admin/analytics?period=${period}`
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockGetAnalytics).toHaveBeenCalledWith(period);
    }
  });

  it("returns 500 on internal error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123" },
    });
    mockUserFindUnique.mockResolvedValue({ role: "ADMIN" });
    mockGetAnalytics.mockRejectedValue(new Error("Database error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new Request(
      "http://localhost/api/admin/analytics?period=last30days"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch analytics");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("does not expose PII in response", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123" },
    });
    mockUserFindUnique.mockResolvedValue({ role: "ADMIN" });

    // Analytics data should not contain PII
    const mockAnalyticsData = {
      overview: {
        totalUsers: 100,
        totalAssessments: 50,
        completedAssessments: 20,
        activeAssessments: 10,
        completionRate: 40,
        avgCompletionTimeMinutes: 60,
      },
      trends: {
        signups: [{ date: "2024-01-01", count: 5 }],
        assessmentStarts: [],
        assessmentCompletions: [],
      },
      phaseDurations: [],
      statusDistribution: [],
      completionFunnel: [],
      period: "last30days",
      generatedAt: "2024-01-01T00:00:00Z",
    };
    mockGetAnalytics.mockResolvedValue(mockAnalyticsData);

    const request = new Request(
      "http://localhost/api/admin/analytics?period=last30days"
    );
    const response = await GET(request);
    const data = await response.json();

    const dataString = JSON.stringify(data);

    // Should not contain any email-like patterns
    expect(dataString).not.toMatch(/@/);
    // Should not contain "email" key
    expect(dataString).not.toContain('"email"');
    // Should not contain "name" key (as user name)
    expect(dataString).not.toContain('"userName"');
    expect(dataString).not.toContain('"user_name"');
  });
});
