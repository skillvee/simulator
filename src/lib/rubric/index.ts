/**
 * Rubric System
 *
 * Data-driven assessment rubric with role families, dimensions,
 * behavioral anchors, archetypes, and seniority gates.
 *
 * @since 2026-02-06
 */

export {
  loadRubricForRoleFamily,
  loadArchetype,
  loadArchetypesForRoleFamily,
} from "./load-rubric";

export {
  calculateArchetypeFit,
  calculateFitForMultipleArchetypes,
  type ArchetypeInput,
} from "./fit-score";
