"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { AssessmentDimension } from "@prisma/client";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Video,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  Briefcase,
  ToggleLeft,
  ToggleRight,
  Star,
} from "lucide-react";
import {
  type RoleArchetype,
  type WeightLevel,
  calculateFitScore,
  getArchetypeDisplayName,
  getWeightLevelForDimension,
  ARCHETYPE_CONFIGS,
  WEIGHT_MULTIPLIERS,
} from "@/lib/candidate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Map dimension enums to human-readable labels
const dimensionLabels: Record<AssessmentDimension, string> = {
  COMMUNICATION: "Communication",
  PROBLEM_SOLVING: "Problem Solving",
  TECHNICAL_KNOWLEDGE: "Technical Knowledge",
  COLLABORATION: "Collaboration",
  ADAPTABILITY: "Adaptability",
  LEADERSHIP: "Leadership",
  CREATIVITY: "Creativity",
  TIME_MANAGEMENT: "Time Management",
};

// All dimensions in display order
const dimensionOrder: AssessmentDimension[] = [
  AssessmentDimension.COMMUNICATION,
  AssessmentDimension.PROBLEM_SOLVING,
  AssessmentDimension.TECHNICAL_KNOWLEDGE,
  AssessmentDimension.COLLABORATION,
  AssessmentDimension.ADAPTABILITY,
  AssessmentDimension.LEADERSHIP,
  AssessmentDimension.CREATIVITY,
  AssessmentDimension.TIME_MANAGEMENT,
];

// Parse timestamp string to seconds for video seeking
// Accepts formats like "2:34", "15:07", "1:23:45"
export function parseTimestampToSeconds(timestamp: string): number | null {
  const parts = timestamp.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) return null;

  if (parts.length === 2) {
    // MM:SS format
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // HH:MM:SS format
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return null;
}

// Format timestamp from JSON (could be string or other format)
export function normalizeTimestamp(timestamp: unknown): string | null {
  if (typeof timestamp === "string") {
    // Validate it looks like a timestamp
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timestamp)) {
      return timestamp;
    }
  }
  return null;
}

function ScoreBar({
  score,
  maxScore = 5,
  emphasized = false,
  deemphasized = false,
}: {
  score: number;
  maxScore?: number;
  /** Emphasize this score (primary background, larger) */
  emphasized?: boolean;
  /** De-emphasize this score (muted styling) */
  deemphasized?: boolean;
}) {
  const segments = Array.from({ length: maxScore }, (_, i) => i + 1);

  // Determine bar fill color based on emphasis
  const getSegmentClass = (filled: boolean) => {
    if (!filled) {
      return deemphasized ? "bg-muted/50" : "bg-muted";
    }
    if (deemphasized) {
      return "bg-muted-foreground/30";
    }
    return "bg-primary";
  };

  return (
    <div
      className={`flex gap-1 ${emphasized ? "h-4" : "h-3"}`}
      data-testid="score-bar"
    >
      {segments.map((segment) => (
        <div
          key={segment}
          data-testid="score-segment"
          className={`flex-1 rounded-sm ${getSegmentClass(segment <= score)}`}
        />
      ))}
    </div>
  );
}

function TimestampLink({
  timestamp,
  onTimestampClick,
}: {
  timestamp: string;
  onTimestampClick: (seconds: number) => void;
}) {
  const seconds = parseTimestampToSeconds(timestamp);
  if (seconds === null) return null;

  return (
    <button
      type="button"
      onClick={() => onTimestampClick(seconds)}
      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 font-mono text-sm text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
      data-testid="timestamp-link"
    >
      <Clock size={12} />
      {timestamp}
    </button>
  );
}

/** Weight level badge for dimension cards */
function WeightLevelBadge({ level }: { level: WeightLevel }) {
  const labels: Record<WeightLevel, string> = {
    VERY_HIGH: "Critical",
    HIGH: "Important",
    MEDIUM: "Standard",
  };

  const styles: Record<WeightLevel, string> = {
    VERY_HIGH: "bg-primary text-primary-foreground",
    HIGH: "bg-primary/20 text-primary",
    MEDIUM: "bg-muted text-muted-foreground",
  };

  return (
    <Badge
      variant="secondary"
      className={`inline-flex items-center gap-1 rounded-md text-xs ${styles[level]}`}
      data-testid="weight-level-badge"
    >
      {level === "VERY_HIGH" && <Star size={10} className="fill-current" />}
      {labels[level]}
    </Badge>
  );
}

