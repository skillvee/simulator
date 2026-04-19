"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, AlertCircle } from "lucide-react";
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

interface CandidateResultsClientProps {
  assessmentId: string;
  results: CandidateResultsData | null;
  initialFeedback: { rating: "LIKE" | "DISLIKE"; comment: string } | null;
}

function NoReportState({
  onGenerate,
  isGenerating,
}: {
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const t = useTranslations("results.noReport");
  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <Card className="max-w-md p-12 text-center shadow-lg">
        {isGenerating ? (
          <>
            <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <h2 className="mb-4 text-2xl font-semibold">{t("generating.title")}</h2>
            <p className="mb-6 text-muted-foreground">
              {t("generating.description")}
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <AlertCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-4 text-2xl font-semibold">{t("notReady.title")}</h2>
            <p className="mb-6 text-muted-foreground">{t("notReady.description")}</p>
            <Button onClick={onGenerate}>{t("notReady.generateButton")}</Button>
          </>
        )}
      </Card>
    </div>
  );
}

export function CandidateResultsClient({
  assessmentId,
  results: initialResults,
  initialFeedback,
}: CandidateResultsClientProps) {
  const t = useTranslations("results");
  const [results] = useState<CandidateResultsData | null>(initialResults);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/assessment/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      logger.error("Error generating report", { error });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!results) {
    return (
      <NoReportState
        onGenerate={handleGenerateReport}
        isGenerating={isGenerating}
      />
    );
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
