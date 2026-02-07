import { describe, it, expect } from "vitest";
import {
  getCompletionStatus,
  formatScenarioForPrompt,
  parseExtractionFromResponse,
  cleanResponseForDisplay,
  applyExtraction,
  formatCurrentStateForPrompt,
  type ScenarioBuilderData,
} from "./scenario-builder";

describe("getCompletionStatus", () => {
  it("returns all fields as missing for empty data", () => {
    const data: ScenarioBuilderData = {};
    const status = getCompletionStatus(data);

    expect(status.missing).toContain("name");
    expect(status.missing).toContain("companyName");
    expect(status.missing).toContain("companyDescription");
    expect(status.missing).toContain("taskDescription");
    expect(status.missing).toContain("repoUrl");
    expect(status.missing).toContain("coworkers");
    expect(status.complete).toEqual([]);
    expect(status.isReadyToSave).toBe(false);
  });

  it("marks fields as complete when filled", () => {
    const data: ScenarioBuilderData = {
      name: "Test Scenario",
      companyName: "Test Company",
      companyDescription: "A test company",
      taskDescription: "Build something",
    };
    const status = getCompletionStatus(data);

    expect(status.complete).toContain("name");
    expect(status.complete).toContain("companyName");
    expect(status.complete).toContain("companyDescription");
    expect(status.complete).toContain("taskDescription");
    expect(status.missing).toContain("coworkers");
    expect(status.isReadyToSave).toBe(false);
  });

  it("requires at least one coworker with complete data", () => {
    const data: ScenarioBuilderData = {
      name: "Test Scenario",
      companyName: "Test Company",
      companyDescription: "A test company",
      taskDescription: "Build something",
      coworkers: [
        {
          name: "Alex",
          role: "Manager",
          personaStyle: "Professional",
          knowledge: [
            {
              topic: "auth",
              triggerKeywords: ["login"],
              response: "We use JWT",
              isCritical: true,
            },
          ],
        },
      ],
    };
    const status = getCompletionStatus(data);

    expect(status.complete).toContain("coworkers");
    expect(status.missing).toEqual([]);
    expect(status.isReadyToSave).toBe(true);
  });

  it("does not count coworkers without knowledge items", () => {
    const data: ScenarioBuilderData = {
      name: "Test Scenario",
      companyName: "Test Company",
      companyDescription: "A test company",
      taskDescription: "Build something",
      coworkers: [
        {
          name: "Alex",
          role: "Manager",
          personaStyle: "Professional",
          knowledge: [], // Empty knowledge
        },
      ],
    };
    const status = getCompletionStatus(data);

    expect(status.missing).toContain("coworkers");
    expect(status.isReadyToSave).toBe(false);
  });

  it("ignores whitespace-only values", () => {
    const data: ScenarioBuilderData = {
      name: "   ",
      companyName: "Test Company",
    };
    const status = getCompletionStatus(data);

    expect(status.missing).toContain("name");
    expect(status.complete).toContain("companyName");
  });
});

describe("formatScenarioForPrompt", () => {
  it("returns 'No information collected' for empty data", () => {
    const data: ScenarioBuilderData = {};
    const result = formatScenarioForPrompt(data);

    expect(result).toBe("No information collected yet.");
  });

  it("formats all fields correctly", () => {
    const data: ScenarioBuilderData = {
      name: "Test Scenario",
      companyName: "Test Company",
      companyDescription: "A test company description",
      taskDescription: "Build a feature",
      techStack: ["TypeScript", "React"],
      coworkers: [
        {
          name: "Alex Chen",
          role: "Manager",
          personaStyle: "Professional",
          knowledge: [
            {
              topic: "auth",
              triggerKeywords: ["login"],
              response: "Use JWT",
              isCritical: true,
            },
          ],
        },
      ],
    };
    const result = formatScenarioForPrompt(data);

    expect(result).toContain("**Scenario Name:** Test Scenario");
    expect(result).toContain("**Company Name:** Test Company");
    expect(result).toContain("**Tech Stack:** TypeScript, React");
    expect(result).toContain("**Coworkers:**");
    expect(result).toContain("Alex Chen (Manager): 1 knowledge item(s)");
  });
});

