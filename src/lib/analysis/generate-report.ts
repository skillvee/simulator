import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import {
  fetchAssessmentForReport,
  resolveVideoEvaluation,
  calculateTiming,
  countUniqueCoworkers,
} from "./report-data";
import { convertRubricToReport, reportToPrismaJson } from "./report-scoring";
import { generateCandidateNarrative } from "./candidate-narrative";
import type { AssessmentReport, RubricAssessmentOutput } from "@/types";

const logger = createLogger("analysis:generate-report");

export type GenerateReportResult =
  | { status: "ready"; report: AssessmentReport }
  | { status: "processing" }
  | { status: "not_found" }
  | { status: "unauthorized" }
  | { status: "error"; message: string };

const NO_EVIDENCE_NARRATIVE_EN =
  "We couldn't analyze video evidence from this session — the screen recording wasn't captured. Your conversations were saved and you completed the assessment, but we can't provide evidence-based observations without the recording.";
const NO_EVIDENCE_NARRATIVE_ES =
  "No pudimos analizar evidencia en video de esta sesión — la grabación de pantalla no se capturó. Tus conversaciones quedaron guardadas y completaste la evaluación, pero no podemos ofrecer observaciones basadas en evidencia sin la grabación.";

function buildEmptyRubric(language?: string): RubricAssessmentOutput {
  const note =
    language === "es" ? NO_EVIDENCE_NARRATIVE_ES : NO_EVIDENCE_NARRATIVE_EN;
  return {
    evaluationVersion: "no-evidence-fallback-v1",
    roleFamilySlug: "engineering",
    overallScore: null,
    dimensionScores: [],
    detectedRedFlags: [],
    topStrengths: [],
    growthAreas: [],
    overallSummary: note,
    evaluationConfidence: "low",
    insufficientEvidenceNotes: note,
  };
}

async function persistReport(
  assessmentId: string,
  report: AssessmentReport
): Promise<void> {
  try {
    await db.assessment.update({
      where: { id: assessmentId },
      data: { report: reportToPrismaJson(report) },
    });
  } catch (err) {
    logger.error("Failed to persist generated report", {
      assessmentId,
      err: String(err),
    });
  }
}

/**
 * Server-side helper: returns the cached report or generates one.
 * Safe to call from RSC/page.tsx — no HTTP round-trip, no fake cookies.
 *
 * If the assessment has no usable screen recording, produces a minimal
 * "no-evidence" report rather than failing outright. This keeps the
 * results page rendering (with a friendly message) for candidates whose
 * recording upload didn't complete.
 */
export async function generateOrFetchReport(
  assessmentId: string,
  userId: string
): Promise<GenerateReportResult> {
  const assessment = await fetchAssessmentForReport(assessmentId);
  if (!assessment) return { status: "not_found" };
  if (assessment.userId !== userId) return { status: "unauthorized" };

  if (assessment.report) {
    return { status: "ready", report: assessment.report as AssessmentReport };
  }

  const timing = calculateTiming(assessment.startedAt, assessment.completedAt);
  const coworkersContacted = countUniqueCoworkers(assessment.conversations);

  const videoUrl = assessment.recordings[0]?.storageUrl;
  if (!videoUrl) {
    // No recording available — build a minimal report so the results page
    // still has something to render instead of a dead end. The hardcoded
    // no-evidence message is already candidate-friendly, so we reuse it as
    // the candidate summary and skip the LLM coach pass.
    const emptyRubric = buildEmptyRubric(assessment.scenario.language);
    const fallback = convertRubricToReport(
      emptyRubric,
      assessmentId,
      assessment.user?.name || undefined,
      timing,
      coworkersContacted,
      assessment.scenario.language
    );
    fallback.candidateSummary = emptyRubric.overallSummary;
    fallback.candidateObservations = [];
    await persistReport(assessmentId, fallback);
    return { status: "ready", report: fallback };
  }

  const videoResult = await resolveVideoEvaluation(
    assessmentId,
    videoUrl,
    assessment.scenario.taskDescription,
    userId,
    assessment.scenario.language
  );

  if (videoResult.status === "processing") return { status: "processing" };
  if (videoResult.status === "error") {
    return { status: "error", message: videoResult.message };
  }

  const report = convertRubricToReport(
    videoResult.data,
    assessmentId,
    assessment.user?.name || undefined,
    timing,
    coworkersContacted,
    assessment.scenario.language
  );

  // Softened, candidate-facing recap. Non-blocking in spirit: on failure we
  // persist the report without the coach fields and the transformer falls
  // back to the recruiter summary. That fallback is imperfect (it's why this
  // pass exists), but it's strictly better than blocking the results page.
  const narrative = await generateCandidateNarrative({
    assessmentId,
    rubricOutput: videoResult.data,
    scenarioName: assessment.scenario.name,
    companyName: assessment.scenario.companyName,
    candidateName: assessment.user?.name || undefined,
    language: assessment.scenario.language,
  });
  if (narrative) {
    report.candidateSummary = narrative.candidateSummary;
    report.candidateObservations = narrative.candidateObservations;
  }

  await persistReport(assessmentId, report);
  return { status: "ready", report };
}
