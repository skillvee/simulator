import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  codeQualityFindingSchema,
  patternFindingSchema,
  securityFindingSchema,
  maintainabilityAssessmentSchema,
  codeReviewResponseSchema,
  buildCodeReviewData,
  formatCodeReviewForPrompt,
  type CodeReviewResponse,
  type CodeReviewData,
} from "./code-review";

// Mock gemini module
vi.mock("@/lib/gemini", () => ({
  gemini: {
    models: {
      generateContent: vi.fn(),
    },
  },
}));

// Mock github module
vi.mock("@/lib/github", () => ({
  fetchGitHubPrContent: vi.fn(),
}));

describe("Code Review Schemas", () => {
  describe("codeQualityFindingSchema", () => {
    it("should validate valid code quality finding", () => {
      const finding = {
        category: "naming",
        severity: "minor",
        description: "Variable name could be more descriptive",
        fileHint: "src/utils/helper.ts",
        recommendation: "Rename 'x' to 'userCount'",
      };
      expect(() => codeQualityFindingSchema.parse(finding)).not.toThrow();
    });

    it("should reject invalid category", () => {
      const finding = {
        category: "invalid_category",
        severity: "minor",
        description: "Test finding",
      };
      expect(() => codeQualityFindingSchema.parse(finding)).toThrow();
    });

    it("should reject invalid severity", () => {
      const finding = {
        category: "naming",
        severity: "invalid_severity",
        description: "Test finding",
      };
      expect(() => codeQualityFindingSchema.parse(finding)).toThrow();
    });

    it("should allow optional fields", () => {
      const finding = {
        category: "structure",
        severity: "major",
        description: "Function is too long",
      };
      expect(() => codeQualityFindingSchema.parse(finding)).not.toThrow();
    });

    it("should validate all category types", () => {
      const categories = [
        "naming",
        "structure",
        "complexity",
        "duplication",
        "error_handling",
        "documentation",
        "performance",
        "type_safety",
        "formatting",
        "other",
      ];
      categories.forEach((category) => {
        const finding = {
          category,
          severity: "minor",
          description: "Test",
        };
        expect(() => codeQualityFindingSchema.parse(finding)).not.toThrow();
      });
    });
  });

  describe("patternFindingSchema", () => {
    it("should validate valid pattern finding", () => {
      const finding = {
        pattern: "Repository Pattern",
        usage: "correct",
        notes: "Properly separates data access from business logic",
        isStrength: true,
      };
      expect(() => patternFindingSchema.parse(finding)).not.toThrow();
    });

    it("should reject invalid usage", () => {
      const finding = {
        pattern: "Test Pattern",
        usage: "invalid_usage",
        notes: "Test",
        isStrength: false,
      };
      expect(() => patternFindingSchema.parse(finding)).toThrow();
    });

    it("should validate all usage types", () => {
      const usages = ["correct", "partial", "incorrect", "missing"];
      usages.forEach((usage) => {
        const finding = {
          pattern: "Test Pattern",
          usage,
          notes: "Test notes",
          isStrength: usage === "correct",
        };
        expect(() => patternFindingSchema.parse(finding)).not.toThrow();
      });
    });
  });

  describe("securityFindingSchema", () => {
    it("should validate valid security finding", () => {
      const finding = {
        category: "injection",
        severity: "critical",
        description: "SQL injection vulnerability in user query",
        fileHint: "src/api/users.ts:45",
        recommendation: "Use parameterized queries",
      };
      expect(() => securityFindingSchema.parse(finding)).not.toThrow();
    });

    it("should reject invalid category", () => {
      const finding = {
        category: "invalid_category",
        severity: "high",
        description: "Test",
        recommendation: "Fix it",
      };
      expect(() => securityFindingSchema.parse(finding)).toThrow();
    });

    it("should validate all security categories", () => {
      const categories = [
        "injection",
        "authentication",
        "authorization",
        "data_exposure",
        "cryptography",
        "input_validation",
        "dependency",
        "configuration",
        "other",
      ];
      categories.forEach((category) => {
        const finding = {
          category,
          severity: "medium",
          description: "Test finding",
          recommendation: "Test recommendation",
        };
        expect(() => securityFindingSchema.parse(finding)).not.toThrow();
      });
    });

    it("should validate all severity levels", () => {
      const severities = ["critical", "high", "medium", "low", "info"];
      severities.forEach((severity) => {
        const finding = {
          category: "other",
          severity,
          description: "Test finding",
          recommendation: "Test recommendation",
        };
        expect(() => securityFindingSchema.parse(finding)).not.toThrow();
      });
    });
  });

  describe("maintainabilityAssessmentSchema", () => {
    it("should validate valid maintainability assessment", () => {
      const assessment = {
        score: 4,
        readability: 5,
        modularity: 4,
        testability: 3,
        notes: ["Good separation of concerns", "Could use more tests"],
      };
      expect(() => maintainabilityAssessmentSchema.parse(assessment)).not.toThrow();
    });

    it("should reject scores outside 1-5 range", () => {
      const assessment = {
        score: 0,
        readability: 5,
        modularity: 4,
        testability: 3,
        notes: [],
      };
      expect(() => maintainabilityAssessmentSchema.parse(assessment)).toThrow();

      const assessment2 = {
        score: 4,
        readability: 6,
        modularity: 4,
        testability: 3,
        notes: [],
      };
      expect(() => maintainabilityAssessmentSchema.parse(assessment2)).toThrow();
    });
  });

  describe("codeReviewResponseSchema", () => {
    const validResponse: CodeReviewResponse = {
      overallScore: 4,
      codeQualityScore: 4,
      patternScore: 3,
      securityScore: 5,
      maintainabilityScore: 4,
      codeQualityFindings: [
        {
          category: "naming",
          severity: "minor",
          description: "Variable name could be clearer",
        },
      ],
      patternFindings: [
        {
          pattern: "MVC",
          usage: "correct",
          notes: "Proper separation",
          isStrength: true,
        },
      ],
      securityFindings: [],
      maintainability: {
        score: 4,
        readability: 4,
        modularity: 4,
        testability: 4,
        notes: ["Clean code structure"],
      },
      summary: {
        strengths: ["Good code organization", "Proper error handling"],
        areasForImprovement: ["Add more tests"],
        overallAssessment: "Solid implementation with room for improvement in test coverage",
        testCoverage: "adequate",
        codeStyleConsistency: "good",
        aiToolUsageEvident: false,
      },
      filesAnalyzed: 5,
      linesChanged: {
        additions: 150,
        deletions: 30,
      },
    };

    it("should validate complete response", () => {
      expect(() => codeReviewResponseSchema.parse(validResponse)).not.toThrow();
    });

    it("should reject invalid overall score", () => {
      const response = { ...validResponse, overallScore: 6 };
      expect(() => codeReviewResponseSchema.parse(response)).toThrow();
    });

    it("should reject invalid test coverage value", () => {
      const response = {
        ...validResponse,
        summary: { ...validResponse.summary, testCoverage: "invalid" },
      };
      expect(() => codeReviewResponseSchema.parse(response)).toThrow();
    });

    it("should validate all testCoverage types", () => {
      const coverages = ["comprehensive", "adequate", "minimal", "none", "unknown"];
      coverages.forEach((testCoverage) => {
        const response = {
          ...validResponse,
          summary: { ...validResponse.summary, testCoverage },
        };
        expect(() => codeReviewResponseSchema.parse(response)).not.toThrow();
      });
    });

    it("should validate all codeStyleConsistency types", () => {
      const styles = ["excellent", "good", "fair", "poor"];
      styles.forEach((codeStyleConsistency) => {
        const response = {
          ...validResponse,
          summary: { ...validResponse.summary, codeStyleConsistency },
        };
        expect(() => codeReviewResponseSchema.parse(response)).not.toThrow();
      });
    });
  });
});

