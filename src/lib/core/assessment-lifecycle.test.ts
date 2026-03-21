import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssessmentStatus } from "@prisma/client";

// ─── Shared auth mock ──────────────────────────────────────────────
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// ─── DB mocks ──────────────────────────────────────────────────────
const mockAssessmentFindFirst = vi.fn();
const mockAssessmentFindUnique = vi.fn();
const mockAssessmentUpdate = vi.fn();
const mockCoworkerFindFirst = vi.fn();
const mockCoworkerFindMany = vi.fn();
const mockConversationFindMany = vi.fn();
const mockConversationCreate = vi.fn();
const mockConversationUpdate = vi.fn();
const mockRecordingUpsert = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
      findUnique: (...args: unknown[]) => mockAssessmentFindUnique(...args),
      update: (...args: unknown[]) => mockAssessmentUpdate(...args),
    },
    coworker: {
      findFirst: (...args: unknown[]) => mockCoworkerFindFirst(...args),
      findMany: (...args: unknown[]) => mockCoworkerFindMany(...args),
    },
    conversation: {
      findMany: (...args: unknown[]) => mockConversationFindMany(...args),
      create: (...args: unknown[]) => mockConversationCreate(...args),
      update: (...args: unknown[]) => mockConversationUpdate(...args),
    },
    recording: {
      upsert: (...args: unknown[]) => mockRecordingUpsert(...args),
    },
  },
}));

// ─── Gemini mocks (chat + call/token) ──────────────────────────────
vi.mock("@/lib/ai/gemini", () => ({
  gemini: {
    models: {
      generateContentStream: vi.fn(),
    },
  },
  generateEphemeralToken: vi.fn(),
}));
vi.mock("@/lib/ai/conversation-memory", () => ({
  buildCoworkerMemory: vi.fn().mockResolvedValue({
    hasPriorConversations: false,
    summary: null,
    recentMessages: [],
    totalMessageCount: 0,
  }),
  formatMemoryForPrompt: vi.fn().mockReturnValue(""),
  buildCrossCoworkerContext: vi.fn().mockReturnValue(""),
  formatConversationsForSummary: vi.fn().mockReturnValue(""),
}));
vi.mock("@/lib/ai", () => ({
  parseCoworkerKnowledge: vi.fn().mockReturnValue([]),
}));

// ─── Supabase mock (recording route) ──────────────────────────────
vi.mock("@/lib/external", () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi
          .fn()
          .mockResolvedValue({ data: { signedUrl: "https://example.com/signed" }, error: null }),
      }),
    },
  },
  STORAGE_BUCKETS: { RECORDINGS: "recordings", SCREENSHOTS: "screenshots" },
  isValidPrUrl: (url: string) =>
    /^https:\/\/(github\.com|gitlab\.|bitbucket\.org)/.test(url) &&
    (/\/pull\/\d+/.test(url) || /merge_requests\/\d+/.test(url) || /pull-requests\/\d+/.test(url)),
}));

// ─── Import route handlers AFTER all mocks ────────────────────────
import { POST as chatPOST } from "@/app/api/chat/route";
import { POST as callTokenPOST } from "@/app/api/call/token/route";
import { POST as completePOST } from "@/app/api/assessment/complete/route";
import { POST as recordingPOST } from "@/app/api/recording/route";
import { NextRequest } from "next/server";

// ─── Helpers ──────────────────────────────────────────────────────
function authedSession(userId = "user-1") {
  mockAuth.mockResolvedValue({ user: { id: userId, name: "Test User" } });
}

