import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockClientErrorDeleteMany = vi.fn();
const mockVoiceSessionDeleteMany = vi.fn();
const mockApiRequestLogDeleteMany = vi.fn();
const mockCandidateEventDeleteMany = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    clientError: {
      deleteMany: (...args: unknown[]) => mockClientErrorDeleteMany(...args),
    },
    voiceSession: {
      deleteMany: (...args: unknown[]) => mockVoiceSessionDeleteMany(...args),
    },
    apiRequestLog: {
      deleteMany: (...args: unknown[]) => mockApiRequestLogDeleteMany(...args),
    },
    candidateEvent: {
      deleteMany: (...args: unknown[]) => mockCandidateEventDeleteMany(...args),
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

import { purgeOldObservabilityData } from "./data-retention";

describe("purgeOldObservabilityData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deletes records older than 30 days from all observability tables", async () => {
    mockClientErrorDeleteMany.mockResolvedValue({ count: 10 });
    mockVoiceSessionDeleteMany.mockResolvedValue({ count: 5 });
    mockApiRequestLogDeleteMany.mockResolvedValue({ count: 20 });
    mockCandidateEventDeleteMany.mockResolvedValue({ count: 8 });

    const result = await purgeOldObservabilityData();

    expect(result.clientErrors).toBe(10);
    expect(result.voiceSessions).toBe(5);
    expect(result.apiRequestLogs).toBe(20);
    expect(result.candidateEvents).toBe(8);
    expect(result.totalDeleted).toBe(43);
  });

  it("uses correct cutoff date (30 days ago)", async () => {
    mockClientErrorDeleteMany.mockResolvedValue({ count: 0 });
    mockVoiceSessionDeleteMany.mockResolvedValue({ count: 0 });
    mockApiRequestLogDeleteMany.mockResolvedValue({ count: 0 });
    mockCandidateEventDeleteMany.mockResolvedValue({ count: 0 });

    await purgeOldObservabilityData();

    // Verify all tables are called with a cutoff ~30 days before now
    const callArg = mockClientErrorDeleteMany.mock.calls[0][0];
    const cutoff = callArg.where.createdAt.lt as Date;
    const now = new Date("2026-03-20T12:00:00Z");
    const diffDays = (now.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(30, 0);

    // All four tables should use the same structure
    for (const mock of [mockClientErrorDeleteMany, mockVoiceSessionDeleteMany, mockApiRequestLogDeleteMany, mockCandidateEventDeleteMany]) {
      expect(mock).toHaveBeenCalledWith({
        where: { createdAt: { lt: expect.any(Date) } },
      });
    }
  });

  it("returns cutoff date in ISO format", async () => {
    mockClientErrorDeleteMany.mockResolvedValue({ count: 0 });
    mockVoiceSessionDeleteMany.mockResolvedValue({ count: 0 });
    mockApiRequestLogDeleteMany.mockResolvedValue({ count: 0 });
    mockCandidateEventDeleteMany.mockResolvedValue({ count: 0 });

    const result = await purgeOldObservabilityData();

    // Should be a valid ISO date string ~30 days before the fake now
    expect(result.cutoffDate).toMatch(/^2026-02-18T\d{2}:00:00\.000Z$/);
  });

  it("handles zero deletions", async () => {
    mockClientErrorDeleteMany.mockResolvedValue({ count: 0 });
    mockVoiceSessionDeleteMany.mockResolvedValue({ count: 0 });
    mockApiRequestLogDeleteMany.mockResolvedValue({ count: 0 });
    mockCandidateEventDeleteMany.mockResolvedValue({ count: 0 });

    const result = await purgeOldObservabilityData();

    expect(result.totalDeleted).toBe(0);
  });

  it("propagates database errors", async () => {
    mockClientErrorDeleteMany.mockRejectedValue(new Error("DB connection lost"));
    mockVoiceSessionDeleteMany.mockResolvedValue({ count: 0 });
    mockApiRequestLogDeleteMany.mockResolvedValue({ count: 0 });
    mockCandidateEventDeleteMany.mockResolvedValue({ count: 0 });

    await expect(purgeOldObservabilityData()).rejects.toThrow("DB connection lost");
  });
});
