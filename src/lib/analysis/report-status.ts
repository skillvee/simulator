/**
 * Self-healing report-status resolver.
 *
 * The candidate's results page polls this. Every call is a fresh serverless
 * invocation, so we don't rely on long-lived fire-and-forget work surviving
 * after an HTTP response returns. On each call we look at the current state
 * and nudge it forward:
 *
 * - report present                 → ready
 * - no recording                   → build no-evidence fallback, ready
 * - VideoAssessment missing        → create PENDING + trigger evaluation
 * - PENDING (not already running)  → (re)trigger evaluation via CAS
 * - PROCESSING                     → wait; if stuck >10 min, mark FAILED + retry
 * - FAILED + retryCount < max      → reset + retrigger
 * - FAILED + retryCount >= max     → exhausted (rare — surfaced as "taking
 *                                    longer than expected", never as a button)
 * - COMPLETED but report is null   → convert rubric + narrative + persist
 *
 * None of this is visible to the candidate beyond "we're still working on it".
 */

import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import { VideoAssessmentStatus } from "@prisma/client";
import {
  evaluateVideo,
  getEvaluationResults,
} from "@/lib/analysis/video-evaluation";
import { migrateVideoEvaluationToRubric } from "@/lib/analysis/report-migration";
import {
  calculateTiming,
  countUniqueCoworkers,
  fetchAssessmentForReport,
} from "@/lib/analysis/report-data";
import {
  convertRubricToReport,
  reportToPrismaJson,
} from "@/lib/analysis/report-scoring";
import { generateCandidateNarrative } from "@/lib/analysis/candidate-narrative";
import type { AssessmentReport, RubricAssessmentOutput } from "@/types";

const logger = createLogger("analysis:report-status");

/** How many Gemini evaluation attempts before we give up. */
const MAX_EVALUATION_ATTEMPTS = 3;

export type ReportStatusState =
  | "ready"
  | "processing"
  | "exhausted"
  | "not_found"
  | "unauthorized";

export interface ReportStatusResult {
  state: ReportStatusState;
  /** Debug hint — candidate UI does not display this. */
  detail?: string;
}

