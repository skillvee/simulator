/**
 * Tests for Avatar Generation Service (RF-021)
 *
 * Note: These are unit tests for the avatar generation logic.
 * Full integration tests would require actual API credentials.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the entire module's dependencies
vi.mock("@google/genai", () => {
  const mockGenerateImages = vi.fn();
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateImages: mockGenerateImages,
      };
    },
    Modality: { AUDIO: "AUDIO" },
    __mockGenerateImages: mockGenerateImages,
  };
});

vi.mock("@/lib/core", () => ({
  env: {
    GEMINI_API_KEY: "test-api-key",
  },
}));

const mockStorageFrom = vi.fn();
vi.mock("@/lib/external/supabase", () => ({
  supabaseAdmin: {
    storage: {
      from: mockStorageFrom,
      createBucket: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

const mockCoworkerFindMany = vi.fn();
const mockCoworkerFindUnique = vi.fn();
const mockCoworkerUpdate = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    coworker: {
      findMany: mockCoworkerFindMany,
      findUnique: mockCoworkerFindUnique,
      update: mockCoworkerUpdate,
    },
  },
}));

// Setup default mock behaviors
beforeEach(() => {
  vi.clearAllMocks();

  mockStorageFrom.mockReturnValue({
    upload: vi.fn().mockResolvedValue({ error: null }),
    createSignedUrl: vi.fn().mockResolvedValue({
      data: { signedUrl: "https://example.com/avatar.jpg" },
      error: null,
    }),
  });
});

describe("Avatar Generation Service", () => {
  describe("generateAvatarForCoworker", () => {
    it("should skip generation if avatar already exists", async () => {
      const { generateAvatarForCoworker } = await import("./avatar-generation");

      const mockCoworker = {
        id: "test-coworker-id",
        name: "Sarah Chen",
        role: "Product Manager",
        personaStyle: "Friendly",
        avatarUrl: "https://existing-avatar.com/image.jpg",
      };

      mockCoworkerFindUnique.mockResolvedValue(mockCoworker);

      const result = await generateAvatarForCoworker("test-coworker-id");

      expect(result.success).toBe(true);
      expect(result.avatarUrl).toBe("https://existing-avatar.com/image.jpg");
      expect(mockCoworkerFindUnique).toHaveBeenCalledWith({
        where: { id: "test-coworker-id" },
        select: {
          id: true,
          name: true,
          role: true,
          personaStyle: true,
          avatarUrl: true,
        },
      });
    });

    it("should return error for non-existent coworker", async () => {
      const { generateAvatarForCoworker } = await import("./avatar-generation");

      mockCoworkerFindUnique.mockResolvedValue(null);

      const result = await generateAvatarForCoworker("non-existent-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Coworker not found");
    });
  });

  describe("generateAvatarsForScenario", () => {
    it("should return empty array when no coworkers need avatars", async () => {
      const { generateAvatarsForScenario } = await import("./avatar-generation");

      mockCoworkerFindMany.mockResolvedValue([]);

      const results = await generateAvatarsForScenario("test-scenario-id");

      expect(results).toEqual([]);
      expect(mockCoworkerFindMany).toHaveBeenCalledWith({
        where: {
          scenarioId: "test-scenario-id",
          avatarUrl: null,
        },
        select: {
          id: true,
          name: true,
          role: true,
          personaStyle: true,
        },
      });
    });
  });
});
