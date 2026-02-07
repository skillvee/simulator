import { describe, it, expect, vi, beforeEach } from "vitest";

// Define mock functions before vi.mock calls
const mockFindMany = vi.fn();
const mockCount = vi.fn();
const mockDeleteMany = vi.fn();
const mockUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockStorageRemove = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findMany: (args: unknown) => mockFindMany(args),
      count: (args: unknown) => mockCount(args),
      deleteMany: (args: unknown) => mockDeleteMany(args),
    },
    conversation: {
      count: (args: unknown) => mockCount(args),
    },
    recording: {
      count: (args: unknown) => mockCount(args),
    },
    recordingSegment: {
      count: (args: unknown) => mockCount(args),
    },
    hRInterviewAssessment: {
      count: (args: unknown) => mockCount(args),
    },
    user: {
      update: (args: unknown) => mockUpdate(args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
  },
}));

vi.mock("@/lib/external", () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        remove: (paths: string[]) => mockStorageRemove(paths),
      }),
    },
  },
  STORAGE_BUCKETS: {
    RESUMES: "resumes",
    RECORDINGS: "recordings",
    SCREENSHOTS: "screenshots",
  },
}));

import {
  deleteUserData,
  hasGracePeriodPassed,
  processImmediateDeletion,
} from "./data-deletion";

