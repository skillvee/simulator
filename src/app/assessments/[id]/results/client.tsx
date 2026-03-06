"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CandidateResultsData } from "@/types";
import { CandidateRadarChartOverview } from "./components/radar-chart-overview";
import { CandidateStrengthsGrowthSection } from "./components/strengths-growth-section";
import { CandidateCoreDimensionsSection } from "./components/core-dimensions-section";
import { CandidateWorkStyleSection } from "./components/work-style-section";

interface CandidateResultsClientProps {
  assessmentId: string;
  results: CandidateResultsData | null;
}

function NoReportState({
  onGenerate,
  isGenerating,
}: {
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <Card className="max-w-md p-12 text-center shadow-lg">
        {isGenerating ? (
          <>
            <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              Generating Report
            </h2>
            <p className="mb-6 text-stone-500">
              We&apos;re analyzing your performance and generating your
              personalized report. This may take a moment.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <AlertCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              Report Not Ready
            </h2>
            <p className="mb-6 text-stone-500">
              Your assessment report hasn&apos;t been generated yet. Click below
              to generate it now.
            </p>
            <Button onClick={onGenerate}>Generate Report</Button>
          </>
        )}
      </Card>
    </div>
  );
}

export function CandidateResultsClient({
  assessmentId,
  results: initialResults,
}: CandidateResultsClientProps) {
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
        // Reload the page to get the transformed data from the server
        window.location.reload();
      }
    } catch (error) {
      console.error("Error generating report:", error);
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
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Back Link + Header */}
      <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-stone-600 hover:text-stone-900 -ml-2"
        >
          <Link href="/candidate/dashboard">
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Back to My Assessments
          </Link>
        </Button>
        <div className="text-right">
          <h1 className="text-sm font-semibold text-stone-900">
            Assessment Results
          </h1>
          <p className="text-xs text-stone-400">{formattedDate}</p>
        </div>
      </div>

      {/* Radar Chart + Score Overview */}
      <CandidateRadarChartOverview results={results} />

      {/* Strengths & Growth Areas */}
      <CandidateStrengthsGrowthSection results={results} />

      {/* Core Dimensions (Skill Breakdown) */}
      <CandidateCoreDimensionsSection results={results} />

      {/* Work Style */}
      <CandidateWorkStyleSection results={results} />
    </div>
  );
}
