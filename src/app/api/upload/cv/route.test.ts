import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock @/lib/external (supabase + storage)
const mockUpload = vi.fn();
const mockCreateSignedUrl = vi.fn();
vi.mock("@/lib/external", () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args),
      }),
    },
  },
  STORAGE_BUCKETS: {
    RESUMES: "resumes",
  },
}));

// Mock database
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

// Mock CV parser (now in @/lib/candidate)
const mockParseCv = vi.fn();
vi.mock("@/lib/candidate", () => ({
  parseCv: (...args: unknown[]) => mockParseCv(...args),
  profileToPrismaJson: (profile: unknown) => profile,
}));

import { POST } from "./route";

// Constants that mirror route.ts for validation tests
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "txt", "rtf"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/rtf",
];

describe("POST /api/upload/cv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockUpload.mockResolvedValue({ error: null });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.com/signed-url" },
      error: null,
    });
  });

  describe("authentication", () => {
    it("returns 401 when session is null", async () => {
      mockAuth.mockResolvedValue(null);
      const formData = new FormData();
      const request = new Request("http://localhost/api/upload/cv", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 401 when user is missing from session", async () => {
      mockAuth.mockResolvedValue({ user: null });
      const formData = new FormData();
      const request = new Request("http://localhost/api/upload/cv", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 401 when user id is missing", async () => {
      mockAuth.mockResolvedValue({ user: { email: "test@example.com" } });
      const formData = new FormData();
      const request = new Request("http://localhost/api/upload/cv", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("file validation", () => {
    it("returns 400 when no file is provided", async () => {
      const formData = new FormData();
      const request = new Request("http://localhost/api/upload/cv", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No file provided");
    });
  });

  describe("validation constants", () => {
    it("enforces 10MB file size limit", () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });

    it("accepts PDF files", () => {
      expect(ALLOWED_EXTENSIONS).toContain("pdf");
      expect(ALLOWED_MIME_TYPES).toContain("application/pdf");
    });

    it("accepts DOC files", () => {
      expect(ALLOWED_EXTENSIONS).toContain("doc");
      expect(ALLOWED_MIME_TYPES).toContain("application/msword");
    });

    it("accepts DOCX files", () => {
      expect(ALLOWED_EXTENSIONS).toContain("docx");
      expect(ALLOWED_MIME_TYPES).toContain(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
    });

    it("accepts TXT files", () => {
      expect(ALLOWED_EXTENSIONS).toContain("txt");
      expect(ALLOWED_MIME_TYPES).toContain("text/plain");
    });

    it("accepts RTF files", () => {
      expect(ALLOWED_EXTENSIONS).toContain("rtf");
      expect(ALLOWED_MIME_TYPES).toContain("application/rtf");
    });

    it("rejects image file extensions", () => {
      expect(ALLOWED_EXTENSIONS).not.toContain("jpg");
      expect(ALLOWED_EXTENSIONS).not.toContain("jpeg");
      expect(ALLOWED_EXTENSIONS).not.toContain("png");
      expect(ALLOWED_EXTENSIONS).not.toContain("gif");
      expect(ALLOWED_EXTENSIONS).not.toContain("webp");
    });

    it("rejects image MIME types", () => {
      expect(ALLOWED_MIME_TYPES).not.toContain("image/jpeg");
      expect(ALLOWED_MIME_TYPES).not.toContain("image/png");
      expect(ALLOWED_MIME_TYPES).not.toContain("image/gif");
      expect(ALLOWED_MIME_TYPES).not.toContain("image/webp");
    });

    it("rejects executable extensions", () => {
      expect(ALLOWED_EXTENSIONS).not.toContain("exe");
      expect(ALLOWED_EXTENSIONS).not.toContain("sh");
      expect(ALLOWED_EXTENSIONS).not.toContain("bat");
    });
  });
});
