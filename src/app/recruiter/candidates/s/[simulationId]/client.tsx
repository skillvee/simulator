"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, AlertTriangle, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Candidate strength levels based on overall score (1-4 scale)
 */
type CandidateStrengthLevel = "Exceptional" | "Strong" | "Proficient" | "Developing";

/**
 * Candidate data for the scoped table
 */
interface CandidateData {
  assessmentId: string;
  name: string | null;
  email: string | null;
  status: string;
  overallScore: number | null;
  percentile: number | null;
  strengthLevel: CandidateStrengthLevel | null;
  topDimension: { name: string; score: number } | null;
  midDimension: { name: string; score: number } | null;
  bottomDimension: { name: string; score: number } | null;
  redFlagCount: number;
  evaluationConfidence: string | null;
  summary: string | null;
  completedAt: string | null;
}

interface ScopedCandidatesClientProps {
  simulationId: string;
  simulationName: string;
  candidates: CandidateData[];
}

/**
 * Get initials from name
 */
function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Get badge variant for status
 */
function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" {
  switch (status) {
    case "COMPLETED":
      return "default"; // green
    case "WORKING":
      return "secondary"; // blue
    case "WELCOME":
      return "outline"; // gray
    default:
      return "outline";
  }
}

/**
 * Get badge variant for strength level
 */
