/**
 * Transforms raw assessment report data into a candidate-friendly format.
 *
 * Philosophy: the candidate view is a *positive, evidence-grounded* recap,
 * not a scorecard. No numeric scores, no "areas to develop", no red flags,
 * no dimension-level grades. Everything judgmental lives on the recruiter side.
 */
import type {
  AssessmentReport,
  CandidateResultsData,
  CandidateWorkStyleMetrics,
} from "@/types";

interface TransformMeta {
  assessmentId: string;
  candidateName: string;
  scenarioName: string;
  companyName: string;
  isSearchable: boolean;
  hasVideoAssessment: boolean;
}

function cleanObservation(raw: string): string {
  // Some pipelines bake a leading "+ " (or "- ") bullet into the evidence string.
  // Strip those so the UI can style its own bullet.
  return raw.trim().replace(/^[+\-•*]\s*/, "");
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = cleanObservation(raw);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function extractObservations(report: AssessmentReport): string[] {
  // Prefer the coach-pass output when available — it's already filtered and
  // tone-checked for candidate consumption.
  if (
    Array.isArray(report.candidateObservations) &&
    report.candidateObservations.length > 0
  ) {
    return dedupe(report.candidateObservations).slice(0, 6);
  }

  // Legacy fallback for reports generated before the coach pass existed.
  // IMPORTANT: skillScores[].evidence mixes greenFlags (prefixed "+ ") and
  // redFlags (prefixed "- ") — see report-scoring.ts. cleanObservation() strips
  // those prefixes unconditionally, which is why pre-coach reports leaked
  // negative items onto the candidate view. Filter to green-flag-prefixed
  // entries before cleaning.
  const items: string[] = [];
  if (report.videoEvaluation && Array.isArray(report.videoEvaluation.skills)) {
    for (const skill of report.videoEvaluation.skills) {
      for (const flag of skill.greenFlags ?? []) items.push(flag);
    }
  }
  if (Array.isArray(report.skillScores)) {
    for (const skill of report.skillScores) {
      for (const ev of skill.evidence ?? []) {
        if (ev.startsWith("+ ")) items.push(ev);
      }
    }
  }
  for (const s of report.narrative?.strengths ?? []) items.push(s);
  return dedupe(items).slice(0, 6);
}

function extractNarrative(report: AssessmentReport): string {
  // Coach-pass summary is the intended candidate-facing string. Older reports
  // fall back to the recruiter summary — imperfect, but the best we have.
  return (
    report.candidateSummary ||
    report.videoEvaluation?.overallSummary ||
    report.narrative?.overallSummary ||
    ""
  );
}

function extractMetrics(
  report: AssessmentReport
): CandidateWorkStyleMetrics | null {
  if (!report.metrics) return null;
  return {
    totalDurationMinutes: report.metrics.totalDurationMinutes,
    workingPhaseMinutes: report.metrics.workingPhaseMinutes,
    coworkersContacted: report.metrics.coworkersContacted,
    aiToolsUsed: report.metrics.aiToolsUsed,
    testsStatus: report.metrics.testsStatus,
  };
}

export function transformToCandidateResults(
  report: AssessmentReport,
  meta: TransformMeta
): CandidateResultsData {
  return {
    assessmentId: meta.assessmentId,
    candidateName: meta.candidateName,
    scenarioName: meta.scenarioName,
    companyName: meta.companyName,
    generatedAt: report.generatedAt,
    narrative: extractNarrative(report),
    observations: extractObservations(report),
    metrics: extractMetrics(report),
    isSearchable: meta.isSearchable,
    hasVideoAssessment: meta.hasVideoAssessment,
  };
}
