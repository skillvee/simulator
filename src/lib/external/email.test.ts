import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AssessmentReport, ReportSkillCategory as SkillCategory } from "@/types";
import type { SendReportEmailParams } from "./email";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the Resend emails.send function - defined before vi.mock for hoisting
const mockResendEmailsSend = vi.fn();

// Mock the env module with a getter that allows dynamic API key changes
const mockEnv = {
  RESEND_API_KEY: undefined as string | undefined,
};

vi.mock("@/lib/core", () => ({
  env: new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "RESEND_API_KEY") {
          return mockEnv.RESEND_API_KEY;
        }
        return undefined;
      },
    }
  ),
}));

// Mock the Resend constructor - returns object with emails.send
vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = {
      send: mockResendEmailsSend,
    };
  },
}));

// Import after mocks are set up
import {
  generateReportEmailHtml,
  generateReportEmailText,
  sendEmail,
  sendReportEmail,
  isEmailServiceConfigured,
  DEFAULT_FROM_EMAIL,
  FALLBACK_FROM_EMAIL,
} from "./email";

// ============================================================================
// Test Data
// ============================================================================

function createMockSkillScore(
  category: SkillCategory,
  score: number
): {
  category: SkillCategory;
  score: number;
  level:
    | "exceptional"
    | "strong"
    | "adequate"
    | "developing"
    | "needs_improvement";
  evidence: string[];
  notes: string;
} {
  const level =
    score >= 4.5
      ? "exceptional"
      : score >= 3.5
        ? "strong"
        : score >= 2.5
          ? "adequate"
          : score >= 1.5
            ? "developing"
            : "needs_improvement";
  return {
    category,
    score,
    level,
    evidence: [`Evidence for ${category}`],
    notes: `Notes about ${category}`,
  };
}

function createMockReport(): AssessmentReport {
  return {
    generatedAt: new Date().toISOString(),
    assessmentId: "test-assessment-123",
    candidateName: "John Doe",
    overallScore: 4.2,
    overallLevel: "strong",
    skillScores: [
      createMockSkillScore("communication", 4.5),
      createMockSkillScore("problem_decomposition", 4.2),
      createMockSkillScore("ai_leverage", 4.0),
      createMockSkillScore("code_quality", 4.3),
      createMockSkillScore("xfn_collaboration", 3.8),
      createMockSkillScore("time_management", 4.1),
      createMockSkillScore("technical_decision_making", 4.0),
      createMockSkillScore("presentation", 3.9),
    ],
    narrative: {
      overallSummary:
        "John demonstrated strong technical skills and excellent communication throughout the assessment. His approach to problem-solving was methodical and efficient.",
      strengths: [
        "Excellent verbal communication during interviews",
        "Strong code quality with clear naming conventions",
        "Effective use of AI tools for productivity",
      ],
      areasForImprovement: [
        "Could improve collaboration with cross-functional team members",
        "Time management during complex tasks could be more efficient",
      ],
      notableObservations: [
        "Showed strong debugging skills",
        "Asked insightful questions",
      ],
    },
    recommendations: [
      {
        category: "xfn_collaboration",
        priority: "high",
        title: "Improve Cross-Functional Collaboration",
        description: "Work on proactively reaching out to team members.",
        actionableSteps: [
          "Schedule regular check-ins",
          "Ask for feedback early",
        ],
      },
      {
        category: "time_management",
        priority: "medium",
        title: "Optimize Time Allocation",
        description: "Focus on prioritizing tasks more effectively.",
        actionableSteps: ["Use time-boxing", "Break tasks into smaller chunks"],
      },
    ],
    metrics: {
      totalDurationMinutes: 120,
      workingPhaseMinutes: 90,
      coworkersContacted: 3,
      aiToolsUsed: true,
      testsStatus: "passing",
      codeReviewScore: 4.3,
    },
    version: "1.0.0",
  };
}

