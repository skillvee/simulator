/**
 * Integration test: Gemini Video Evaluation Response Structure
 *
 * Sends a real test video to Gemini using our actual rubric prompt and validates
 * the response matches the expected RubricAssessmentOutput structure.
 * Does NOT assert on evaluation quality — only on structural correctness.
 *
 * Requires:
 * - GEMINI_API_KEY env var
 * - DATABASE_URL env var (to load the real rubric)
 * - public/videos/test.mp4
 */

import { describe, it, expect, vi, afterAll } from "vitest";

// Mock heavy server-only dependencies that video-evaluation.ts transitively imports
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/lib/ai/gemini", () => ({
  gemini: { files: { upload: vi.fn() }, models: { generateContent: vi.fn() } },
}));
vi.mock("@/lib/external", () => ({
  supabaseAdmin: { storage: { from: () => ({}) } },
  STORAGE_BUCKETS: { RECORDINGS: "recordings" },
}));
vi.mock("@/lib/core", () => ({
  createLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
  withRetry: vi.fn(),
  env: {},
}));
vi.mock("@/lib/analysis/assessment-logging", () => ({
  createVideoAssessmentLogger: vi.fn(),
}));
vi.mock("@/lib/candidate", () => ({
  generateAndStoreEmbeddings: vi.fn(),
}));

import { GoogleGenAI } from "@google/genai";
import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { buildRubricEvaluationPrompt } from "@/prompts/analysis/rubric-evaluation";
import { loadRubricForRoleFamily } from "@/lib/rubric";
import { parseEvaluationResponse } from "./video-evaluation";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const VIDEO_EVALUATION_MODEL = "gemini-3-pro-preview";
const ROLE_FAMILY_SLUG = "engineering";
const TEST_VIDEO_PATH = path.resolve(
  __dirname,
  "../../../public/videos/test.mp4"
);

// Skip if missing prerequisites
const canRun =
  !!GEMINI_API_KEY &&
  !!DATABASE_URL &&
  fs.existsSync(TEST_VIDEO_PATH);

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

const prisma = canRun ? new PrismaClient() : (null as unknown as PrismaClient);

afterAll(async () => {
  if (prisma && typeof prisma.$disconnect === "function") {
    await prisma.$disconnect();
  }
});

