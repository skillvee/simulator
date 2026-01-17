"use client";

import { useState, useRef } from "react";
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
} from "lucide-react";

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
}: {
  score: number;
  maxScore?: number;
}) {
  const segments = Array.from({ length: maxScore }, (_, i) => i + 1);

  return (
    <div className="flex gap-1" data-testid="score-bar">
      {segments.map((segment) => (
        <div
          key={segment}
          data-testid="score-segment"
          className={`h-3 flex-1 ${
            segment <= score ? "bg-secondary" : "bg-muted"
          } border border-foreground`}
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
      className="inline-flex items-center gap-1 font-mono text-sm px-2 py-1 border border-secondary bg-secondary/10 hover:bg-secondary hover:text-secondary-foreground"
      data-testid="timestamp-link"
    >
      <Clock size={12} />
      {timestamp}
    </button>
  );
}

function DimensionScoreCard({
  dimension,
  score,
  observableBehaviors,
  trainableGap,
  timestamps,
  onTimestampClick,
}: {
  dimension: AssessmentDimension;
  score: number;
  observableBehaviors: string;
  trainableGap: boolean;
  timestamps: unknown[];
  onTimestampClick: (seconds: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse and normalize timestamps from JSON
  const validTimestamps = timestamps
    .map(normalizeTimestamp)
    .filter((t): t is string => t !== null);

  return (
    <div className="border-2 border-foreground" data-testid="dimension-card">
      {/* Header - always visible, clickable to expand */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left hover:bg-accent/50 flex items-center justify-between"
        data-testid="dimension-header"
      >
        <div className="flex-1">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="font-bold">{dimensionLabels[dimension]}</div>
            <div className="font-mono text-lg font-bold">{score}/5</div>
          </div>
          <div className="max-w-xs">
            <ScoreBar score={score} />
          </div>
        </div>
        <div className="ml-4">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Expandable details section */}
      {isExpanded && (
        <div
          className="border-t-2 border-foreground p-4 bg-muted/10"
          data-testid="dimension-details"
        >
          {/* Observable behaviors */}
          <div className="mb-4">
            <h4 className="font-mono text-xs font-bold mb-2 text-muted-foreground">
              OBSERVABLE BEHAVIORS
            </h4>
            <p className="text-sm">{observableBehaviors}</p>
          </div>

          {/* Timestamps */}
          {validTimestamps.length > 0 && (
            <div className="mb-4">
              <h4 className="font-mono text-xs font-bold mb-2 text-muted-foreground">
                VIDEO TIMESTAMPS
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
              <span className="inline-block font-mono text-xs px-2 py-1 border border-secondary bg-secondary/10">
                Trainable Gap
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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

  // Set initial time when video loads
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = initialTime;
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked, that's okay
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
      data-testid="video-modal"
    >
      <div
        className="relative w-full max-w-4xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white hover:text-secondary"
          data-testid="close-modal"
        >
          <X size={24} />
        </button>

        {/* Video player */}
        <div className="border-2 border-foreground bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full"
            data-testid="video-player"
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Current timestamp display */}
        <div className="mt-2 text-center text-white font-mono text-sm">
          Starting at {Math.floor(initialTime / 60)}:
          {String(Math.floor(initialTime % 60)).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
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

export function CandidateProfileClient({
  data,
}: {
  data: CandidateProfileData;
}) {
  const [videoModal, setVideoModal] = useState<{
    isOpen: boolean;
    initialTime: number;
  }>({ isOpen: false, initialTime: 0 });

  const { candidate, scores, summary, assessment, completedAt, isSearchable, videoUrl } =
    data;

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

  // Handle timestamp click - open video modal at that time
  const handleTimestampClick = (seconds: number) => {
    setVideoModal({ isOpen: true, initialTime: seconds });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-2 border-foreground">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Candidate Info Section */}
        <section className="border-2 border-foreground p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 bg-secondary border-2 border-foreground flex items-center justify-center">
              <span className="text-xl font-bold text-secondary-foreground">
                {initials}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">{displayName}</h1>
              {candidate.email && (
                <p className="text-muted-foreground mb-2">{candidate.email}</p>
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
                <span className="inline-flex items-center gap-2 px-3 py-2 border-2 border-foreground bg-secondary/10">
                  <Eye size={16} />
                  <span className="font-mono text-sm">
                    Searchable by hiring managers
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-2 border-2 border-foreground bg-muted">
                  <EyeOff size={16} />
                  <span className="font-mono text-sm">Private</span>
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Overall Summary Section */}
        <section className="border-2 border-foreground p-6">
          <h2 className="text-lg font-bold mb-4 font-mono">OVERALL SUMMARY</h2>
          {summary?.overallSummary ? (
            <p className="text-muted-foreground leading-relaxed">
              {summary.overallSummary}
            </p>
          ) : (
            <p className="text-muted-foreground italic">No summary available</p>
          )}
        </section>

        {/* Dimension Scores Section */}
        <section>
          <h2 className="text-lg font-bold mb-4 font-mono">ASSESSMENT SCORES</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Click on a dimension to expand details and view video evidence.
          </p>
          {scores.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {dimensionOrder.map((dimension) => {
                const scoreData = scoreMap.get(dimension);
                if (!scoreData) return null;

                // Parse timestamps from JSON field
                const timestamps = Array.isArray(scoreData.timestamps)
                  ? scoreData.timestamps
                  : [];

                return (
                  <DimensionScoreCard
                    key={dimension}
                    dimension={dimension}
                    score={scoreData.score}
                    observableBehaviors={scoreData.observableBehaviors}
                    trainableGap={scoreData.trainableGap}
                    timestamps={timestamps}
                    onTimestampClick={handleTimestampClick}
                  />
                );
              })}
            </div>
          ) : (
            <div className="border-2 border-foreground p-6 text-center">
              <p className="text-muted-foreground italic">No scores available</p>
            </div>
          )}
        </section>

        {/* Recording Link Section */}
        {assessment && (
          <section className="border-2 border-foreground p-6">
            <h2 className="text-lg font-bold mb-4 font-mono">
              SIMULATION RECORDING
            </h2>
            <Link
              href={`/assessment/${assessment.id}/results`}
              className="inline-flex items-center gap-2 px-4 py-2 border-2 border-foreground bg-foreground text-background hover:bg-secondary hover:text-secondary-foreground"
            >
              <Video size={16} />
              View Simulation Recording
              <ExternalLink size={14} />
            </Link>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-foreground mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-sm text-muted-foreground">
          <p>Candidate profile generated by Skillvee Simulator</p>
        </div>
      </footer>

      {/* Video Player Modal */}
      {videoModal.isOpen && (
        <VideoPlayerModal
          videoUrl={videoUrl}
          initialTime={videoModal.initialTime}
          onClose={() => setVideoModal({ isOpen: false, initialTime: 0 })}
        />
      )}
    </div>
  );
}
