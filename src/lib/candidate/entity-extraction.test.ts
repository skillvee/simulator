/**
 * Tests for Real-Time Entity Extraction Service
 *
 * @see Issue #68: US-008
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RoleArchetype } from "@/lib/candidate";
import type { SeniorityLevel } from "@/lib/candidate";

// Mock Gemini before importing the module (now in @/lib/ai)
vi.mock("@/lib/ai", () => ({
  gemini: {
    models: {
      generateContent: vi.fn(),
    },
  },
  TEXT_MODEL: "gemini-3-flash-preview",
}));

// Import after mocking
import { gemini } from "@/lib/ai";
import {
  extractEntities,
  mapJobTitleToArchetype,
  inferSeniorityFromYears,
  cleanJsonResponse,
  isWithinTargetTime,
  getSupportedJobTitleKeywords,
  getSeniorityThresholds,
  type ExtractedIntent,
} from "./entity-extraction";

// Cast the mock for type safety
const mockGenerateContent = gemini.models.generateContent as ReturnType<
  typeof vi.fn
>;

describe("entity-extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // mapJobTitleToArchetype Tests
  // ============================================================================

  describe("mapJobTitleToArchetype", () => {
    it("returns null for null input", () => {
      expect(mapJobTitleToArchetype(null)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(mapJobTitleToArchetype("")).toBeNull();
    });

    it("returns null for unrecognized job title", () => {
      expect(mapJobTitleToArchetype("Wizard of Oz")).toBeNull();
      expect(mapJobTitleToArchetype("Marketing Manager")).toBeNull();
    });

    describe("Frontend Engineer mapping", () => {
      const testCases = [
        "Frontend Engineer",
        "frontend developer",
        "Front-end Engineer",
        "front end developer",
        "UI Engineer",
        "UI Developer",
        "Senior Frontend Engineer",
      ];

      it.each(testCases)("maps '%s' to SENIOR_FRONTEND_ENGINEER", (title) => {
        expect(mapJobTitleToArchetype(title)).toBe("SENIOR_FRONTEND_ENGINEER");
      });
    });

    describe("Backend Engineer mapping", () => {
      const testCases = [
        "Backend Engineer",
        "backend developer",
        "Back-end Engineer",
        "back end developer",
        "Server Engineer",
        "API Engineer",
        "Senior API Engineer",
      ];

      it.each(testCases)("maps '%s' to SENIOR_BACKEND_ENGINEER", (title) => {
        expect(mapJobTitleToArchetype(title)).toBe("SENIOR_BACKEND_ENGINEER");
      });
    });

    describe("Fullstack Engineer mapping", () => {
      const testCases = [
        "Fullstack Engineer",
        "Full-Stack Developer",
        "Full Stack Engineer",
      ];

      it.each(testCases)("maps '%s' to FULLSTACK_ENGINEER", (title) => {
        expect(mapJobTitleToArchetype(title)).toBe("FULLSTACK_ENGINEER");
      });
    });

    describe("Engineering Manager mapping", () => {
      const testCases = [
        "Engineering Manager",
        "Eng Manager",
        "Manager of Engineering",
      ];

      it.each(testCases)("maps '%s' to ENGINEERING_MANAGER", (title) => {
        expect(mapJobTitleToArchetype(title)).toBe("ENGINEERING_MANAGER");
      });
    });

    describe("Tech Lead mapping", () => {
      const testCases = [
        "Tech Lead",
        "Technical Lead",
        "Lead Engineer",
        "Staff Engineer",
        "Principal Engineer",
        "Software Architect",
      ];

      it.each(testCases)("maps '%s' to TECH_LEAD", (title) => {
        expect(mapJobTitleToArchetype(title)).toBe("TECH_LEAD");
      });
    });

    describe("DevOps/SRE mapping", () => {
      const testCases = [
        "DevOps Engineer",
        "SRE",
        "Site Reliability Engineer",
        "Infrastructure Engineer",
        "Platform Engineer",
        "Senior DevOps Engineer",
      ];

      it.each(testCases)("maps '%s' to DEVOPS_ENGINEER", (title) => {
        expect(mapJobTitleToArchetype(title)).toBe("DEVOPS_ENGINEER");
      });
    });

    describe("Data Engineer mapping", () => {
      const testCases = [
        "Data Engineer",
        "Data Platform Engineer",
        "Analytics Engineer",
        "ETL Developer",
      ];

      it.each(testCases)("maps '%s' to DATA_ENGINEER", (title) => {
        expect(mapJobTitleToArchetype(title)).toBe("DATA_ENGINEER");
      });
    });

    describe("AI/ML and General Software Engineer mapping", () => {
      it("maps ML Engineer to GENERAL_SOFTWARE_ENGINEER", () => {
        expect(mapJobTitleToArchetype("ML Engineer")).toBe(
          "GENERAL_SOFTWARE_ENGINEER"
        );
      });

      it("maps Machine Learning Engineer to GENERAL_SOFTWARE_ENGINEER", () => {
        expect(mapJobTitleToArchetype("Machine Learning Engineer")).toBe(
          "GENERAL_SOFTWARE_ENGINEER"
        );
      });

      it("maps AI Engineer to GENERAL_SOFTWARE_ENGINEER", () => {
        expect(mapJobTitleToArchetype("AI Engineer")).toBe(
          "GENERAL_SOFTWARE_ENGINEER"
        );
      });

      it("maps Software Engineer to GENERAL_SOFTWARE_ENGINEER", () => {
        expect(mapJobTitleToArchetype("Software Engineer")).toBe(
          "GENERAL_SOFTWARE_ENGINEER"
        );
      });

      it("maps Software Developer to GENERAL_SOFTWARE_ENGINEER", () => {
        expect(mapJobTitleToArchetype("Software Developer")).toBe(
          "GENERAL_SOFTWARE_ENGINEER"
        );
      });

      it("maps SWE to GENERAL_SOFTWARE_ENGINEER", () => {
        expect(mapJobTitleToArchetype("SWE")).toBe("GENERAL_SOFTWARE_ENGINEER");
      });
    });

    it("is case-insensitive", () => {
      expect(mapJobTitleToArchetype("FRONTEND ENGINEER")).toBe(
        "SENIOR_FRONTEND_ENGINEER"
      );
      expect(mapJobTitleToArchetype("Backend developer")).toBe(
        "SENIOR_BACKEND_ENGINEER"
      );
    });

    it("handles extra whitespace", () => {
      expect(mapJobTitleToArchetype("  Frontend Engineer  ")).toBe(
        "SENIOR_FRONTEND_ENGINEER"
      );
    });
  });

  // ============================================================================
  // inferSeniorityFromYears Tests
  // ============================================================================

  describe("inferSeniorityFromYears", () => {
    it("returns null for null input", () => {
      expect(inferSeniorityFromYears(null)).toBeNull();
    });

    it("returns null for negative years", () => {
      expect(inferSeniorityFromYears(-1)).toBeNull();
      expect(inferSeniorityFromYears(-5)).toBeNull();
    });

    describe("JUNIOR level (0-2 years)", () => {
      it.each([0, 1, 2])("maps %d years to JUNIOR", (years) => {
        expect(inferSeniorityFromYears(years)).toBe("JUNIOR");
      });
    });

    describe("MID level (3-5 years)", () => {
      it.each([3, 4, 5])("maps %d years to MID", (years) => {
        expect(inferSeniorityFromYears(years)).toBe("MID");
      });
    });

    describe("SENIOR level (6+ years)", () => {
      it.each([6, 7, 10, 15, 20])("maps %d years to SENIOR", (years) => {
        expect(inferSeniorityFromYears(years)).toBe("SENIOR");
      });
    });

    it("handles decimal years", () => {
      expect(inferSeniorityFromYears(2.5)).toBe("MID"); // 2.5 > 2
      expect(inferSeniorityFromYears(5.5)).toBe("SENIOR"); // 5.5 > 5
    });
  });

  // ============================================================================
  // cleanJsonResponse Tests
  // ============================================================================

  describe("cleanJsonResponse", () => {
    it("returns clean JSON as-is", () => {
      const json = '{"job_title":"Engineer"}';
      expect(cleanJsonResponse(json)).toBe(json);
    });

    it("removes ```json prefix", () => {
      const response = '```json\n{"job_title":"Engineer"}';
      expect(cleanJsonResponse(response)).toBe('{"job_title":"Engineer"}');
    });

    it("removes ``` prefix", () => {
      const response = '```\n{"job_title":"Engineer"}';
      expect(cleanJsonResponse(response)).toBe('{"job_title":"Engineer"}');
    });

    it("removes ``` suffix", () => {
      const response = '{"job_title":"Engineer"}\n```';
      expect(cleanJsonResponse(response)).toBe('{"job_title":"Engineer"}');
    });

    it("removes both prefix and suffix", () => {
      const response = '```json\n{"job_title":"Engineer"}\n```';
      expect(cleanJsonResponse(response)).toBe('{"job_title":"Engineer"}');
    });

    it("trims whitespace", () => {
      const response = '  {"job_title":"Engineer"}  ';
      expect(cleanJsonResponse(response)).toBe('{"job_title":"Engineer"}');
    });
  });

  // ============================================================================
  // isWithinTargetTime Tests
  // ============================================================================

  describe("isWithinTargetTime", () => {
    it("returns true for 0ms", () => {
      expect(isWithinTargetTime(0)).toBe(true);
    });

    it("returns true for 500ms", () => {
      expect(isWithinTargetTime(500)).toBe(true);
    });

    it("returns false for 501ms", () => {
      expect(isWithinTargetTime(501)).toBe(false);
    });

    it("returns true for times under 500ms", () => {
      expect(isWithinTargetTime(100)).toBe(true);
      expect(isWithinTargetTime(250)).toBe(true);
      expect(isWithinTargetTime(499)).toBe(true);
    });

    it("returns false for times over 500ms", () => {
      expect(isWithinTargetTime(600)).toBe(false);
      expect(isWithinTargetTime(1000)).toBe(false);
    });
  });

  // ============================================================================
  // getSupportedJobTitleKeywords Tests
  // ============================================================================

  describe("getSupportedJobTitleKeywords", () => {
    it("returns an array of keywords", () => {
      const keywords = getSupportedJobTitleKeywords();
      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(0);
    });

    it("includes common job title keywords", () => {
      const keywords = getSupportedJobTitleKeywords();
      expect(keywords).toContain("frontend");
      expect(keywords).toContain("backend");
      expect(keywords).toContain("fullstack");
      expect(keywords).toContain("devops");
      expect(keywords).toContain("software engineer");
    });
  });

  // ============================================================================
  // getSeniorityThresholds Tests
  // ============================================================================

  describe("getSeniorityThresholds", () => {
    it("returns correct thresholds", () => {
      const thresholds = getSeniorityThresholds();
      expect(thresholds.juniorMax).toBe(2);
      expect(thresholds.midMax).toBe(5);
    });
  });

  // ============================================================================
  // extractEntities Tests
  // ============================================================================

  describe("extractEntities", () => {
    const createMockResponse = (intent: Partial<ExtractedIntent>) => ({
      text: JSON.stringify({
        job_title: null,
        location: null,
        years_experience: null,
        skills: [],
        industry: [],
        company_type: [],
        ...intent,
      }),
    });

    it("returns empty intent for empty query", async () => {
      const result = await extractEntities("");
      expect(result.success).toBe(true);
      expect(result.intent.job_title).toBeNull();
      expect(result.intent.skills).toEqual([]);
      expect(result.archetype).toBeNull();
      expect(result.seniority).toBeNull();
    });

    it("returns empty intent for whitespace-only query", async () => {
      const result = await extractEntities("   ");
      expect(result.success).toBe(true);
      expect(result.intent.job_title).toBeNull();
    });

    it("extracts job title and maps to archetype", async () => {
      mockGenerateContent.mockResolvedValueOnce(
        createMockResponse({ job_title: "Frontend Engineer" })
      );

      const result = await extractEntities("frontend engineer in SF");
      expect(result.success).toBe(true);
      expect(result.intent.job_title).toBe("Frontend Engineer");
      expect(result.archetype).toBe("SENIOR_FRONTEND_ENGINEER");
    });

    it("extracts location", async () => {
      mockGenerateContent.mockResolvedValueOnce(
        createMockResponse({ location: "San Francisco" })
      );

      const result = await extractEntities("engineer in SF");
      expect(result.success).toBe(true);
      expect(result.intent.location).toBe("San Francisco");
    });

    it("extracts years of experience and infers seniority", async () => {
      mockGenerateContent.mockResolvedValueOnce(
        createMockResponse({ years_experience: 5 })
      );

      const result = await extractEntities("5 years experience");
      expect(result.success).toBe(true);
      expect(result.intent.years_experience).toBe(5);
      expect(result.seniority).toBe("MID");
    });

    it("extracts skills as array", async () => {
      mockGenerateContent.mockResolvedValueOnce(
        createMockResponse({ skills: ["Python", "React", "Node.js"] })
      );

      const result = await extractEntities("python react nodejs developer");
      expect(result.success).toBe(true);
      expect(result.intent.skills).toEqual(["Python", "React", "Node.js"]);
    });

    it("extracts industry", async () => {
      mockGenerateContent.mockResolvedValueOnce(
        createMockResponse({ industry: ["fintech", "healthcare"] })
      );

      const result = await extractEntities("fintech or healthcare experience");
      expect(result.success).toBe(true);
      expect(result.intent.industry).toEqual(["fintech", "healthcare"]);
    });

    it("extracts company type", async () => {
      mockGenerateContent.mockResolvedValueOnce(
        createMockResponse({ company_type: ["startup", "VC backed"] })
      );

      const result = await extractEntities("startup experience, VC backed");
      expect(result.success).toBe(true);
      expect(result.intent.company_type).toEqual(["startup", "VC backed"]);
    });

    it("handles complex query with all entities", async () => {
      mockGenerateContent.mockResolvedValueOnce(
        createMockResponse({
          job_title: "Senior Backend Engineer",
          location: "remote",
          years_experience: 7,
          skills: ["Python", "Go", "Kubernetes"],
          industry: ["fintech"],
          company_type: ["startup"],
        })
      );

      const result = await extractEntities(
        "senior backend engineer remote 7+ years python go kubernetes fintech startup"
      );

      expect(result.success).toBe(true);
      expect(result.intent.job_title).toBe("Senior Backend Engineer");
      expect(result.intent.location).toBe("remote");
      expect(result.intent.years_experience).toBe(7);
      expect(result.intent.skills).toEqual(["Python", "Go", "Kubernetes"]);
      expect(result.intent.industry).toEqual(["fintech"]);
      expect(result.intent.company_type).toEqual(["startup"]);
      expect(result.archetype).toBe("SENIOR_BACKEND_ENGINEER");
      expect(result.seniority).toBe("SENIOR");
    });

    it("handles JSON wrapped in markdown code blocks", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: '```json\n{"job_title":"Engineer","location":null,"years_experience":null,"skills":[],"industry":[],"company_type":[]}\n```',
      });

      const result = await extractEntities("engineer");
      expect(result.success).toBe(true);
      expect(result.intent.job_title).toBe("Engineer");
    });

    it("returns error result when Gemini returns empty response", async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: null });

      const result = await extractEntities("test query");
      expect(result.success).toBe(false);
      expect(result.error).toBe("No response from Gemini");
    });

    it("returns error result when Gemini returns invalid JSON", async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: "not valid json" });

      const result = await extractEntities("test query");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("returns error result when Gemini throws an error", async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error("API error"));

      const result = await extractEntities("test query");
      expect(result.success).toBe(false);
      expect(result.error).toBe("API error");
    });

    it("includes processing time in result", async () => {
      mockGenerateContent.mockResolvedValueOnce(createMockResponse({}));

      const result = await extractEntities("test query");
      expect(typeof result.processingTimeMs).toBe("number");
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("calls Gemini with correct model and prompt", async () => {
      mockGenerateContent.mockResolvedValueOnce(createMockResponse({}));

      await extractEntities("frontend developer");

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const call = mockGenerateContent.mock.calls[0][0];
      expect(call.model).toBe("gemini-3-flash-preview");
      expect(call.contents[0].parts[0].text).toContain("frontend developer");
      expect(call.config.temperature).toBe(0);
    });

    it("handles default values for missing arrays", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          job_title: "Engineer",
          location: null,
          years_experience: null,
          // skills, industry, company_type are missing
        }),
      });

      const result = await extractEntities("engineer");
      expect(result.success).toBe(true);
      expect(result.intent.skills).toEqual([]);
      expect(result.intent.industry).toEqual([]);
      expect(result.intent.company_type).toEqual([]);
    });
  });

  // ============================================================================
  // Acceptance Criteria Tests
  // ============================================================================

  describe("Acceptance Criteria", () => {
    describe("Entity Extraction from unstructured text", () => {
      it("extracts Job Titles", async () => {
        mockGenerateContent.mockResolvedValueOnce({
          text: JSON.stringify({
            job_title: "ML Engineer",
            location: null,
            years_experience: null,
            skills: [],
            industry: [],
            company_type: [],
          }),
        });

        const result = await extractEntities("ML Engineer position");
        expect(result.intent.job_title).toBe("ML Engineer");
      });

      it("extracts Location variations", async () => {
        const locations = ["SF", "San Francisco", "NYC", "remote"];

        for (const loc of locations) {
          mockGenerateContent.mockResolvedValueOnce({
            text: JSON.stringify({
              job_title: null,
              location: loc,
              years_experience: null,
              skills: [],
              industry: [],
              company_type: [],
            }),
          });

          const result = await extractEntities(`developer in ${loc}`);
          expect(result.intent.location).toBe(loc);
        }
      });

      it("extracts Years of Experience", async () => {
        mockGenerateContent.mockResolvedValueOnce({
          text: JSON.stringify({
            job_title: null,
            location: null,
            years_experience: 5,
            skills: [],
            industry: [],
            company_type: [],
          }),
        });

        const result = await extractEntities("5+ years experience");
        expect(result.intent.years_experience).toBe(5);
      });

      it("extracts Skills/Keywords", async () => {
        mockGenerateContent.mockResolvedValueOnce({
          text: JSON.stringify({
            job_title: null,
            location: null,
            years_experience: null,
            skills: ["Python", "LLMs", "React", "Node"],
            industry: [],
            company_type: [],
          }),
        });

        const result = await extractEntities(
          "python llms react node developer"
        );
        expect(result.intent.skills).toContain("Python");
        expect(result.intent.skills).toContain("LLMs");
        expect(result.intent.skills).toContain("React");
      });

      it("extracts Company Types/Attributes", async () => {
        mockGenerateContent.mockResolvedValueOnce({
          text: JSON.stringify({
            job_title: null,
            location: null,
            years_experience: null,
            skills: [],
            industry: [],
            company_type: ["startup", "VC backed", "enterprise"],
          }),
        });

        const result = await extractEntities(
          "startup or enterprise, VC backed"
        );
        expect(result.intent.company_type).toContain("startup");
        expect(result.intent.company_type).toContain("VC backed");
      });

      it("extracts Industry", async () => {
        mockGenerateContent.mockResolvedValueOnce({
          text: JSON.stringify({
            job_title: null,
            location: null,
            years_experience: null,
            skills: [],
            industry: ["retail", "fintech", "healthcare"],
            company_type: [],
          }),
        });

        const result = await extractEntities("retail fintech healthcare");
        expect(result.intent.industry).toContain("retail");
        expect(result.intent.industry).toContain("fintech");
        expect(result.intent.industry).toContain("healthcare");
      });
    });

    describe("Archetype mapping from job title", () => {
      const mappings: Array<{ title: string; archetype: RoleArchetype }> = [
        { title: "Frontend Engineer", archetype: "SENIOR_FRONTEND_ENGINEER" },
        { title: "Backend Developer", archetype: "SENIOR_BACKEND_ENGINEER" },
        { title: "Full Stack Engineer", archetype: "FULLSTACK_ENGINEER" },
        { title: "ML Engineer", archetype: "GENERAL_SOFTWARE_ENGINEER" },
        { title: "DevOps Engineer", archetype: "DEVOPS_ENGINEER" },
        { title: "Tech Lead", archetype: "TECH_LEAD" },
      ];

      it.each(mappings)(
        "maps $title to $archetype",
        async ({ title, archetype }) => {
          mockGenerateContent.mockResolvedValueOnce({
            text: JSON.stringify({
              job_title: title,
              location: null,
              years_experience: null,
              skills: [],
              industry: [],
              company_type: [],
            }),
          });

          const result = await extractEntities(title);
          expect(result.archetype).toBe(archetype);
        }
      );
    });

    describe("Seniority inference from years of experience", () => {
      const mappings: Array<{ years: number; seniority: SeniorityLevel }> = [
        { years: 1, seniority: "JUNIOR" },
        { years: 2, seniority: "JUNIOR" },
        { years: 3, seniority: "MID" },
        { years: 5, seniority: "MID" },
        { years: 6, seniority: "SENIOR" },
        { years: 10, seniority: "SENIOR" },
      ];

      it.each(mappings)(
        "maps $years years to $seniority",
        async ({ years, seniority }) => {
          mockGenerateContent.mockResolvedValueOnce({
            text: JSON.stringify({
              job_title: null,
              location: null,
              years_experience: years,
              skills: [],
              industry: [],
              company_type: [],
            }),
          });

          const result = await extractEntities(`${years} years experience`);
          expect(result.seniority).toBe(seniority);
        }
      );
    });

    describe("Structured filter object output", () => {
      it("returns structured intent with all fields", async () => {
        mockGenerateContent.mockResolvedValueOnce({
          text: JSON.stringify({
            job_title: "Software Engineer",
            location: "NYC",
            years_experience: 4,
            skills: ["TypeScript"],
            industry: ["fintech"],
            company_type: ["startup"],
          }),
        });

        const result = await extractEntities(
          "software engineer nyc 4 years typescript fintech startup"
        );

        expect(result.intent).toEqual({
          job_title: "Software Engineer",
          location: "NYC",
          years_experience: 4,
          skills: ["TypeScript"],
          industry: ["fintech"],
          company_type: ["startup"],
        });
      });
    });
  });
});
