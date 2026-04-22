import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/server/db";
import type { User, Archetype } from "@prisma/client";

describe("JD Language Detection Integration Tests", () => {
  let recruiter: User;
  let archetype: Archetype | null;

  beforeAll(async () => {
    // Create a test recruiter
    recruiter = await db.user.create({
      data: {
        email: `recruiter-jd-lang-${Date.now()}@test.com`,
        name: "Test Recruiter",
        role: "RECRUITER",
      },
    });

    // Get or create a test archetype
    archetype = await db.archetype.findFirst({
      where: { slug: "frontend_engineer" },
    });

    if (!archetype) {
      // First, ensure the family exists
      let family = await db.roleFamily.findFirst({
        where: { slug: "engineering" },
      });

      if (!family) {
        family = await db.roleFamily.create({
          data: {
            name: "Engineering",
            slug: "engineering",
            description: "Engineering roles",
          },
        });
      }

      archetype = await db.archetype.create({
        data: {
          name: "Frontend Engineer",
          slug: "frontend_engineer",
          roleFamilyId: family.id,
          description: "Frontend engineering role",
        },
      });
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await db.scenario.deleteMany({
      where: { createdById: recruiter.id },
    });
    await db.user.delete({
      where: { id: recruiter.id },
    });
  });

  it("creates scenario with detected Spanish language from Spanish JD", async () => {
    const spanishJD = `
      Desarrollador Frontend Senior

      Buscamos un Desarrollador Frontend Senior para unirse a nuestro equipo en Ciudad de México.

      Responsabilidades:
      - Desarrollar componentes reutilizables en React
      - Optimizar el rendimiento de aplicaciones web
      - Colaborar con el equipo de diseño UX/UI
      - Mentorear a desarrolladores junior

      Requisitos:
      - 5+ años de experiencia con React y TypeScript
      - Experiencia con GraphQL y Next.js
      - Conocimiento de pruebas unitarias con Jest
      - Español fluido y inglés conversacional

      Beneficios:
      - Salario competitivo
      - Trabajo remoto flexible
      - Seguro médico completo
    `;

    // Step 1: Parse the Spanish JD
    const parseResponse = await fetch("http://localhost:3000/api/recruiter/simulations/parse-jd", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Mock authentication
        "x-test-user-id": recruiter.id,
        "x-test-user-role": "RECRUITER",
      },
      body: JSON.stringify({
        jobDescription: spanishJD,
      }),
    });

    const parseResult = await parseResponse.json();
    expect(parseResult.data.language.value).toBe("es");
    expect(parseResult.data.language.confidence).toMatch(/high|medium/);

    // Step 2: Create scenario with detected language
    const scenarioResponse = await fetch("http://localhost:3000/api/recruiter/simulations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user-id": recruiter.id,
        "x-test-user-role": "RECRUITER",
      },
      body: JSON.stringify({
        name: "Desarrollador Frontend Senior",
        companyName: "TestCo México",
        companyDescription: "Empresa de tecnología",
        taskDescription: "Implementar una nueva funcionalidad",
        techStack: ["React", "TypeScript", "GraphQL"],
        targetLevel: "senior",
        archetypeId: archetype!.id,
        language: parseResult.data.language.value, // Use detected language
      }),
    });

    const scenarioResult = await scenarioResponse.json();
    const scenario = await db.scenario.findUnique({
      where: { id: scenarioResult.data.scenario.id },
    });

    expect(scenario?.language).toBe("es");
  });

  it("creates scenario with detected English language from English JD", async () => {
    const englishJD = `
      Senior Frontend Engineer

      We are looking for a Senior Frontend Engineer to join our team in San Francisco.

      Responsibilities:
      - Build reusable React components
      - Optimize web application performance
      - Collaborate with UX/UI design team
      - Mentor junior developers

      Requirements:
      - 5+ years of experience with React and TypeScript
      - Experience with GraphQL and Next.js
      - Knowledge of unit testing with Jest
      - Excellent communication skills

      Benefits:
      - Competitive salary
      - Flexible remote work
      - Comprehensive health insurance
    `;

    // Step 1: Parse the English JD
    const parseResponse = await fetch("http://localhost:3000/api/recruiter/simulations/parse-jd", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user-id": recruiter.id,
        "x-test-user-role": "RECRUITER",
      },
      body: JSON.stringify({
        jobDescription: englishJD,
      }),
    });

    const parseResult = await parseResponse.json();
    expect(parseResult.data.language.value).toBe("en");
    expect(parseResult.data.language.confidence).toMatch(/high|medium/);

    // Step 2: Create scenario with detected language
    const scenarioResponse = await fetch("http://localhost:3000/api/recruiter/simulations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user-id": recruiter.id,
        "x-test-user-role": "RECRUITER",
      },
      body: JSON.stringify({
        name: "Senior Frontend Engineer",
        companyName: "TestCo USA",
        companyDescription: "Technology company",
        taskDescription: "Implement a new feature",
        techStack: ["React", "TypeScript", "GraphQL"],
        targetLevel: "senior",
        archetypeId: archetype!.id,
        language: parseResult.data.language.value, // Use detected language
      }),
    });

    const scenarioResult = await scenarioResponse.json();
    const scenario = await db.scenario.findUnique({
      where: { id: scenarioResult.data.scenario.id },
    });

    expect(scenario?.language).toBe("en");
  });

  it("falls back to English for unsupported language JD", async () => {
    const germanJD = `
      Senior Frontend-Entwickler

      Wir suchen einen Senior Frontend-Entwickler für unser Team in Berlin.

      Aufgaben:
      - Entwicklung von React-Komponenten
      - Performance-Optimierung
      - Zusammenarbeit mit dem UX-Team

      Anforderungen:
      - 5+ Jahre Erfahrung mit React und TypeScript
      - Kenntnisse in GraphQL und Next.js
    `;

    // Step 1: Parse the German JD (unsupported language)
    const parseResponse = await fetch("http://localhost:3000/api/recruiter/simulations/parse-jd", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user-id": recruiter.id,
        "x-test-user-role": "RECRUITER",
      },
      body: JSON.stringify({
        jobDescription: germanJD,
      }),
    });

    const parseResult = await parseResponse.json();
    // Should fall back to English
    expect(parseResult.data.language.value).toBe("en");
    expect(parseResult.data.language.confidence).toBe("low");
  });
});