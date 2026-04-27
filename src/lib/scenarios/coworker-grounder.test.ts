import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GroundCoworkerInput } from "./coworker-grounder";

const mockGenerateContentStream = vi.fn();

vi.mock("@/lib/ai/gemini", () => ({
  gemini: {
    models: {
      generateContentStream: (...args: unknown[]) => mockGenerateContentStream(...args),
    },
  },
}));

vi.mock("@/lib/ai/errors", () => ({
  // wrapAICall is just a passthrough wrapper around the SDK call; bypass it
  // so we don't have to mock its tracking calls.
  wrapAICall: <T>(fn: () => Promise<T>) => fn(),
}));

import { groundCoworkerKnowledge } from "./coworker-grounder";

function makeStream(text: string): AsyncIterable<{ text?: string }> {
  return {
    async *[Symbol.asyncIterator]() {
      yield { text };
    },
  };
}

const baseInput: GroundCoworkerInput = {
  scenarioId: "scn_test",
  scenario: {
    companyName: "Acme",
    taskDescription: "Build a thing",
    roleName: "Software Engineer",
    seniorityLevel: "mid",
    archetypeName: "Full Stack Engineer",
  },
  plan: {
    resources: [
      {
        id: "repo",
        type: "repository",
        label: "Main Repo",
        filename: "acme-app",
        objective: "Codebase",
        candidateUsage: "Edit it",
      },
    ],
    qualityCriteria: ["builds clean"],
  },
  docs: [
    {
      id: "kickoff",
      name: "Kickoff",
      filename: "kickoff.md",
      objective: "Onboarding",
      markdown: "Hello",
    },
  ],
  artifactSummary: {
    kind: "repo",
    repoUrl: "https://github.com/acme/acme-app",
    fileTree: ["package.json", "src/app.ts", "Dockerfile"],
    readme: "Acme README",
    sampleFiles: [],
  },
  coworkers: [
    {
      id: "cw_alice",
      name: "Alice",
      role: "Engineering Manager",
      personaStyle: "Warm, decisive.",
      language: "en",
    },
    {
      id: "cw_bob",
      name: "Bob",
      role: "Senior Backend Engineer",
      personaStyle: "Direct, terse.",
      language: "en",
    },
  ],
};

describe("groundCoworkerKnowledge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses a valid grounded response and aligns updates to input order", async () => {
    // Model returns coworkers in REVERSE order — grounder must realign.
    const validResponse = JSON.stringify({
      coworkers: [
        {
          coworkerId: "cw_bob",
          knowledge: [
            {
              topic: "service_layout",
              triggerKeywords: ["where", "structure", "layout"],
              response: "Edit `src/app.ts`. The Dockerfile is at the root.",
              isCritical: true,
            },
          ],
        },
        {
          coworkerId: "cw_alice",
          knowledge: [
            {
              topic: "priorities",
              triggerKeywords: ["priority", "deadline"],
              response: "This ships Friday.",
              isCritical: true,
            },
            {
              topic: "process",
              triggerKeywords: ["review", "merge"],
              response: "Open a PR; I review same-day.",
              isCritical: false,
            },
          ],
        },
      ],
    });
    mockGenerateContentStream.mockResolvedValueOnce(makeStream(validResponse));

    const result = await groundCoworkerKnowledge(baseInput);

    expect(result.updates).toHaveLength(2);
    expect(result.updates[0]?.coworkerId).toBe("cw_alice");
    expect(result.updates[1]?.coworkerId).toBe("cw_bob");
    expect(result.updates[0]?.knowledge).toHaveLength(2);
    expect(result.updates[1]?.knowledge).toHaveLength(1);
  });

  it("returns updates with ONLY coworkerId + knowledge (identity preservation)", async () => {
    const validResponse = JSON.stringify({
      coworkers: [
        {
          coworkerId: "cw_alice",
          knowledge: [
            {
              topic: "x",
              triggerKeywords: ["x"],
              response: "x",
              isCritical: false,
            },
          ],
          // Model drops in extra junk — Zod must strip it (or our caller must
          // refuse to write it). We assert the result only has the contract
          // fields.
          name: "Alice (renamed!)",
          role: "Different Role",
        },
        {
          coworkerId: "cw_bob",
          knowledge: [
            {
              topic: "y",
              triggerKeywords: ["y"],
              response: "y",
              isCritical: true,
            },
          ],
        },
      ],
    });
    mockGenerateContentStream.mockResolvedValueOnce(makeStream(validResponse));

    const result = await groundCoworkerKnowledge(baseInput);

    for (const u of result.updates) {
      // Critical invariant: only `coworkerId` + `knowledge` ride downstream.
      expect(Object.keys(u).sort()).toEqual(["coworkerId", "knowledge"]);
    }
  });

  it("throws when the model returns non-JSON", async () => {
    mockGenerateContentStream.mockResolvedValueOnce(makeStream("not json {{{"));

    await expect(groundCoworkerKnowledge(baseInput)).rejects.toThrow(
      /coworker-grounder: model returned non-JSON/
    );
  });

  it("throws when the schema validation fails", async () => {
    const badResponse = JSON.stringify({
      coworkers: [
        {
          // Missing `coworkerId`.
          knowledge: [
            { topic: "x", triggerKeywords: ["x"], response: "x", isCritical: false },
          ],
        },
      ],
    });
    mockGenerateContentStream.mockResolvedValueOnce(makeStream(badResponse));

    await expect(groundCoworkerKnowledge(baseInput)).rejects.toThrow(
      /coworker-grounder: schema validation failed/
    );
  });

  it("throws when the model drops a coworker from its output", async () => {
    const partialResponse = JSON.stringify({
      coworkers: [
        {
          coworkerId: "cw_alice",
          knowledge: [
            { topic: "x", triggerKeywords: ["x"], response: "x", isCritical: false },
          ],
        },
        // cw_bob missing — grounder must throw rather than silently write
        // partial data.
      ],
    });
    mockGenerateContentStream.mockResolvedValueOnce(makeStream(partialResponse));

    await expect(groundCoworkerKnowledge(baseInput)).rejects.toThrow(
      /missing entries for 1 coworker/
    );
  });

  it("short-circuits without calling the model when input has no coworkers", async () => {
    const result = await groundCoworkerKnowledge({ ...baseInput, coworkers: [] });

    expect(result.updates).toEqual([]);
    expect(mockGenerateContentStream).not.toHaveBeenCalled();
  });
});
