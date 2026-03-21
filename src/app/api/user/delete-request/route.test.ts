import { describe, it, expect, vi, beforeEach } from "vitest";

// Define mock functions before vi.mock calls
const mockAuth = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/server/db", () => ({
  db: {
    user: {
      findUnique: (args: unknown) => mockFindUnique(args),
      update: (args: unknown) => mockUpdate(args),
    },
  },
}));

import { POST, GET, DELETE } from "./route";

describe("/api/user/delete-request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST - Request data deletion", () => {
    it("returns 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 if user not found", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockFindUnique.mockResolvedValueOnce(null);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("returns 400 if account already deleted", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockFindUnique.mockResolvedValueOnce({
        id: "user-123",
        deletedAt: new Date(),
        dataDeleteRequestedAt: null,
      });

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Account has already been deleted");
    });

    it("returns success if deletion already requested", async () => {
      const requestDate = new Date("2025-01-01");
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockFindUnique.mockResolvedValueOnce({
        id: "user-123",
        deletedAt: null,
        dataDeleteRequestedAt: requestDate,
      });

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe("Data deletion request already submitted");
      expect(data.data.status).toBe("pending");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("submits deletion request successfully", async () => {
      const requestDate = new Date();
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockFindUnique.mockResolvedValueOnce({
        id: "user-123",
        deletedAt: null,
        dataDeleteRequestedAt: null,
      });
      mockUpdate.mockResolvedValueOnce({
        dataDeleteRequestedAt: requestDate,
      });

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain("Data deletion request submitted");
      expect(data.data.status).toBe("pending");
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { dataDeleteRequestedAt: expect.any(Date) },
      });
    });
  });

  describe("GET - Check deletion status", () => {
    it("returns 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 if user not found", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockFindUnique.mockResolvedValueOnce(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("returns status: deleted when account is deleted", async () => {
      const deletedDate = new Date("2025-01-01");
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockFindUnique.mockResolvedValueOnce({
        deletedAt: deletedDate,
        dataDeleteRequestedAt: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe("deleted");
    });

    it("returns status: pending when deletion requested", async () => {
      const requestDate = new Date("2025-01-01");
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockFindUnique.mockResolvedValueOnce({
        deletedAt: null,
        dataDeleteRequestedAt: requestDate,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe("pending");
    });

    it("returns status: none when no deletion requested", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockFindUnique.mockResolvedValueOnce({
        deletedAt: null,
        dataDeleteRequestedAt: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe("none");
    });
  });

  describe("DELETE - Cancel deletion request", () => {
    it("returns 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 if user not found", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockFindUnique.mockResolvedValueOnce(null);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("returns 400 if account already deleted", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockFindUnique.mockResolvedValueOnce({
        deletedAt: new Date(),
        dataDeleteRequestedAt: new Date(),
      });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Account has already been deleted");
    });

    it("returns 400 if no deletion request exists", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockFindUnique.mockResolvedValueOnce({
        deletedAt: null,
        dataDeleteRequestedAt: null,
      });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No deletion request to cancel");
    });

    it("cancels deletion request successfully", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockFindUnique.mockResolvedValueOnce({
        deletedAt: null,
        dataDeleteRequestedAt: new Date(),
      });
      mockUpdate.mockResolvedValueOnce({});

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe("Data deletion request cancelled");
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { dataDeleteRequestedAt: null },
      });
    });
  });
});