describe("buildCodeReviewData", () => {
  const mockAnalysis: CodeReviewResponse = {
    overallScore: 4,
    codeQualityScore: 4,
    patternScore: 3,
    securityScore: 5,
    maintainabilityScore: 4,
    codeQualityFindings: [
      {
        category: "naming",
        severity: "minor",
        description: "Variable naming could be improved",
      },
    ],
    patternFindings: [
      {
        pattern: "Repository Pattern",
        usage: "correct",
        notes: "Good data abstraction",
        isStrength: true,
      },
    ],
    securityFindings: [],
    maintainability: {
      score: 4,
      readability: 5,
      modularity: 4,
      testability: 3,
      notes: ["Clear code structure"],
    },
    summary: {
      strengths: ["Clean implementation"],
      areasForImprovement: ["Add integration tests"],
      overallAssessment: "Good work overall",
      testCoverage: "adequate",
      codeStyleConsistency: "good",
      aiToolUsageEvident: true,
    },
    filesAnalyzed: 3,
    linesChanged: {
      additions: 100,
      deletions: 20,
    },
  };

  it("should build correct data structure", () => {
    const prUrl = "https://github.com/owner/repo/pull/123";
    const data = buildCodeReviewData(prUrl, mockAnalysis);

    expect(data.prUrl).toBe(prUrl);
    expect(data.overallScore).toBe(4);
    expect(data.codeQualityScore).toBe(4);
    expect(data.patternScore).toBe(3);
    expect(data.securityScore).toBe(5);
    expect(data.maintainabilityScore).toBe(4);
    expect(data.filesAnalyzed).toBe(3);
    expect(data.linesAdded).toBe(100);
    expect(data.linesDeleted).toBe(20);
    expect(data.summary).toEqual(mockAnalysis.summary);
    expect(data.codeQualityFindings).toEqual(mockAnalysis.codeQualityFindings);
    expect(data.patternFindings).toEqual(mockAnalysis.patternFindings);
    expect(data.securityFindings).toEqual(mockAnalysis.securityFindings);
    expect(data.maintainability).toEqual(mockAnalysis.maintainability);
  });

  it("should include analyzedAt timestamp", () => {
    const prUrl = "https://github.com/owner/repo/pull/123";
    const before = new Date().toISOString();
    const data = buildCodeReviewData(prUrl, mockAnalysis);
    const after = new Date().toISOString();

    expect(data.analyzedAt).toBeDefined();
    expect(data.analyzedAt >= before).toBe(true);
    expect(data.analyzedAt <= after).toBe(true);
  });

  it("should include aiAnalysis with full response", () => {
    const prUrl = "https://github.com/owner/repo/pull/123";
    const data = buildCodeReviewData(prUrl, mockAnalysis);

    expect(data.aiAnalysis).toMatchObject(mockAnalysis);
  });
});

