/**
 * Dimension Mapping
 *
 * Maps rubric dimensions (role-family-specific) to the fixed assessment
 * dimensions used in video scoring (AssessmentDimension enum).
 *
 * The rubric system evaluates candidates on role-specific dimensions
 * (e.g., "technical_execution" for engineering, "analytical_reasoning" for
 * data science). The video assessment system stores scores under 8 fixed
 * dimensions. This mapping bridges the two systems so that archetype-specific
 * seniority gates can set per-dimension expected scores on the candidates table.
 *
 * When a rubric dimension maps to an assessment dimension, the seniority gate
 * minimum score for that rubric dimension becomes the "expected" score shown
 * as the marker on the bar chart for that assessment dimension.
 *
 * Multiple rubric dimensions may map to the same assessment dimension.
 * When that happens, we take the maximum gate score (higher bar = stricter
 * expectation wins).
 */

/**
 * Maps rubric dimension slugs → assessment dimension keys.
 *
 * Assessment dimensions:
 *   COMMUNICATION, PROBLEM_SOLVING, TECHNICAL_KNOWLEDGE,
 *   COLLABORATION, ADAPTABILITY, LEADERSHIP, CREATIVITY, TIME_MANAGEMENT
 */
export const RUBRIC_TO_ASSESSMENT_DIMENSION: Record<string, string> = {
  // Universal dimensions
  communication: "COMMUNICATION",
  practical_maturity: "ADAPTABILITY",
  collaboration_coachability: "COLLABORATION",

  // Engineering
  problem_decomposition_design: "PROBLEM_SOLVING",
  technical_execution: "TECHNICAL_KNOWLEDGE",
  learning_velocity: "ADAPTABILITY",
  work_process: "TIME_MANAGEMENT",

  // Product Management
  problem_structuring: "PROBLEM_SOLVING",
  prioritization_tradeoffs: "LEADERSHIP",
  data_reasoning: "TECHNICAL_KNOWLEDGE",
  stakeholder_influence: "COMMUNICATION",

  // Data Science
  analytical_reasoning: "PROBLEM_SOLVING",
  technical_proficiency_ds: "TECHNICAL_KNOWLEDGE",
  insight_communication: "COMMUNICATION",
  methodology_rigor: "TECHNICAL_KNOWLEDGE",

  // Program Management
  program_structuring: "PROBLEM_SOLVING",
  risk_identification: "ADAPTABILITY",
  cross_team_coordination: "COLLABORATION",
  execution_tracking: "TIME_MANAGEMENT",

  // Sales
  discovery_qualification: "PROBLEM_SOLVING",
  value_articulation: "COMMUNICATION",
  objection_handling: "ADAPTABILITY",
  closing_next_steps: "LEADERSHIP",

  // Customer Success
  onboarding_enablement: "COMMUNICATION",
  escalation_handling: "ADAPTABILITY",
  value_realization: "TECHNICAL_KNOWLEDGE",
  relationship_management: "COLLABORATION",
};

/**
 * Given seniority gates (rubric dimension slug → min score) and archetype
 * weights (rubric dimension slug → weight multiplier), compute the expected
 * score per assessment dimension.
 *
 * Strategy:
 * - Map each rubric gate to its assessment dimension
 * - When multiple rubric dimensions map to the same assessment dimension,
 *   pick the one with the highest weight (most important for this archetype)
 * - The gate's minScore becomes the expected score for that assessment dimension
 */
export function computeExpectedScores(
  seniorityGates: Record<string, number>,
  archetypeWeights: Record<string, number>,
): Record<string, number> {
  const result: Record<string, { score: number; weight: number }> = {};

  for (const [rubricDim, minScore] of Object.entries(seniorityGates)) {
    const assessmentDim = RUBRIC_TO_ASSESSMENT_DIMENSION[rubricDim];
    if (!assessmentDim) continue;

    const weight = archetypeWeights[rubricDim] ?? 1.0;

    const existing = result[assessmentDim];
    if (!existing || weight > existing.weight) {
      result[assessmentDim] = { score: minScore, weight };
    }
  }

  const expectedScores: Record<string, number> = {};
  for (const [dim, { score }] of Object.entries(result)) {
    expectedScores[dim] = score;
  }
  return expectedScores;
}
