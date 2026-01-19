/**
 * Candidate Search Result Card Component
 *
 * Displays a candidate in search results with:
 * - Fit score (0-100)
 * - Archetype match
 * - 6 dimension scores as compact visual
 * - Threshold highlighting (green/amber for seniority)
 * - 1-sentence summary excerpt
 * - View Profile button
 *
 * @since 2026-01-17
 * @see Issue #74: US-012
 */

import Link from "next/link";
import { AssessmentDimension } from "@prisma/client";
import { ArrowRight, User, TrendingUp, X } from "lucide-react";
import type { RoleArchetype, WeightLevel } from "@/lib/candidate";
import type { SeniorityLevel } from "@/lib/candidate";
import { SENIORITY_THRESHOLDS } from "@/lib/candidate";

// ============================================================================
// Types
// ============================================================================

export interface DimensionScoreData {
  dimension: AssessmentDimension;
  score: number;
  /** Weight level for this dimension based on archetype */
  weightLevel?: WeightLevel;
}

export interface CandidateSearchResult {
  /** VideoAssessment ID */
  id: string;
  /** Candidate information */
  candidate: {
    id: string;
    name: string | null;
    email: string | null;
  };
  /** Fit score normalized to 0-100 */
  fitScore: number;
  /** Matched archetype */
  archetype: RoleArchetype;
  /** Seniority level used for threshold comparison */
  seniorityLevel: SeniorityLevel | null;
  /** Dimension scores with weight context */
  dimensionScores: DimensionScoreData[];
  /** 1-sentence summary excerpt */
  summaryExcerpt: string | null;
  /** Completion date */
  completedAt: Date | null;
}

// ============================================================================
// Constants
// ============================================================================

// Map dimension enums to short labels for compact display
const dimensionShortLabels: Record<AssessmentDimension, string> = {
  COMMUNICATION: "COMM",
  PROBLEM_SOLVING: "PROB",
  TECHNICAL_KNOWLEDGE: "TECH",
  COLLABORATION: "COLLAB",
  ADAPTABILITY: "ADAPT",
  LEADERSHIP: "LEAD",
  CREATIVITY: "CREATE",
  TIME_MANAGEMENT: "TIME",
};

// Display order for dimensions (6 most relevant for quick scanning)
const primaryDimensions: AssessmentDimension[] = [
  AssessmentDimension.TECHNICAL_KNOWLEDGE,
  AssessmentDimension.PROBLEM_SOLVING,
  AssessmentDimension.COMMUNICATION,
  AssessmentDimension.COLLABORATION,
  AssessmentDimension.ADAPTABILITY,
  AssessmentDimension.LEADERSHIP,
];

