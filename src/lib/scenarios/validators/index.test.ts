/**
 * Regression test for the Step 3 validator gate.
 *
 * Codex P1 on PR #419: when only coworker errors are present, `ok` MUST be
 * true so the orchestrator runs Step 4 (judge) → Step 5 (coworker
 * grounding). Coworker errors are the exact failures Step 5 exists to fix —
 * blocking on them would prevent grounding from ever running.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("./markdown", () => ({
  validateMarkdownDocs: vi.fn(),
}));
vi.mock("./repo", () => ({
  validateRepoArtifact: vi.fn(),
}));
vi.mock("./csv", () => ({
  validateCsvArtifact: vi.fn(),
}));
vi.mock("./coworkers", () => ({
  validateCoworkerKnowledge: vi.fn(),
}));

import { validateMarkdownDocs } from "./markdown";
import { validateRepoArtifact } from "./repo";
import { validateCoworkerKnowledge } from "./coworkers";
import { runValidators } from "./index";

const baseInput = {
  scenarioId: "scn_test",
  plan: { resources: [], qualityCriteria: [] },
  docs: [],
  resourceType: "repo" as const,
  taskDescription: "Build a thing",
};

describe("runValidators — Step 3 gate", () => {
  it("ok=true when only coworker errors are present (Codex P1 regression)", async () => {
    vi.mocked(validateMarkdownDocs).mockReturnValue([]);
    vi.mocked(validateRepoArtifact).mockResolvedValue([]);
    vi.mocked(validateCoworkerKnowledge).mockResolvedValue([
      "Coworker \"Diego\" references `docker-compose`, which is not in the bundle",
    ]);

    const result = await runValidators(baseInput);

    expect(result.ok).toBe(true);
    expect(result.coworkerErrorCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/^\[coworkers\]/);
  });

  it("ok=false when markdown errors are present", async () => {
    vi.mocked(validateMarkdownDocs).mockReturnValue([
      "Doc \"Kickoff\" contains placeholder text matching /\\bTODO\\b/",
    ]);
    vi.mocked(validateRepoArtifact).mockResolvedValue([]);
    vi.mocked(validateCoworkerKnowledge).mockResolvedValue([]);

    const result = await runValidators(baseInput);

    expect(result.ok).toBe(false);
    expect(result.coworkerErrorCount).toBe(0);
  });

  it("ok=false when repo errors are present", async () => {
    vi.mocked(validateMarkdownDocs).mockReturnValue([]);
    vi.mocked(validateRepoArtifact).mockResolvedValue([
      "repoUrl returns 404",
    ]);
    vi.mocked(validateCoworkerKnowledge).mockResolvedValue([]);

    const result = await runValidators(baseInput);

    expect(result.ok).toBe(false);
    expect(result.coworkerErrorCount).toBe(0);
  });

  it("ok=false (and coworker errors present) when both repo + coworker errors exist", async () => {
    vi.mocked(validateMarkdownDocs).mockReturnValue([]);
    vi.mocked(validateRepoArtifact).mockResolvedValue(["repoUrl returns 404"]);
    vi.mocked(validateCoworkerKnowledge).mockResolvedValue([
      "Coworker \"Diego\" references `docker-compose`",
    ]);

    const result = await runValidators(baseInput);

    expect(result.ok).toBe(false);
    expect(result.coworkerErrorCount).toBe(1);
    expect(result.errors).toHaveLength(2);
  });

  it("ok=true and coworkerErrorCount=0 on a fully clean run", async () => {
    vi.mocked(validateMarkdownDocs).mockReturnValue([]);
    vi.mocked(validateRepoArtifact).mockResolvedValue([]);
    vi.mocked(validateCoworkerKnowledge).mockResolvedValue([]);

    const result = await runValidators(baseInput);

    expect(result.ok).toBe(true);
    expect(result.coworkerErrorCount).toBe(0);
    expect(result.errors).toEqual([]);
  });
});
