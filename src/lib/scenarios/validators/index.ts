/**
 * Step 3 — deterministic validators entry point.
 *
 * Composes markdown + (repo OR csv) validators into a single result.
 * Returned errors feed back into Step 2 as judge feedback when validation fails.
 */

import { validateMarkdownDocs } from "./markdown";
import { validateRepoArtifact } from "./repo";
import { validateCsvArtifact } from "./csv";
import { validateCoworkerKnowledge } from "./coworkers";
import type { ResourceType } from "../archetype-resource-mapping";
import type { ResourcePlan, ScenarioDoc } from "@/types";

export interface RunValidatorsInput {
  scenarioId: string;
  plan: ResourcePlan;
  docs: ScenarioDoc[];
  resourceType: ResourceType;
  taskDescription: string;
}

export interface RunValidatorsResult {
  ok: boolean;
  errors: string[];
  /** Number of `[coworkers]`-prefixed errors. Threaded out so the orchestrator
   *  can decide whether to skip Step 5 (coworker grounding) — if zero, the
   *  ungrounded coworkers already match the bundle and grounding is a no-op. */
  coworkerErrorCount: number;
}

export async function runValidators(
  input: RunValidatorsInput
): Promise<RunValidatorsResult> {
  const markdownErrors = validateMarkdownDocs({
    docs: input.docs,
    taskDescription: input.taskDescription,
  });

  const branchErrors =
    input.resourceType === "repo"
      ? await validateRepoArtifact({ scenarioId: input.scenarioId })
      : await validateCsvArtifact({
          scenarioId: input.scenarioId,
          docs: input.docs,
        });

  const coworkerErrors = await validateCoworkerKnowledge({
    scenarioId: input.scenarioId,
    resourceType: input.resourceType,
    plan: input.plan,
    docs: input.docs,
  });

  const errors = [
    ...markdownErrors.map((e) => `[markdown] ${e}`),
    ...branchErrors.map((e) => `[${input.resourceType}] ${e}`),
    ...coworkerErrors.map((e) => `[coworkers] ${e}`),
  ];

  return {
    ok: errors.length === 0,
    errors,
    coworkerErrorCount: coworkerErrors.length,
  };
}

export { validateMarkdownDocs, validateRepoArtifact, validateCsvArtifact, validateCoworkerKnowledge };