function createReportEmailParams(
  overrides: Partial<SendReportEmailParams> = {}
): SendReportEmailParams {
  return {
    to: "test@example.com",
    candidateName: "John Doe",
    assessmentId: "test-assessment-123",
    report: createMockReport(),
    appBaseUrl: "https://skillvee.com",
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("Email Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.RESEND_API_KEY = undefined;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // --------------------------------------------------------------------------
  // isEmailServiceConfigured
  // --------------------------------------------------------------------------

  describe("isEmailServiceConfigured", () => {
    it("should return false when RESEND_API_KEY is not set", () => {
      mockEnv.RESEND_API_KEY = undefined;
      expect(isEmailServiceConfigured()).toBe(false);
    });

    it("should return true when RESEND_API_KEY is set", () => {
      mockEnv.RESEND_API_KEY = "re_test_key";
      expect(isEmailServiceConfigured()).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // generateReportEmailHtml
  // --------------------------------------------------------------------------

  describe("generateReportEmailHtml", () => {
    it("should generate HTML with candidate name", () => {
      const params = createReportEmailParams();
      const html = generateReportEmailHtml(params);

      expect(html).toContain("Hi John Doe,");
      expect(html).toContain("SKILLVEE");
    });

    it("should include overall score and level", () => {
      const params = createReportEmailParams();
      const html = generateReportEmailHtml(params);

      expect(html).toContain("4.2/5");
      expect(html).toContain("Strong Performance");
    });

    it("should include top skills", () => {
      const params = createReportEmailParams();
      const html = generateReportEmailHtml(params);

      // Top 3 skills by score should be included
      expect(html).toContain("Communication"); // 4.5
      expect(html).toContain("Code Quality"); // 4.3
      expect(html).toContain("Problem Decomposition"); // 4.2
    });

    it("should include summary text", () => {
      const params = createReportEmailParams();
      const html = generateReportEmailHtml(params);

      expect(html).toContain("John demonstrated strong technical skills");
    });

    it("should include strengths", () => {
      const params = createReportEmailParams();
      const html = generateReportEmailHtml(params);

      expect(html).toContain(
        "Excellent verbal communication during interviews"
      );
      expect(html).toContain(
        "Strong code quality with clear naming conventions"
      );
    });

    it("should include recommendations", () => {
      const params = createReportEmailParams();
      const html = generateReportEmailHtml(params);

      expect(html).toContain("Improve Cross-Functional Collaboration");
    });

    it("should include report link", () => {
      const params = createReportEmailParams();
      const html = generateReportEmailHtml(params);

      expect(html).toContain(
        "https://skillvee.com/assessments/test-assessment-123/results"
      );
      expect(html).toContain("View Full Report");
    });

    it("should handle missing candidate name", () => {
      const params = createReportEmailParams({ candidateName: undefined });
      const html = generateReportEmailHtml(params);

      expect(html).toContain("Hi,");
      expect(html).not.toContain("undefined");
    });

    it("should truncate long summaries", () => {
      const longSummary = "A".repeat(600);
      const params = createReportEmailParams();
      params.report.narrative.overallSummary = longSummary;
      const html = generateReportEmailHtml(params);

      expect(html).toContain("...");
    });
  });

  // --------------------------------------------------------------------------
  // generateReportEmailText
  // --------------------------------------------------------------------------

  describe("generateReportEmailText", () => {
    it("should generate plain text with candidate name", () => {
      const params = createReportEmailParams();
      const text = generateReportEmailText(params);

      expect(text).toContain("Hi John Doe,");
      expect(text).toContain("SKILLVEE");
    });

    it("should include overall score", () => {
      const params = createReportEmailParams();
      const text = generateReportEmailText(params);

      expect(text).toContain("4.2/5");
      expect(text).toContain("Strong Performance");
    });

    it("should include top skills with scores", () => {
      const params = createReportEmailParams();
      const text = generateReportEmailText(params);

      expect(text).toContain("Communication: 4.5/5");
    });

    it("should include report URL", () => {
      const params = createReportEmailParams();
      const text = generateReportEmailText(params);

      expect(text).toContain(
        "https://skillvee.com/assessments/test-assessment-123/results"
      );
    });

    it("should handle missing candidate name", () => {
      const params = createReportEmailParams({ candidateName: undefined });
      const text = generateReportEmailText(params);

      expect(text).toContain("Hi,");
      expect(text).not.toContain("undefined");
    });
  });

  // --------------------------------------------------------------------------
  // sendEmail
  // --------------------------------------------------------------------------

  describe("sendEmail", () => {
    it("should return error when email service is not configured", async () => {
      mockEnv.RESEND_API_KEY = undefined;

      const result = await sendEmail({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email service not configured");
    });

    it("should call Resend API when configured", async () => {
      mockEnv.RESEND_API_KEY = "re_test_key";
      mockResendEmailsSend.mockResolvedValue({
        data: { id: "email-123" },
        error: null,
      });

      const result = await sendEmail({
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
        text: "Test content",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("email-123");
      expect(mockResendEmailsSend).toHaveBeenCalledWith({
        from: DEFAULT_FROM_EMAIL,
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
        text: "Test content",
      });
    });

    it("should handle Resend API errors", async () => {
      mockEnv.RESEND_API_KEY = "re_test_key";
      mockResendEmailsSend.mockResolvedValue({
        data: null,
        error: { message: "Invalid email address" },
      });

      const result = await sendEmail({
        to: "invalid",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid email address");
    });

    it("should handle exceptions", async () => {
      mockEnv.RESEND_API_KEY = "re_test_key";
      mockResendEmailsSend.mockRejectedValue(new Error("Network error"));

      const result = await sendEmail({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  // --------------------------------------------------------------------------
  // sendReportEmail
  // --------------------------------------------------------------------------

  describe("sendReportEmail", () => {
    it("should reject invalid email addresses", async () => {
      const params = createReportEmailParams({ to: "invalid" });

      const result = await sendReportEmail(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid email address");
    });

    it("should reject empty email addresses", async () => {
      const params = createReportEmailParams({ to: "" });

      const result = await sendReportEmail(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid email address");
    });

    it("should send email with proper subject including name", async () => {
      mockEnv.RESEND_API_KEY = "re_test_key";
      mockResendEmailsSend.mockResolvedValue({
        data: { id: "email-123" },
        error: null,
      });

      const params = createReportEmailParams();
      await sendReportEmail(params);

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "John Doe, your Skillvee assessment report is ready!",
        })
      );
    });

    it("should send email with generic subject when no name", async () => {
      mockEnv.RESEND_API_KEY = "re_test_key";
      mockResendEmailsSend.mockResolvedValue({
        data: { id: "email-123" },
        error: null,
      });

      const params = createReportEmailParams({ candidateName: undefined });
      await sendReportEmail(params);

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Your Skillvee assessment report is ready!",
        })
      );
    });

    it("should include both HTML and text versions", async () => {
      mockEnv.RESEND_API_KEY = "re_test_key";
      mockResendEmailsSend.mockResolvedValue({
        data: { id: "email-123" },
        error: null,
      });

      const params = createReportEmailParams();
      await sendReportEmail(params);

      const call = mockResendEmailsSend.mock.calls[0][0];
      expect(call.html).toContain("<!DOCTYPE html>");
      expect(call.text).toContain("SKILLVEE");
    });
  });

  // --------------------------------------------------------------------------
  // Constants
  // --------------------------------------------------------------------------

  describe("Email Constants", () => {
    it("should export DEFAULT_FROM_EMAIL", () => {
      expect(DEFAULT_FROM_EMAIL).toBe("Skillvee <noreply@skillvee.com>");
    });

    it("should export FALLBACK_FROM_EMAIL for testing", () => {
      expect(FALLBACK_FROM_EMAIL).toBe("onboarding@resend.dev");
    });
  });
});
