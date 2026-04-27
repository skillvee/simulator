/**
 * US-003 — orchestrator integration tests for the coworker grounding step.
 *
 * Tests `runStep5_groundCoworkers` in isolation with mocked dependencies. The
 * step's contract:
 *   - Runs grounder when validator coworker error count > 0; persists results.
 *   - Skips grounder when validator coworker error count === 0; no DB writes.
 *   - Falls back silently if grounder throws on every retry — no exception
 *     bubbles up; pipeline still publishes.
 *   - Identity-preservation: only the `knowledge` field is updated per
 *     coworker; name/role/persona/voice/etc. are never written.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGroundCoworkerKnowledge = vi.fn();
const mockBuildRepoArtifactSummary = vi.fn();
const mockBuildDataArtifactSummary = vi.fn();
const mockCoworkerFindMany = vi.fn();
const mockCoworkerUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockScenarioFindUnique = vi.fn();

vi.mock("./coworker-grounder", () => ({
  groundCoworkerKnowledge: (...args: unknown[]) => mockGroundCoworkerKnowledge(...args),
}));

vi.mock("./artifact-summary", () => ({
  buildRepoArtifactSummary: (...args: unknown[]) => mockBuildRepoArtifactSummary(...args),
  buildDataArtifactSummary: (...args: unknown[]) => mockBuildDataArtifactSummary(...args),
}));

vi.mock("@/server/db", () => ({
  db: {
    coworker: {
      findMany: (...args: unknown[]) => mockCoworkerFindMany(...args),
      update: (...args: unknown[]) => mockCoworkerUpdate(...args),
    },
    scenario: {
      findUnique: (...args: unknown[]) => mockScenarioFindUnique(...args),
      update: vi.fn(),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

vi.mock("./generation-logger", () => ({
  logGenerationStep: vi.fn(async () => ({
    complete: vi.fn(async () => undefined),
    fail: vi.fn(async () => undefined),
  })),
}));

import { runStep5_groundCoworkers } from "./orchestrator";

const basePlan = {
  resources: [
    {
      id: "repo",
      type: "repository" as const,
      label: "Main",
      filename: "app",
      objective: "Codebase",
      candidateUsage: "Edit",
    },
  ],
  qualityCriteria: ["builds clean"],
};

const baseDocs = [
  {
    id: "kickoff",
    name: "Kickoff",
    filename: "kickoff.md",
    objective: "Onboarding",
    markdown: "Hello",
  },
];

const baseArgs = {
  scenarioId: "scn_test",
  plan: basePlan,
  docs: baseDocs,
  resourceType: "repo" as const,
  coworkerErrorCount: 2,
};

const mockArtifactSummary = {
  kind: "repo" as const,
  repoUrl: "https://github.com/acme/app",
  fileTree: ["package.json", "src/app.ts"],
  readme: "README",
  sampleFiles: [],
};

const mockScenarioRow = {
  companyName: "Acme",
  taskDescription: "Build a thing",
  targetLevel: "mid",
  archetype: { name: "Full Stack Engineer", slug: "fullstack_engineer" },
};

const mockCoworkers = [
  {
    id: "cw_alice",
    name: "Alice",
    role: "Engineering Manager",
    personaStyle: "Warm.",
    language: "en",
  },
  {
    id: "cw_bob",
    name: "Bob",
    role: "Senior Backend Engineer",
    personaStyle: "Direct.",
    language: "en",
  },
];

const mockGroundedKnowledge = [
  {
    coworkerId: "cw_alice",
    knowledge: [
      {
        topic: "priorities",
        triggerKeywords: ["priority"],
        response: "Ships Friday.",
        isCritical: true,
      },
    ],
  },
  {
    coworkerId: "cw_bob",
    knowledge: [
      {
        topic: "service_layout",
        triggerKeywords: ["where", "structure"],
        response: "Edit `src/app.ts`.",
        isCritical: true,
      },
    ],
  },
];

describe("runStep5_groundCoworkers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildRepoArtifactSummary.mockResolvedValue(mockArtifactSummary);
    mockScenarioFindUnique.mockResolvedValue(mockScenarioRow);
    mockCoworkerFindMany.mockResolvedValue(mockCoworkers);
    mockTransaction.mockImplementation(async (ops: unknown[]) => ops);
  });

  it("runs grounder and persists updated knowledge when validator reports errors", async () => {
    mockGroundCoworkerKnowledge.mockResolvedValueOnce({ updates: mockGroundedKnowledge });

    const result = await runStep5_groundCoworkers({ ...baseArgs, coworkerErrorCount: 2 });

    expect(result.success).toBe(true);
    expect(mockGroundCoworkerKnowledge).toHaveBeenCalledTimes(1);
    expect(mockCoworkerUpdate).toHaveBeenCalledTimes(2);

    // Identity preservation: each update writes ONLY `knowledge`.
    for (const call of mockCoworkerUpdate.mock.calls) {
      const updateArg = call[0] as { where: { id: string }; data: Record<string, unknown> };
      expect(Object.keys(updateArg.data)).toEqual(["knowledge"]);
    }
  });

  it("is skipped when validator reports zero coworker errors", async () => {
    const result = await runStep5_groundCoworkers({ ...baseArgs, coworkerErrorCount: 0 });

    expect(result.success).toBe(false);
    expect(mockGroundCoworkerKnowledge).not.toHaveBeenCalled();
    expect(mockCoworkerFindMany).not.toHaveBeenCalled();
    expect(mockCoworkerUpdate).not.toHaveBeenCalled();
  });

  it("falls back gracefully when grounder throws on every retry", async () => {
    // Three different errors so fingerprint short-circuit doesn't fire — we
    // want to confirm the loop doesn't bubble the exception out.
    mockGroundCoworkerKnowledge
      .mockRejectedValueOnce(new Error("transient blip 1"))
      .mockRejectedValueOnce(new Error("transient blip 2"))
      .mockRejectedValueOnce(new Error("transient blip 3"));

    const result = await runStep5_groundCoworkers({ ...baseArgs, coworkerErrorCount: 2 });

    expect(result.success).toBe(false);
    expect(mockGroundCoworkerKnowledge).toHaveBeenCalledTimes(3);
    expect(mockCoworkerUpdate).not.toHaveBeenCalled();
  });

  it("aborts retries early on identical fingerprint (fail-fast)", async () => {
    // Same error message twice — should bail after attempt 2.
    mockGroundCoworkerKnowledge
      .mockRejectedValueOnce(new Error("schema validation failed"))
      .mockRejectedValueOnce(new Error("schema validation failed"));

    const result = await runStep5_groundCoworkers({ ...baseArgs, coworkerErrorCount: 2 });

    expect(result.success).toBe(false);
    expect(mockGroundCoworkerKnowledge).toHaveBeenCalledTimes(2);
  });

  it("identity preservation: db.coworker.update data object contains only `knowledge`", async () => {
    mockGroundCoworkerKnowledge.mockResolvedValueOnce({ updates: mockGroundedKnowledge });

    await runStep5_groundCoworkers({ ...baseArgs, coworkerErrorCount: 1 });

    expect(mockCoworkerUpdate).toHaveBeenCalled();
    for (const call of mockCoworkerUpdate.mock.calls) {
      const arg = call[0] as { where: { id: string }; data: Record<string, unknown> };
      // The contract: ONLY `knowledge`. Any other field would silently
      // overwrite name/role/personaStyle/voiceName/personality/gender/
      // ethnicity/avatarUrl — that's a regression. Tests must catch it.
      expect(Object.keys(arg.data).sort()).toEqual(["knowledge"]);
      // The `where` MUST be by id.
      expect(arg.where).toHaveProperty("id");
    }
  });

  it("falls back when the scenario has no coworkers (defensive)", async () => {
    mockCoworkerFindMany.mockResolvedValueOnce([]);

    const result = await runStep5_groundCoworkers({ ...baseArgs, coworkerErrorCount: 1 });

    expect(result.success).toBe(false);
    expect(mockGroundCoworkerKnowledge).not.toHaveBeenCalled();
    expect(mockCoworkerUpdate).not.toHaveBeenCalled();
  });

  it("returns telemetry shape (per-run emission contract — Codex P2 on #420)", async () => {
    // The function used to emit `logger.info("coworker_grounding", ...)`
    // internally, which double-counted when the outer artifact retry loop
    // called it more than once per scenario. The canonical event is now
    // emitted by the orchestrator's run-end exit using the LAST telemetry
    // payload returned here. This test pins the new contract: the function
    // returns telemetry, the orchestrator owns emission.
    mockGroundCoworkerKnowledge.mockResolvedValueOnce({ updates: mockGroundedKnowledge });

    const t = await runStep5_groundCoworkers({ ...baseArgs, coworkerErrorCount: 2 });

    expect(t).toMatchObject({
      success: true,
      skipped: false,
      attempts: 1,
      validatorErrorsBefore: 2,
    });
    expect(typeof t.durationMs).toBe("number");
  });
});