function DimensionScoreCard({
  dimension,
  score,
  observableBehaviors,
  trainableGap,
  timestamps,
  onTimestampClick,
  weightLevel,
  showWeightLevel = false,
}: {
  dimension: AssessmentDimension;
  score: number;
  observableBehaviors: string;
  trainableGap: boolean;
  timestamps: unknown[];
  onTimestampClick: (seconds: number) => void;
  /** Weight level for this dimension (when viewing with archetype context) */
  weightLevel?: WeightLevel;
  /** Whether to show the weight level badge */
  showWeightLevel?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse and normalize timestamps from JSON
  const validTimestamps = timestamps
    .map(normalizeTimestamp)
    .filter((t): t is string => t !== null);

  // Determine emphasis based on weight level
  const isEmphasized = weightLevel === "VERY_HIGH";
  const isDeemphasized = weightLevel === "MEDIUM";

  // Card styling based on emphasis
  const cardBorderClass = isEmphasized
    ? "border-primary"
    : isDeemphasized
      ? "border-muted"
      : "";

  const headerBgClass = isEmphasized
    ? "hover:bg-primary/5"
    : isDeemphasized
      ? "hover:bg-muted/30 opacity-70"
      : "hover:bg-muted/50";

  return (
    <Card
      className={`overflow-hidden transition-all duration-200 ${cardBorderClass} ${isEmphasized ? "ring-1 ring-primary" : ""}`}
      data-testid="dimension-card"
      data-weight-level={weightLevel}
    >
      {/* Header - always visible, clickable to expand */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full p-4 text-left ${headerBgClass} flex items-center justify-between transition-colors`}
        data-testid="dimension-header"
      >
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`font-semibold ${isDeemphasized ? "text-muted-foreground" : ""}`}
              >
                {dimensionLabels[dimension]}
              </span>
              {showWeightLevel && weightLevel && (
                <WeightLevelBadge level={weightLevel} />
              )}
            </div>
            <div
              className={`text-lg font-semibold ${isDeemphasized ? "text-muted-foreground" : "text-primary"}`}
            >
              {score}/5
            </div>
          </div>
          <div className="max-w-xs">
            <ScoreBar
              score={score}
              emphasized={isEmphasized}
              deemphasized={isDeemphasized}
            />
          </div>
        </div>
        <div
          className={`ml-4 ${isDeemphasized ? "text-muted-foreground" : ""}`}
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Expandable details section */}
      {isExpanded && (
        <div
          className="border-t border-border bg-muted/30 p-4"
          data-testid="dimension-details"
        >
          {/* Observable behaviors */}
          <div className="mb-4">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Observable Behaviors
            </h4>
            <p className="text-sm">{observableBehaviors}</p>
          </div>

          {/* Timestamps */}
          {validTimestamps.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Video Timestamps
              </h4>
              <div className="flex flex-wrap gap-2">
                {validTimestamps.map((timestamp, index) => (
                  <TimestampLink
                    key={`${timestamp}-${index}`}
                    timestamp={timestamp}
                    onTimestampClick={onTimestampClick}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Trainable gap indicator */}
          {trainableGap && (
            <div>
              <Badge variant="outline" className="rounded-md bg-primary/10 text-primary">
                Trainable Gap
              </Badge>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// Format seconds to MM:SS or HH:MM:SS format
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

// Available playback speeds
const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function VideoPlayerModal({
  videoUrl,
  initialTime,
  onClose,
}: {
  videoUrl: string;
  initialTime: number;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Set initial time when video loads
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = initialTime;
      setDuration(videoRef.current.duration);
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked, that's okay
      });
    }
  };

  // Update current time as video plays
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Change playback speed
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
      data-testid="video-modal"
    >
      <div
        className="relative mx-4 w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white transition-colors hover:text-primary"
          data-testid="close-modal"
        >
          <X size={24} />
        </button>

        {/* Video player */}
        <div className="overflow-hidden rounded-xl bg-black shadow-lg">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            className="w-full"
            data-testid="video-player"
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Timestamp and controls bar */}
        <div className="mt-2 flex items-center justify-between font-mono text-sm text-white">
          {/* Current time / Duration */}
          <div data-testid="time-display">
            <span data-testid="current-time">{formatTime(currentTime)}</span>
            <span className="text-muted-foreground"> / </span>
            <span data-testid="total-duration">{formatTime(duration)}</span>
          </div>

          {/* Playback speed controls */}
          <div className="flex items-center gap-1" data-testid="speed-controls">
            <span className="mr-2 text-xs text-muted-foreground">Speed:</span>
            {PLAYBACK_SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => handleSpeedChange(speed)}
                className={`rounded-md px-2 py-1 text-xs transition-colors ${
                  playbackSpeed === speed
                    ? "bg-primary text-primary-foreground"
                    : "border border-white/30 hover:border-white"
                }`}
                data-testid={`speed-${speed}`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Role-Specific View Components
// ============================================================================

/**
 * Banner showing the role being used to view the profile
 */
function RoleBanner({ archetype }: { archetype: RoleArchetype }) {
  const displayName = getArchetypeDisplayName(archetype);

  return (
    <Card
      className="border-primary bg-primary/5"
      data-testid="role-banner"
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Briefcase size={20} className="text-primary" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Viewing as
          </p>
          <p className="text-lg font-semibold" data-testid="role-name">
            {displayName} role
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Fit score breakdown showing how the score was calculated
 */
function FitScoreBreakdown({
  scores,
  archetype,
}: {
  scores: Array<{ dimension: AssessmentDimension; score: number }>;
  archetype: RoleArchetype;
}) {
  // Calculate fit score using the archetype weights
  const dimensionScoreInputs = scores.map((s) => ({
    dimension: s.dimension,
    score: s.score,
  }));
  const result = calculateFitScore(dimensionScoreInputs, archetype);

  // Sort breakdown by weighted contribution (highest first)
  const sortedBreakdown = [...result.breakdown].sort(
    (a, b) => b.weightedScore - a.weightedScore
  );

  // Get top 3 contributors
  const topContributors = sortedBreakdown.slice(0, 3);

  return (
    <Card data-testid="fit-score-breakdown">
      <CardContent className="p-6">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <h2 className="mb-1 text-lg font-semibold">Fit Score</h2>
            <p className="text-sm text-muted-foreground">
              How well this candidate matches the{" "}
              {getArchetypeDisplayName(archetype)} role
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary bg-primary/10"
              data-testid="fit-score-value"
            >
              <span className="text-3xl font-semibold text-primary">
                {Math.round(result.fitScore)}
              </span>
            </div>
          </div>
        </div>

        {/* Score calculation explanation */}
        <div className="mb-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Top Contributing Dimensions
          </h3>
          <div className="space-y-3">
            {topContributors.map((item) => (
              <div
                key={item.dimension}
                className="flex items-center gap-4"
                data-testid="contribution-item"
              >
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium">
                      {dimensionLabels[item.dimension]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({WEIGHT_MULTIPLIERS[item.weightLevel]}x weight)
                    </span>
                  </div>
                  {/* Contribution bar */}
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${(item.weightedScore / result.maxPossible) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.rawScore}/5 → {item.weightedScore.toFixed(1)} pts
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formula explanation */}
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Score = {result.weightedSum.toFixed(1)} /{" "}
            {result.maxPossible.toFixed(1)} × 100 = {result.fitScore.toFixed(1)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Toggle button for switching between weighted and raw assessment view
 */
function ViewModeToggle({
  showRawAssessment,
  onToggle,
}: {
  showRawAssessment: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      variant="outline"
      onClick={onToggle}
      className="inline-flex items-center gap-2"
      data-testid="view-mode-toggle"
    >
      {showRawAssessment ? (
        <>
          <ToggleRight size={20} className="text-primary" />
          <span className="text-sm">Viewing: Raw Assessment</span>
        </>
      ) : (
        <>
          <ToggleLeft size={20} />
          <span className="text-sm">Viewing: Role-Weighted</span>
        </>
      )}
    </Button>
  );
}

/**
 * Check if a string is a valid RoleArchetype
 */
function isValidArchetype(value: string | null): value is RoleArchetype {
  if (!value) return false;
  return Object.keys(ARCHETYPE_CONFIGS).includes(value);
}

// Types for the component props
export interface CandidateProfileData {
  id: string;
  videoUrl: string;
  completedAt: Date | null;
  isSearchable: boolean;
  candidate: {
    id: string;
    name: string | null;
    email: string | null;
  };
  scores: Array<{
    id: string;
    dimension: AssessmentDimension;
    score: number;
    observableBehaviors: string;
    trainableGap: boolean;
    timestamps: unknown;
  }>;
  summary: {
    overallSummary: string;
  } | null;
  assessment: {
    id: string;
  } | null;
}

// Inner component that uses useSearchParams
function CandidateProfileInner({ data }: { data: CandidateProfileData }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [videoModal, setVideoModal] = useState<{
    isOpen: boolean;
    initialTime: number;
  }>({ isOpen: false, initialTime: 0 });

  // Toggle for raw assessment view
  const [showRawAssessment, setShowRawAssessment] = useState(false);

  const {
    candidate,
    scores,
    summary,
    assessment,
    completedAt,
    isSearchable,
    videoUrl,
  } = data;

  // Get archetype from URL parameters (if coming from search)
  const archetypeParam = searchParams.get("archetype");
  const archetype = isValidArchetype(archetypeParam) ? archetypeParam : null;

  // Check for timestamp URL parameter on mount
  useEffect(() => {
    const timeParam = searchParams.get("t");
    if (timeParam) {
      const seconds = parseInt(timeParam, 10);
      if (!isNaN(seconds) && seconds >= 0) {
        setVideoModal({ isOpen: true, initialTime: seconds });
      }
    }
  }, [searchParams]);

  // Update URL when timestamp changes
  const handleTimestampClick = useCallback(
    (seconds: number) => {
      // Update URL with timestamp parameter
      const params = new URLSearchParams(searchParams.toString());
      params.set("t", String(seconds));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      setVideoModal({ isOpen: true, initialTime: seconds });
    },
    [searchParams, router, pathname]
  );

  // Clear URL parameter when closing modal
  const handleCloseModal = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("t");
    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(newUrl, { scroll: false });

    setVideoModal({ isOpen: false, initialTime: 0 });
  }, [searchParams, router, pathname]);

  // Create a map of dimension to score for easy lookup
  const scoreMap = new Map(scores.map((s) => [s.dimension, s]));

  // Format completion date
  const formattedDate = completedAt
    ? new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(completedAt))
    : null;

  // Get initials for avatar
  const displayName = candidate.name || candidate.email || "Anonymous";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Determine if we should show role-specific view
  const showRoleSpecificView = archetype !== null && !showRawAssessment;

  // Get weight level for a dimension
  const getWeightLevel = (
    dimension: AssessmentDimension
  ): WeightLevel | undefined => {
    if (!archetype || showRawAssessment) return undefined;
    return getWeightLevelForDimension(archetype, dimension);
  };

  // Sort dimensions by weight level when in role-specific view
  const sortedDimensionOrder = showRoleSpecificView
    ? [...dimensionOrder].sort((a, b) => {
        const weightA = getWeightLevel(a);
        const weightB = getWeightLevel(b);
        const order: Record<WeightLevel, number> = {
          VERY_HIGH: 0,
          HIGH: 1,
          MEDIUM: 2,
        };
        return (weightA ? order[weightA] : 3) - (weightB ? order[weightB] : 3);
      })
    : dimensionOrder;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href={archetype ? "/candidate_search" : "/"}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft size={16} />
            {archetype ? "Back to Search" : "Back to Home"}
          </Link>
          {/* View mode toggle (only show when viewing with archetype) */}
          {archetype && (
            <ViewModeToggle
              showRawAssessment={showRawAssessment}
              onToggle={() => setShowRawAssessment(!showRawAssessment)}
            />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        {/* Role Banner (only when viewing with archetype context) */}
        {showRoleSpecificView && archetype && (
          <RoleBanner archetype={archetype} />
        )}

        {/* Candidate Info Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1">
                <h1 className="mb-1 text-2xl font-semibold">{displayName}</h1>
                {candidate.email && (
                  <p className="mb-2 text-muted-foreground">{candidate.email}</p>
                )}
                {formattedDate && (
                  <p className="text-sm text-muted-foreground">
                    Simulation completed: {formattedDate}
                  </p>
                )}
              </div>

              {/* Searchable Status Badge */}
              <div className="flex items-center gap-2">
                {isSearchable ? (
                  <Badge variant="outline" className="inline-flex items-center gap-2 rounded-md bg-green-500/10 px-3 py-2 text-green-600">
                    <Eye size={16} />
                    <span className="text-sm">
                      Searchable by hiring managers
                    </span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                    <EyeOff size={16} />
                    <span className="text-sm">Private</span>
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fit Score Breakdown (only when viewing with archetype context) */}
        {showRoleSpecificView && archetype && scores.length > 0 && (
          <FitScoreBreakdown
            scores={scores.map((s) => ({
              dimension: s.dimension,
              score: s.score,
            }))}
            archetype={archetype}
          />
        )}

        {/* Overall Summary Section */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Overall Summary</h2>
            {summary?.overallSummary ? (
              <p className="leading-relaxed text-muted-foreground">
                {summary.overallSummary}
              </p>
            ) : (
              <p className="italic text-muted-foreground">No summary available</p>
            )}
          </CardContent>
        </Card>

        {/* Dimension Scores Section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Assessment Scores</h2>
            {showRoleSpecificView && (
              <p className="text-xs text-muted-foreground">
                Sorted by importance for{" "}
                {archetype && getArchetypeDisplayName(archetype)}
              </p>
            )}
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Click on a dimension to expand details and view video evidence.
            {showRoleSpecificView && (
              <span className="mt-1 block">
                Emphasized dimensions are most critical for this role.
              </span>
            )}
          </p>
          {scores.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {sortedDimensionOrder.map((dimension) => {
                const scoreData = scoreMap.get(dimension);
                if (!scoreData) return null;

                // Parse timestamps from JSON field
                const timestamps = Array.isArray(scoreData.timestamps)
                  ? scoreData.timestamps
                  : [];

                const weightLevel = getWeightLevel(dimension);

                return (
                  <DimensionScoreCard
                    key={dimension}
                    dimension={dimension}
                    score={scoreData.score}
                    observableBehaviors={scoreData.observableBehaviors}
                    trainableGap={scoreData.trainableGap}
                    timestamps={timestamps}
                    onTimestampClick={handleTimestampClick}
                    weightLevel={weightLevel}
                    showWeightLevel={showRoleSpecificView}
                  />
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="italic text-muted-foreground">
                  No scores available
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Recording Link Section */}
        {assessment && (
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-semibold">
                Simulation Recording
              </h2>
              <Button asChild>
                <Link
                  href={`/assessment/${assessment.id}/results`}
                  className="inline-flex items-center gap-2"
                >
                  <Video size={16} />
                  View Simulation Recording
                  <ExternalLink size={14} />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border">
        <div className="mx-auto max-w-4xl px-6 py-6 text-center text-sm text-muted-foreground">
          <p>Candidate profile generated by Skillvee Simulator</p>
        </div>
      </footer>

      {/* Video Player Modal */}
      {videoModal.isOpen && (
        <VideoPlayerModal
          videoUrl={videoUrl}
          initialTime={videoModal.initialTime}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

// Loading skeleton for Suspense boundary
function CandidateProfileSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="h-16 w-16 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-48 rounded bg-muted" />
                <div className="h-4 w-32 rounded bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// Main exported component with Suspense boundary
export function CandidateProfileClient({
  data,
}: {
  data: CandidateProfileData;
}) {
  return (
    <Suspense fallback={<CandidateProfileSkeleton />}>
      <CandidateProfileInner data={data} />
    </Suspense>
  );
}
