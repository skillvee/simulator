"use client";

import { Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import type { CandidateResultsData } from "@/types";

interface OverviewSectionProps {
  results: CandidateResultsData;
}

export function CandidateOverviewSection({ results }: OverviewSectionProps) {
  const t = useTranslations("results.overview");
  const firstName = results.candidateName.trim().split(/\s+/)[0];
  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-primary/10 bg-white/70 py-0 shadow-sm backdrop-blur-sm">
        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-primary/30" />

        <div className="flex flex-col items-center gap-4 px-8 pb-8 pt-8 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary animate-scale-in"
            aria-hidden
          >
            <Check className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
            {results.companyName}
          </span>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {t("youreDone", { name: firstName })}
            </h1>
            <p className="text-sm text-muted-foreground md:text-[15px]">
              {results.scenarioName}
            </p>
          </div>
          <p className="max-w-xl text-[15px] leading-relaxed text-foreground/75">
            {t("thanks", { name: firstName })}
          </p>
        </div>
      </Card>

      {results.narrative && (
        <Card className="border-border/70 shadow-sm">
          <div className="flex items-center gap-2 px-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              {t("whatWeSawTitle")}
            </h2>
          </div>
          <div className="px-6">
            <p className="text-[15px] leading-relaxed text-foreground/80">
              {results.narrative}
            </p>
          </div>

          {results.observations.length > 0 && (
            <>
              <div className="mx-6 border-t border-dashed border-border" />
              <div className="px-6">
                <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("momentsTitle")}
                </p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {results.observations.map((obs, i) => (
                    <li
                      key={i}
                      className="group flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-primary/5"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary transition-transform group-hover:scale-125" />
                      <span className="text-sm leading-snug text-foreground/80">
                        {obs}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
