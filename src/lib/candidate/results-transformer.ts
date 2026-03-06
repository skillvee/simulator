/**
 * Transforms raw assessment report data into a candidate-friendly format.
 * Filters out recruiter-only data (hiring signals, red flags, timestamps, percentiles).
 */
import type {
  AssessmentReport,
  CandidateResultsData,
  CandidateDimensionScore,
  CandidateStrengthOrGrowth,
  CandidateWorkStyleMetrics,
} from "@/types";

interface TransformMeta {
  assessmentId: string;
  candidateName: string;
  scenarioName: string;
  companyName: string;
}

/**
 * Compute strength level from overall score on 1-4 scale
 */
function getStrengthLevel4(score: number): string {
  if (score >= 3.5) return "Exceptional";
  if (score >= 2.5) return "Strong";
  if (score >= 1.5) return "Meets expectations";
  return "Below expectations";
}

/**
 * Compute strength level from overall score on 1-5 scale (legacy)
 */
function getStrengthLevel5(score: number): string {
  if (score >= 4.5) return "Exceptional";
  if (score >= 3.5) return "Strong";
  if (score >= 2.5) return "Meets expectations";
  return "Below expectations";
}

/**
 * Format dimension name from SCREAMING_SNAKE or lowercase_snake to Title Case
 */
function formatDimension(dimension: string): string {
  return dimension
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Transform an AssessmentReport into candidate-safe CandidateResultsData.
 * - Video evaluation path: uses videoEvaluation data (1-4 scale)
 * - Legacy path: uses skillScores + narrative (1-5 scale)
 */
export function transformToCandidateResults(
  report: AssessmentReport,
  meta: TransformMeta
): CandidateResultsData {
  if (report.videoEvaluation) {
    return transformVideoEvaluation(report, meta);
  }
  return transformLegacyReport(report, meta);
}

function transformVideoEvaluation(
  report: AssessmentReport,
  meta: TransformMeta
): CandidateResultsData {
  const ve = report.videoEvaluation!;

  // Map skills to candidate-safe dimension scores
  const dimensionScores: CandidateDimensionScore[] = ve.skills
    .filter((s) => s.score !== null)
    .map((skill) => ({
      dimension: skill.dimension,
      score: skill.score ?? 0,
      summary: skill.rationale.split(".")[0] + ".", // First sentence as summary
      strengths: skill.greenFlags,
      rationale: skill.rationale,
    }));

  // Sort by score descending for deriving strengths/growth
  const sorted = [...dimensionScores].sort((a, b) => b.score - a.score);

  // Top strengths: highest scoring dimensions (score >= 2.5, max 3)
  const topStrengths: CandidateStrengthOrGrowth[] = sorted
    .filter((d) => d.score >= 2.5)
    .slice(0, 3)
    .map((d) => ({
      dimension: d.dimension,
      score: d.score,
      description: d.strengths[0] || d.summary,
    }));

  // Growth areas: lowest scoring dimensions (score < 3, max 3)
  const growthAreas: CandidateStrengthOrGrowth[] = sorted
    .filter((d) => d.score < 3)
    .reverse() // lowest first
    .slice(0, 3)
    .map((d) => ({
      dimension: d.dimension,
      score: d.score,
      description: d.summary,
    }));

  // Extract metrics if available
  const metrics: CandidateWorkStyleMetrics | null = report.metrics
    ? {
        totalDurationMinutes: report.metrics.totalDurationMinutes,
        workingPhaseMinutes: report.metrics.workingPhaseMinutes,
        coworkersContacted: report.metrics.coworkersContacted,
        aiToolsUsed: report.metrics.aiToolsUsed,
        testsStatus: report.metrics.testsStatus,
      }
    : null;

  return {
    assessmentId: meta.assessmentId,
    candidateName: meta.candidateName,
    scenarioName: meta.scenarioName,
    companyName: meta.companyName,
    generatedAt: report.generatedAt,
    scoreScale: 4,
    overallScore: ve.overallScore,
    strengthLevel: getStrengthLevel4(ve.overallScore),
    dimensionScores,
    topStrengths,
    growthAreas,
    overallSummary: ve.overallSummary,
    metrics,
    evaluationConfidence: ve.evaluationConfidence,
  };
}

function transformLegacyReport(
  report: AssessmentReport,
  meta: TransformMeta
): CandidateResultsData {
  // Map legacy skill scores to candidate dimension scores
  const dimensionScores: CandidateDimensionScore[] = report.skillScores.map(
    (skill) => ({
      dimension: formatDimension(skill.category),
      score: skill.score,
      summary: skill.notes.split(".")[0] + ".",
      strengths: skill.evidence,
      rationale: skill.notes,
    })
  );

  // Derive strengths from narrative
  const topStrengths: CandidateStrengthOrGrowth[] = (
    report.narrative?.strengths || []
  )
    .slice(0, 3)
    .map((s, i) => ({
      dimension: dimensionScores[i]?.dimension || "General",
      score: report.overallScore,
      description: s,
    }));

  // Derive growth areas from narrative
  const growthAreas: CandidateStrengthOrGrowth[] = (
    report.narrative?.areasForImprovement || []
  )
    .slice(0, 3)
    .map((s, i) => ({
      dimension:
        dimensionScores[dimensionScores.length - 1 - i]?.dimension ||
        "General",
      score: report.overallScore,
      description: s,
    }));

  const metrics: CandidateWorkStyleMetrics | null = report.metrics
    ? {
        totalDurationMinutes: report.metrics.totalDurationMinutes,
        workingPhaseMinutes: report.metrics.workingPhaseMinutes,
        coworkersContacted: report.metrics.coworkersContacted,
        aiToolsUsed: report.metrics.aiToolsUsed,
        testsStatus: report.metrics.testsStatus,
      }
    : null;

  return {
    assessmentId: meta.assessmentId,
    candidateName: meta.candidateName,
    scenarioName: meta.scenarioName,
    companyName: meta.companyName,
    generatedAt: report.generatedAt,
    scoreScale: 5,
    overallScore: report.overallScore,
    strengthLevel: getStrengthLevel5(report.overallScore),
    dimensionScores,
    topStrengths,
    growthAreas,
    overallSummary:
      report.narrative?.overallSummary || "Assessment completed.",
    metrics,
    evaluationConfidence: "medium",
  };
}
