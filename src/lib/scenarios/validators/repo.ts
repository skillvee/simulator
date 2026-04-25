/**
 * Deterministic validators for the v2 repo branch.
 *
 * Most semantic checks (referenced files exist, no duplicate paths, package
 * scripts compatible with the scaffold) already live inside `repo-spec-generator`
 * and run during spec validation. This module checks the *result* of provisioning:
 * the repoUrl was set, the scenario has a main-task issue, etc.
 */

import { db } from "@/server/db";

export interface RepoValidatorInput {
  scenarioId: string;
}

export async function validateRepoArtifact(
  input: RepoValidatorInput
): Promise<string[]> {
  const errors: string[] = [];

  const scenario = await db.scenario.findUnique({
    where: { id: input.scenarioId },
    select: { repoUrl: true, repoSpec: true },
  });

  if (!scenario) {
    errors.push("Scenario not found");
    return errors;
  }

  if (!scenario.repoUrl) {
    errors.push("repoUrl is not set on the scenario");
  } else {
    try {
      const url = new URL(scenario.repoUrl);
      if (!url.hostname.includes("github.com")) {
        errors.push(`repoUrl host is not github.com: ${url.hostname}`);
      }
    } catch {
      errors.push(`repoUrl is not a valid URL: ${scenario.repoUrl}`);
    }
  }

  // repoSpec sanity: at least 1 file, 1 commit, 1 main-task issue.
  const spec = scenario.repoSpec as
    | { files?: unknown[]; commitHistory?: unknown[]; issues?: Array<{ isMainTask?: boolean }> }
    | null;
  if (!spec) {
    errors.push("repoSpec is null — provisioning likely failed");
  } else {
    if (!Array.isArray(spec.files) || spec.files.length === 0) {
      errors.push("repoSpec.files is empty");
    }
    if (!Array.isArray(spec.commitHistory) || spec.commitHistory.length === 0) {
      errors.push("repoSpec.commitHistory is empty");
    }
    const mainTaskCount =
      Array.isArray(spec.issues) && spec.issues.filter((i) => i.isMainTask).length;
    if (mainTaskCount !== 1) {
      errors.push(`Expected exactly 1 main-task issue, got ${mainTaskCount}`);
    }
  }

  return errors;
}
