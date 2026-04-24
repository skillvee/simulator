"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createLogger } from "@/lib/core";
import type { CandidateResultsData } from "@/types";

import { CandidateOverviewSection } from "./components/overview-section";
import { HowToThinkSection } from "./components/how-to-think-section";
import { NextStepsSection } from "./components/next-steps-section";
import { ExperienceFeedback } from "./components/experience-feedback";

const logger = createLogger("client:app:results");

/** How often to poll the self-healing report-status endpoint. */
const POLL_INTERVAL_MS = 5_000;

/**
 * After this long with no "ready", switch the spinner copy to a calmer
 * "this is taking longer than expected" message. We keep polling — the
 * pipeline is self-healing — but the candidate gets a more honest signal.
 */
const LONG_WAIT_THRESHOLD_MS = 90_000;

interface CandidateResultsClientProps {
  assessmentId: string;
  results: CandidateResultsData | null;
  initialFeedback: { rating: "LIKE" | "DISLIKE"; comment: string } | null;
}

type ReportPollState = "ready" | "processing" | "exhausted";

function GeneratingState({ longWait }: { longWait: boolean }) {
  const t = useTranslations("results.noReport.generating");
  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <Card className="max-w-md p-12 text-center shadow-lg">
        <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <h2 className="mb-4 text-2xl font-semibold">{t("title")}</h2>
        <p className="text-muted-foreground">
          {longWait ? t("descriptionLong") : t("description")}
        </p>
      </Card>
    </div>
  );
}

export function CandidateResultsClient({
  assessmentId,
  results,
  initialFeedback,
}: CandidateResultsClientProps) {
  const t = useTranslations("results");
  const router = useRouter();
  const [longWait, setLongWait] = useState(false);

  // Poll the self-healing endpoint while no report is available. Each call
  // is a fresh serverless invocation, so any individual failure (Vercel
  // killed the previous fire-and-forget, Gemini blip, etc.) heals on the
  // next tick. The candidate only ever sees a spinner.
  const pollingRef = useRef(false);
  useEffect(() => {
    if (results) return;
    if (pollingRef.current) return;
    pollingRef.current = true;

    let cancelled = false;
    const startedAt = Date.now();

    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(
          `/api/assessment/report-status?assessmentId=${encodeURIComponent(assessmentId)}`,
          { cache: "no-store" }
        );
        if (cancelled) return;

        if (res.ok) {
          const body = (await res.json()) as {
            data?: { state?: ReportPollState };
          };
          const state = body.data?.state;
          if (state === "ready") {
            // Pull the freshly persisted report by refetching the RSC.
            router.refresh();
            return; // stop polling
          }
          if (state === "exhausted") {
            // Self-healing has given up — usually means a stale Gemini
            // file URI or a structural failure that will need an admin
            // retry. Don't surface a button to the candidate; show the
            // calm long-wait copy and stop polling silently.
            setLongWait(true);
            return; // stop polling
          }
        }

        if (Date.now() - startedAt > LONG_WAIT_THRESHOLD_MS) {
          setLongWait(true);
        }
      } catch (err) {
        logger.warn("report-status poll failed", { err: String(err) });
      }

      if (cancelled) return;
      window.setTimeout(tick, POLL_INTERVAL_MS);
    };

    void tick();

    return () => {
      cancelled = true;
      pollingRef.current = false;
    };
  }, [assessmentId, results, router]);

  if (!results) {
    return <GeneratingState longWait={longWait} />;
  }

  const formattedDate = new Date(results.generatedAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-blue-50/60 via-white to-white">
      {/* Decorative blurred accent behind the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-120px] h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      </div>

      {/* Back link (floating, minimal) */}
      <div className="relative mx-auto flex max-w-3xl items-center justify-between px-6 pt-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/candidate/dashboard">
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            {t("backToAssessments")}
          </Link>
        </Button>
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {formattedDate}
        </p>
      </div>

      <div className="relative mx-auto max-w-3xl space-y-6 px-6 py-8">
        <div className="animate-fade-in">
          <CandidateOverviewSection results={results} />
        </div>
        <div className="animate-slide-up" style={{ animationDelay: "80ms" }}>
          <HowToThinkSection />
        </div>
        <div className="animate-slide-up" style={{ animationDelay: "160ms" }}>
          <NextStepsSection
            assessmentId={results.assessmentId}
            companyName={results.companyName}
            initialIsSearchable={results.isSearchable}
            canOptIn={results.hasVideoAssessment}
          />
        </div>
        <div className="animate-slide-up" style={{ animationDelay: "240ms" }}>
          <ExperienceFeedback
            assessmentId={results.assessmentId}
            initialRating={initialFeedback?.rating ?? null}
            initialComment={initialFeedback?.comment ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
