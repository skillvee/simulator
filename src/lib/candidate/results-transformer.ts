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
  const items: string[] = [];
  if (report.videoEvaluation && Array.isArray(report.videoEvaluation.skills)) {
    for (const skill of report.videoEvaluation.skills) {
      for (const flag of skill.greenFlags ?? []) items.push(flag);
    }
  }
  if (Array.isArray(report.skillScores)) {
    for (const skill of report.skillScores) {
      for (const ev of skill.evidence ?? []) items.push(ev);
    }
  }
  for (const s of report.narrative?.strengths ?? []) items.push(s);
  return dedupe(items).slice(0, 6);
}

function extractNarrative(report: AssessmentReport): string {
  return (
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
