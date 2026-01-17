import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/server/db";
import { VideoAssessmentStatus, AssessmentDimension } from "@prisma/client";
import { ArrowLeft, Eye, EyeOff, Video, ExternalLink } from "lucide-react";

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

function ScoreBar({ score, maxScore = 5 }: { score: number; maxScore?: number }) {
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

function DimensionScoreCard({
  dimension,
  score,
  observableBehaviors,
  trainableGap,
}: {
  dimension: AssessmentDimension;
  score: number;
  observableBehaviors: string;
  trainableGap: boolean;
}) {
  return (
    <div className="border-2 border-foreground p-4">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="font-bold">{dimensionLabels[dimension]}</div>
        <div className="font-mono text-lg font-bold">{score}/5</div>
      </div>
      <div className="max-w-xs mb-2">
        <ScoreBar score={score} />
      </div>
      <p className="text-sm text-muted-foreground">{observableBehaviors}</p>
      {trainableGap && (
        <span className="mt-2 inline-block font-mono text-xs px-2 py-1 border border-secondary bg-secondary/10">
          Trainable Gap
        </span>
      )}
    </div>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CandidateProfilePage({ params }: PageProps) {
  const { id } = await params;

  const videoAssessment = await db.videoAssessment.findUnique({
    where: { id },
    include: {
      candidate: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      scores: true,
      summary: true,
      assessment: {
        select: {
          id: true,
        },
      },
    },
  });

  // Only show completed assessments
  if (!videoAssessment || videoAssessment.status !== VideoAssessmentStatus.COMPLETED) {
    notFound();
  }

  const { candidate, scores, summary, assessment, completedAt, isSearchable } = videoAssessment;

  // Create a map of dimension to score for easy lookup
  const scoreMap = new Map(scores.map((s) => [s.dimension, s]));

  // Format completion date
  const formattedDate = completedAt
    ? new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(completedAt)
    : null;

  // Get initials for avatar
  const displayName = candidate.name || candidate.email || "Anonymous";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
              <p className="text-muted-foreground mb-2">{candidate.email}</p>
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
                  <span className="font-mono text-sm">Searchable by hiring managers</span>
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
          {scores.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {dimensionOrder.map((dimension) => {
                const scoreData = scoreMap.get(dimension);
                if (!scoreData) return null;
                return (
                  <DimensionScoreCard
                    key={dimension}
                    dimension={dimension}
                    score={scoreData.score}
                    observableBehaviors={scoreData.observableBehaviors}
                    trainableGap={scoreData.trainableGap}
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
            <h2 className="text-lg font-bold mb-4 font-mono">SIMULATION RECORDING</h2>
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
    </div>
  );
}
