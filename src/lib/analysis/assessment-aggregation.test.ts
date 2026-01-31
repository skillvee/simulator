import { describe, it, expect, vi } from "vitest";
import {
  skillCategorySchema,
  skillScoreSchema,
  narrativeFeedbackSchema,
  recommendationSchema,
  assessmentReportSchema,
  scoreToLevel,
  calculateAllSkillScores,
  calculateOverallScore,
  formatReportForDisplay,
  type AssessmentSignals,
  type SkillScore,
} from "./assessment-aggregation";

// Mock gemini module
vi.mock("@/lib/ai", () => ({
  gemini: {
    models: {
      generateContent: vi.fn(),
    },
  },
}));

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("Assessment Aggregation Schemas", () => {
  describe("skillCategorySchema", () => {
    it("should validate all 8 skill categories", () => {
      const categories = [
        "communication",
        "problem_decomposition",
        "ai_leverage",
        "code_quality",
        "xfn_collaboration",
        "time_management",
        "technical_decision_making",
        "presentation",
      ];
      categories.forEach((category) => {
        expect(() => skillCategorySchema.parse(category)).not.toThrow();
      });
    });

    it("should reject invalid category", () => {
      expect(() => skillCategorySchema.parse("invalid_category")).toThrow();
    });
  });

  describe("skillScoreSchema", () => {
    it("should validate valid skill score", () => {
      const score = {
        category: "communication",
        score: 4,
        level: "strong",
        evidence: ["Good HR interview", "Clear communication"],
        notes: "Excellent verbal skills",
      };
      expect(() => skillScoreSchema.parse(score)).not.toThrow();
    });

    it("should reject score outside 1-5 range", () => {
      const scoreTooLow = {
        category: "communication",
        score: 0,
        level: "needs_improvement",
        evidence: [],
        notes: "Test",
      };
      expect(() => skillScoreSchema.parse(scoreTooLow)).toThrow();

      const scoreTooHigh = {
        category: "communication",
        score: 6,
        level: "exceptional",
        evidence: [],
        notes: "Test",
      };
      expect(() => skillScoreSchema.parse(scoreTooHigh)).toThrow();
    });

    it("should reject invalid level", () => {
      const score = {
        category: "communication",
        score: 4,
        level: "invalid_level",
        evidence: [],
        notes: "Test",
      };
      expect(() => skillScoreSchema.parse(score)).toThrow();
    });

    it("should validate all performance levels", () => {
      const levels = [
        "exceptional",
        "strong",
        "adequate",
        "developing",
        "needs_improvement",
      ];
      levels.forEach((level) => {
        const score = {
          category: "code_quality",
          score: 3,
          level,
          evidence: ["test evidence"],
          notes: "test notes",
        };
        expect(() => skillScoreSchema.parse(score)).not.toThrow();
      });
    });
  });

  describe("narrativeFeedbackSchema", () => {
    it("should validate valid narrative feedback", () => {
      const feedback = {
        overallSummary:
          "The candidate performed well overall with strong technical skills.",
        strengths: ["Good communication", "Strong coding"],
        areasForImprovement: ["Time management", "Testing"],
        notableObservations: ["Used AI effectively"],
      };
      expect(() => narrativeFeedbackSchema.parse(feedback)).not.toThrow();
    });

    it("should require all fields", () => {
      const incomplete = {
        overallSummary: "Summary only",
      };
      expect(() => narrativeFeedbackSchema.parse(incomplete)).toThrow();
    });
  });

  describe("recommendationSchema", () => {
    it("should validate valid recommendation", () => {
      const recommendation = {
        category: "code_quality",
        priority: "high",
        title: "Improve test coverage",
        description: "Adding more tests will improve code reliability.",
        actionableSteps: [
          "Write unit tests",
          "Add integration tests",
          "Set up CI",
        ],
      };
      expect(() => recommendationSchema.parse(recommendation)).not.toThrow();
    });

    it("should validate all priority levels", () => {
      const priorities = ["high", "medium", "low"];
      priorities.forEach((priority) => {
        const recommendation = {
          category: "communication",
          priority,
          title: "Test",
          description: "Test description",
          actionableSteps: ["Step 1"],
        };
        expect(() => recommendationSchema.parse(recommendation)).not.toThrow();
      });
    });
  });

  describe("assessmentReportSchema", () => {
    const validReport = {
      generatedAt: "2024-01-15T10:00:00.000Z",
      assessmentId: "test-assessment-id",
      candidateName: "John Doe",
      overallScore: 3.8,
      overallLevel: "strong",
      skillScores: [
        {
          category: "communication",
          score: 4,
          level: "strong",
          evidence: ["Good HR interview"],
          notes: "Clear communication",
        },
      ],
      narrative: {
        overallSummary: "Good overall performance.",
        strengths: ["Communication skills"],
        areasForImprovement: ["Time management"],
        notableObservations: ["Used AI tools effectively"],
      },
      recommendations: [
        {
          category: "time_management",
          priority: "medium",
          title: "Improve time management",
          description: "Work on task prioritization.",
          actionableSteps: ["Use time blocking", "Set deadlines"],
        },
      ],
      metrics: {
        totalDurationMinutes: 120,
        workingPhaseMinutes: 90,
        coworkersContacted: 3,
        aiToolsUsed: true,
        testsStatus: "passing",
        codeReviewScore: 4,
      },
    };

    it("should validate complete report", () => {
      expect(() => assessmentReportSchema.parse(validReport)).not.toThrow();
    });

    it("should allow nullable metrics", () => {
      const reportWithNulls = {
        ...validReport,
        metrics: {
          totalDurationMinutes: null,
          workingPhaseMinutes: null,
          coworkersContacted: 0,
          aiToolsUsed: false,
          testsStatus: "unknown",
          codeReviewScore: null,
        },
      };
      expect(() => assessmentReportSchema.parse(reportWithNulls)).not.toThrow();
    });

    it("should validate all test statuses", () => {
      const statuses = ["passing", "failing", "none", "unknown"];
      statuses.forEach((testsStatus) => {
        const report = {
          ...validReport,
          metrics: { ...validReport.metrics, testsStatus },
        };
        expect(() => assessmentReportSchema.parse(report)).not.toThrow();
      });
    });
  });
});