// Map archetype to human-readable display name
const archetypeDisplayNames: Record<RoleArchetype, string> = {
  SENIOR_FRONTEND_ENGINEER: "Frontend Engineer",
  SENIOR_BACKEND_ENGINEER: "Backend Engineer",
  FULLSTACK_ENGINEER: "Fullstack Engineer",
  ENGINEERING_MANAGER: "Eng Manager",
  TECH_LEAD: "Tech Lead",
  DEVOPS_ENGINEER: "DevOps Engineer",
  DATA_ENGINEER: "Data Engineer",
  GENERAL_SOFTWARE_ENGINEER: "Software Engineer",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the threshold status for a dimension score
 * @returns "exceeds" if score exceeds threshold, "meets" if equal, "below" if below
 */
function getThresholdStatus(
  score: number,
  seniorityLevel: SeniorityLevel | null,
  weightLevel?: WeightLevel
): "exceeds" | "meets" | "below" | null {
  if (!seniorityLevel) return null;

  const threshold = SENIORITY_THRESHOLDS[seniorityLevel];

  // Only check threshold for key dimensions (VERY_HIGH weight)
  if (weightLevel !== "VERY_HIGH" && threshold > 0) {
    return null;
  }

  if (threshold === 0) return null; // JUNIOR has no threshold
  if (score > threshold) return "exceeds";
  if (score === threshold) return "meets";
  return "below";
}

/**
 * Gets initials from name or email
 */
function getInitials(name: string | null, email: string | null): string {
  const displayName = name || email || "?";
  return displayName
    .split(/[\s@]+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Compact dimension score bar with threshold highlighting
 */
function DimensionScoreBar({
  dimension,
  score,
  weightLevel,
  seniorityLevel,
}: {
  dimension: AssessmentDimension;
  score: number;
  weightLevel?: WeightLevel;
  seniorityLevel: SeniorityLevel | null;
}) {
  const thresholdStatus = getThresholdStatus(
    score,
    seniorityLevel,
    weightLevel
  );

  // Determine bar color based on threshold status
  let barColorClass = "bg-secondary"; // Default gold
  if (thresholdStatus === "exceeds") {
    barColorClass = "bg-green-500";
  } else if (thresholdStatus === "below") {
    barColorClass = "bg-amber-500";
  }

  // Show indicator for key dimensions
  const isKeyDimension = weightLevel === "VERY_HIGH";

  return (
    <div className="flex items-center gap-2" data-testid="dimension-score-bar">
      <span
        className={`w-14 font-mono text-xs ${isKeyDimension ? "font-bold" : "text-muted-foreground"}`}
        data-testid="dimension-label"
      >
        {dimensionShortLabels[dimension]}
      </span>
      <div className="flex flex-1 gap-[2px]" data-testid="score-dots">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-2 flex-1 border border-foreground ${
              level <= score ? barColorClass : "bg-muted/30"
            }`}
            data-testid={`score-dot-${level}`}
          />
        ))}
      </div>
      <span
        className="w-4 text-right font-mono text-xs"
        data-testid="score-value"
      >
        {score}
      </span>
    </div>
  );
}

/**
 * Fit score badge with visual indicator
 */
function FitScoreBadge({ score }: { score: number }) {
  // Determine color based on score range
  let bgClass = "bg-muted";
  if (score >= 80) {
    bgClass = "bg-secondary";
  } else if (score >= 60) {
    bgClass = "bg-green-500/20 border-green-500";
  }

  return (
    <div
      className={`flex items-center gap-1 border-2 border-foreground px-3 py-2 ${bgClass}`}
      data-testid="fit-score-badge"
    >
      <TrendingUp
        size={14}
        className={score >= 80 ? "text-secondary-foreground" : ""}
      />
      <span
        className={`font-mono text-lg font-bold ${score >= 80 ? "text-secondary-foreground" : ""}`}
        data-testid="fit-score-value"
      >
        {Math.round(score)}
      </span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export interface CandidateSearchResultCardProps {
  candidate: CandidateSearchResult;
  /** Optional className for grid layout */
  className?: string;
  /** Optional callback when reject button is clicked */
  onReject?: (candidateId: string) => void;
}

export function CandidateSearchResultCard({
  candidate,
  className = "",
  onReject,
}: CandidateSearchResultCardProps) {
  const {
    id,
    candidate: candidateInfo,
    fitScore,
    archetype,
    seniorityLevel,
    dimensionScores,
    summaryExcerpt,
    completedAt,
  } = candidate;

  const initials = getInitials(candidateInfo.name, candidateInfo.email);
  const displayName = candidateInfo.name || candidateInfo.email || "Anonymous";

  // Create score map for easy lookup
  const scoreMap = new Map(dimensionScores.map((s) => [s.dimension, s]));

  // Format completion date
  const formattedDate = completedAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
      }).format(new Date(completedAt))
    : null;

  return (
    <article
      className={`flex h-full flex-col border-2 border-foreground bg-background ${className}`}
      data-testid="candidate-card"
    >
      {/* Header: Avatar, Name, Fit Score */}
      <header className="flex items-start gap-4 border-b-2 border-foreground p-4">
        {/* Avatar */}
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center border-2 border-foreground bg-secondary"
          data-testid="candidate-avatar"
        >
          <span className="text-sm font-bold text-secondary-foreground">
            {initials}
          </span>
        </div>

        {/* Name and Archetype */}
        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-lg font-bold"
            data-testid="candidate-name"
          >
            {displayName}
          </h3>
          <p
            className="truncate font-mono text-xs text-muted-foreground"
            data-testid="archetype-match"
          >
            {archetypeDisplayNames[archetype]}
          </p>
          {formattedDate && (
            <p className="mt-1 text-xs text-muted-foreground">
              Assessed {formattedDate}
            </p>
          )}
        </div>

        {/* Fit Score */}
        <FitScoreBadge score={fitScore} />
      </header>

      {/* Dimension Scores */}
      <section className="flex-1 p-4" data-testid="dimensions-section">
        <h4 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Dimension Scores
        </h4>
        <div className="space-y-2">
          {primaryDimensions.map((dimension) => {
            const scoreData = scoreMap.get(dimension);
            if (!scoreData) return null;

            return (
              <DimensionScoreBar
                key={dimension}
                dimension={dimension}
                score={scoreData.score}
                weightLevel={scoreData.weightLevel}
                seniorityLevel={seniorityLevel}
              />
            );
          })}
        </div>
      </section>

      {/* Summary Excerpt */}
      {summaryExcerpt && (
        <section
          className="border-t border-muted px-4 pb-4"
          data-testid="summary-section"
        >
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
            {summaryExcerpt}
          </p>
        </section>
      )}

      {/* Footer: View Profile Button + Reject Button */}
      <footer className="mt-auto border-t-2 border-foreground p-4">
        <div className="flex gap-2">
          <Link
            href={`/candidate/${id}?archetype=${archetype}`}
            className="flex flex-1 items-center justify-center gap-2 border-2 border-foreground bg-foreground px-4 py-3 font-bold text-background hover:bg-secondary hover:text-secondary-foreground"
            data-testid="view-profile-button"
          >
            View Profile
            <ArrowRight size={16} />
          </Link>
          {onReject && (
            <button
              onClick={() => onReject(id)}
              className="flex items-center justify-center gap-2 border-2 border-foreground bg-background px-4 py-3 font-medium text-foreground hover:border-red-500 hover:bg-red-100 hover:text-red-700"
              data-testid="reject-button"
              aria-label="Not a fit"
            >
              <X size={16} />
              Not a fit
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}

// ============================================================================
// Grid Container Component
// ============================================================================

export interface CandidateSearchResultGridProps {
  candidates: CandidateSearchResult[];
  /** Optional className for the grid container */
  className?: string;
  /** Optional callback when reject button is clicked on a card */
  onReject?: (candidateId: string) => void;
}

/**
 * Grid container for candidate search result cards
 * Displays 3-4 cards per row on desktop, responsive on smaller screens
 */
export function CandidateSearchResultGrid({
  candidates,
  className = "",
  onReject,
}: CandidateSearchResultGridProps) {
  if (candidates.length === 0) {
    return (
      <div
        className="border-2 border-foreground p-8 text-center"
        data-testid="no-results"
      >
        <User size={48} className="mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">
          No candidates found matching your criteria.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${className}`}
      data-testid="candidate-grid"
    >
      {candidates.map((candidate) => (
        <CandidateSearchResultCard
          key={candidate.id}
          candidate={candidate}
          onReject={onReject}
        />
      ))}
    </div>
  );
}
