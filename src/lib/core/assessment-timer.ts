/**
 * Assessment timer utilities
 *
 * The timer duration depends on the scenario's simulationDepth:
 *   - "short":  60 minutes max
 *   - "medium": 75 minutes max (default)
 *   - "long":   90 minutes max
 *
 * The timer starts when the candidate clicks "Start Simulation" (workingStartedAt).
 * There is no visible countdown — the cutoff is enforced server-side
 * and via a client-side setTimeout as a safety net.
 */

import type { SimulationDepth } from "@/types";
import { SIMULATION_DEPTH_CONFIG } from "@/types";

/** @deprecated Use `getMaxDurationMs(depth)` for depth-aware duration */
export const ASSESSMENT_DURATION_MS = 75 * 60 * 1000; // 75 minutes (medium default)

/**
 * Get the maximum duration in milliseconds for a given simulation depth.
 */
export function getMaxDurationMs(depth: SimulationDepth = "medium"): number {
  return SIMULATION_DEPTH_CONFIG[depth].maxMinutes * 60 * 1000;
}

/**
 * Check if an assessment's time window has expired.
 * Returns false for legacy assessments without workingStartedAt.
 */
export function isAssessmentExpired(
  workingStartedAt: Date | null,
  simulationDepth: SimulationDepth = "medium"
): boolean {
  if (!workingStartedAt) return false;
  return Date.now() > workingStartedAt.getTime() + getMaxDurationMs(simulationDepth);
}

/**
 * Hard safety-net: how long past the cap before the server force-finalizes.
 * Replaces the old auto-finalize-at-cap behavior — at cap we now fire the
 * pacing-cap nudge instead, but if the candidate stays on the page well past
 * cap without starting the walkthrough we still need a guard.
 */
export const HARD_EXPIRY_GRACE_MS = 30 * 60 * 1000; // 30 minutes

export function isAssessmentHardExpired(
  workingStartedAt: Date | null,
  simulationDepth: SimulationDepth = "medium"
): boolean {
  if (!workingStartedAt) return false;
  return (
    Date.now() >
    workingStartedAt.getTime() + getMaxDurationMs(simulationDepth) + HARD_EXPIRY_GRACE_MS
  );
}

/**
 * Get the deadline timestamp for an assessment.
 */
export function getDeadlineAt(
  workingStartedAt: Date,
  simulationDepth: SimulationDepth = "medium"
): Date {
  return new Date(workingStartedAt.getTime() + getMaxDurationMs(simulationDepth));
}