function makeJsonRequest(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function _makeFormDataRequest(url: string, fields: Record<string, string | Blob>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  // Use NextRequest-compatible constructor
  return new Request(url, { method: "POST", body: formData });
}

function mockAssessment(status: AssessmentStatus, extra: Record<string, unknown> = {}) {
  return {
    id: "assessment-1",
    userId: "user-1",
    status,
    scenarioId: "scenario-1",
    startedAt: new Date("2025-01-01T10:00:00Z"),
    prUrl: null,
    managerMessagesStarted: false,
    repoUrl: "https://github.com/org/repo",
    scenario: {
      companyName: "Test Corp",
      taskDescription: "Build a feature",
      techStack: ["typescript", "react"],
    },
    user: { name: "Test User", email: "test@test.com" },
    ...extra,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Assessment Lifecycle State-Machine Tests
//
// The assessment lifecycle: WELCOME → WORKING → COMPLETED
// These tests verify that each route correctly rejects requests
// when the assessment is in an invalid state.
// ═══════════════════════════════════════════════════════════════════

describe("Assessment Lifecycle State Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Chat route (/api/chat) ───────────────────────────────────
  describe("POST /api/chat — status guards", () => {
    const chatBody = {
      assessmentId: "assessment-1",
      coworkerId: "coworker-1",
      message: "Hello",
    };

    it("rejects chat when assessment status is WELCOME", async () => {
      authedSession();
      mockAssessmentFindFirst.mockResolvedValue(mockAssessment(AssessmentStatus.WELCOME));
      mockConversationFindMany.mockResolvedValue([]);

      const response = await chatPOST(
        makeJsonRequest("http://localhost/api/chat", chatBody)
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("WELCOME");
    });

    it("rejects chat when assessment status is COMPLETED", async () => {
      authedSession();
      mockAssessmentFindFirst.mockResolvedValue(mockAssessment(AssessmentStatus.COMPLETED));
      mockConversationFindMany.mockResolvedValue([]);

      const response = await chatPOST(
        makeJsonRequest("http://localhost/api/chat", chatBody)
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("COMPLETED");
    });
  });

  // ─── Call token route (/api/call/token) ───────────────────────
  describe("POST /api/call/token — status guards", () => {
    const tokenBody = {
      assessmentId: "assessment-1",
      coworkerId: "coworker-1",
    };

    it("rejects call token when assessment status is COMPLETED", async () => {
      authedSession();
      mockAssessmentFindFirst.mockResolvedValue(mockAssessment(AssessmentStatus.COMPLETED));

      const response = await callTokenPOST(
        makeJsonRequest("http://localhost/api/call/token", tokenBody)
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("completed");
    });
  });

  // ─── Assessment complete route (/api/assessment/complete) ─────
  describe("POST /api/assessment/complete — status guards", () => {
    const completeBody = {
      assessmentId: "assessment-1",
      prUrl: "https://github.com/org/repo/pull/123",
    };

    it("rejects completion when assessment is already COMPLETED (double-completion)", async () => {
      authedSession();
      mockAssessmentFindUnique.mockResolvedValue(
        mockAssessment(AssessmentStatus.COMPLETED)
      );

      const response = await completePOST(
        makeJsonRequest("http://localhost/api/assessment/complete", completeBody)
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("Cannot complete assessment");
    });

    it("rejects completion when assessment is still in WELCOME", async () => {
      authedSession();
      mockAssessmentFindUnique.mockResolvedValue(
        mockAssessment(AssessmentStatus.WELCOME)
      );

      const response = await completePOST(
        makeJsonRequest("http://localhost/api/assessment/complete", completeBody)
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("Cannot complete assessment");
    });
  });

  // ─── Recording upload route (/api/recording) ─────────────────
  describe("POST /api/recording — status guards", () => {
    it("rejects recording upload when assessment is COMPLETED", async () => {
      authedSession();
      mockAssessmentFindFirst.mockResolvedValue(mockAssessment(AssessmentStatus.COMPLETED));

      // jsdom's File/Blob with FormData can hang or fail assertions,
      // so we use Node's native File (globalThis.File from undici) via NextRequest
      const { File: NodeFile } = await import("node:buffer");
      const file = new NodeFile(["x"], "t.webm", { type: "video/webm" });
      const formData = new FormData();
      formData.append("file", file as unknown as Blob);
      formData.append("assessmentId", "assessment-1");
      formData.append("type", "video");

      const request = new NextRequest("http://localhost/api/recording", {
        method: "POST",
        body: formData,
      });

      const response = await recordingPOST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("completed");
    });
  });
});
