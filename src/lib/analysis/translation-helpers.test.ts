import { describe, it, expect, vi } from "vitest";
import { AssessmentDimension } from "@prisma/client";
import { getDimensionLabel, getLevelLabel } from "./translation-helpers";

// Mock next-intl/server
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockImplementation(({ locale, namespace }) => {
    const translations: Record<string, Record<string, Record<string, string>>> = {
      en: {
        "assessment.dimensions": {
          COMMUNICATION: "Communication",
          PROBLEM_SOLVING: "Problem Solving",
          TECHNICAL_KNOWLEDGE: "Technical Knowledge",
          COLLABORATION: "Collaboration",
          ADAPTABILITY: "Adaptability",
          LEADERSHIP: "Leadership",
          CREATIVITY: "Creativity",
          TIME_MANAGEMENT: "Time Management",
        },
        "assessment.levels": {
          exceptional: "Exceptional",
          strong: "Strong",
          adequate: "Adequate",
          developing: "Developing",
          needs_improvement: "Needs Improvement",
        },
      },
      es: {
        "assessment.dimensions": {
          COMMUNICATION: "Comunicación",
          PROBLEM_SOLVING: "Resolución de Problemas",
          TECHNICAL_KNOWLEDGE: "Conocimiento Técnico",
          COLLABORATION: "Colaboración",
          ADAPTABILITY: "Adaptabilidad",
          LEADERSHIP: "Liderazgo",
          CREATIVITY: "Creatividad",
          TIME_MANAGEMENT: "Gestión del Tiempo",
        },
        "assessment.levels": {
          exceptional: "Excepcional",
          strong: "Fuerte",
          adequate: "Adecuado",
          developing: "En Desarrollo",
          needs_improvement: "Necesita Mejorar",
        },
      },
    };

    return vi.fn().mockImplementation((key: string) => {
      const keys = namespace.split(".");
      const category = keys[keys.length - 1];
      return translations[locale]?.[namespace]?.[key] || key;
    });
  }),
}));

describe("Translation Helpers", () => {
  describe("getDimensionLabel", () => {
    it("returns English label for COMMUNICATION", async () => {
      const label = await getDimensionLabel(AssessmentDimension.COMMUNICATION, "en");
      expect(label).toBe("Communication");
    });

    it("returns Spanish label for COMMUNICATION", async () => {
      const label = await getDimensionLabel(AssessmentDimension.COMMUNICATION, "es");
      expect(label).toBe("Comunicación");
    });

    it("returns English label for PROBLEM_SOLVING", async () => {
      const label = await getDimensionLabel(AssessmentDimension.PROBLEM_SOLVING, "en");
      expect(label).toBe("Problem Solving");
    });

    it("returns Spanish label for PROBLEM_SOLVING", async () => {
      const label = await getDimensionLabel(AssessmentDimension.PROBLEM_SOLVING, "es");
      expect(label).toBe("Resolución de Problemas");
    });

    it("returns English label for TECHNICAL_KNOWLEDGE", async () => {
      const label = await getDimensionLabel(AssessmentDimension.TECHNICAL_KNOWLEDGE, "en");
      expect(label).toBe("Technical Knowledge");
    });

    it("returns Spanish label for TECHNICAL_KNOWLEDGE", async () => {
      const label = await getDimensionLabel(AssessmentDimension.TECHNICAL_KNOWLEDGE, "es");
      expect(label).toBe("Conocimiento Técnico");
    });

    it("returns English label for all dimensions", async () => {
      const dimensions = [
        { key: AssessmentDimension.COMMUNICATION, expected: "Communication" },
        { key: AssessmentDimension.PROBLEM_SOLVING, expected: "Problem Solving" },
        { key: AssessmentDimension.TECHNICAL_KNOWLEDGE, expected: "Technical Knowledge" },
        { key: AssessmentDimension.COLLABORATION, expected: "Collaboration" },
        { key: AssessmentDimension.ADAPTABILITY, expected: "Adaptability" },
        { key: AssessmentDimension.LEADERSHIP, expected: "Leadership" },
        { key: AssessmentDimension.CREATIVITY, expected: "Creativity" },
        { key: AssessmentDimension.TIME_MANAGEMENT, expected: "Time Management" },
      ];

      for (const { key, expected } of dimensions) {
        const label = await getDimensionLabel(key, "en");
        expect(label).toBe(expected);
      }
    });

    it("returns Spanish label for all dimensions", async () => {
      const dimensions = [
        { key: AssessmentDimension.COMMUNICATION, expected: "Comunicación" },
        { key: AssessmentDimension.PROBLEM_SOLVING, expected: "Resolución de Problemas" },
        { key: AssessmentDimension.TECHNICAL_KNOWLEDGE, expected: "Conocimiento Técnico" },
        { key: AssessmentDimension.COLLABORATION, expected: "Colaboración" },
        { key: AssessmentDimension.ADAPTABILITY, expected: "Adaptabilidad" },
        { key: AssessmentDimension.LEADERSHIP, expected: "Liderazgo" },
        { key: AssessmentDimension.CREATIVITY, expected: "Creatividad" },
        { key: AssessmentDimension.TIME_MANAGEMENT, expected: "Gestión del Tiempo" },
      ];

      for (const { key, expected } of dimensions) {
        const label = await getDimensionLabel(key, "es");
        expect(label).toBe(expected);
      }
    });
  });

  describe("getLevelLabel", () => {
    it("returns English label for exceptional", async () => {
      const label = await getLevelLabel("exceptional", "en");
      expect(label).toBe("Exceptional");
    });

    it("returns Spanish label for exceptional", async () => {
      const label = await getLevelLabel("exceptional", "es");
      expect(label).toBe("Excepcional");
    });

    it("returns English label for all levels", async () => {
      const levels = [
        { key: "exceptional", expected: "Exceptional" },
        { key: "strong", expected: "Strong" },
        { key: "adequate", expected: "Adequate" },
        { key: "developing", expected: "Developing" },
        { key: "needs_improvement", expected: "Needs Improvement" },
      ];

      for (const { key, expected } of levels) {
        const label = await getLevelLabel(key as any, "en");
        expect(label).toBe(expected);
      }
    });

    it("returns Spanish label for all levels", async () => {
      const levels = [
        { key: "exceptional", expected: "Excepcional" },
        { key: "strong", expected: "Fuerte" },
        { key: "adequate", expected: "Adecuado" },
        { key: "developing", expected: "En Desarrollo" },
        { key: "needs_improvement", expected: "Necesita Mejorar" },
      ];

      for (const { key, expected } of levels) {
        const label = await getLevelLabel(key as any, "es");
        expect(label).toBe(expected);
      }
    });
  });
});