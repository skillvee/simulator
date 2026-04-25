"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import {
  type AssessmentPhase,
  getSessionElapsedMinutes,
  type PhaseTimingInput,
} from "@/lib/core/assessment-phase";
import type { SimulationDepth } from "@/types";
import { SIMULATION_DEPTH_CONFIG } from "@/types";

interface AgendaProps {
  /** Current phase — drives which row is highlighted. */
  phase: AssessmentPhase;
  /** Name of the candidate's manager (first name, e.g. "Sarah") for copy. */
  managerName: string;
  /** Session timing fields — elapsed minutes are derived from these. */
  timing: PhaseTimingInput;
  /** Depth controls the "most candidates finish around X min" hint. */
  simulationDepth: SimulationDepth;
}

type AgendaItem = {
  phase: AssessmentPhase;
  label: string;
};

function useElapsedMinutes(timing: PhaseTimingInput): number | null {
  // Re-render every 30s so the elapsed counter stays roughly current.
  // (Sub-minute precision isn't meaningful here — this is a soft pacing cue.)
  const [, setTick] = useState(0);
  useEffect(() => {
    const handle = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(handle);
  }, []);

  const elapsed = getSessionElapsedMinutes(timing);
  return elapsed === null ? null : Math.max(0, Math.floor(elapsed));
}

export function Agenda({
  phase,
  managerName,
  timing,
  simulationDepth,
}: AgendaProps) {
  const t = useTranslations("work.agenda");
  const elapsedMinutes = useElapsedMinutes(timing);
  const target = SIMULATION_DEPTH_CONFIG[simulationDepth].targetMinutes;

  const items: AgendaItem[] = [
    { phase: "review_materials", label: t("phases.reviewMaterials") },
    { phase: "kickoff_call", label: t("phases.kickoff", { manager: managerName }) },
    { phase: "heads_down_work", label: t("phases.work") },
    { phase: "walkthrough_call", label: t("phases.walkthrough", { manager: managerName }) },
  ];

  const activeIndex = items.findIndex((i) => i.phase === phase);

  return (
    <div className="px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--slack-border))" }}>
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color: "hsl(var(--slack-text-muted))" }}
      >
        {t("title")}
      </h3>
      <ol className="space-y-1">
        {items.map((item, index) => {
          const isDone = activeIndex > index;
          const isActive = activeIndex === index;
          const isUpcoming = activeIndex < index;

          return (
            <li key={item.phase} className="flex items-start gap-2">
              <span
                className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                style={{
                  background: isDone
                    ? "hsl(var(--primary))"
                    : isActive
                      ? "hsl(var(--primary) / 0.15)"
                      : "transparent",
                  border: isActive
                    ? "1.5px solid hsl(var(--primary))"
                    : isUpcoming
                      ? "1.5px solid hsl(var(--slack-border))"
                      : "none",
                  color: isDone ? "hsl(var(--primary-foreground))" : "hsl(var(--primary))",
                }}
                aria-hidden
              >
                {isDone ? <Check size={10} strokeWidth={3} /> : isActive ? "●" : ""}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm leading-tight"
                  style={{
                    color: isActive
                      ? "hsl(var(--slack-text))"
                      : isDone
                        ? "hsl(var(--slack-text-muted))"
                        : "hsl(var(--slack-text-muted))",
                    fontWeight: isActive ? 600 : 400,
                    textDecoration: isDone ? "line-through" : "none",
                  }}
                >
                  {item.label}
                </p>
                {isActive && elapsedMinutes !== null && (
                  <p
                    className="text-xs mt-0.5 leading-tight"
                    style={{ color: "hsl(var(--slack-text-muted))" }}
                  >
                    {t("elapsedMinutes", { minutes: elapsedMinutes })}
                    {phase === "heads_down_work" && (
                      <>
                        {" · "}
                        {t("pacingHint", { target })}
                      </>
                    )}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
