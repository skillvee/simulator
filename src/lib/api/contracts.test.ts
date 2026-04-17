/**
 * API Response Contract Tests
 *
 * These tests verify that route handlers return responses matching their
 * Zod response schemas. If a route handler changes its response shape
 * (e.g., renaming a field, nesting differently, removing a field), these
 * tests will fail immediately — protecting the frontend from silent breakage.
 *
 * Pattern: call actual route handler with mocked deps → parse JSON → validate against Zod schema
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssessmentStatus } from "@prisma/client";
import {
  ChatStreamChunkSchema,
  ChatStreamDoneSchema,
  ChatGetResponseSchema,
  AssessmentCreateResponseSchema,
  CallTokenResponseSchema,
  RecordingUploadResponseSchema,
} from "@/lib/schemas";

// ─── Shared mocks ───────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// DB mocks
const mockAssessmentFindFirst = vi.fn();
const mockAssessmentFindUnique = vi.fn();
const mockAssessmentCreate = vi.fn();
const mockAssessmentUpdate = vi.fn();
const mockScenarioFindUnique = vi.fn();
const mockCoworkerFindFirst = vi.fn();
const mockCoworkerFindMany = vi.fn();
const mockConversationFindFirst = vi.fn();
const mockConversationFindMany = vi.fn();
const mockConversationCreate = vi.fn();
const mockConversationUpdate = vi.fn();
const mockRecordingUpsert = vi.fn();
const mockRecordingSegmentFindUnique = vi.fn();
const mockRecordingSegmentUpdate = vi.fn();
const mockAssessmentApiCallCreate = vi.fn();
const mockAssessmentApiCallUpdate = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
      findUnique: (...args: unknown[]) => mockAssessmentFindUnique(...args),
      create: (...args: unknown[]) => mockAssessmentCreate(...args),
      update: (...args: unknown[]) => mockAssessmentUpdate(...args),
    },
    scenario: {
      findUnique: (...args: unknown[]) => mockScenarioFindUnique(...args),
    },
    coworker: {
      findFirst: (...args: unknown[]) => mockCoworkerFindFirst(...args),
      findMany: (...args: unknown[]) => mockCoworkerFindMany(...args),
    },
    conversation: {
      findFirst: (...args: unknown[]) => mockConversationFindFirst(...args),
      findMany: (...args: unknown[]) => mockConversationFindMany(...args),
      create: (...args: unknown[]) => mockConversationCreate(...args),
      update: (...args: unknown[]) => mockConversationUpdate(...args),
    },
    recording: {
      upsert: (...args: unknown[]) => mockRecordingUpsert(...args),
    },
    recordingSegment: {
      findUnique: (...args: unknown[]) => mockRecordingSegmentFindUnique(...args),
      update: (...args: unknown[]) => mockRecordingSegmentUpdate(...args),
    },
    assessmentApiCall: {
      create: (...args: unknown[]) => mockAssessmentApiCallCreate(...args),
      update: (...args: unknown[]) => mockAssessmentApiCallUpdate(...args),
    },
  },
}));

// Gemini mock
const mockGenerateContentStream = vi.fn();
vi.mock("@/lib/ai/gemini", () => ({
  gemini: {
    models: {
      generateContentStream: (...args: unknown[]) =>
        mockGenerateContentStream(...args),
    },
  },
  generateEphemeralToken: vi.fn().mockResolvedValue("mock-ephemeral-token"),
}));

// Conversation memory mocks
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

vi.mock("@/lib/avatar", () => ({
  inferDemographics: vi.fn().mockReturnValue({ gender: "male" }),
}));

vi.mock("@/lib/ai/gemini-config", () => ({
  GEMINI_VOICES: {
    male: [{ name: "Puck" }],
    female: [{ name: "Kore" }],
  },
}));

vi.mock("@/lib/scenarios/repo-templates", () => ({
  provisionAssessmentRepo: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/external", () => ({
  isValidPrUrl: vi.fn().mockReturnValue(true),
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://storage.example.com/signed-url" },
          error: null,
        }),
      }),
    },
  },
  STORAGE_BUCKETS: {
    RECORDINGS: "recordings",
    SCREENSHOTS: "screenshots",
  },
}));

// ─── Test constants ─────────────────────────────────────────────────────────

const USER_ID = "user-1";
const ASSESSMENT_ID = "assessment-1";
const COWORKER_ID = "coworker-1";
const SCENARIO_ID = "scenario-1";

const mockSession = { user: { id: USER_ID, name: "Test User" } };

const mockAssessment = {
  id: ASSESSMENT_ID,
  userId: USER_ID,
  scenarioId: SCENARIO_ID,
  status: AssessmentStatus.WORKING,
  startedAt: new Date("2026-01-01T00:00:00Z"),
  completedAt: null,
  repoUrl: null,
  scenario: {
    id: SCENARIO_ID,
    companyName: "TestCo",
    taskDescription: "Build a widget",
    techStack: ["TypeScript"],
    repoUrl: null,
  },
  user: { name: "Test User", email: "test@example.com" },
};

const mockCoworker = {
  id: COWORKER_ID,
  scenarioId: SCENARIO_ID,
  name: "Alex",
  role: "Senior Engineer",
  personaStyle: "friendly",
  personality: null,
  knowledge: "[]",
  avatarUrl: null,
  voiceName: null,
};

// ─── Helper: read SSE stream events ─────────────────────────────────────────

async function readSSEEvents(
  response: Response
): Promise<Array<Record<string, unknown>>> {
  const text = await response.text();
  const events: Array<Record<string, unknown>> = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("data: ")) {
      events.push(JSON.parse(line.slice(6)));
    }
  }
  return events;
}

// Helper: create async iterable for Gemini stream mock
function createMockStream(texts: string[]) {
  return (async function* () {
    for (const text of texts) {
      yield { text };
    }
  })();
}

// ─── Contract Tests ─────────────────────────────────────────────────────────

describe("API Response Contract Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession);
    mockAssessmentApiCallCreate.mockResolvedValue({ id: "api-call-1" });
  });

  // ── POST /api/chat (SSE stream) ──────────────────────────────────────────

  describe("POST /api/chat — SSE stream contract", () => {
    it("stream events match chunk and done schemas", async () => {
      const { POST } = await import("@/app/api/chat/route");

      mockAssessmentFindFirst.mockResolvedValue(mockAssessment);
      mockConversationFindMany.mockResolvedValue([]);
      mockCoworkerFindFirst.mockResolvedValue(mockCoworker);
      mockConversationCreate.mockResolvedValue({ id: "conv-1" });
      mockGenerateContentStream.mockResolvedValue(
        createMockStream(["Hello ", "there!"])
      );

      const request = new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          assessmentId: ASSESSMENT_ID,
          coworkerId: COWORKER_ID,
          message: "Hi",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");

      const events = await readSSEEvents(response);
      expect(events.length).toBeGreaterThanOrEqual(2);

      // All non-done events must be chunks
      const chunks = events.filter((e) => e.type === "chunk");
      for (const chunk of chunks) {
        const result = ChatStreamChunkSchema.safeParse(chunk);
        expect(result.success).toBe(true);
      }

      // Last event must be "done"
      const doneEvent = events.find((e) => e.type === "done");
      expect(doneEvent).toBeDefined();
      const doneResult = ChatStreamDoneSchema.safeParse(doneEvent);
      expect(doneResult.success).toBe(true);
    });
  });

  // ── GET /api/chat ────────────────────────────────────────────────────────

  describe("GET /api/chat — response contract", () => {
    it("response matches ChatGetResponseSchema", async () => {
      const { GET } = await import("@/app/api/chat/route");

      mockAssessmentFindFirst.mockResolvedValue(mockAssessment);
      mockCoworkerFindFirst.mockResolvedValue(mockCoworker);
      mockConversationFindFirst.mockResolvedValue({
        id: "conv-1",
        transcript: [
          { role: "user", text: "Hello", timestamp: "2026-01-01T00:00:00Z" },
          {
            role: "model",
            text: "Hi there!",
            timestamp: "2026-01-01T00:00:01Z",
          },
        ],
      });

      const request = new Request(
        `http://localhost/api/chat?assessmentId=${ASSESSMENT_ID}&coworkerId=${COWORKER_ID}`
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      const result = ChatGetResponseSchema.safeParse(body);
      expect(result.success).toBe(true);
    });

    it("empty messages still match schema", async () => {
      const { GET } = await import("@/app/api/chat/route");

      mockAssessmentFindFirst.mockResolvedValue(mockAssessment);
      mockCoworkerFindFirst.mockResolvedValue(mockCoworker);
      mockConversationFindFirst.mockResolvedValue(null);

      const request = new Request(
        `http://localhost/api/chat?assessmentId=${ASSESSMENT_ID}&coworkerId=${COWORKER_ID}`
      );

      const response = await GET(request);
      const body = await response.json();
      const result = ChatGetResponseSchema.safeParse(body);
      expect(result.success).toBe(true);
      expect(result.data?.data.messages).toEqual([]);
    });
  });

  // ── POST /api/assessment/create ──────────────────────────────────────────

  describe("POST /api/assessment/create — response contract", () => {
    it("new assessment matches AssessmentCreateResponseSchema", async () => {
      const { POST } = await import("@/app/api/assessment/create/route");

      mockScenarioFindUnique.mockResolvedValue({
        id: SCENARIO_ID,
        name: "Test Scenario",
        isPublished: true,
        repoUrl: null,
      });
      mockAssessmentFindFirst.mockResolvedValue(null); // No existing assessment
      mockAssessmentCreate.mockResolvedValue({
        id: "new-assessment-id",
        userId: USER_ID,
        scenarioId: SCENARIO_ID,
        status: AssessmentStatus.WORKING,
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: new Date(),
        completedAt: null,
        repoUrl: null,
        repoStatus: null,
      });

      const request = new Request(
        "http://localhost/api/assessment/create",
        {
          method: "POST",
          body: JSON.stringify({ scenarioId: SCENARIO_ID }),
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(201);

      const body = await response.json();
      const result = AssessmentCreateResponseSchema.safeParse(body);
      expect(result.success).toBe(true);
      expect(body.data.isExisting).toBe(false);
    });

    it("existing assessment matches AssessmentCreateResponseSchema", async () => {
      const { POST } = await import("@/app/api/assessment/create/route");

      mockScenarioFindUnique.mockResolvedValue({
        id: SCENARIO_ID,
        name: "Test Scenario",
        isPublished: true,
        repoUrl: null,
      });
      mockAssessmentFindFirst.mockResolvedValue({
        id: "existing-assessment",
        userId: USER_ID,
        scenarioId: SCENARIO_ID,
        status: AssessmentStatus.WORKING,
        createdAt: new Date(),
      });

      const request = new Request(
        "http://localhost/api/assessment/create",
        {
          method: "POST",
          body: JSON.stringify({ scenarioId: SCENARIO_ID }),
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      const result = AssessmentCreateResponseSchema.safeParse(body);
      expect(result.success).toBe(true);
      expect(body.data.isExisting).toBe(true);
    });
  });

  // ── POST /api/call/token ─────────────────────────────────────────────────

  describe("POST /api/call/token — response contract", () => {
    it("response matches CallTokenResponseSchema", async () => {
      const { POST } = await import("@/app/api/call/token/route");

      mockAssessmentFindFirst.mockResolvedValue(mockAssessment);
      mockCoworkerFindFirst.mockResolvedValue(mockCoworker);
      mockConversationFindMany.mockResolvedValue([]);
      mockCoworkerFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/call/token", {
        method: "POST",
        body: JSON.stringify({
          assessmentId: ASSESSMENT_ID,
          coworkerId: COWORKER_ID,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      const result = CallTokenResponseSchema.safeParse(body);
      expect(result.success).toBe(true);
    });
  });

  // ── POST /api/recording ──────────────────────────────────────────────────

  describe("POST /api/recording — response contract", () => {
    it("response matches RecordingUploadResponseSchema", async () => {
      const { POST } = await import("@/app/api/recording/route");

      mockAssessmentFindFirst.mockResolvedValue({
        ...mockAssessment,
        status: AssessmentStatus.WORKING,
      });
      mockRecordingUpsert.mockResolvedValue({ id: "recording-1" });

      // jsdom File.arrayBuffer() hangs in vitest — create a request with
      // a custom formData() that returns pre-built mock values
      const mockFile = {
        size: 100,
        type: "image/jpeg",
        name: "test.jpg",
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(3)),
      };

      const mockFormData = {
        get: (key: string) => {
          const values: Record<string, unknown> = {
            file: mockFile,
            assessmentId: ASSESSMENT_ID,
            type: "screenshot",
            chunkIndex: null,
            timestamp: null,
            segmentId: null,
            snapshotId: null,
          };
          return values[key] ?? null;
        },
      };

      const request = {
        formData: () => Promise.resolve(mockFormData),
      };

      const response = await POST(request as never);
      expect(response.status).toBe(200);

      const body = await response.json();
      const result = RecordingUploadResponseSchema.safeParse(body);
      expect(result.success).toBe(true);
    });
  });
});
