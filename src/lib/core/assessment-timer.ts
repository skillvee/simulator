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
 * Get the deadline timestamp for an assessment.
 */
export function getDeadlineAt(
  workingStartedAt: Date,
  simulationDepth: SimulationDepth = "medium"
): Date {
  return new Date(workingStartedAt.getTime() + getMaxDurationMs(simulationDepth));
}