describe("formatCodeReviewForPrompt", () => {
  const mockReviewData: CodeReviewData = {
    prUrl: "https://github.com/owner/repo/pull/123",
    analyzedAt: "2024-01-15T10:00:00.000Z",
    overallScore: 4,
    codeQualityScore: 4,
    patternScore: 3,
    securityScore: 5,
    maintainabilityScore: 4,
    codeQualityFindings: [
      {
        category: "naming",
        severity: "minor",
        description: "Variable naming could be improved",
      },
      {
        category: "complexity",
        severity: "major",
        description: "Function too complex",
      },
    ],
    patternFindings: [
      {
        pattern: "Repository Pattern",
        usage: "correct",
        notes: "Good data abstraction",
        isStrength: true,
      },
    ],
    securityFindings: [
      {
        category: "injection",
        severity: "high",
        description: "Potential SQL injection",
        recommendation: "Use parameterized queries",
      },
    ],
    maintainability: {
      score: 4,
      readability: 5,
      modularity: 4,
      testability: 3,
      notes: ["Clear code structure"],
    },
    summary: {
      strengths: ["Clean implementation", "Good error handling"],
      areasForImprovement: ["Add integration tests", "Reduce function complexity"],
      overallAssessment: "Good work with some areas needing attention",
      testCoverage: "adequate",
      codeStyleConsistency: "good",
      aiToolUsageEvident: true,
    },
    filesAnalyzed: 3,
    linesAdded: 100,
    linesDeleted: 20,
    aiAnalysis: {},
  };

  it("should include overall score", () => {
    const prompt = formatCodeReviewForPrompt(mockReviewData);
    expect(prompt).toContain("Overall Score: 4/5");
  });

  it("should include individual scores", () => {
    const prompt = formatCodeReviewForPrompt(mockReviewData);
    expect(prompt).toContain("Code Quality: 4/5");
    expect(prompt).toContain("Patterns/Architecture: 3/5");
    expect(prompt).toContain("Security: 5/5");
    expect(prompt).toContain("Maintainability: 4/5");
  });

  it("should include summary assessment", () => {
    const prompt = formatCodeReviewForPrompt(mockReviewData);
    expect(prompt).toContain("Good work with some areas needing attention");
  });

  it("should include strengths", () => {
    const prompt = formatCodeReviewForPrompt(mockReviewData);
    expect(prompt).toContain("Strengths");
    expect(prompt).toContain("Clean implementation");
    expect(prompt).toContain("Good error handling");
  });

  it("should include areas for improvement", () => {
    const prompt = formatCodeReviewForPrompt(mockReviewData);
    expect(prompt).toContain("Areas for Improvement");
    expect(prompt).toContain("Add integration tests");
    expect(prompt).toContain("Reduce function complexity");
  });

  it("should include metrics", () => {
    const prompt = formatCodeReviewForPrompt(mockReviewData);
    expect(prompt).toContain("Files Analyzed: 3");
    expect(prompt).toContain("Lines Added: 100");
    expect(prompt).toContain("Deleted: 20");
    expect(prompt).toContain("Test Coverage: adequate");
    expect(prompt).toContain("Code Style Consistency: good");
    expect(prompt).toContain("AI Tool Usage Evident: Yes");
  });

  it("should include critical/major code quality findings", () => {
    const prompt = formatCodeReviewForPrompt(mockReviewData);
    expect(prompt).toContain("Key Code Quality Findings");
    expect(prompt).toContain("[MAJOR]");
    expect(prompt).toContain("complexity");
    expect(prompt).toContain("Function too complex");
  });

  it("should include high severity security findings", () => {
    const prompt = formatCodeReviewForPrompt(mockReviewData);
    expect(prompt).toContain("Security Concerns");
    expect(prompt).toContain("[HIGH]");
    expect(prompt).toContain("injection");
    expect(prompt).toContain("Potential SQL injection");
  });

  it("should not include minor findings in key findings section", () => {
    const prompt = formatCodeReviewForPrompt(mockReviewData);
    // The minor "naming" finding should not appear in Key Code Quality Findings
    const keyFindingsSection = prompt.split("Key Code Quality Findings")[1]?.split("###")[0] || "";
    expect(keyFindingsSection).not.toContain("naming");
  });

  it("should handle empty findings gracefully", () => {
    const emptyReviewData: CodeReviewData = {
      ...mockReviewData,
      codeQualityFindings: [],
      securityFindings: [],
      summary: {
        ...mockReviewData.summary,
        strengths: [],
        areasForImprovement: [],
      },
    };

    const prompt = formatCodeReviewForPrompt(emptyReviewData);
    // Should still have the basic structure
    expect(prompt).toContain("Code Review Analysis");
    expect(prompt).toContain("Overall Score");
    // Should not have findings sections
    expect(prompt).not.toContain("Key Code Quality Findings");
    expect(prompt).not.toContain("Security Concerns");
  });
});
