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

vi.mock("@/lib/core/env", () => ({
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

vi.mock("@/lib/core", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock next-intl for translations
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(({ locale, namespace }) => {
    // Return a mock translation function that handles both simple keys and rich text
    const translations: Record<string, Record<string, Record<string, string>>> = {
      "email.report": {
        en: {
          subject: "{candidateName}, your Skillvee assessment report is ready!",
          subjectNoName: "Your Skillvee assessment report is ready!",
          greeting: "Hi {candidateName},",
          greetingNoName: "Hi,",
          intro: "Your developer assessment is complete! Here's a summary of your performance.",
          overallScoreLabel: "{emoji} {levelText} Performance",
          topSkillsTitle: "Top Skills",
          summaryTitle: "Summary",
          keyStrengthsTitle: "Key Strengths",
          recommendationsTitle: "Recommendations",
          viewFullReportButton: "View Full Report",
          fullReportDescription: "Your full report includes detailed skill breakdowns, evidence-based scores, and actionable steps to improve. Click the button above to view it all.",
          footerText: "This email was sent by {link}. You received this because you completed a developer assessment.",
          "skillCategories.communication": "Communication",
          "skillCategories.problem_decomposition": "Problem Decomposition",
          "skillCategories.ai_leverage": "AI Leverage",
          "skillCategories.code_quality": "Code Quality",
          "skillCategories.xfn_collaboration": "Cross-Functional Collaboration",
          "skillCategories.time_management": "Time Management",
          "skillCategories.technical_decision_making": "Technical Decision-Making",
          "skillCategories.presentation": "Presentation",
          "levels.exceptional": "Exceptional",
          "levels.strong": "Strong",
          "levels.adequate": "Adequate",
          "levels.developing": "Developing",
          "levels.needs_improvement": "Needs Improvement",
        },
        es: {
          subject: "{candidateName}, ¡tu informe de evaluación de Skillvee está listo!",
          subjectNoName: "¡Tu informe de evaluación de Skillvee está listo!",
          greeting: "Hola {candidateName},",
          greetingNoName: "Hola,",
          intro: "¡Tu evaluación de desarrollador está completa! Aquí hay un resumen de tu desempeño.",
          overallScoreLabel: "{emoji} Desempeño {levelText}",
          topSkillsTitle: "Habilidades Principales",
          summaryTitle: "Resumen",
          keyStrengthsTitle: "Fortalezas Clave",
          recommendationsTitle: "Recomendaciones",
          viewFullReportButton: "Ver Informe Completo",
          fullReportDescription: "Tu informe completo incluye desgloses detallados de habilidades, puntuaciones basadas en evidencia y pasos accionables para mejorar. Haz clic en el botón de arriba para verlo todo.",
          footerText: "Este correo fue enviado por {link}. Lo recibiste porque completaste una evaluación de desarrollador.",
          "skillCategories.communication": "Comunicación",
          "skillCategories.problem_decomposition": "Descomposición de Problemas",
          "skillCategories.ai_leverage": "Aprovechamiento de IA",
          "skillCategories.code_quality": "Calidad del Código",
          "skillCategories.xfn_collaboration": "Colaboración Multifuncional",
          "skillCategories.time_management": "Gestión del Tiempo",
          "skillCategories.technical_decision_making": "Toma de Decisiones Técnicas",
          "skillCategories.presentation": "Presentación",
          "levels.exceptional": "Excepcional",
          "levels.strong": "Fuerte",
          "levels.adequate": "Adecuado",
          "levels.developing": "En Desarrollo",
          "levels.needs_improvement": "Necesita Mejorar",
        },
      },
    };

    const langTranslations = translations[namespace]?.[locale] || translations[namespace]?.en || {};

    const t = (key: string, values?: Record<string, unknown>) => {
      // Handle both simple keys and dotted keys (e.g., "skillCategories.communication")
      let template = langTranslations[key] || key;

      // Replace template variables
      if (values) {
        Object.entries(values).forEach(([k, v]) => {
          template = template.replace(`{${k}}`, String(v));
        });
      }

      return template;
    };

    // Add the rich method to the translation function
    (t as unknown as { rich: (key: string, values: Record<string, unknown>) => string }).rich = (key: string, values: Record<string, unknown>) => {
      let template = langTranslations[key] || key;
      Object.entries(values).forEach(([k, v]) => {
        if (typeof v === "function") {
          template = template.replace(`{${k}}`, v());
        }
      });
      return template;
    };

    return Promise.resolve(t);
  }),
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
    it("should generate HTML with candidate name", async () => {
      const params = createReportEmailParams();
      const html = await generateReportEmailHtml(params);

      expect(html).toContain("Hi John Doe,");
      expect(html).toContain("SKILLVEE");
    });

    it("should include overall score and level", async () => {
      const params = createReportEmailParams();
      const html = await generateReportEmailHtml(params);

      expect(html).toContain("4.2/5");
      expect(html).toContain("Strong Performance");
    });

    it("should include top skills", async () => {
      const params = createReportEmailParams();
      const html = await generateReportEmailHtml(params);

      // Top 3 skills by score should be included
      expect(html).toContain("Communication"); // 4.5
      expect(html).toContain("Code Quality"); // 4.3
      expect(html).toContain("Problem Decomposition"); // 4.2
    });

    it("should include summary text", async () => {
      const params = createReportEmailParams();
      const html = await generateReportEmailHtml(params);

      expect(html).toContain("John demonstrated strong technical skills");
    });

    it("should include strengths", async () => {
      const params = createReportEmailParams();
      const html = await generateReportEmailHtml(params);

      expect(html).toContain(
        "Excellent verbal communication during interviews"
      );
      expect(html).toContain(
        "Strong code quality with clear naming conventions"
      );
    });

    it("should include recommendations", async () => {
      const params = createReportEmailParams();
      const html = await generateReportEmailHtml(params);

      expect(html).toContain("Improve Cross-Functional Collaboration");
    });

    it("should include report link", async () => {
      const params = createReportEmailParams();
      const html = await generateReportEmailHtml(params);

      expect(html).toContain(
        "https://skillvee.com/assessments/test-assessment-123/results"
      );
      expect(html).toContain("View Full Report");
    });

    it("should handle missing candidate name", async () => {
      const params = createReportEmailParams({ candidateName: undefined });
      const html = await generateReportEmailHtml(params);

      expect(html).toContain("Hi,");
      expect(html).not.toContain("undefined");
    });

    it("should truncate long summaries", async () => {
      const longSummary = "A".repeat(600);
      const params = createReportEmailParams();
      params.report.narrative.overallSummary = longSummary;
      const html = await generateReportEmailHtml(params);

      expect(html).toContain("...");
    });
  });

  // --------------------------------------------------------------------------
  // generateReportEmailText
  // --------------------------------------------------------------------------

  describe("generateReportEmailText", () => {
    it("should generate plain text with candidate name", async () => {
      const params = createReportEmailParams();
      const text = await generateReportEmailText(params);

      expect(text).toContain("Hi John Doe,");
      expect(text).toContain("SKILLVEE");
    });

    it("should include overall score", async () => {
      const params = createReportEmailParams();
      const text = await generateReportEmailText(params);

      expect(text).toContain("4.2/5");
      expect(text).toContain("Strong Performance");
    });

    it("should include top skills with scores", async () => {
      const params = createReportEmailParams();
      const text = await generateReportEmailText(params);

      expect(text).toContain("Communication: 4.5/5");
    });

    it("should include report URL", async () => {
      const params = createReportEmailParams();
      const text = await generateReportEmailText(params);

      expect(text).toContain(
        "https://skillvee.com/assessments/test-assessment-123/results"
      );
    });

    it("should handle missing candidate name", async () => {
      const params = createReportEmailParams({ candidateName: undefined });
      const text = await generateReportEmailText(params);

      expect(text).toContain("Hi,");
      expect(text).not.toContain("undefined");
    });

    it("should generate plain text in Spanish when language is es", async () => {
      const params = createReportEmailParams({ language: "es" });
      const text = await generateReportEmailText(params);

      expect(text).toContain("Hola John Doe,");
      expect(text).toContain("Habilidades Principales");
      expect(text).toContain("Comunicación: 4.5/5");
      expect(text).toContain("Resumen");
      expect(text).toContain("Fortalezas Clave");
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

    it("should send email with Spanish subject when language is es", async () => {
      mockEnv.RESEND_API_KEY = "re_test_key";
      mockResendEmailsSend.mockResolvedValue({
        data: { id: "email-123" },
        error: null,
      });

      const params = createReportEmailParams({ language: "es" });
      await sendReportEmail(params);

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "John Doe, ¡tu informe de evaluación de Skillvee está listo!",
        })
      );
    });

    it("should generate Spanish HTML content when language is es", async () => {
      mockEnv.RESEND_API_KEY = "re_test_key";
      mockResendEmailsSend.mockResolvedValue({
        data: { id: "email-123" },
        error: null,
      });

      const params = createReportEmailParams({ language: "es" });
      await sendReportEmail(params);

      const call = mockResendEmailsSend.mock.calls[0][0];
      expect(call.html).toContain("Hola John Doe,");
      expect(call.html).toContain("Habilidades Principales");
      expect(call.text).toContain("Hola John Doe,");
      expect(call.text).toContain("Comunicación: 4.5/5");
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