describe("parseExtractionFromResponse", () => {
  it("returns null when no extraction block is present", () => {
    const response = "This is just a normal response without any JSON.";
    const result = parseExtractionFromResponse(response);

    expect(result).toBeNull();
  });

  it("parses valid extraction block", () => {
    const response = `Great! So the company is called TechFlow.

\`\`\`json:extraction
{
  "extracted": {
    "companyName": "TechFlow"
  }
}
\`\`\``;
    const result = parseExtractionFromResponse(response);

    expect(result).not.toBeNull();
    expect(result?.companyName).toBe("TechFlow");
  });

  it("handles new coworker extraction", () => {
    const response = `Let me add Jordan to the team.

\`\`\`json:extraction
{
  "extracted": {
    "newCoworker": {
      "name": "Jordan Rivera",
      "role": "Senior Developer",
      "personaStyle": "Technical and detail-oriented",
      "knowledge": []
    }
  }
}
\`\`\``;
    const result = parseExtractionFromResponse(response);

    expect(result?.newCoworker).toBeDefined();
    expect(result?.newCoworker?.name).toBe("Jordan Rivera");
    expect(result?.newCoworker?.role).toBe("Senior Developer");
  });

  it("handles new knowledge for coworker extraction", () => {
    const response = `Adding authentication knowledge to Jordan.

\`\`\`json:extraction
{
  "extracted": {
    "newKnowledgeForCoworker": {
      "coworkerName": "Jordan Rivera",
      "knowledge": {
        "topic": "authentication",
        "triggerKeywords": ["auth", "login", "jwt"],
        "response": "We use JWT with 24h expiry",
        "isCritical": true
      }
    }
  }
}
\`\`\``;
    const result = parseExtractionFromResponse(response);

    expect(result?.newKnowledgeForCoworker).toBeDefined();
    expect(result?.newKnowledgeForCoworker?.coworkerName).toBe("Jordan Rivera");
    expect(result?.newKnowledgeForCoworker?.knowledge.topic).toBe(
      "authentication"
    );
  });

  it("returns null for invalid JSON", () => {
    const response = `\`\`\`json:extraction
{not valid json}
\`\`\``;
    const result = parseExtractionFromResponse(response);

    expect(result).toBeNull();
  });
});

describe("cleanResponseForDisplay", () => {
  it("removes extraction block from response", () => {
    const response = `Great! I've noted that the company is called TechFlow.

\`\`\`json:extraction
{
  "extracted": {
    "companyName": "TechFlow"
  }
}
\`\`\``;
    const result = cleanResponseForDisplay(response);

    expect(result).toBe(
      "Great! I've noted that the company is called TechFlow."
    );
    expect(result).not.toContain("json:extraction");
  });

  it("returns unchanged response if no extraction block", () => {
    const response = "Just a normal response.";
    const result = cleanResponseForDisplay(response);

    expect(result).toBe("Just a normal response.");
  });

  it("handles multiple extraction blocks", () => {
    const response = `First part.

\`\`\`json:extraction
{"extracted": {"name": "test1"}}
\`\`\`

Second part.

\`\`\`json:extraction
{"extracted": {"name": "test2"}}
\`\`\``;
    const result = cleanResponseForDisplay(response);

    expect(result).toBe("First part.\n\n\n\nSecond part.");
    expect(result).not.toContain("json:extraction");
  });
});

