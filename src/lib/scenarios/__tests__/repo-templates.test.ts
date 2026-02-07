/**
 * Tests for repo template selection (US-007)
 */

import { describe, it, expect } from "vitest";
import { selectTemplate, REPO_TEMPLATES } from "../repo-templates";

describe("selectTemplate", () => {
  describe("happy path", () => {
    it("should select Next.js template for React + TypeScript stack", () => {
      const result = selectTemplate(["react", "typescript", "nextjs"]);
      expect(result.id).toBe("nextjs-typescript");
      expect(result.name).toBe("Next.js + TypeScript Starter");
    });

    it("should select Express template for Node.js + Express stack", () => {
      const result = selectTemplate(["node", "express", "typescript"]);
      expect(result.id).toBe("express-typescript");
      expect(result.name).toBe("Express + TypeScript Starter");
    });

    it("should select Python FastAPI template for Python stack", () => {
      const result = selectTemplate(["python", "fastapi"]);
      expect(result.id).toBe("python-fastapi");
      expect(result.name).toBe("Python + FastAPI Starter");
    });

    it("should select fullstack monorepo for fullstack keywords", () => {
      const result = selectTemplate(["fullstack", "monorepo"]);
      expect(result.id).toBe("fullstack-monorepo");
      expect(result.name).toBe("Full Stack Monorepo");
    });
  });

  describe("case insensitivity", () => {
    it("should match regardless of case", () => {
      const result = selectTemplate(["REACT", "TypeScript", "NextJS"]);
      expect(result.id).toBe("nextjs-typescript");
    });

    it("should handle mixed case with spaces", () => {
      const result = selectTemplate(["Node.js", "EXPRESS", "typescript"]);
      expect(result.id).toBe("express-typescript");
    });
  });

  describe("partial matches", () => {
    it("should match partial tech stack keywords", () => {
      const result = selectTemplate(["react"]);
      // Should match either nextjs-typescript or fullstack-monorepo (both have react)
      expect(["nextjs-typescript", "fullstack-monorepo"]).toContain(result.id);
    });

    it("should select best match when multiple templates match", () => {
      const result = selectTemplate(["react", "node"]);
      // Both express-typescript and fullstack-monorepo could match
      // Express has more specific keywords for Node.js backend
      expect(["express-typescript", "fullstack-monorepo"]).toContain(result.id);
    });

    it("should match Express template for generic backend keywords", () => {
      const result = selectTemplate(["backend", "api", "node"]);
      expect(result.id).toBe("express-typescript");
    });
  });

  describe("fallback behavior", () => {
    it("should return fullstack monorepo for empty tech stack", () => {
      const result = selectTemplate([]);
      expect(result.id).toBe("fullstack-monorepo");
      expect(result.name).toBe("Full Stack Monorepo");
    });

    it("should return fullstack monorepo for unknown tech stack", () => {
      const result = selectTemplate(["cobol", "fortran", "assembly"]);
      expect(result.id).toBe("fullstack-monorepo");
      expect(result.name).toBe("Full Stack Monorepo");
    });

    it("should return fullstack monorepo when tech stack is undefined", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectTemplate(undefined as any);
      expect(result.id).toBe("fullstack-monorepo");
    });
  });

  describe("template registry validation", () => {
    it("should have all required fields for each template", () => {
      REPO_TEMPLATES.forEach((template) => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.repoTemplate).toBeDefined();
        expect(template.matchesTechStack).toBeDefined();
        expect(template.description).toBeDefined();
        expect(Array.isArray(template.matchesTechStack)).toBe(true);
        expect(template.matchesTechStack.length).toBeGreaterThan(0);
      });
    });

    it("should have unique template IDs", () => {
      const ids = REPO_TEMPLATES.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it("should have valid GitHub repo format", () => {
      REPO_TEMPLATES.forEach((template) => {
        expect(template.repoTemplate).toMatch(/^[a-z0-9-]+\/[a-z0-9-]+$/i);
      });
    });

    it("should have fullstack-monorepo as fallback", () => {
      const fallback = REPO_TEMPLATES.find(
        (t) => t.id === "fullstack-monorepo"
      );
      expect(fallback).toBeDefined();
    });
  });

  describe("scoring algorithm", () => {
    it("should prefer template with more matching keywords", () => {
      // Next.js template has many React-related keywords
      const result = selectTemplate([
        "react",
        "typescript",
        "nextjs",
        "frontend",
      ]);
      expect(result.id).toBe("nextjs-typescript");
    });

    it("should handle ties by returning first match", () => {
      // Both templates might match "typescript" equally
      const result = selectTemplate(["typescript"]);
      // Should return one of the TypeScript templates consistently
      expect(result.matchesTechStack).toContain("typescript");
    });
  });

  describe("real-world scenarios", () => {
    it("should handle typical frontend role tech stack", () => {
      const result = selectTemplate([
        "JavaScript",
        "React",
        "TypeScript",
        "HTML/CSS",
      ]);
      expect(result.id).toBe("nextjs-typescript");
    });

    it("should handle typical backend role tech stack", () => {
      const result = selectTemplate([
        "Node.js",
        "Express",
        "PostgreSQL",
        "REST API",
      ]);
      expect(result.id).toBe("express-typescript");
    });

    it("should handle Python backend role tech stack", () => {
      const result = selectTemplate(["Python", "FastAPI", "PostgreSQL"]);
      expect(result.id).toBe("python-fastapi");
    });

    it("should handle full stack role tech stack", () => {
      const result = selectTemplate([
        "React",
        "Node.js",
        "TypeScript",
        "PostgreSQL",
      ]);
      // Could match nextjs, express, or fullstack - all are valid fullstack options
      expect(["nextjs-typescript", "express-typescript", "fullstack-monorepo"]).toContain(result.id);
    });
  });
});
