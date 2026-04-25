/**
 * Assessment phase helpers.
 *
 * The new 4-phase flow (plus "welcome" and "completed") maps 1:1 onto the
 * `AssessmentStatus` enum in Prisma. This module exposes a narrower,
 * UI-friendly phase type, the legal transition table, and elapsed-time /
 * pacing helpers used by the manager's check-in nudges.
 */

import { AssessmentStatus } from "@prisma/client";
import { SIMULATION_DEPTH_CONFIG, type SimulationDepth } from "@/types";

export type AssessmentPhase =
  | "welcome"
  | "review_materials"
  | "kickoff_call"
  | "heads_down_work"
  | "walkthrough_call"
  | "completed";

/** Convert the persisted status to a UI phase. */
export function phaseFromStatus(status: AssessmentStatus): AssessmentPhase {
  switch (status) {
    case AssessmentStatus.WELCOME:
      return "welcome";
    case AssessmentStatus.REVIEW_MATERIALS:
      return "review_materials";
    case AssessmentStatus.KICKOFF_CALL:
      return "kickoff_call";
    case AssessmentStatus.WORKING:
      return "heads_down_work";
    case AssessmentStatus.WALKTHROUGH_CALL:
      return "walkthrough_call";
    case AssessmentStatus.COMPLETED:
      return "completed";
  }
}

/** Candidate-facing transitions. */
export type TransitionAction =
  | "start_kickoff"
  | "end_kickoff"
  | "start_walkthrough"
  | "end_walkthrough";

interface TransitionSpec {
  from: readonly AssessmentStatus[];
  to: AssessmentStatus;
}

const TRANSITIONS: Record<TransitionAction, TransitionSpec> = {
  start_kickoff: {
    from: [AssessmentStatus.REVIEW_MATERIALS],
    to: AssessmentStatus.KICKOFF_CALL,
  },
  end_kickoff: {
    from: [AssessmentStatus.KICKOFF_CALL],
    to: AssessmentStatus.WORKING,
  },
  start_walkthrough: {
    from: [AssessmentStatus.WORKING],
    to: AssessmentStatus.WALKTHROUGH_CALL,
  },
  end_walkthrough: {
    from: [AssessmentStatus.WALKTHROUGH_CALL],
    to: AssessmentStatus.COMPLETED,
  },
};

export function canTransition(
  from: AssessmentStatus,
  action: TransitionAction
): boolean {
  return TRANSITIONS[action].from.includes(from);
}

export function getTargetStatus(action: TransitionAction): AssessmentStatus {
  return TRANSITIONS[action].to;
}

export function getTransition(action: TransitionAction): TransitionSpec {
  return TRANSITIONS[action];
}

/**
 * Minimum subset of Assessment fields needed for phase-timing math.
 * Takes a structural subset rather than the full Prisma type so callers
 * can pass a narrowed `select`/`include` result.
 */
export interface PhaseTimingInput {
  reviewStartedAt: Date | null;
  workingStartedAt: Date | null;
  kickoffStartedAt?: Date | null;
  kickoffEndedAt?: Date | null;
  workStartedAt?: Date | null;
  walkthroughStartedAt?: Date | null;
  walkthroughEndedAt?: Date | null;
}

/**
 * Start of the candidate's "session clock." For new assessments this is
 * `reviewStartedAt`. Legacy rows (pre-phase-split) fall back to
 * `workingStartedAt` so existing in-flight assessments keep working.
 */
export function getSessionStartedAt(assessment: PhaseTimingInput): Date | null {
  return assessment.reviewStartedAt ?? assessment.workingStartedAt;
}

/** Returns null if the session hasn't started (status=WELCOME with no timestamps). */
export function getSessionElapsedMs(
  assessment: PhaseTimingInput,
  now: Date = new Date()
): number | null {
  const start = getSessionStartedAt(assessment);
  if (!start) return null;
  return now.getTime() - start.getTime();
}

export function getSessionElapsedMinutes(
  assessment: PhaseTimingInput,
  now: Date = new Date()
): number | null {
  const ms = getSessionElapsedMs(assessment, now);
  return ms === null ? null : ms / 60_000;
}

/**
 * Pacing nudges are measured in minutes *before* (or at) the per-depth cap.
 * This lets a single rule set apply across 60/75/90-min simulations:
 *   checkin: cap - 15 min
 *   wrapup:  cap - 5  min
 *   cap:     cap      (firm "let's hop on now")
 */
export type PacingNudgeType = "checkin" | "wrapup" | "cap";

export const PACING_OFFSETS_FROM_CAP_MIN: Record<PacingNudgeType, number> = {
  checkin: -15,
  wrapup: -5,
  cap: 0,
};

export function getPacingThresholdMinutes(
  depth: SimulationDepth,
  nudge: PacingNudgeType
): number {
  return (
    SIMULATION_DEPTH_CONFIG[depth].maxMinutes +
    PACING_OFFSETS_FROM_CAP_MIN[nudge]
  );
}

/** All nudges in firing order — useful for scheduling. */
export const PACING_NUDGES_IN_ORDER: readonly PacingNudgeType[] = [
  "checkin",
  "wrapup",
  "cap",
] as const;

/**
 * Every status that counts as "the candidate is mid-assessment" for dashboards,
 * recruiter bucketing, and filters. Excludes WELCOME (not started) and
 * COMPLETED (done).
 */
export const IN_PROGRESS_STATUSES: readonly AssessmentStatus[] = [
  AssessmentStatus.REVIEW_MATERIALS,
  AssessmentStatus.KICKOFF_CALL,
  AssessmentStatus.WORKING,
  AssessmentStatus.WALKTHROUGH_CALL,
] as const;

export function isInProgressStatus(status: AssessmentStatus): boolean {
  return IN_PROGRESS_STATUSES.includes(status);
}
