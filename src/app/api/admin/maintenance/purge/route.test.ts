import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockUserFindUnique = vi.fn();
const mockPurge = vi.fn();

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
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("@/lib/maintenance", () => ({
  purgeOldObservabilityData: (...args: unknown[]) => mockPurge(...args),
}));

import { POST } from "./route";

describe("POST /api/admin/maintenance/purge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 if session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {} });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValue({ role: "USER" });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 403 if user not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockUserFindUnique.mockResolvedValue(null);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns purge results for admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-123" } });
    mockUserFindUnique.mockResolvedValue({ role: "ADMIN" });
    mockPurge.mockResolvedValue({
      clientErrors: 10,
      voiceSessions: 5,
      apiRequestLogs: 20,
      candidateEvents: 8,
      totalDeleted: 43,
      cutoffDate: "2026-02-18T12:00:00.000Z",
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.totalDeleted).toBe(43);
    expect(data.data.clientErrors).toBe(10);
    expect(data.data.voiceSessions).toBe(5);
    expect(data.data.apiRequestLogs).toBe(20);
    expect(data.data.candidateEvents).toBe(8);
    expect(data.data.cutoffDate).toBe("2026-02-18T12:00:00.000Z");
  });

  it("returns 500 on purge failure", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-123" } });
    mockUserFindUnique.mockResolvedValue({ role: "ADMIN" });
    mockPurge.mockRejectedValue(new Error("Database error"));

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to purge observability data");
  });
});
