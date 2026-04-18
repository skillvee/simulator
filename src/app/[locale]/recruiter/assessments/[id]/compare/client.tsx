"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseTimestampToSeconds,
  getInitials,
  getStrengthBadgeStyles,
} from "./components/helpers";
import type {
  CandidateComparison,
  CandidateCompareClientProps,
} from "./components/types";
import { RadarChartOverview } from "./components/radar-chart-overview";
import { StrengthsGrowthSection } from "./components/strengths-growth-section";
import { CoreDimensionsSection } from "./components/core-dimensions-section";
import { WorkStyleSection } from "./components/work-style-section";
import { VideoModal } from "./components/video-modal";
import { LoadingSkeleton } from "./components/loading-skeleton";
import { ForbiddenError, ErrorState } from "./components/error-states";

export function CandidateCompareClient({
  simulationId,
  simulationName,
  assessmentIds,
}: CandidateCompareClientProps) {
  const [candidates, setCandidates] = useState<CandidateComparison[] | null>(
    null
  );
  const [totalCandidatesInSimulation, setTotalCandidatesInSimulation] =
    useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{
    code: number;
    message: string;
  } | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("0");

  // Video modal state
  const [videoModal, setVideoModal] = useState<{
    isOpen: boolean;
    videoUrl: string | null;
    initialTime: number;
    candidateName: string | null;
    dimensionName?: string;
  }>({
    isOpen: false,
    videoUrl: null,
    initialTime: 0,
    candidateName: null,
  });

  // Fetch comparison data
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(
          `/api/recruiter/candidates/compare?simulationId=${simulationId}&assessmentIds=${assessmentIds.join(",")}`
        );

        if (!response.ok) {
          setError({
            code: response.status,
            message:
              response.status === 403
                ? "Access denied"
                : "Failed to load comparison data",
          });
          return;
        }

        const result = await response.json();
        // Handle both old (array) and new (object with candidates) response shapes
        if (Array.isArray(result.data)) {
          setCandidates(result.data);
        } else {
          setCandidates(result.data.candidates);
          setTotalCandidatesInSimulation(
            result.data.totalCandidatesInSimulation ?? 0
          );
        }
      } catch {
        setError({
          code: 500,
          message: "An error occurred while fetching data",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [simulationId, assessmentIds]);

  // Find winner(s) for overall score
  const winnerIds = useMemo(() => {
    if (!candidates || candidates.length <= 1) return new Set<string>();
    const maxScore = Math.max(...candidates.map((c) => c.overallScore));
    return new Set(
      candidates
        .filter((c) => c.overallScore === maxScore)
        .map((c) => c.assessmentId)
    );
  }, [candidates]);

  const handleTimestampClick = (
    timestamp: string,
    candidateName: string | null,
    videoUrl: string,
    dimensionName?: string
  ) => {
    const seconds = parseTimestampToSeconds(timestamp);
    if (seconds === null) return;

    setVideoModal({
      isOpen: true,
      videoUrl,
      initialTime: seconds,
      candidateName,
      dimensionName,
    });
  };

  const handleCloseModal = () => {
    setVideoModal({
      isOpen: false,
      videoUrl: null,
      initialTime: 0,
      candidateName: null,
    });
  };

  if (loading) return <LoadingSkeleton />;
  if (error?.code === 403) return <ForbiddenError />;
  if (error || !candidates) {
    return <ErrorState error={error?.message ?? "Unknown error"} />;
  }

  const isSingle = candidates.length === 1;
  const showPercentiles = totalCandidatesInSimulation >= 10;

  // Mobile layout — tabs for each candidate (multi-candidate only)
  const renderMobileLayout = () => {
    if (isSingle) return null;
    return (
      <div className="md:hidden">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <div className="sticky top-0 z-50 bg-white border-b border-stone-200">
            <TabsList
              className="w-full grid"
              style={{
                gridTemplateColumns: `repeat(${candidates.length}, 1fr)`,
              }}
            >
              {candidates.map((candidate, index) => (
                <TabsTrigger
                  key={candidate.assessmentId}
                  value={String(index)}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                      {getInitials(candidate.candidateName)}
                    </div>
                    <span className="text-xs truncate max-w-[80px]">
                      {candidate.candidateName || "Anonymous"}
                    </span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {candidates.map((candidate, index) => {
            const isWinner = winnerIds.has(candidate.assessmentId);
            return (
              <TabsContent key={candidate.assessmentId} value={String(index)}>
                <div className={cn("p-6", isWinner && "bg-blue-50/50")}>
                  <div className="flex flex-col items-center gap-4">
                    <div
                      className={cn(
                        "h-32 w-32 rounded-full flex items-center justify-center border-4",
                        isWinner
                          ? "border-blue-600 bg-blue-50"
                          : "border-stone-200 bg-stone-50"
                      )}
                    >
                      <span
                        className={cn(
                          "text-4xl font-bold",
                          isWinner ? "text-blue-600" : "text-stone-900"
                        )}
                      >
                        {candidate.overallScore.toFixed(1)}
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-2 w-full">
                      <Badge
                        className={getStrengthBadgeStyles(
                          candidate.strengthLevel
                        )}
                      >
                        {candidate.strengthLevel}
                      </Badge>
                      {showPercentiles && (
                        <Badge variant="outline" className="text-xs">
                          Top{" "}
                          {Math.round(100 - candidate.overallPercentile)}%
                          <span className="text-stone-400 ml-1">
                            of {totalCandidatesInSimulation}
                          </span>
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-stone-600 text-center">
                      {candidate.summary || "No summary available"}
                    </p>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Back Link */}
      <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-stone-600 hover:text-stone-900 -ml-2"
        >
          <Link href={`/recruiter/assessments/${simulationId}`}>
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Back to {simulationName}
          </Link>
        </Button>

        {isSingle && (
          <Button asChild variant="outline" size="sm" className="border-stone-200">
            <Link href={`/recruiter/assessments/${simulationId}`}>
              <Users className="mr-1.5 h-4 w-4" />
              Compare with others
            </Link>
          </Button>
        )}
      </div>

      {/* Radar Chart + Overview — always visible for single, desktop-only for multi */}
      {isSingle ? (
        <RadarChartOverview
          candidates={candidates}
          winnerIds={winnerIds}
          showPercentiles={showPercentiles}
          totalCandidatesInSimulation={totalCandidatesInSimulation}
        />
      ) : (
        <div className="hidden md:block">
          <RadarChartOverview
            candidates={candidates}
            winnerIds={winnerIds}
            showPercentiles={showPercentiles}
            totalCandidatesInSimulation={totalCandidatesInSimulation}
          />
        </div>
      )}

      {/* Mobile: Tab-based layout (multi-candidate only) */}
      {renderMobileLayout()}

      {/* Strengths & Growth Areas */}
      <StrengthsGrowthSection candidates={candidates} />

      {/* Core Dimensions (collapsed by default) */}
      <CoreDimensionsSection
        candidates={candidates}
        onTimestampClick={handleTimestampClick}
      />

      {/* Work Style */}
      <WorkStyleSection candidates={candidates} />

      {/* Video Modal */}
      <VideoModal
        isOpen={videoModal.isOpen}
        onClose={handleCloseModal}
        videoUrl={videoModal.videoUrl}
        initialTime={videoModal.initialTime}
        candidateName={videoModal.candidateName}
        dimensionName={videoModal.dimensionName}
      />
    </div>
  );
}
