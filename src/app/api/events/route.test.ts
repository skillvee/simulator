import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock db
const mockAssessmentFindFirst = vi.fn();
const mockCandidateEventCreateMany = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
    },
    candidateEvent: {
      createMany: (...args: unknown[]) => mockCandidateEventCreateMany(...args),
    },
  },
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  assessmentId: "assess-1",
  events: [
    {
      eventType: "TAB_SWITCH",
      timestamp: "2026-03-20T10:00:00Z",
      metadata: { targetTab: "browser" },
    },
    {
      eventType: "PASTE",
      timestamp: "2026-03-20T10:00:05Z",
      metadata: { pasteLength: 42 },
    },
  ],
};

describe("POST /api/events", () => {
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

    const response = await POST(makeRequest({ assessmentId: "a" }));
    expect(response.status).toBe(400);
  });

  it("should return 400 for empty events array", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const response = await POST(
      makeRequest({ assessmentId: "assess-1", events: [] })
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

  it("should return 201 on successful event creation", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assess-1",
      userId: "user-123",
    });
    mockCandidateEventCreateMany.mockResolvedValue({ count: 2 });

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.count).toBe(2);
  });

  it("should pass correct data to db.candidateEvent.createMany", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assess-1",
      userId: "user-123",
    });
    mockCandidateEventCreateMany.mockResolvedValue({ count: 2 });

    await POST(makeRequest(validBody));

    expect(mockCandidateEventCreateMany).toHaveBeenCalledWith({
      data: [
        {
          assessmentId: "assess-1",
          eventType: "TAB_SWITCH",
          timestamp: new Date("2026-03-20T10:00:00Z"),
          metadata: { targetTab: "browser" },
        },
        {
          assessmentId: "assess-1",
          eventType: "PASTE",
          timestamp: new Date("2026-03-20T10:00:05Z"),
          metadata: { pasteLength: 42 },
        },
      ],
    });
  });

  it("should handle events without metadata", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assess-1",
      userId: "user-123",
    });
    mockCandidateEventCreateMany.mockResolvedValue({ count: 1 });

    const body = {
      assessmentId: "assess-1",
      events: [
        { eventType: "FOCUS_LOST", timestamp: "2026-03-20T10:00:00Z" },
      ],
    };

    const response = await POST(makeRequest(body));
    expect(response.status).toBe(201);

    expect(mockCandidateEventCreateMany).toHaveBeenCalledWith({
      data: [
        {
          assessmentId: "assess-1",
          eventType: "FOCUS_LOST",
          timestamp: new Date("2026-03-20T10:00:00Z"),
          metadata: undefined,
        },
      ],
    });
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

  it("should return 500 on internal error", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockAssessmentFindFirst.mockRejectedValue(new Error("DB error"));

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(500);
  });
});
