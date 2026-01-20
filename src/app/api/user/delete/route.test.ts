import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Define mock functions before vi.mock calls
const mockAuth = vi.fn();
const mockFindUnique = vi.fn();
const mockProcessImmediateDeletion = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/server/db", () => ({
  db: {
    user: {
      findUnique: (args: unknown) => mockFindUnique(args),
    },
  },
}));

vi.mock("@/lib/core", () => ({
  processImmediateDeletion: (userId: string) =>
    mockProcessImmediateDeletion(userId),
}));

import { POST } from "./route";

function createRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/user/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/user/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST - Execute account deletion", () => {
    it("returns 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const response = await POST(
        createRequest({ confirm: "DELETE MY ACCOUNT" })
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 if confirmation text is missing", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

      const response = await POST(createRequest({}));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Confirmation required");
    });

    it("returns 400 if confirmation text is wrong", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

      const response = await POST(createRequest({ confirm: "wrong text" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Confirmation required");
    });

    it("returns 404 if user not found", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockFindUnique.mockResolvedValueOnce(null);

      const response = await POST(
        createRequest({ confirm: "DELETE MY ACCOUNT" })
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("returns 400 if account already deleted", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockFindUnique.mockResolvedValueOnce({
        id: "user-123",
        deletedAt: new Date(),
      });

      const response = await POST(
        createRequest({ confirm: "DELETE MY ACCOUNT" })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Account has already been deleted");
    });

    it("executes deletion and returns success", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockFindUnique.mockResolvedValueOnce({
        id: "user-123",
        deletedAt: null,
      });
      mockProcessImmediateDeletion.mockResolvedValueOnce({
        success: true,
        deletedItems: {
          assessments: 2,
          conversations: 5,
          recordings: 1,
          recordingSegments: 3,
          hrAssessments: 2,
          storageFiles: 10,
        },
        errors: [],
      });

      const response = await POST(
        createRequest({ confirm: "DELETE MY ACCOUNT" })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("deleted");
      expect(data.deletedItems.assessments).toBe(2);
      expect(mockProcessImmediateDeletion).toHaveBeenCalledWith("user-123");
    });

    it("returns 500 if deletion fails", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockFindUnique.mockResolvedValueOnce({
        id: "user-123",
        deletedAt: null,
      });
      mockProcessImmediateDeletion.mockResolvedValueOnce({
        success: false,
        deletedItems: {
          assessments: 0,
          conversations: 0,
          recordings: 0,
          recordingSegments: 0,
          hrAssessments: 0,
          storageFiles: 0,
        },
        errors: ["Database error"],
      });

      const response = await POST(
        createRequest({ confirm: "DELETE MY ACCOUNT" })
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Deletion partially failed");
      expect(data.details).toContain("Database error");
    });

    it("handles exceptions gracefully", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockFindUnique.mockRejectedValueOnce(
        new Error("Database connection error")
      );

      const response = await POST(
        createRequest({ confirm: "DELETE MY ACCOUNT" })
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to delete account");
    });
  });
});
