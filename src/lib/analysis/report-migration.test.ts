import { describe, it, expect } from "vitest";
import { migrateVideoEvaluationToRubric } from "./report-migration";
import type { RubricAssessmentOutput } from "@/types";

describe("migrateVideoEvaluationToRubric", () => {
  it("should return null for null/undefined input", () => {
    expect(migrateVideoEvaluationToRubric(null)).toBeNull();
    expect(migrateVideoEvaluationToRubric(undefined)).toBeNull();
  });

  it("should return null for non-object input", () => {
    expect(migrateVideoEvaluationToRubric("string")).toBeNull();
    expect(migrateVideoEvaluationToRubric(42)).toBeNull();
  });

  it("should return v3 format data as-is", () => {
    const v3Data: RubricAssessmentOutput = {
      evaluationVersion: "3.0.0",
      roleFamilySlug: "engineering",
      overallScore: 3.5,
      dimensionScores: [{
        dimensionSlug: "technical-execution",
        dimensionName: "Technical Execution",
        score: 3.5,
        summary: "Good",
        confidence: "high",
        rationale: "Solid work",
        observableBehaviors: [],
        timestamps: [],
        trainableGap: false,
        greenFlags: [],
        redFlags: [],
      }],
      detectedRedFlags: [],
      topStrengths: [],
      growthAreas: [],
      overallSummary: "Good candidate",
      evaluationConfidence: "high",
      insufficientEvidenceNotes: null,
    };

    const result = migrateVideoEvaluationToRubric(v3Data);
    expect(result).toBe(v3Data);
  });

  it("should migrate v1 format with skill_scores to v3", () => {
    const v1Data = {
      overall_score: { score: 3.0 },
      skill_scores: {
        communication: { score: 4, rationale: "Clear" },
        problem_solving: { score: 2, rationale: "Needs work" },
      },
      red_flags: [{ signal: "Copy Paste", evidence: "Copied code" }],
      green_flags: ["Great attitude"],
      areas_for_improvement: ["Testing"],
      overall_summary: "Decent candidate",
    };

    const result = migrateVideoEvaluationToRubric(v1Data);
    expect(result).not.toBeNull();
    expect(result!.evaluationVersion).toBe("3.0.0");
    expect(result!.overallScore).toBe(3.0);
    expect(result!.dimensionScores).toHaveLength(2);
    expect(result!.dimensionScores[0].dimensionSlug).toBe("communication");
    expect(result!.dimensionScores[0].score).toBe(4);
    expect(result!.dimensionScores[1].dimensionSlug).toBe("problem-solving");
    expect(result!.dimensionScores[1].trainableGap).toBe(true);
    expect(result!.detectedRedFlags).toHaveLength(1);
    expect(result!.detectedRedFlags[0].name).toBe("Copy Paste");
    expect(result!.topStrengths).toHaveLength(1);
    expect(result!.topStrengths[0].description).toBe("Great attitude");
    expect(result!.growthAreas).toHaveLength(1);
    expect(result!.overallSummary).toBe("Decent candidate");
  });

  it("should handle v1 with string red flags", () => {
    const v1Data = {
      skill_scores: { coding: { score: 3, rationale: "OK" } },
      red_flags: ["Didn't test"],
    };

    const result = migrateVideoEvaluationToRubric(v1Data);
    expect(result).not.toBeNull();
    expect(result!.detectedRedFlags[0].name).toBe("Didn't test");
    expect(result!.detectedRedFlags[0].evidence).toBe("");
  });

  it("should default overallScore to 2.0 when missing", () => {
    const v1Data = {
      skill_scores: { coding: { score: 3 } },
    };

    const result = migrateVideoEvaluationToRubric(v1Data);
    expect(result!.overallScore).toBe(2.0);
  });

  it("should handle null skill scores", () => {
    const v1Data = {
      skill_scores: { coding: { score: null, rationale: "" } },
    };

    const result = migrateVideoEvaluationToRubric(v1Data);
    expect(result!.dimensionScores[0].score).toBeNull();
    expect(result!.dimensionScores[0].trainableGap).toBe(false);
  });

  it("should return null for unknown format", () => {
    const unknownData = { someRandomField: true };
    expect(migrateVideoEvaluationToRubric(unknownData)).toBeNull();
  });
});