describe.skipIf(!canRun)("Gemini Video Evaluation - Response Structure", () => {
  it("returns a valid RubricAssessmentOutput with all requested dimensions", { timeout: 120_000 }, async () => {
      // 1. Load the real rubric from the database
      const rubricInput = await loadRubricForRoleFamily(prisma, ROLE_FAMILY_SLUG);
      const expectedSlugs = rubricInput.dimensions.map((d) => d.slug);

      expect(expectedSlugs.length).toBeGreaterThan(0);
      console.log(`Loaded ${expectedSlugs.length} dimensions: ${expectedSlugs.join(", ")}`);

      // 2. Build the evaluation prompt (same as production)
      const prompt = buildRubricEvaluationPrompt(rubricInput);

      // 3. Initialize Gemini and upload the test video
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });

      const videoBuffer = fs.readFileSync(TEST_VIDEO_PATH);
      const uploadedFile = await ai.files.upload({
        file: new Blob([videoBuffer], { type: "video/mp4" }),
        config: {
          mimeType: "video/mp4",
          displayName: "integration-test-video",
        },
      });

      expect(uploadedFile.uri).toBeTruthy();
      console.log(`Video uploaded to Gemini: ${uploadedFile.uri}`);

      // Wait for the file to become ACTIVE (Gemini processes it asynchronously)
      const fileName = uploadedFile.name!;
      let fileState = uploadedFile.state;
      while (fileState === "PROCESSING") {
        console.log("Waiting for file to become ACTIVE...");
        await new Promise((r) => setTimeout(r, 3000));
        const fileInfo = await ai.files.get({ name: fileName });
        fileState = fileInfo.state;
      }
      expect(fileState).toBe("ACTIVE");

      // 4. Call Gemini with the video + rubric prompt
      console.log("Sending evaluation request to Gemini...");
      const result = await ai.models.generateContent({
        model: VIDEO_EVALUATION_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                fileData: {
                  fileUri: uploadedFile.uri!,
                  mimeType: "video/mp4",
                },
              },
              { text: prompt },
            ],
          },
        ],
      });

      const responseText = result.text;
      expect(responseText).toBeTruthy();
      console.log(`Received response (${responseText!.length} chars)`);

      // 5. Parse through the same parser the production code uses
      const evaluation = parseEvaluationResponse(responseText!);

      // ====================================================================
      // 6. Validate top-level structure
      // ====================================================================

      // overall_score: number between 1 and 4
      expect(typeof evaluation.overallScore).toBe("number");
      expect(evaluation.overallScore).toBeGreaterThanOrEqual(1);
      expect(evaluation.overallScore).toBeLessThanOrEqual(4);

      // overall_summary: non-empty string
      expect(typeof evaluation.overallSummary).toBe("string");
      expect(evaluation.overallSummary.length).toBeGreaterThan(50);

      // evaluation_confidence: one of the expected values
      expect(["high", "medium", "low"]).toContain(
        evaluation.evaluationConfidence
      );

      // evaluationVersion: string
      expect(typeof evaluation.evaluationVersion).toBe("string");

      // ====================================================================
      // 7. Validate dimension_scores — every rubric dimension present
      // ====================================================================

      expect(evaluation.dimensionScores.length).toBeGreaterThanOrEqual(
        expectedSlugs.length
      );

      const returnedSlugs = evaluation.dimensionScores.map(
        (d) => d.dimensionSlug
      );
      for (const expectedSlug of expectedSlugs) {
        expect(returnedSlugs).toContain(expectedSlug);
      }

      // Validate each dimension score object
      for (const dimScore of evaluation.dimensionScores) {
        // score: number 1-4 or null (insufficient evidence)
        if (dimScore.score !== null) {
          expect(typeof dimScore.score).toBe("number");
          expect(dimScore.score).toBeGreaterThanOrEqual(1);
          expect(dimScore.score).toBeLessThanOrEqual(4);
        }

        // summary: non-empty string
        expect(typeof dimScore.summary).toBe("string");
        expect(dimScore.summary.length).toBeGreaterThan(0);

        // confidence: one of the expected values
        expect(["high", "medium", "low"]).toContain(dimScore.confidence);

        // rationale: string
        expect(typeof dimScore.rationale).toBe("string");

        // observableBehaviors: array of { timestamp, behavior }
        expect(Array.isArray(dimScore.observableBehaviors)).toBe(true);
        if (dimScore.score !== null) {
          // Scored dimensions should have at least one behavior
          expect(dimScore.observableBehaviors.length).toBeGreaterThan(0);
          for (const behavior of dimScore.observableBehaviors) {
            expect(typeof behavior.timestamp).toBe("string");
            expect(typeof behavior.behavior).toBe("string");
          }
        }

        // timestamps: array of strings
        expect(Array.isArray(dimScore.timestamps)).toBe(true);

        // trainableGap: boolean
        expect(typeof dimScore.trainableGap).toBe("boolean");

        // greenFlags & redFlags: arrays
        expect(Array.isArray(dimScore.greenFlags)).toBe(true);
        expect(Array.isArray(dimScore.redFlags)).toBe(true);
      }

      // ====================================================================
      // 8. Validate detected_red_flags structure
      // ====================================================================

      expect(Array.isArray(evaluation.detectedRedFlags)).toBe(true);
      for (const rf of evaluation.detectedRedFlags) {
        expect(typeof rf.slug).toBe("string");
        expect(typeof rf.evidence).toBe("string");
        expect(Array.isArray(rf.timestamps)).toBe(true);
      }

      // ====================================================================
      // 9. Validate top_strengths & growth_areas
      // ====================================================================

      expect(Array.isArray(evaluation.topStrengths)).toBe(true);
      expect(evaluation.topStrengths.length).toBeGreaterThanOrEqual(1);
      for (const s of evaluation.topStrengths) {
        expect(typeof s.dimension).toBe("string");
        expect(typeof s.score).toBe("number");
        expect(typeof s.description).toBe("string");
        expect(s.description.length).toBeGreaterThan(0);
      }

      expect(Array.isArray(evaluation.growthAreas)).toBe(true);
      for (const g of evaluation.growthAreas) {
        expect(typeof g.dimension).toBe("string");
        expect(typeof g.score).toBe("number");
        expect(typeof g.description).toBe("string");
      }
  });
});