describe("applyExtraction", () => {
  it("updates simple fields", () => {
    const current: ScenarioBuilderData = { name: "Old Name" };
    const extraction = {
      name: "New Name",
      companyName: "Test Company",
    };

    const result = applyExtraction(current, extraction);

    expect(result.name).toBe("New Name");
    expect(result.companyName).toBe("Test Company");
  });

  it("adds new coworker to list", () => {
    const current: ScenarioBuilderData = {
      coworkers: [
        {
          name: "Existing",
          role: "Dev",
          personaStyle: "Casual",
          knowledge: [],
        },
      ],
    };
    const extraction = {
      newCoworker: {
        name: "New Coworker",
        role: "Manager",
        personaStyle: "Professional",
        knowledge: [],
      },
    };

    const result = applyExtraction(current, extraction);

    expect(result.coworkers).toHaveLength(2);
    expect(result.coworkers?.[1].name).toBe("New Coworker");
  });

  it("adds knowledge to existing coworker", () => {
    const current: ScenarioBuilderData = {
      coworkers: [
        {
          name: "Jordan",
          role: "Dev",
          personaStyle: "Technical",
          knowledge: [],
        },
      ],
    };
    const extraction = {
      newKnowledgeForCoworker: {
        coworkerName: "Jordan",
        knowledge: {
          topic: "auth",
          triggerKeywords: ["login"],
          response: "Use JWT",
          isCritical: true,
        },
      },
    };

    const result = applyExtraction(current, extraction);

    expect(result.coworkers?.[0].knowledge).toHaveLength(1);
    expect(result.coworkers?.[0].knowledge[0].topic).toBe("auth");
  });

  it("does not modify other coworkers when adding knowledge", () => {
    const current: ScenarioBuilderData = {
      coworkers: [
        {
          name: "Alex",
          role: "Manager",
          personaStyle: "Professional",
          knowledge: [
            {
              topic: "team",
              triggerKeywords: ["team"],
              response: "Great team",
              isCritical: false,
            },
          ],
        },
        {
          name: "Jordan",
          role: "Dev",
          personaStyle: "Technical",
          knowledge: [],
        },
      ],
    };
    const extraction = {
      newKnowledgeForCoworker: {
        coworkerName: "Jordan",
        knowledge: {
          topic: "auth",
          triggerKeywords: ["login"],
          response: "Use JWT",
          isCritical: true,
        },
      },
    };

    const result = applyExtraction(current, extraction);

    expect(result.coworkers?.[0].knowledge).toHaveLength(1);
    expect(result.coworkers?.[1].knowledge).toHaveLength(1);
  });

  it("handles empty coworkers array for new coworker", () => {
    const current: ScenarioBuilderData = {};
    const extraction = {
      newCoworker: {
        name: "First Coworker",
        role: "Manager",
        personaStyle: "Professional",
        knowledge: [],
      },
    };

    const result = applyExtraction(current, extraction);

    expect(result.coworkers).toHaveLength(1);
    expect(result.coworkers?.[0].name).toBe("First Coworker");
  });

  it("updates existing coworker instead of duplicating when name matches", () => {
    const current: ScenarioBuilderData = {
      coworkers: [
        {
          name: "Sarah Jenkins",
          role: "Developer",
          personaStyle: "Friendly",
          knowledge: [],
        },
        {
          name: "Marcus Thorne",
          role: "Manager",
          personaStyle: "Professional",
          knowledge: [],
        },
      ],
    };
    const extraction = {
      newCoworker: {
        name: "Sarah Jenkins",
        role: "Senior Developer",
        personaStyle: "Technical and detail-oriented",
        knowledge: [
          {
            topic: "architecture",
            triggerKeywords: ["design", "patterns"],
            response: "We use microservices",
            isCritical: true,
          },
        ],
      },
    };

    const result = applyExtraction(current, extraction);

    // Should still have 2 coworkers, not 3
    expect(result.coworkers).toHaveLength(2);
    // Sarah should be updated with new data
    const sarah = result.coworkers?.find((c) => c.name === "Sarah Jenkins");
    expect(sarah?.role).toBe("Senior Developer");
    expect(sarah?.personaStyle).toBe("Technical and detail-oriented");
    expect(sarah?.knowledge).toHaveLength(1);
    // Marcus should be unchanged
    const marcus = result.coworkers?.find((c) => c.name === "Marcus Thorne");
    expect(marcus?.role).toBe("Manager");
  });
});

describe("formatCurrentStateForPrompt", () => {
  it("includes completion status", () => {
    const data: ScenarioBuilderData = {
      name: "Test",
      companyName: "Company",
    };

    const result = formatCurrentStateForPrompt(data);

    expect(result).toContain("## Current Collected Information");
    expect(result).toContain("## Completion Status");
    expect(result).toContain("Complete:");
    expect(result).toContain("Missing:");
  });

  it("shows ready status when all required fields are complete", () => {
    const data: ScenarioBuilderData = {
      name: "Test Scenario",
      companyName: "Test Company",
      companyDescription: "A test company",
      taskDescription: "Build something",
      coworkers: [
        {
          name: "Alex",
          role: "Manager",
          personaStyle: "Professional",
          knowledge: [
            {
              topic: "auth",
              triggerKeywords: ["login"],
              response: "JWT",
              isCritical: true,
            },
          ],
        },
      ],
    };

    const result = formatCurrentStateForPrompt(data);

    expect(result).toContain("Ready to save!");
  });

  it("shows in progress status when fields are missing", () => {
    const data: ScenarioBuilderData = {
      name: "Test",
    };

    const result = formatCurrentStateForPrompt(data);

    expect(result).toContain("In progress");
  });
});
