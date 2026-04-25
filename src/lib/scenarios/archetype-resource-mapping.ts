/**
 * Archetype → resource-type mapping for the v2 resource pipeline.
 *
 * Determines whether Step 2 of the orchestrator generates a GitHub repo
 * (for engineering archetypes) or CSV data files (for data archetypes).
 */

import type { RoleArchetype } from "@/lib/candidate";

export type ResourceType = "repo" | "data";

const DATA_ARCHETYPES: ReadonlySet<RoleArchetype> = new Set<RoleArchetype>([
  "DATA_ANALYST",
  "DATA_SCIENTIST",
  "DATA_ENGINEER",
]);

export function archetypeToResourceType(archetype: RoleArchetype): ResourceType {
  return DATA_ARCHETYPES.has(archetype) ? "data" : "repo";
}

export function isDataArchetype(archetype: RoleArchetype): boolean {
  return DATA_ARCHETYPES.has(archetype);
}
