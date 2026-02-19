/**
 * Tests for scaffold selection and needsRepo (US-007)
 */

import { describe, it, expect } from "vitest";
import { selectScaffold, SCAFFOLDS, needsRepo } from "../repo-spec";

describe("selectScaffold", () => {
  describe("happy path", () => {
    it("should select Next.js scaffold for React + TypeScript stack", () => {
      const result = selectScaffold(["react", "typescript", "nextjs"]);
      expect(result.id).toBe("nextjs-ts");
      expect(result.repoTemplate).toBe("skillvee/scaffold-nextjs-ts");
    });

    it("should select Express scaffold for Node.js backend stack", () => {
      const result = selectScaffold(["node", "express", "api"]);
      expect(result.id).toBe("express-ts");
    });

    it("should select Next.js scaffold for fullstack keywords", () => {
      const result = selectScaffold(["fullstack", "react"]);
      expect(result.id).toBe("nextjs-ts");
    });
  });

  describe("case insensitivity", () => {
    it("should match regardless of case", () => {
      const result = selectScaffold(["REACT", "TypeScript", "NextJS"]);
      expect(result.id).toBe("nextjs-ts");
    });

    it("should handle mixed case with spaces", () => {
      const result = selectScaffold(["Node.js", "EXPRESS", "api"]);
      expect(result.id).toBe("express-ts");
    });
  });

  describe("fallback behavior", () => {
    it("should return first scaffold for empty tech stack", () => {
      const result = selectScaffold([]);
      expect(result.id).toBe("nextjs-ts");
    });

    it("should return first scaffold for unknown tech stack", () => {
      const result = selectScaffold(["cobol", "fortran", "assembly"]);
      expect(result.id).toBe("nextjs-ts");
    });

    it("should return first scaffold when tech stack is undefined", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectScaffold(undefined as any);
      expect(result.id).toBe("nextjs-ts");
    });
  });

  describe("scaffold registry validation", () => {
    it("should have all required fields for each scaffold", () => {
      SCAFFOLDS.forEach((scaffold) => {
        expect(scaffold.id).toBeDefined();
        expect(scaffold.name).toBeDefined();
        expect(scaffold.repoTemplate).toBeDefined();
        expect(scaffold.matchesTechStack).toBeDefined();
        expect(scaffold.description).toBeDefined();
        expect(scaffold.devCommand).toBeDefined();
        expect(scaffold.installCommand).toBeDefined();
        expect(scaffold.testCommand).toBeDefined();
        expect(Array.isArray(scaffold.matchesTechStack)).toBe(true);
        expect(scaffold.matchesTechStack.length).toBeGreaterThan(0);
      });
    });

    it("should have unique scaffold IDs", () => {
      const ids = SCAFFOLDS.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it("should have valid GitHub repo format", () => {
      SCAFFOLDS.forEach((scaffold) => {
        expect(scaffold.repoTemplate).toMatch(/^[a-z0-9-]+\/[a-z0-9-]+$/i);
      });
    });
  });

  describe("real-world scenarios", () => {
    it("should handle typical frontend role tech stack", () => {
      const result = selectScaffold([
        "JavaScript",
        "React",
        "TypeScript",
        "HTML/CSS",
      ]);
      expect(result.id).toBe("nextjs-ts");
    });

    it("should handle typical backend role tech stack", () => {
      const result = selectScaffold([
        "Node.js",
        "Express",
        "PostgreSQL",
        "REST API",
      ]);
      expect(result.id).toBe("express-ts");
    });
  });
});

describe("needsRepo", () => {
  it("should return true for engineering tech stacks", () => {
    expect(needsRepo(["react", "typescript"])).toBe(true);
    expect(needsRepo(["node", "express"])).toBe(true);
    expect(needsRepo(["nextjs"])).toBe(true);
  });

  it("should return false for non-engineering tech stacks", () => {
    expect(needsRepo(["sales", "crm"])).toBe(false);
    expect(needsRepo(["product-management"])).toBe(false);
  });

  it("should return false for empty tech stack", () => {
    expect(needsRepo([])).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(needsRepo(undefined as any)).toBe(false);
  });
});