// ============================================================================
// Score Calculation Tests
// ============================================================================

describe("Score Calculation Functions", () => {
  describe("scoreToLevel", () => {
    it("should return exceptional for scores >= 4.5", () => {
      expect(scoreToLevel(5)).toBe("exceptional");
      expect(scoreToLevel(4.5)).toBe("exceptional");
      expect(scoreToLevel(4.7)).toBe("exceptional");
    });

    it("should return strong for scores >= 3.5 and < 4.5", () => {
      expect(scoreToLevel(4.4)).toBe("strong");
      expect(scoreToLevel(4)).toBe("strong");
      expect(scoreToLevel(3.5)).toBe("strong");
    });

    it("should return adequate for scores >= 2.5 and < 3.5", () => {
      expect(scoreToLevel(3.4)).toBe("adequate");
      expect(scoreToLevel(3)).toBe("adequate");
      expect(scoreToLevel(2.5)).toBe("adequate");
    });

    it("should return developing for scores >= 1.5 and < 2.5", () => {
      expect(scoreToLevel(2.4)).toBe("developing");
      expect(scoreToLevel(2)).toBe("developing");
      expect(scoreToLevel(1.5)).toBe("developing");
    });

    it("should return needs_improvement for scores < 1.5", () => {
      expect(scoreToLevel(1.4)).toBe("needs_improvement");
      expect(scoreToLevel(1)).toBe("needs_improvement");
    });
  });

  describe("calculateOverallScore", () => {
    it("should calculate weighted average of skill scores", () => {
      const skillScores: SkillScore[] = [
        {
          category: "communication",
          score: 4,
          level: "strong",
          evidence: [],
          notes: "",
        },
        {
          category: "problem_decomposition",
          score: 4,
          level: "strong",
          evidence: [],
          notes: "",
        },
        {
          category: "ai_leverage",
          score: 3,
          level: "adequate",
          evidence: [],
          notes: "",
        },
        {
          category: "code_quality",
          score: 5,
          level: "exceptional",
          evidence: [],
          notes: "",
        },
        {
          category: "xfn_collaboration",
          score: 3,
          level: "adequate",
          evidence: [],
          notes: "",
        },
        {
          category: "time_management",
          score: 3,
          level: "adequate",
          evidence: [],
          notes: "",
        },
        {
          category: "technical_decision_making",
          score: 4,
          level: "strong",
          evidence: [],
          notes: "",
        },
        {
          category: "presentation",
          score: 4,
          level: "strong",
          evidence: [],
          notes: "",
        },
      ];

      const overall = calculateOverallScore(skillScores);
      // Should be weighted average (code_quality has highest weight at 0.2)
      expect(overall).toBeGreaterThan(3);
      expect(overall).toBeLessThan(5);
    });

    it("should handle empty skill scores", () => {
      // Should return NaN for empty array due to division by zero
      const overall = calculateOverallScore([]);
      expect(Number.isNaN(overall)).toBe(true);
    });

    it("should weight code_quality higher", () => {
      // All 3s except code_quality is 5
      const highCodeQuality: SkillScore[] = [
        {
          category: "communication",
          score: 3,
          level: "adequate",
          evidence: [],
          notes: "",
        },
        {
          category: "problem_decomposition",
          score: 3,
          level: "adequate",
          evidence: [],
          notes: "",
        },
        {
          category: "ai_leverage",
          score: 3,
          level: "adequate",
          evidence: [],
          notes: "",
        },
        {
          category: "code_quality",
          score: 5,
          level: "exceptional",
          evidence: [],
          notes: "",
        },
        {
          category: "xfn_collaboration",
          score: 3,
          level: "adequate",
          evidence: [],
          notes: "",
        },
        {
          category: "time_management",
          score: 3,
          level: "adequate",
          evidence: [],
          notes: "",
        },
        {
          category: "technical_decision_making",
          score: 3,
          level: "adequate",
          evidence: [],
          notes: "",
        },
        {
          category: "presentation",
          score: 3,
          level: "adequate",
          evidence: [],
          notes: "",
        },
      ];

      // All 3s except ai_leverage is 5
      const highAiLeverage: SkillScore[] = [
        {
          category: "communication",
          score: 3,
          level: "adequate",
          evidence: [],
          notes: "",
        },
        {
          category: "problem_decomposition",
          score: 3,
          level: "adequate",
          evidence: [],
          notes: "",
        },
        {
          category: "ai_leverage",
          score: 5,
          level: "exceptional",
          evidence: [],
          notes: "",
        },
        {
          category: "code_quality",
          score: 3,
          level: "adequate",
          evidence: [],
          notes: "",
        },
        {
          category: "xfn_collaboration",
          score: 3,
          level: "adequate",
          evidence: [],
          notes: "",
        },
        {
          category: "time_management",
          score: 3,
          level: "adequate",
          evidence: [],
          notes: "",
        },
        {
          category: "technical_decision_making",
          score: 3,
          level: "adequate",
          evidence: [],
          notes: "",
        },
        {
          category: "presentation",
          score: 3,
          level: "adequate",
          evidence: [],
          notes: "",
        },
      ];

      const codeQualityScore = calculateOverallScore(highCodeQuality);
      const aiLeverageScore = calculateOverallScore(highAiLeverage);

      // Code quality has weight 0.2, AI leverage has weight 0.1
      // So high code_quality should result in higher overall
      expect(codeQualityScore).toBeGreaterThan(aiLeverageScore);
    });
  });

  describe("calculateAllSkillScores", () => {
    const createMockSignals = (
      overrides: Partial<AssessmentSignals> = {}
    ): AssessmentSignals => ({
      assessmentId: "test-id",
      userId: "user-id",
      scenarioName: "Test Scenario",
      hrInterview: null,
      conversations: {
        coworkerChats: [],
        defenseTranscript: [],
        totalCoworkerInteractions: 0,
        uniqueCoworkersContacted: 0,
      },
      recording: null,
      codeReview: null,
      ciStatus: null,
      prUrl: null,
      timing: {
        startedAt: new Date(),
        completedAt: null,
        totalDurationSeconds: null,
        workingPhaseSeconds: null,
      },
      ...overrides,
    });

    it("should return 8 skill scores", () => {
      const signals = createMockSignals();
      const scores = calculateAllSkillScores(signals);
      expect(scores).toHaveLength(8);
    });

    it("should include all skill categories", () => {
      const signals = createMockSignals();
      const scores = calculateAllSkillScores(signals);
      const categories = scores.map((s) => s.category);

      expect(categories).toContain("communication");
      expect(categories).toContain("problem_decomposition");
      expect(categories).toContain("ai_leverage");
      expect(categories).toContain("code_quality");
      expect(categories).toContain("xfn_collaboration");
      expect(categories).toContain("time_management");
      expect(categories).toContain("technical_decision_making");
      expect(categories).toContain("presentation");
    });

    it("should use HR interview scores for communication", () => {
      const signals = createMockSignals({
        hrInterview: {
          communicationScore: 5,
          communicationNotes: "Excellent communication",
          cvConsistencyScore: 4,
          cvVerificationNotes: null,
          professionalismScore: 4,
          technicalDepthScore: 4,
          cultureFitNotes: null,
          interviewDurationSeconds: 1200,
          verifiedClaims: [],
        },
      });

      const scores = calculateAllSkillScores(signals);
      const commScore = scores.find((s) => s.category === "communication");

      expect(commScore?.score).toBe(5);
      expect(commScore?.evidence).toContain(
        "HR interview communication score: 5/5"
      );
    });

    it("should score collaboration based on coworker contacts", () => {
      // No coworkers contacted
      const noCollab = createMockSignals();
      const noCollabScores = calculateAllSkillScores(noCollab);
      const noCollabScore = noCollabScores.find(
        (s) => s.category === "xfn_collaboration"
      );
      expect(noCollabScore?.score).toBe(2);

      // 3+ coworkers contacted
      const goodCollab = createMockSignals({
        conversations: {
          coworkerChats: [
            {
              coworkerName: "Alice",
              coworkerRole: "PM",
              messages: [],
              type: "text",
            },
            {
              coworkerName: "Bob",
              coworkerRole: "Dev",
              messages: [],
              type: "text",
            },
            {
              coworkerName: "Carol",
              coworkerRole: "QA",
              messages: [],
              type: "text",
            },
          ],
          defenseTranscript: [],
          totalCoworkerInteractions: 15,
          uniqueCoworkersContacted: 3,
        },
      });
      const goodCollabScores = calculateAllSkillScores(goodCollab);
      const goodCollabScore = goodCollabScores.find(
        (s) => s.category === "xfn_collaboration"
      );
      expect(goodCollabScore?.score).toBe(5);
    });

    it("should use code review scores for code_quality", () => {
      const signals = createMockSignals({
        codeReview: {
          prUrl: "https://github.com/test/repo/pull/1",
          analyzedAt: "2024-01-01T00:00:00Z",
          overallScore: 4,
          codeQualityScore: 4,
          patternScore: 3,
          securityScore: 5,
          maintainabilityScore: 4,
          codeQualityFindings: [],
          patternFindings: [],
          securityFindings: [],
          maintainability: {
            score: 4,
            readability: 4,
            modularity: 4,
            testability: 4,
            notes: [],
          },
          summary: {
            strengths: ["Good code"],
            areasForImprovement: [],
            overallAssessment: "Solid work",
            testCoverage: "adequate",
            codeStyleConsistency: "good",
            aiToolUsageEvident: false,
          },
          filesAnalyzed: 5,
          linesAdded: 100,
          linesDeleted: 20,
          aiAnalysis: {},
        },
      });

      const scores = calculateAllSkillScores(signals);
      const codeScore = scores.find((s) => s.category === "code_quality");

      expect(codeScore?.score).toBe(4);
      expect(codeScore?.evidence).toContain("Code review overall score: 4/5");
    });

    it("should detect AI tool usage", () => {
      const signals = createMockSignals({
        recording: {
          activityTimeline: [],
          toolUsage: [
            {
              tool: "Claude",
              usageCount: 10,
              contextNotes: "Used for coding help",
            },
            { tool: "VS Code", usageCount: 50, contextNotes: "Main editor" },
          ],
          stuckMoments: [],
          totalActiveTime: 3600,
          totalIdleTime: 600,
          focusScore: 4,
          aiToolsUsed: true,
          keyObservations: ["Effectively used AI for problem-solving"],
        },
      });

      const scores = calculateAllSkillScores(signals);
      const aiScore = scores.find((s) => s.category === "ai_leverage");

      expect(aiScore?.score).toBe(4);
      expect(aiScore?.evidence.some((e) => e.includes("Claude"))).toBe(true);
    });

    it("should use focus score for time management", () => {
      const signals = createMockSignals({
        recording: {
          activityTimeline: [],
          toolUsage: [],
          stuckMoments: [],
          totalActiveTime: 3600,
          totalIdleTime: 600,
          focusScore: 5,
          aiToolsUsed: false,
          keyObservations: [],
        },
      });

      const scores = calculateAllSkillScores(signals);
      const timeScore = scores.find((s) => s.category === "time_management");

      expect(timeScore?.score).toBe(5);
      expect(timeScore?.evidence).toContain("Focus score: 5/5");
    });
  });
});

