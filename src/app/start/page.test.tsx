import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssessmentStatus } from "@prisma/client";

// Define mock functions before vi.mock calls
const mockAuth = vi.fn();
const mockAssessmentFindFirst = vi.fn();
const mockAssessmentCreate = vi.fn();
const mockScenarioFindFirst = vi.fn();
const mockRedirect = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (args: unknown) => mockAssessmentFindFirst(args),
      create: (args: unknown) => mockAssessmentCreate(args),
    },
    scenario: {
      findFirst: (args: unknown) => mockScenarioFindFirst(args),
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`REDIRECT:${url}`);
  },
}));

// Import after mocks are set up
import StartPage from "./page";

describe("/start page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("redirects to sign-in with callback when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      await expect(StartPage()).rejects.toThrow("REDIRECT:/sign-in?callbackUrl=/start");
      expect(mockRedirect).toHaveBeenCalledWith("/sign-in?callbackUrl=/start");
    });

    it("redirects to sign-in when session has no user id", async () => {
      mockAuth.mockResolvedValueOnce({ user: {} });

      await expect(StartPage()).rejects.toThrow("REDIRECT:/sign-in?callbackUrl=/start");
      expect(mockRedirect).toHaveBeenCalledWith("/sign-in?callbackUrl=/start");
    });
  });

  describe("Resume existing assessment", () => {
    it("redirects to consent page when assessment has no consent", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockAssessmentFindFirst.mockResolvedValueOnce({
        id: "assessment-123",
        status: AssessmentStatus.HR_INTERVIEW,
        consentGivenAt: null,
        scenario: { id: "scenario-1" },
      });

      await expect(StartPage()).rejects.toThrow("REDIRECT:/assessment/assessment-123/consent");
      expect(mockRedirect).toHaveBeenCalledWith("/assessment/assessment-123/consent");
    });

    it("redirects to HR interview for HR_INTERVIEW status with consent", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockAssessmentFindFirst.mockResolvedValueOnce({
        id: "assessment-123",
        status: AssessmentStatus.HR_INTERVIEW,
        consentGivenAt: new Date(),
        scenario: { id: "scenario-1" },
      });

      await expect(StartPage()).rejects.toThrow("REDIRECT:/assessment/assessment-123/hr-interview");
      expect(mockRedirect).toHaveBeenCalledWith("/assessment/assessment-123/hr-interview");
    });

    it("redirects to congratulations for ONBOARDING status", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockAssessmentFindFirst.mockResolvedValueOnce({
        id: "assessment-123",
        status: AssessmentStatus.ONBOARDING,
        consentGivenAt: new Date(),
        scenario: { id: "scenario-1" },
      });

      await expect(StartPage()).rejects.toThrow("REDIRECT:/assessment/assessment-123/congratulations");
      expect(mockRedirect).toHaveBeenCalledWith("/assessment/assessment-123/congratulations");
    });

    it("redirects to welcome for WORKING status", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockAssessmentFindFirst.mockResolvedValueOnce({
        id: "assessment-123",
        status: AssessmentStatus.WORKING,
        consentGivenAt: new Date(),
        scenario: { id: "scenario-1" },
      });

      await expect(StartPage()).rejects.toThrow("REDIRECT:/assessment/assessment-123/welcome");
      expect(mockRedirect).toHaveBeenCalledWith("/assessment/assessment-123/welcome");
    });

    it("redirects to defense for FINAL_DEFENSE status", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockAssessmentFindFirst.mockResolvedValueOnce({
        id: "assessment-123",
        status: AssessmentStatus.FINAL_DEFENSE,
        consentGivenAt: new Date(),
        scenario: { id: "scenario-1" },
      });

      await expect(StartPage()).rejects.toThrow("REDIRECT:/assessment/assessment-123/defense");
      expect(mockRedirect).toHaveBeenCalledWith("/assessment/assessment-123/defense");
    });

    it("redirects to processing for PROCESSING status", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockAssessmentFindFirst.mockResolvedValueOnce({
        id: "assessment-123",
        status: AssessmentStatus.PROCESSING,
        consentGivenAt: new Date(),
        scenario: { id: "scenario-1" },
      });

      await expect(StartPage()).rejects.toThrow("REDIRECT:/assessment/assessment-123/processing");
      expect(mockRedirect).toHaveBeenCalledWith("/assessment/assessment-123/processing");
    });

    it("does not resume COMPLETED assessments", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      // Query returns null because we filter out COMPLETED assessments
      mockAssessmentFindFirst.mockResolvedValueOnce(null);
      mockScenarioFindFirst.mockResolvedValueOnce({ id: "scenario-1" });
      mockAssessmentCreate.mockResolvedValueOnce({ id: "new-assessment-123" });

      await expect(StartPage()).rejects.toThrow("REDIRECT:/assessment/new-assessment-123/consent");

      // Verify the filter excludes COMPLETED status
      expect(mockAssessmentFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { not: AssessmentStatus.COMPLETED },
          }),
        })
      );
    });

    it("resumes most recent assessment when multiple exist", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      // Most recent is returned due to orderBy: createdAt desc
      mockAssessmentFindFirst.mockResolvedValueOnce({
        id: "most-recent-assessment",
        status: AssessmentStatus.WORKING,
        consentGivenAt: new Date(),
        scenario: { id: "scenario-1" },
      });

      await expect(StartPage()).rejects.toThrow("REDIRECT:/assessment/most-recent-assessment/welcome");

      // Verify orderBy is desc
      expect(mockAssessmentFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
    });
  });

  describe("Create new assessment", () => {
    it("creates assessment for first published scenario when no in-progress assessment", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockAssessmentFindFirst.mockResolvedValueOnce(null);
      mockScenarioFindFirst.mockResolvedValueOnce({ id: "scenario-1" });
      mockAssessmentCreate.mockResolvedValueOnce({ id: "new-assessment-123" });

      await expect(StartPage()).rejects.toThrow("REDIRECT:/assessment/new-assessment-123/consent");

      expect(mockScenarioFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublished: true },
          orderBy: { createdAt: "asc" },
        })
      );

      expect(mockAssessmentCreate).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          scenarioId: "scenario-1",
          status: AssessmentStatus.HR_INTERVIEW,
        },
      });

      expect(mockRedirect).toHaveBeenCalledWith("/assessment/new-assessment-123/consent");
    });

    it("redirects new assessment to consent page", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockAssessmentFindFirst.mockResolvedValueOnce(null);
      mockScenarioFindFirst.mockResolvedValueOnce({ id: "scenario-1" });
      mockAssessmentCreate.mockResolvedValueOnce({ id: "assessment-abc" });

      await expect(StartPage()).rejects.toThrow("REDIRECT:/assessment/assessment-abc/consent");
      expect(mockRedirect).toHaveBeenCalledWith("/assessment/assessment-abc/consent");
    });
  });

  describe("No published scenarios", () => {
    it("renders no scenarios message when no published scenarios exist", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });
      mockAssessmentFindFirst.mockResolvedValueOnce(null);
      mockScenarioFindFirst.mockResolvedValueOnce(null);

      const result = await StartPage();

      // Should render JSX element, not redirect
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
