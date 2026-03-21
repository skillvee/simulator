import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock db
const mockAssessmentFindFirst = vi.fn();
const mockVoiceSessionCreate = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
    },
    voiceSession: {
      create: (...args: unknown[]) => mockVoiceSessionCreate(...args),
    },
  },
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/call/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  assessmentId: "assess-1",
  coworkerId: "coworker-1",
  startTime: "2026-03-20T10:00:00Z",
  endTime: "2026-03-20T10:05:00Z",
  transcript: [{ role: "user", text: "Hello", timestamp: "2026-03-20T10:00:01Z" }],
  connectionEvents: [{ event: "connected", timestamp: "2026-03-20T10:00:00Z" }],
  tokenName: "token-abc",
  errorMessage: undefined,
  durationMs: 300000,
};

describe("POST /api/call/log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(401);
  });

  it("should return 400 for invalid request body", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const response = await POST(
      makeRequest({ assessmentId: "a" }) // missing required fields
    );
    expect(response.status).toBe(400);
  });

  it("should return 404 when assessment not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockAssessmentFindFirst.mockResolvedValue(null);

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 201 on successful voice session creation", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assess-1",
      userId: "user-123",
    });
    mockVoiceSessionCreate.mockResolvedValue({ id: "vs-1" });

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.voiceSession.id).toBe("vs-1");
  });

  it("should pass correct data to db.voiceSession.create", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assess-1",
      userId: "user-123",
    });
    mockVoiceSessionCreate.mockResolvedValue({ id: "vs-1" });

    await POST(makeRequest(validBody));

    expect(mockVoiceSessionCreate).toHaveBeenCalledWith({
      data: {
        assessmentId: "assess-1",
        coworkerId: "coworker-1",
        startTime: new Date("2026-03-20T10:00:00Z"),
        endTime: new Date("2026-03-20T10:05:00Z"),
        transcript: [{ role: "user", text: "Hello", timestamp: "2026-03-20T10:00:01Z" }],
        connectionEvents: [{ event: "connected", timestamp: "2026-03-20T10:00:00Z" }],
        tokenName: "token-abc",
        errorMessage: null,
        durationMs: 300000,
      },
    });
  });

  it("should handle optional fields correctly", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assess-1",
      userId: "user-123",
    });
    mockVoiceSessionCreate.mockResolvedValue({ id: "vs-2" });

    const minimalBody = {
      assessmentId: "assess-1",
      coworkerId: "coworker-1",
      startTime: "2026-03-20T10:00:00Z",
      transcript: [],
      connectionEvents: [],
    };

    const response = await POST(makeRequest(minimalBody));
    expect(response.status).toBe(201);

    expect(mockVoiceSessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        endTime: null,
        tokenName: null,
        errorMessage: null,
        durationMs: null,
      }),
    });
  });

  it("should return 500 on internal error", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockAssessmentFindFirst.mockRejectedValue(new Error("DB error"));

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(500);
  });

  it("should verify assessment belongs to authenticated user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockAssessmentFindFirst.mockResolvedValue(null);

    await POST(makeRequest(validBody));

    expect(mockAssessmentFindFirst).toHaveBeenCalledWith({
      where: {
        id: "assess-1",
        userId: "user-123",
      },
    });
  });
});
