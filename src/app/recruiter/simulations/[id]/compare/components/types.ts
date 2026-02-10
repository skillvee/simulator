// ============================================================================
// Types for the candidate comparison view
// ============================================================================

export type CandidateStrengthLevel = "Exceptional" | "Strong" | "Proficient" | "Developing";

export interface TimestampedBehavior {
  timestamp: string;
  behavior: string;
}

export interface AssessmentStrengthOrGap {
  dimension: string;
  score: number;
  description: string;
}

export interface DimensionScoreComparison {
  dimension: string;
  score: number;
  summary: string;
  percentile: number;
  greenFlags: string[];
  redFlags: string[];
  rationale: string;
  timestamps: string[];
  observableBehaviors: TimestampedBehavior[];
}

export interface WorkStyleMetrics {
  totalDurationMinutes: number | null;
  workingPhaseMinutes: number | null;
  coworkersContacted: number;
  aiToolsUsed: boolean;
  testsStatus: string;
}

export interface CandidateComparison {
  assessmentId: string;
  candidateName: string | null;
  scenarioId: string;
  overallScore: number;
  overallPercentile: number;
  strengthLevel: CandidateStrengthLevel;
  dimensionScores: DimensionScoreComparison[];
  topStrengths: AssessmentStrengthOrGap[];
  growthAreas: AssessmentStrengthOrGap[];
  summary: string;
  metrics: WorkStyleMetrics;
  confidence: string;
  videoUrl: string;
}

export interface CandidateCompareClientProps {
  simulationId: string;
  simulationName: string;
  assessmentIds: string[];
}