// ============================================================================
// Report Formatting Tests
// ============================================================================

describe("formatReportForDisplay", () => {
  const mockReport = {
    generatedAt: "2024-01-15T10:00:00.000Z",
    assessmentId: "test-assessment-id",
    candidateName: "Jane Smith",
    overallScore: 4.2,
    overallLevel: "strong" as const,
    skillScores: [
      {
        category: "communication" as const,
        score: 4,
        level: "strong" as const,
        evidence: ["Clear in HR interview"],
        notes: "Good verbal communication",
      },
      {
        category: "code_quality" as const,
        score: 5,
        level: "exceptional" as const,
        evidence: ["Clean code"],
        notes: "Well-structured implementation",
      },
    ],
    narrative: {
      overallSummary:
        "Jane demonstrated strong technical skills throughout the assessment.",
      strengths: ["Excellent code quality", "Clear communication"],
      areasForImprovement: ["Could improve time management"],
      notableObservations: ["Used AI tools effectively"],
    },
    recommendations: [
      {
        category: "time_management" as const,
        priority: "medium" as const,
        title: "Practice time estimation",
        description: "Work on estimating task duration more accurately.",
        actionableSteps: [
          "Use time tracking tools",
          "Break tasks into smaller chunks",
        ],
      },
    ],
    metrics: {
      totalDurationMinutes: 120,
      workingPhaseMinutes: 90,
      coworkersContacted: 3,
      aiToolsUsed: true,
      testsStatus: "passing" as const,
      codeReviewScore: 4.5,
    },
  };

  it("should include report header", () => {
    const output = formatReportForDisplay(mockReport);
    expect(output).toContain("# Assessment Report");
    expect(output).toContain("Generated: 2024-01-15T10:00:00.000Z");
    expect(output).toContain("Candidate: Jane Smith");
  });

  it("should include overall score", () => {
    const output = formatReportForDisplay(mockReport);
    expect(output).toContain("## Overall Score: 4.2/5 (strong)");
  });

  it("should include skill scores", () => {
    const output = formatReportForDisplay(mockReport);
    expect(output).toContain("## Skill Scores");
    expect(output).toContain("**communication**: 4/5 (strong)");
    expect(output).toContain("**code quality**: 5/5 (exceptional)");
  });

  it("should include narrative summary", () => {
    const output = formatReportForDisplay(mockReport);
    expect(output).toContain("## Summary");
    expect(output).toContain("Jane demonstrated strong technical skills");
  });

  it("should include strengths", () => {
    const output = formatReportForDisplay(mockReport);
    expect(output).toContain("## Strengths");
    expect(output).toContain("- Excellent code quality");
    expect(output).toContain("- Clear communication");
  });

  it("should include areas for improvement", () => {
    const output = formatReportForDisplay(mockReport);
    expect(output).toContain("## Areas for Improvement");
    expect(output).toContain("- Could improve time management");
  });

  it("should include recommendations", () => {
    const output = formatReportForDisplay(mockReport);
    expect(output).toContain("## Recommendations");
    expect(output).toContain("### Practice time estimation (medium priority)");
    expect(output).toContain("Work on estimating task duration");
    expect(output).toContain("**Action steps:**");
    expect(output).toContain("- Use time tracking tools");
  });

  it("should include metrics", () => {
    const output = formatReportForDisplay(mockReport);
    expect(output).toContain("## Metrics");
    expect(output).toContain("Total duration: 120 minutes");
    expect(output).toContain("Working phase: 90 minutes");
    expect(output).toContain("Coworkers contacted: 3");
    expect(output).toContain("AI tools used: Yes");
    expect(output).toContain("Tests status: passing");
    expect(output).toContain("Code review score: 4.5/5");
  });

  it("should handle missing optional fields", () => {
    const reportWithoutName = {
      ...mockReport,
      candidateName: undefined,
      metrics: {
        ...mockReport.metrics,
        totalDurationMinutes: null,
        workingPhaseMinutes: null,
        codeReviewScore: null,
      },
    };

    const output = formatReportForDisplay(reportWithoutName);
    expect(output).not.toContain("Candidate:");
    expect(output).not.toContain("Total duration:");
    expect(output).not.toContain("Working phase:");
    expect(output).not.toContain("Code review score:");
  });
});