describe("data-deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hasGracePeriodPassed", () => {
    it("returns false if request is less than 30 days old", () => {
      const now = new Date();
      const requestDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000); // 29 days ago

      expect(hasGracePeriodPassed(requestDate)).toBe(false);
    });

    it("returns true if request is exactly 30 days old", () => {
      const now = new Date();
      const requestDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      expect(hasGracePeriodPassed(requestDate)).toBe(true);
    });

    it("returns true if request is more than 30 days old", () => {
      const now = new Date();
      const requestDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000); // 31 days ago

      expect(hasGracePeriodPassed(requestDate)).toBe(true);
    });

    it("respects custom grace period", () => {
      const now = new Date();
      const requestDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      expect(hasGracePeriodPassed(requestDate, 7)).toBe(true);
      expect(hasGracePeriodPassed(requestDate, 8)).toBe(false);
    });
  });

  describe("deleteUserData", () => {
    it("returns success with zero counts when user has no data", async () => {
      mockFindMany.mockResolvedValueOnce([]); // No assessments
      mockStorageRemove.mockResolvedValue({ error: null }); // Storage succeeds

      // Transaction mock - execute the callback with a mock tx
      mockTransaction.mockImplementation(async (fn) => {
        const tx = {
          assessment: { count: vi.fn().mockResolvedValue(0), deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
          conversation: { count: vi.fn().mockResolvedValue(0) },
          recording: { count: vi.fn().mockResolvedValue(0) },
          recordingSegment: { count: vi.fn().mockResolvedValue(0) },
          hRInterviewAssessment: { count: vi.fn().mockResolvedValue(0) },
          user: { update: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const result = await deleteUserData("user-123");

      expect(result.success).toBe(true);
      expect(result.deletedItems.assessments).toBe(0);
      expect(result.deletedItems.storageFiles).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("deletes storage files from all buckets AFTER successful DB transaction", async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          recordings: [
            {
              storageUrl: "recordings/user-123/video.webm",
              segments: [
                {
                  chunkPaths: ["recordings/user-123/chunk1.webm"],
                  screenshotPaths: ["screenshots/user-123/ss1.png"],
                },
              ],
            },
          ],
        },
      ]);

      // Track call order
      const callOrder: string[] = [];

      mockTransaction.mockImplementation(async (fn) => {
        callOrder.push("transaction");
        const tx = {
          assessment: { count: vi.fn().mockResolvedValue(1), deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
          conversation: { count: vi.fn().mockResolvedValue(1) },
          recording: { count: vi.fn().mockResolvedValue(1) },
          recordingSegment: { count: vi.fn().mockResolvedValue(1) },
          hRInterviewAssessment: { count: vi.fn().mockResolvedValue(1) },
          user: { update: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      mockStorageRemove.mockImplementation(async () => {
        callOrder.push("storage");
        return { error: null };
      });

      const result = await deleteUserData("user-123");

      expect(result.success).toBe(true);
      // Verify transaction happens before storage deletion
      // Resume bucket has no paths so deleteStorageFiles returns early without calling remove
      // Only recordings and screenshots buckets have paths
      expect(callOrder).toEqual(["transaction", "storage", "storage"]);
      // Should have called storage remove for recordings and screenshots buckets
      expect(mockStorageRemove).toHaveBeenCalledTimes(2);
      expect(result.deletedItems.storageFiles).toBeGreaterThan(0);
    });

    it("wraps database operations in a transaction for atomicity", async () => {
      mockFindMany.mockResolvedValueOnce([]);
      mockStorageRemove.mockResolvedValue({ error: null });

      const txOperations: string[] = [];
      mockTransaction.mockImplementation(async (fn) => {
        const tx = {
          assessment: {
            count: vi.fn().mockImplementation(() => { txOperations.push("assessment.count"); return Promise.resolve(0); }),
            deleteMany: vi.fn().mockImplementation(() => { txOperations.push("assessment.deleteMany"); return Promise.resolve({ count: 0 }); }),
          },
          conversation: { count: vi.fn().mockImplementation(() => { txOperations.push("conversation.count"); return Promise.resolve(0); }) },
          recording: { count: vi.fn().mockImplementation(() => { txOperations.push("recording.count"); return Promise.resolve(0); }) },
          recordingSegment: { count: vi.fn().mockImplementation(() => { txOperations.push("recordingSegment.count"); return Promise.resolve(0); }) },
          hRInterviewAssessment: { count: vi.fn().mockImplementation(() => { txOperations.push("hRInterviewAssessment.count"); return Promise.resolve(0); }) },
          user: { update: vi.fn().mockImplementation(() => { txOperations.push("user.update"); return Promise.resolve({}); }) },
        };
        return fn(tx);
      });

      await deleteUserData("user-123");

      // Verify transaction was called
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      // Verify all operations happened within the transaction
      expect(txOperations).toContain("assessment.count");
      expect(txOperations).toContain("assessment.deleteMany");
      expect(txOperations).toContain("user.update");
    });

    it("does not delete storage files if database transaction fails (rollback)", async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          cvUrl: "https://storage.example.com/resumes/user-123/cv.pdf",
          recordings: [],
        },
      ]);

      // Transaction fails mid-operation
      mockTransaction.mockRejectedValueOnce(new Error("Database transaction failed"));
      mockStorageRemove.mockResolvedValue({ error: null });

      const result = await deleteUserData("user-123");

      // Should fail
      expect(result.success).toBe(false);
      expect(result.errors).toContain("Database transaction failed");
      // Storage should NOT be called since transaction failed
      expect(mockStorageRemove).not.toHaveBeenCalled();
    });

    it("continues deletion even if storage fails (after successful DB transaction)", async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          recordings: [
            {
              storageUrl: "recordings/user-123/video.webm",
              segments: [],
            },
          ],
        },
      ]);

      mockTransaction.mockImplementation(async (fn) => {
        const tx = {
          assessment: { count: vi.fn().mockResolvedValue(0), deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
          conversation: { count: vi.fn().mockResolvedValue(0) },
          recording: { count: vi.fn().mockResolvedValue(0) },
          recordingSegment: { count: vi.fn().mockResolvedValue(0) },
          hRInterviewAssessment: { count: vi.fn().mockResolvedValue(0) },
          user: { update: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      mockStorageRemove.mockResolvedValue({
        error: { message: "Storage error" },
      });

      const result = await deleteUserData("user-123");

      // Should still succeed overall (DB succeeded), but record the storage error
      expect(result.success).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("returns counts from within the transaction", async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          cvUrl: "cv.pdf",
          recordings: [
            {
              storageUrl: "video.webm",
              segments: [
                {
                  chunkPaths: ["chunk1.webm", "chunk2.webm"],
                  screenshotPaths: ["ss1.png"],
                },
              ],
            },
          ],
        },
      ]);

      mockTransaction.mockImplementation(async (fn) => {
        const tx = {
          assessment: { count: vi.fn().mockResolvedValue(5), deleteMany: vi.fn().mockResolvedValue({ count: 5 }) },
          conversation: { count: vi.fn().mockResolvedValue(10) },
          recording: { count: vi.fn().mockResolvedValue(3) },
          recordingSegment: { count: vi.fn().mockResolvedValue(7) },
          hRInterviewAssessment: { count: vi.fn().mockResolvedValue(2) },
          user: { update: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      mockStorageRemove.mockResolvedValue({ error: null });

      const result = await deleteUserData("user-123");

      expect(result.success).toBe(true);
      expect(result.deletedItems.assessments).toBe(5);
      expect(result.deletedItems.conversations).toBe(10);
      expect(result.deletedItems.recordings).toBe(3);
      expect(result.deletedItems.recordingSegments).toBe(7);
    });

    it("returns failure if database operation fails", async () => {
      mockFindMany.mockRejectedValueOnce(new Error("Database error"));

      const result = await deleteUserData("user-123");

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Database error");
    });
  });

  describe("processImmediateDeletion", () => {
    it("calls deleteUserData with the provided userId", async () => {
      mockFindMany.mockResolvedValueOnce([]);
      mockStorageRemove.mockResolvedValue({ error: null });

      mockTransaction.mockImplementation(async (fn) => {
        const tx = {
          assessment: { count: vi.fn().mockResolvedValue(0), deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
          conversation: { count: vi.fn().mockResolvedValue(0) },
          recording: { count: vi.fn().mockResolvedValue(0) },
          recordingSegment: { count: vi.fn().mockResolvedValue(0) },
          hRInterviewAssessment: { count: vi.fn().mockResolvedValue(0) },
          user: {
            update: vi.fn().mockImplementation((args: unknown) => {
              mockUpdate(args);
              return Promise.resolve({});
            })
          },
        };
        return fn(tx);
      });

      const result = await processImmediateDeletion("user-456");

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-456" },
        })
      );
    });
  });
});