function getStrengthBadgeColor(level: CandidateStrengthLevel | null): string {
  switch (level) {
    case "Exceptional":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "Strong":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "Proficient":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    case "Developing":
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
}

/**
 * Render 4-segment score bar
 */
function ScoreBar({ score }: { score: number }) {
  // Each segment represents 1 point on the 1-4 scale
  // A score of 3.2 fills 3 full segments and ~20% of the 4th
  const segments = 4;
  const filledSegments = Math.floor(score);
  const partialFill = (score % 1) * 100;

  return (
    <div className="flex gap-1">
      {Array.from({ length: segments }).map((_, i) => {
        const isFilled = i < filledSegments;
        const isPartial = i === filledSegments && partialFill > 0;

        return (
          <div
            key={i}
            className="h-5 w-8 rounded-sm border border-gray-300 overflow-hidden bg-gray-100"
          >
            {isFilled && <div className="h-full w-full bg-blue-500" />}
            {isPartial && (
              <div
                className="h-full bg-blue-500"
                style={{ width: `${partialFill}%` }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Format completed date
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Abbreviate dimension names for compact display
 */
function abbreviateDimension(dimension: string): string {
  const abbreviations: Record<string, string> = {
    COMMUNICATION: "Comm",
    PROBLEM_SOLVING: "Problem",
    TECHNICAL_KNOWLEDGE: "Tech",
    COLLABORATION: "Collab",
    ADAPTABILITY: "Adapt",
    LEADERSHIP: "Lead",
    CREATIVITY: "Creative",
    TIME_MANAGEMENT: "Time",
  };

  return abbreviations[dimension] ?? dimension;
}

/**
 * Get full dimension name for tooltip
 */
function getFullDimensionName(dimension: string): string {
  const fullNames: Record<string, string> = {
    COMMUNICATION: "Communication",
    PROBLEM_SOLVING: "Problem Solving",
    TECHNICAL_KNOWLEDGE: "Technical Knowledge",
    COLLABORATION: "Collaboration",
    ADAPTABILITY: "Adaptability",
    LEADERSHIP: "Leadership",
    CREATIVITY: "Creativity",
    TIME_MANAGEMENT: "Time Management",
  };

  return fullNames[dimension] ?? dimension;
}

/**
 * Get color class for dimension score
 */
function getDimensionScoreColor(score: number): string {
  if (score >= 3.5) return "bg-green-100 text-green-800 hover:bg-green-100";
  if (score >= 2.5) return "bg-blue-100 text-blue-800 hover:bg-blue-100";
  return "bg-orange-100 text-orange-800 hover:bg-orange-100";
}

/**
 * Dimension mini score badge with tooltip
 */
function DimensionMiniScore({ name, score }: { name: string; score: number }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`text-xs font-medium ${getDimensionScoreColor(score)}`}>
            {abbreviateDimension(name)} {score.toFixed(1)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getFullDimensionName(name)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Confidence indicator icon with tooltip
 */
function ConfidenceIndicator({ confidence }: { confidence: string | null }) {
  if (!confidence) return null;

  // Normalize confidence to lowercase for comparison
  const normalizedConfidence = confidence.toLowerCase();

  let icon: React.ReactNode;
  let label: string;

  if (normalizedConfidence === "high") {
    icon = <Circle className="h-3 w-3 fill-current text-green-600" />;
    label = "High";
  } else if (normalizedConfidence === "medium") {
    icon = (
      <div className="relative h-3 w-3">
        <Circle className="h-3 w-3 text-yellow-600" />
        <div className="absolute inset-0 overflow-hidden w-1/2">
          <Circle className="h-3 w-3 fill-current text-yellow-600" />
        </div>
      </div>
    );
    label = "Medium";
  } else {
    icon = <Circle className="h-3 w-3 text-gray-400" />;
    label = "Low";
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help inline-flex">{icon}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Evaluation confidence: {label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Red flag count badge (hidden when count is 0)
 */
function RedFlagBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs font-medium gap-1">
      <AlertTriangle className="h-3 w-3" />
      {count} {count === 1 ? "flag" : "flags"}
    </Badge>
  );
}

export function ScopedCandidatesClient({
  simulationId,
  simulationName,
  candidates,
}: ScopedCandidatesClientProps) {
  const router = useRouter();

  const handleRowClick = (assessmentId: string) => {
    router.push(`/recruiter/candidates/s/${simulationId}/${assessmentId}`);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/recruiter/candidates"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          All Simulations
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{simulationName}</h1>
        <p className="text-sm text-gray-600 mt-1">
          Showing {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Candidate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Overall Score</TableHead>
              <TableHead>Dimensions</TableHead>
              <TableHead>Percentile</TableHead>
              <TableHead>Strength</TableHead>
              <TableHead>Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                  No candidates found for this simulation
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((candidate) => (
                <TableRow
                  key={candidate.assessmentId}
                  onClick={() => handleRowClick(candidate.assessmentId)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  {/* Avatar + Name + Email + Summary + Flags + Confidence */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                        {getInitials(candidate.name)}
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {candidate.name ?? "Anonymous"}
                          </span>
                          <RedFlagBadge count={candidate.redFlagCount} />
                          <ConfidenceIndicator confidence={candidate.evaluationConfidence} />
                        </div>
                        <div className="text-sm text-gray-500">{candidate.email}</div>
                        {candidate.summary && (
                          <div className="text-xs text-gray-500 mt-1 max-w-md">
                            {candidate.summary}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(candidate.status)}>
                      {candidate.status === "COMPLETED" && "Completed"}
                      {candidate.status === "WORKING" && "Working"}
                      {candidate.status === "WELCOME" && "Welcome"}
                      {!["COMPLETED", "WORKING", "WELCOME"].includes(candidate.status) &&
                        candidate.status}
                    </Badge>
                  </TableCell>

                  {/* Overall Score */}
                  <TableCell>
                    {candidate.overallScore !== null ? (
                      <div className="flex items-center gap-2">
                        <ScoreBar score={candidate.overallScore} />
                        <span className="text-sm text-gray-600">
                          {candidate.overallScore.toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>

                  {/* Dimension Mini-Scores */}
                  <TableCell>
                    {candidate.topDimension &&
                    candidate.midDimension &&
                    candidate.bottomDimension ? (
                      <div className="flex gap-1.5">
                        <DimensionMiniScore
                          name={candidate.topDimension.name}
                          score={candidate.topDimension.score}
                        />
                        <DimensionMiniScore
                          name={candidate.midDimension.name}
                          score={candidate.midDimension.score}
                        />
                        <DimensionMiniScore
                          name={candidate.bottomDimension.name}
                          score={candidate.bottomDimension.score}
                        />
                      </div>
                    ) : candidate.topDimension ? (
                      <div className="flex gap-1.5">
                        <DimensionMiniScore
                          name={candidate.topDimension.name}
                          score={candidate.topDimension.score}
                        />
                        {candidate.midDimension && (
                          <DimensionMiniScore
                            name={candidate.midDimension.name}
                            score={candidate.midDimension.score}
                          />
                        )}
                        {candidate.bottomDimension && (
                          <DimensionMiniScore
                            name={candidate.bottomDimension.name}
                            score={candidate.bottomDimension.score}
                          />
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>

                  {/* Percentile */}
                  <TableCell>
                    {candidate.percentile !== null ? (
                      <Badge variant="outline" className="font-normal">
                        Top {candidate.percentile}%
                      </Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>

                  {/* Strength Level */}
                  <TableCell>
                    {candidate.strengthLevel ? (
                      <Badge className={getStrengthBadgeColor(candidate.strengthLevel)}>
                        {candidate.strengthLevel}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>

                  {/* Completed Date */}
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(candidate.completedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
