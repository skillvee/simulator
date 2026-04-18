import { describe, it, expect } from "vitest";
import { scoreToLevel, convertRubricToReport, reportToPrismaJson, RUBRIC_DIM_TO_CATEGORY } from "./report-scoring";
import type { RubricAssessmentOutput } from "@/types";

describe("scoreToLevel", () => {
  it("should return exceptional for >= 3.5", () => {
    expect(scoreToLevel(3.5)).toBe("exceptional");
    expect(scoreToLevel(4.0)).toBe("exceptional");
  });

  it("should return strong for >= 2.5", () => {
    expect(scoreToLevel(2.5)).toBe("strong");
    expect(scoreToLevel(3.4)).toBe("strong");
  });

  it("should return adequate for >= 1.5", () => {
    expect(scoreToLevel(1.5)).toBe("adequate");
    expect(scoreToLevel(2.4)).toBe("adequate");
  });

  it("should return needs_improvement for < 1.5", () => {
    expect(scoreToLevel(1.0)).toBe("needs_improvement");
    expect(scoreToLevel(0.5)).toBe("needs_improvement");
  });
});

describe("RUBRIC_DIM_TO_CATEGORY", () => {
  it("should map rubric dimension slugs to report categories", () => {
    expect(RUBRIC_DIM_TO_CATEGORY.communication).toBe("communication");
    expect(RUBRIC_DIM_TO_CATEGORY.problem_decomposition_design).toBe("problem_decomposition");
    expect(RUBRIC_DIM_TO_CATEGORY.work_process).toBe("time_management");
    expect(RUBRIC_DIM_TO_CATEGORY.technical_execution).toBe("code_quality");
  });
});

describe("convertRubricToReport", () => {
  const baseRubric: RubricAssessmentOutput = {
    evaluationVersion: "3.0.0",
    roleFamilySlug: "engineering",
    overallScore: 3.2,
    dimensionScores: [
      {
        dimensionSlug: "communication_clarity",
        dimensionName: "Communication Clarity",
        score: 3.5,
        summary: "Clear communicator",
        confidence: "high",
        rationale: "Articulate and clear",
        observableBehaviors: [{ timestamp: "00:30", behavior: "Explained approach" }],
        timestamps: ["00:30"],
        trainableGap: false,
        greenFlags: ["Clear explanations"],
        redFlags: [],
      },
      {
        dimensionSlug: "unknown_slug",
        dimensionName: "Unknown",
        score: 2.0,
        summary: "Unknown",
        confidence: "low",
        rationale: "Needs improvement",
        observableBehaviors: [],
        timestamps: [],
        trainableGap: true,
        greenFlags: [],
        redFlags: ["Missed patterns"],
      },
    ],
    detectedRedFlags: [{ slug: "copy-paste", name: "Copy Paste", description: "Copied code", evidence: "Copied from Stack Overflow", timestamps: [] }],
    topStrengths: [{ dimension: "communication", score: 3.5, description: "Great communicator" }],
    growthAreas: [{ dimension: "technical", score: 2.0, description: "Improve testing" }],
    overallSummary: "Solid candidate with room to grow",
    evaluationConfidence: "high",
    insufficientEvidenceNotes: null,
  };

  it("should produce a valid report with correct structure", () => {
    const report = convertRubricToReport(baseRubric, "assess-1", "John Doe", {
      totalDurationMinutes: 60,
      workingPhaseMinutes: 45,
    }, 3);

    expect(report.assessmentId).toBe("assess-1");
    expect(report.candidateName).toBe("John Doe");
    expect(report.overallScore).toBe(3.2);
    expect(report.overallLevel).toBe("strong");
    expect(report.version).toBe("3.0.0");
    expect(report.metrics!.totalDurationMinutes).toBe(60);
    expect(report.metrics!.workingPhaseMinutes).toBe(45);
    expect(report.metrics!.coworkersContacted).toBe(3);
  });

  it("should include strengths and areas for improvement in narrative", () => {
    const report = convertRubricToReport(baseRubric, "assess-1");

    expect(report.narrative.strengths).toContain("Great communicator");
    expect(report.narrative.areasForImprovement).toContain("Improve testing");
    expect(report.narrative.areasForImprovement).toContain("Red flag: Copied from Stack Overflow");
  });

  it("should build notable observations from high-scoring dimensions", () => {
    const report = convertRubricToReport(baseRubric, "assess-1");

    expect(report.narrative.notableObservations).toHaveLength(1);
    expect(report.narrative.notableObservations[0]).toContain("Explained approach");
  });

  it("should skip dimension scores with null score", () => {
    const rubricWithNull: RubricAssessmentOutput = {
      ...baseRubric,
      dimensionScores: [
        { ...baseRubric.dimensionScores[0], score: null },
      ],
    };

    const report = convertRubricToReport(rubricWithNull, "assess-1");
    expect(report.skillScores).toHaveLength(0);
  });

  it("should fall back to slug when no dimension mapping exists", () => {
    const report = convertRubricToReport(baseRubric, "assess-1");

    // "unknown_slug" has no mapping, so falls back to the slug itself as category
    const unknownScore = report.skillScores.find(s => (s.category as string) === "unknown_slug");
    expect(unknownScore).toBeDefined();
    expect(unknownScore!.score).toBe(2.0);
  });

  it("should generate recommendations for low-scoring skills", () => {
    const report = convertRubricToReport(baseRubric, "assess-1");

    const lowScoreRecs = report.recommendations.filter(r => (r.category as string) === "unknown_slug");
    expect(lowScoreRecs).toHaveLength(1);
    expect(lowScoreRecs[0].priority).toBe("medium");
  });

  it("should default metrics when not provided", () => {
    const report = convertRubricToReport(baseRubric, "assess-1");

    expect(report.metrics!.totalDurationMinutes).toBeNull();
    expect(report.metrics!.coworkersContacted).toBe(0);
  });

  it("should set language field when provided", () => {
    const report = convertRubricToReport(baseRubric, "assess-1", "John Doe", undefined, undefined, "es");

    expect(report.language).toBe("es");
  });

  it("should set language field to undefined when not provided", () => {
    const report = convertRubricToReport(baseRubric, "assess-1");

    expect(report.language).toBeUndefined();
  });
});

describe("reportToPrismaJson", () => {
  it("should cast report to Prisma.InputJsonValue", () => {
    const report = convertRubricToReport({
      evaluationVersion: "3.0.0",
      roleFamilySlug: "engineering",
      overallScore: 3.0,
      dimensionScores: [],
      detectedRedFlags: [],
      topStrengths: [],
      growthAreas: [],
      overallSummary: "OK",
      evaluationConfidence: "medium",
      insufficientEvidenceNotes: null,
    }, "assess-1");

    const json = reportToPrismaJson(report);
    expect(json).toBeDefined();
  });
});