function buildNoEvidenceRubric(language?: string): RubricAssessmentOutput {
  const note =
    language === "es"
      ? "No pudimos analizar evidencia en video de esta sesión — la grabación de pantalla no se capturó. Tus conversaciones quedaron guardadas y completaste la evaluación, pero no podemos ofrecer observaciones basadas en evidencia sin la grabación."
      : "We couldn't analyze video evidence from this session — the screen recording wasn't captured. Your conversations were saved and you completed the assessment, but we can't provide evidence-based observations without the recording.";
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

/**
 * Finalize the report once the rubric is available: convert, run the
 * candidate-facing narrative pass (best-effort), persist. Returns true on
 * success, false on failure (caller keeps polling).
 */
async function finalizeReport(
  assessmentId: string,
  rubric: RubricAssessmentOutput
): Promise<boolean> {
  try {
    const assessment = await fetchAssessmentForReport(assessmentId);
    if (!assessment) return false;

    const timing = calculateTiming(assessment.startedAt, assessment.completedAt);
    const coworkersContacted = countUniqueCoworkers(assessment.conversations);

    const report = convertRubricToReport(
      rubric,
      assessmentId,
      assessment.user?.name || undefined,
      timing,
      coworkersContacted,
      assessment.scenario.language
    );

    // Best-effort narrative — candidate-narrative.ts already swallows its own
    // errors and returns null. Falling back to the recruiter summary is ugly
    // but far better than leaving the candidate in limbo.
    const narrative = await generateCandidateNarrative({
      assessmentId,
      rubricOutput: rubric,
      scenarioName: assessment.scenario.name,
      companyName: assessment.scenario.companyName,
      candidateName: assessment.user?.name || undefined,
      language: assessment.scenario.language,
    });
    if (narrative) {
      report.candidateSummary = narrative.candidateSummary;
      report.candidateObservations = narrative.candidateObservations;
    }

    await db.assessment.update({
      where: { id: assessmentId },
      data: { report: reportToPrismaJson(report) },
    });
    return true;
  } catch (err) {
    logger.error("finalizeReport failed", {
      assessmentId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

function fireEvaluation(params: {
  videoAssessmentId: string;
  videoUrl: string;
  taskDescription: string;
}): void {
  // Fire-and-forget. evaluateVideo updates status itself at completion (and
  // on failure increments retryCount in its own catch — that's the
  // authoritative source of retry counting).
  evaluateVideo({
    assessmentId: params.videoAssessmentId,
    videoUrl: params.videoUrl,
    taskDescription: params.taskDescription,
  }).catch((err) => {
    logger.error("Background evaluation threw after claim", {
      videoAssessmentId: params.videoAssessmentId,
      err: err instanceof Error ? err.message : String(err),
    });
  });
}

/**
 * Atomically claim a videoAssessment row out of PENDING/FAILED into
 * PROCESSING. Returns true if we won the claim and started work; false if
 * the row is already PROCESSING/COMPLETED, or if it's FAILED with retries
 * exhausted. The caller decides what to surface in each case.
 *
 * The MAX_EVALUATION_ATTEMPTS check happens inside the WHERE clause, so a
 * losing race doesn't exceed the cap (no read-then-write hole). Retry
 * counting itself stays inside evaluateVideo so it remains the single
 * source of truth.
 */
async function tryClaimPendingOrFailed(params: {
  videoAssessmentId: string;
  videoUrl: string;
  taskDescription: string;
}): Promise<boolean> {
  // PENDING → PROCESSING (no retry concerns)
  const pending = await db.videoAssessment.updateMany({
    where: {
      id: params.videoAssessmentId,
      status: VideoAssessmentStatus.PENDING,
    },
    data: { status: VideoAssessmentStatus.PROCESSING },
  });
  if (pending.count === 1) {
    fireEvaluation(params);
    return true;
  }

  // FAILED → PROCESSING (only when budget remains)
  const failed = await db.videoAssessment.updateMany({
    where: {
      id: params.videoAssessmentId,
      status: VideoAssessmentStatus.FAILED,
      retryCount: { lt: MAX_EVALUATION_ATTEMPTS },
    },
    data: { status: VideoAssessmentStatus.PROCESSING },
  });
  if (failed.count === 1) {
    fireEvaluation(params);
    return true;
  }

  return false;
}

/**
 * Resolve current state, nudge it forward if needed, and return what the
 * candidate UI should display.
 */
export async function getReportStatus(
  assessmentId: string,
  userId: string
): Promise<ReportStatusResult> {
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      userId: true,
      report: true,
      scenario: { select: { taskDescription: true, language: true } },
      recordings: {
        where: { type: "screen" },
        select: { storageUrl: true },
        take: 1,
      },
      videoAssessment: {
        select: {
          id: true,
          status: true,
          videoUrl: true,
          retryCount: true,
          createdAt: true,
        },
      },
    },
  });

  if (!assessment) return { state: "not_found" };
  if (assessment.userId !== userId) return { state: "unauthorized" };

  if (assessment.report) return { state: "ready" };

  // No recording: build a no-evidence report inline. This is cheap (no LLM
  // call for the rubric — the narrative stays as the hardcoded message) and
  // unblocks the candidate immediately.
  const videoUrl = assessment.recordings[0]?.storageUrl;
  if (!videoUrl) {
    const rubric = buildNoEvidenceRubric(assessment.scenario.language);
    const ok = await finalizeReport(assessmentId, rubric);
    return ok
      ? { state: "ready" }
      : { state: "processing", detail: "no-video-fallback-persist-failed" };
  }

  const video = assessment.videoAssessment;

  const claimParams = {
    videoUrl,
    taskDescription: assessment.scenario.taskDescription,
  };

  // No VideoAssessment yet — finalize fire-and-forget hasn't created one
  // (or was killed before it could). Create and try to claim.
  if (!video) {
    const created = await db.videoAssessment.create({
      data: {
        candidateId: userId,
        assessmentId,
        videoUrl,
        status: VideoAssessmentStatus.PENDING,
      },
      select: { id: true },
    });
    await tryClaimPendingOrFailed({ videoAssessmentId: created.id, ...claimParams });
    return { state: "processing", detail: "created-and-triggered" };
  }

  if (video.status === VideoAssessmentStatus.PROCESSING) {
    // Genuinely stuck PROCESSING (Vercel killed evaluateVideo mid-flight)
    // is an admin issue — there's no `processingStartedAt` field on
    // VideoAssessment, and createdAt would false-positive for any row
    // older than the threshold. Leave it to forceRetryVideoAssessment.
    return { state: "processing", detail: "evaluating" };
  }

  if (video.status === VideoAssessmentStatus.PENDING) {
    await tryClaimPendingOrFailed({ videoAssessmentId: video.id, ...claimParams });
    return { state: "processing", detail: "pending-claimed" };
  }

  if (video.status === VideoAssessmentStatus.FAILED) {
    const claimed = await tryClaimPendingOrFailed({
      videoAssessmentId: video.id,
      ...claimParams,
    });
    return claimed
      ? { state: "processing", detail: "retry-claimed" }
      : { state: "exhausted", detail: "max-retries" };
  }

  // COMPLETED — rubric exists, but report wasn't persisted (the original
  // bug). Convert + persist now.
  if (video.status === VideoAssessmentStatus.COMPLETED) {
    const results = await getEvaluationResults(video.id);
    const rubric = results.summary?.rawAiResponse
      ? migrateVideoEvaluationToRubric(results.summary.rawAiResponse)
      : null;

    // Corrupt rubric — set FAILED so the retry-budget machinery handles it
    // on the next poll (instead of duplicating that logic here).
    if (!rubric) {
      logger.warn("Completed evaluation has unusable rubric — demoting to FAILED", {
        assessmentId,
        videoAssessmentId: video.id,
      });
      await db.videoAssessment.updateMany({
        where: { id: video.id, status: VideoAssessmentStatus.COMPLETED },
        data: {
          status: VideoAssessmentStatus.FAILED,
          lastFailureReason: "unusable-rubric",
        },
      });
      return { state: "processing", detail: "rubric-demoted" };
    }

    const ok = await finalizeReport(assessmentId, rubric);
    return ok
      ? { state: "ready" }
      : { state: "processing", detail: "finalize-failed" };
  }

  return { state: "processing", detail: "unknown-state" };
}

export type { AssessmentReport };
