/**
 * Step 3 — deterministic validators entry point.
 *
 * Composes markdown + (repo OR csv) validators into a single result.
 * Returned errors feed back into Step 2 as judge feedback when validation fails.
 */

import { validateMarkdownDocs } from "./markdown";
import { validateRepoArtifact } from "./repo";
import { validateCsvArtifact } from "./csv";
import type { ResourceType } from "../archetype-resource-mapping";
import type { ScenarioDoc } from "@/types";

export interface RunValidatorsInput {
  scenarioId: string;
  docs: ScenarioDoc[];
  resourceType: ResourceType;
  taskDescription: string;
}

export interface RunValidatorsResult {
  ok: boolean;
  errors: string[];
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

  const errors = [
    ...markdownErrors.map((e) => `[markdown] ${e}`),
    ...branchErrors.map((e) => `[${input.resourceType}] ${e}`),
  ];

  return { ok: errors.length === 0, errors };
}

export { validateMarkdownDocs, validateRepoArtifact, validateCsvArtifact };
