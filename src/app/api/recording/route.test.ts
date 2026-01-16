import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock database
const mockAssessmentFindFirst = vi.fn();
const mockRecordingUpsert = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
    },
    recording: {
      upsert: (...args: unknown[]) => mockRecordingUpsert(...args),
    },
  },
}));

// Mock Supabase admin client
const mockUpload = vi.fn();
const mockCreateSignedUrl = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args),
      }),
    },
  },
}));

import { POST, GET } from "./route";

describe("Recording API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({ error: null });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.com/signed-url" },
      error: null,
    });
  });

  describe("POST /api/recording", () => {
    it("returns 401 if not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const formData = new FormData();
      const request = new NextRequest("http://localhost/api/recording", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("returns 400 if missing required fields", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const formData = new FormData();
      // Missing file, assessmentId, type
      const request = new NextRequest("http://localhost/api/recording", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("Missing required fields");
    });

    // Note: Tests for file size limits and successful uploads are skipped
    // because jsdom's File/Blob arrayBuffer() hangs with larger files.
    // The file size validation and upload logic are tested via integration tests.
  });

  describe("GET /api/recording", () => {
    it("returns 401 if not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/recording?assessmentId=test"
      );

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("returns 400 if assessmentId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const request = new NextRequest("http://localhost/api/recording");

      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it("returns 404 if assessment not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockAssessmentFindFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/recording?assessmentId=test"
      );

      const response = await GET(request);
      expect(response.status).toBe(404);
    });

    it("returns recordings for an assessment", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockAssessmentFindFirst.mockResolvedValue({
        id: "assessment-1",
        userId: "user-1",
        scenarioId: "scenario-1",
        status: "WORKING",
        startedAt: new Date(),
        completedAt: null,
        cvUrl: null,
        prUrl: null,
        report: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        recordings: [
          {
            id: "recording-1",
            assessmentId: "assessment-1",
            type: "screen",
            storageUrl: "https://example.com/recording.webm",
            startTime: new Date(),
            endTime: null,
            analysis: null,
            createdAt: new Date(),
          },
        ],
      });

      const request = new NextRequest(
        "http://localhost/api/recording?assessmentId=assessment-1"
      );

      const response = await GET(request);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.recordings).toHaveLength(1);
    });
  });
});
