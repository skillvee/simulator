import type { AssessmentReport, SkillScore, ScoreLevel, RubricAssessmentOutput } from "@/types";
import type { Prisma } from "@prisma/client";

/**
 * Maps rubric dimension slugs directly to report skill categories.
 * Rubric slugs are used as-is from Gemini evaluation output.
 */
export const RUBRIC_DIM_TO_CATEGORY: Record<string, string> = {
  // Universal
  communication: "communication",
  practical_maturity: "technical_decision_making",
  collaboration_coachability: "xfn_collaboration",
  // Engineering
  problem_decomposition_design: "problem_decomposition",
  technical_execution: "code_quality",
  learning_velocity: "learning_velocity",
  work_process: "time_management",
  // Product Management
  problem_structuring: "problem_decomposition",
  prioritization_tradeoffs: "prioritization",
  data_reasoning: "data_reasoning",
  stakeholder_influence: "communication",
  // Data Science
  analytical_reasoning: "problem_decomposition",
  technical_proficiency_ds: "code_quality",
  insight_communication: "communication",
  methodology_rigor: "methodology_rigor",
  // Program Management
  program_structuring: "problem_decomposition",
  risk_identification: "risk_identification",
  cross_team_coordination: "xfn_collaboration",
  execution_tracking: "time_management",
  // Sales
  discovery_qualification: "problem_decomposition",
  value_articulation: "communication",
  objection_handling: "objection_handling",
  closing_next_steps: "closing_next_steps",
  // Customer Success
  onboarding_enablement: "communication",
  escalation_handling: "escalation_handling",
  value_realization: "value_realization",
  relationship_management: "xfn_collaboration",
};

/**
 * Maps a score (1-4 rubric scale) to a level label
 */
export function scoreToLevel(score: number): ScoreLevel {
  if (score >= 3.5) return "exceptional";
  if (score >= 2.5) return "strong";
  if (score >= 1.5) return "adequate";
  return "needs_improvement";
}

/**
 * Converts rubric assessment output (v3) to assessment report format.
 *
 * The v3 rubric system stores dimension scores using role-family-specific slugs
 * (e.g., "technical_execution", "problem_decomposition_design"). This function
 * maps them through RUBRIC_TO_ASSESSMENT_DIMENSION -> ASSESSMENT_DIM_TO_CATEGORY
 * to produce the report's skill categories.
 */
export function convertRubricToReport(
  rubricResult: RubricAssessmentOutput,
  assessmentId: string,
  candidateName?: string,
  timing?: { totalDurationMinutes: number | null; workingPhaseMinutes: number | null },
  coworkersContacted?: number
): AssessmentReport {
  const skillScores: SkillScore[] = [];

  // Track best score per assessment dimension (multiple rubric dims may map to same one)
  const bestByCategory: Record<string, SkillScore> = {};

  for (const dimScore of rubricResult.dimensionScores) {
    if (dimScore.score === null) continue;

    // Map rubric slug directly to report category
    const category = RUBRIC_DIM_TO_CATEGORY[dimScore.dimensionSlug]
      ?? dimScore.dimensionSlug; // Fall back to slug itself if no mapping

    if (!category) continue;

    const evidence: string[] = [
      ...dimScore.greenFlags.map(f => `+ ${f}`),
      ...dimScore.redFlags.map(f => `- ${f}`),
    ];

    const candidate: SkillScore = {
      category: category as SkillScore["category"],
      score: dimScore.score,
      level: scoreToLevel(dimScore.score),
      evidence,
      notes: dimScore.rationale,
    };

    // Keep the higher-scoring entry when multiple rubric dims map to same category
    const existing = bestByCategory[category];
    if (!existing || dimScore.score > existing.score) {
      bestByCategory[category] = candidate;
    }
  }

  skillScores.push(...Object.values(bestByCategory));

  // Build narrative from v3 fields (topStrengths / growthAreas / detectedRedFlags)
  const strengths = rubricResult.topStrengths.map(s => s.description);
  const areasForImprovement = rubricResult.growthAreas.map(g => g.description);

  // Add detected red flags to areas for improvement
  for (const rf of rubricResult.detectedRedFlags) {
    areasForImprovement.push(`Red flag: ${rf.evidence}`);
  }

  // Build notable observations from highest-scoring dimension behaviors
  const notableObservations: string[] = rubricResult.dimensionScores
    .filter(d => d.score !== null && d.score >= 3)
    .flatMap(d => d.observableBehaviors.slice(0, 1).map(b => `[${b.timestamp}] ${b.behavior}`))
    .slice(0, 5);

  return {
    generatedAt: new Date().toISOString(),
    assessmentId,
    candidateName,
    overallScore: rubricResult.overallScore ?? 0,
    overallLevel: scoreToLevel(rubricResult.overallScore ?? 0),
    skillScores,
    narrative: {
      overallSummary: rubricResult.overallSummary,
      strengths,
      areasForImprovement,
      notableObservations,
    },
    recommendations: skillScores
      .filter(s => s.score <= 2)
      .slice(0, 3)
      .map((skill) => ({
        category: skill.category,
        priority: skill.score <= 1 ? "high" : "medium" as const,
        title: `Improve ${skill.category.replace(/_/g, " ")}`,
        description: skill.notes,
        actionableSteps: skill.evidence
          .filter(e => e.startsWith("- "))
          .map(e => `Address: ${e.slice(2)}`)
          .slice(0, 3),
      })),
    metrics: {
      totalDurationMinutes: timing?.totalDurationMinutes ?? null,
      workingPhaseMinutes: timing?.workingPhaseMinutes ?? null,
      coworkersContacted: coworkersContacted ?? 0,
      aiToolsUsed: true,
      testsStatus: "unknown",
      codeReviewScore: null,
    },
    version: rubricResult.evaluationVersion,
  };
}

/**
 * Convert report to Prisma JSON format
 */
export function reportToPrismaJson(report: AssessmentReport): Prisma.InputJsonValue {
  return report as unknown as Prisma.InputJsonValue;
}
