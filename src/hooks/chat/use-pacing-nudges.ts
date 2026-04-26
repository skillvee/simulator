/**
 * Hook that fires the manager's pacing nudges (check-in / wrap-up / cap) at
 * cap-15, cap-5, and cap minutes from the session start. Server is the
 * source of truth for idempotency — the endpoint refuses duplicates — but
 * we also gate locally so a remount in the same tab doesn't fire twice.
 *
 * Also calls onCapReached when the firm cap nudge fires, so the parent can
 * surface the "let's hop on the walkthrough now" UI prompt.
 */

import { useCallback, useEffect, useRef } from "react";
import {
  type AssessmentPhase,
  type PacingNudgeType,
  PACING_NUDGES_IN_ORDER,
  getPacingThresholdMinutes,
} from "@/lib/core/assessment-phase";
import type { ChatMessage, SimulationDepth } from "@/types";
import { createLogger } from "@/lib/core";

const logger = createLogger("client:hooks:pacing-nudges");

interface UsePacingNudgesOptions {
  assessmentId: string;
  /** First name (for filling unread/notification metadata downstream). */
  managerId: string | null;
  /** Anchors the nudge timeline. Pass `reviewStartedAt` (or `workingStartedAt` for legacy rows). */
  sessionStartedAt: Date | null;
  simulationDepth: SimulationDepth;
  /** Current phase — nudges only fire during heads_down_work. */
  phase: AssessmentPhase;
  /** Nudge types already delivered server-side (from initial server props). */
  alreadyDelivered: PacingNudgeType[];
  /** Called when each nudge fires successfully — parent uses it to update unread + play sound. */
  onNudgeReceived: (managerId: string, message: ChatMessage) => void;
  /** Called specifically when the cap nudge fires, so the parent can offer the walkthrough CTA. */
  onCapReached?: () => void;
}

const FIRED_KEYS = new Set<string>();

function makeFiredKey(assessmentId: string, nudge: PacingNudgeType): string {
  return `${assessmentId}::${nudge}`;
}

export function usePacingNudges({
  assessmentId,
  managerId,
  sessionStartedAt,
  simulationDepth,
  phase,
  alreadyDelivered,
  onNudgeReceived,
  onCapReached,
}: UsePacingNudgesOptions) {
  // Always read the latest callbacks via ref to avoid restarting timers on every render.
  const onNudgeReceivedRef = useRef(onNudgeReceived);
  onNudgeReceivedRef.current = onNudgeReceived;
  const onCapReachedRef = useRef(onCapReached);
  onCapReachedRef.current = onCapReached;

  const fireNudge = useCallback(
    async (nudge: PacingNudgeType) => {
      const firedKey = makeFiredKey(assessmentId, nudge);
      if (FIRED_KEYS.has(firedKey)) return;
      FIRED_KEYS.add(firedKey);

      try {
        const response = await fetch("/api/chat/pacing-nudge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assessmentId, nudgeType: nudge }),
        });
        if (!response.ok) {
          logger.warn("Pacing nudge POST failed", {
            nudge,
            status: String(response.status),
          });
          // Allow retry on subsequent mount since server didn't accept it.
          FIRED_KEYS.delete(firedKey);
          return;
        }
        const json = await response.json();
        const data = json?.data;
        if (data?.alreadyDelivered) {
          logger.info("Pacing nudge already delivered server-side", { nudge });
        } else if (data?.message && managerId) {
          // Surface the message into the chat UI (unread counter + sound).
          onNudgeReceivedRef.current(managerId, data.message as ChatMessage);
        }
        if (nudge === "cap") {
          onCapReachedRef.current?.();
        }
      } catch (err) {
        logger.error("Pacing nudge failed", {
          nudge,
          err: err instanceof Error ? err.message : String(err),
        });
        FIRED_KEYS.delete(firedKey);
      }
    },
    [assessmentId, managerId]
  );

  useEffect(() => {
    if (phase !== "heads_down_work" || !sessionStartedAt || !managerId) {
      return;
    }

    const sessionStartMs = sessionStartedAt.getTime();
    const now = Date.now();
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const nudge of PACING_NUDGES_IN_ORDER) {
      if (alreadyDelivered.includes(nudge)) continue;
      if (FIRED_KEYS.has(makeFiredKey(assessmentId, nudge))) continue;

      const thresholdMs =
        sessionStartMs + getPacingThresholdMinutes(simulationDepth, nudge) * 60_000;
      const delay = thresholdMs - now;

      if (delay <= 0) {
        // Past-due. Only fire the most recent overdue nudge to avoid spamming
        // the candidate with three messages back-to-back after a long reload
        // gap. Restrict the suppression check to *later* (in firing order)
        // pending nudges — earlier overdue nudges must never suppress a later
        // one (otherwise once `cap` is overdue, the also-overdue `checkin` /
        // `wrapup` would suppress it and nothing fires after a reload).
        const currentIndex = PACING_NUDGES_IN_ORDER.indexOf(nudge);
        const laterAlsoOverdue = PACING_NUDGES_IN_ORDER.slice(
          currentIndex + 1
        ).some((later) => {
          if (alreadyDelivered.includes(later)) return false;
          const laterThresholdMs =
            sessionStartMs + getPacingThresholdMinutes(simulationDepth, later) * 60_000;
          return laterThresholdMs <= now;
        });
        if (laterAlsoOverdue) continue;
        fireNudge(nudge);
      } else {
        timers.push(setTimeout(() => fireNudge(nudge), delay));
      }
    }

    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [
    assessmentId,
    managerId,
    sessionStartedAt,
    simulationDepth,
    phase,
    alreadyDelivered,
    fireNudge,
  ]);
}
