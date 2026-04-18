import { describe, it, expect, vi, beforeEach } from "vitest";
import { convertRubricToReport } from "./report-scoring";
import { buildRubricEvaluationPrompt, type RubricPromptInput } from "@/prompts/analysis/rubric-evaluation";
import type { RubricAssessmentOutput } from "@/types";

describe("Multilingual Report Generation", () => {
  describe("convertRubricToReport with language", () => {
    const mockRubricOutput: RubricAssessmentOutput = {
      evaluationVersion: "3.0.0",
      roleFamilySlug: "engineering",
      overallScore: 3.2,
      dimensionScores: [
        {
          dimensionSlug: "communication",
          dimensionName: "Communication",
          score: 3.5,
          summary: "Clear communication",
          confidence: "high",
          rationale: "Good explanation of concepts",
          observableBehaviors: [
            { timestamp: "05:30", behavior: "Explained technical approach clearly" }
          ],
          timestamps: ["05:30"],
          greenFlags: ["Articulate explanations"],
          redFlags: [],
          trainableGap: false,
        }
      ],
      detectedRedFlags: [],
      topStrengths: [
        {
          dimension: "communication",
          score: 3.5,
          description: "Demostró excelente claridad al comunicar conceptos técnicos complejos"
        }
      ],
      growthAreas: [
        {
          dimension: "technical_execution",
          score: 2.0,
          description: "Necesita mejorar la eficiencia del código y las prácticas de testing"
        }
      ],
      overallSummary: "El candidato demostró un sólido entendimiento del problema y buenas habilidades de comunicación.",
      evaluationConfidence: "high",
      insufficientEvidenceNotes: null
    };

    it("should include language field in Spanish report", () => {
      const report = convertRubricToReport(
        mockRubricOutput,
        "test-assessment-id",
        "Juan Pérez",
        { totalDurationMinutes: 45, workingPhaseMinutes: 30 },
        2,
        "es"
      );

      expect(report.language).toBe("es");
      expect(report.assessmentId).toBe("test-assessment-id");
      expect(report.candidateName).toBe("Juan Pérez");
    });

    it("should preserve Spanish narrative content", () => {
      const report = convertRubricToReport(
        mockRubricOutput,
        "test-assessment-id",
        "Juan Pérez",
        undefined,
        undefined,
        "es"
      );

      // Check that Spanish narrative content is preserved
      expect(report.narrative.overallSummary).toContain("candidato");
      expect(report.narrative.strengths[0]).toContain("Demostró");
      expect(report.narrative.areasForImprovement[0]).toContain("Necesita");
    });

    it("should handle English (default) language", () => {
      const englishRubric = {
        ...mockRubricOutput,
        overallSummary: "The candidate demonstrated solid problem understanding.",
        topStrengths: [
          {
            dimension: "communication",
            score: 3.5,
            description: "Demonstrated excellent clarity in communicating complex technical concepts"
          }
        ],
        growthAreas: [
          {
            dimension: "technical_execution",
            score: 2.0,
            description: "Needs to improve code efficiency and testing practices"
          }
        ]
      };

      const report = convertRubricToReport(
        englishRubric,
        "test-assessment-id",
        "John Doe"
      );

      expect(report.language).toBeUndefined();
      expect(report.narrative.overallSummary).toContain("candidate");
      expect(report.narrative.strengths[0]).toContain("Demonstrated");
    });
  });

  describe("buildRubricEvaluationPrompt with language", () => {
    const mockRubricInput: RubricPromptInput = {
      roleFamilyName: "Software Engineering",
      roleFamilySlug: "engineering",
      dimensions: [
        {
          slug: "communication",
          name: "Communication",
          description: "Ability to communicate clearly",
          isUniversal: true,
          levels: [
            {
              level: 1,
              label: "Foundational",
              pattern: "Basic communication",
              evidence: ["Simple explanations"]
            },
            {
              level: 2,
              label: "Competent",
              pattern: "Clear communication",
              evidence: ["Clear explanations", "Good documentation"]
            }
          ]
        }
      ],
      redFlags: [],
      videoContext: {
        taskDescription: "Build a REST API",
        videoDurationMinutes: 45
      }
    };

    it("should include Spanish language instruction when language is es", () => {
      const promptWithSpanish = buildRubricEvaluationPrompt({
        ...mockRubricInput,
        language: "es"
      });

      expect(promptWithSpanish).toContain("LANGUAGE INSTRUCTION FOR NARRATIVE FIELDS");
      expect(promptWithSpanish).toContain("Respond in neutral Latin American Spanish");
      expect(promptWithSpanish).toContain("overall_summary, descriptions in top_strengths, and descriptions in growth_areas");
    });

    it("should not include language instruction for English", () => {
      const promptEnglish = buildRubricEvaluationPrompt({
        ...mockRubricInput,
        language: "en"
      });

      expect(promptEnglish).not.toContain("LANGUAGE INSTRUCTION FOR NARRATIVE FIELDS");
      expect(promptEnglish).not.toContain("Spanish");
    });

    it("should not include language instruction when language is undefined", () => {
      const promptDefault = buildRubricEvaluationPrompt(mockRubricInput);

      expect(promptDefault).not.toContain("LANGUAGE INSTRUCTION FOR NARRATIVE FIELDS");
      expect(promptDefault).not.toContain("Spanish");
    });
  });
});