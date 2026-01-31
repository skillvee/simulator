/**
 * Assessment Types
 *
 * Types for assessment-related JSON data stored in Prisma JSON fields.
 * These provide type safety when reading/writing assessment data.
 */

// ============================================================================
// Code Review Data
// ============================================================================

/**
 * Severity levels for code quality findings
 */
export type CodeQualitySeverity = "critical" | "major" | "minor" | "suggestion";

/**
 * Categories for code quality findings
 */
export type CodeQualityCategory =
  | "naming"
  | "structure"
  | "complexity"
  | "duplication"
  | "error_handling"
  | "documentation"
  | "performance"
  | "type_safety"
  | "formatting"
  | "other";

/**
 * Individual code quality finding
 */
export interface CodeQualityFinding {
  category: CodeQualityCategory;
  severity: CodeQualitySeverity;
  description: string;
  fileHint?: string;
  recommendation?: string;
}

/**
 * Pattern usage assessment
 */
export type PatternUsage = "correct" | "partial" | "incorrect" | "missing";

/**
 * Pattern analysis finding
 */
export interface PatternFinding {
  pattern: string;
  usage: PatternUsage;
  notes: string;
  isStrength: boolean;
}

/**
 * Security finding severity levels
 */
export type SecuritySeverity = "critical" | "high" | "medium" | "low" | "info";

/**
 * Security finding categories
 */
export type SecurityCategory =
  | "injection"
  | "authentication"
  | "authorization"
  | "data_exposure"
  | "cryptography"
  | "input_validation"
  | "dependency"
  | "configuration"
  | "other";

/**
 * Security finding in code review
 */
export interface SecurityFinding {
  category: SecurityCategory;
  severity: SecuritySeverity;
  description: string;
  fileHint?: string;
  recommendation: string;
}

/**
 * Maintainability assessment scores
 */
export interface MaintainabilityAssessment {
  score: number;
  readability: number;
  modularity: number;
  testability: number;
  notes: string[];
}

/**
 * Test coverage levels
 */
export type TestCoverage =
  | "comprehensive"
  | "adequate"
  | "minimal"
  | "none"
  | "unknown";

/**
 * Code style consistency levels
 */
export type CodeStyleConsistency = "excellent" | "good" | "fair" | "poor";

/**
 * Code review summary
 */
export interface CodeReviewSummary {
  strengths: string[];
  areasForImprovement: string[];
  overallAssessment: string;
  testCoverage: TestCoverage;
  codeStyleConsistency: CodeStyleConsistency;
  aiToolUsageEvident: boolean;
}

/**
 * Full code review data stored in Prisma JSON field
 */
export interface CodeReviewData {
  prUrl: string;
  analyzedAt: string;

  // Overall scores (1-5 scale)
  overallScore: number;
  codeQualityScore: number;
  patternScore: number;
  securityScore: number;
  maintainabilityScore: number;

  // Detailed findings
  codeQualityFindings: CodeQualityFinding[];
  patternFindings: PatternFinding[];
  securityFindings: SecurityFinding[];
  maintainability: MaintainabilityAssessment;

  // Summary
  summary: CodeReviewSummary;

  // Metrics
  filesAnalyzed: number;
  linesAdded: number;
  linesDeleted: number;

  // Full AI analysis (for debugging/future reference)
  aiAnalysis: object;
}

// ============================================================================
// HR Assessment Data
// ============================================================================

/**
 * Dimension score with feedback
 */
export interface DimensionFeedback {
  score: number;
  feedback: string;
}

/**
 * HR assessment data stored in Prisma JSON field
 * Generated from HR interview analysis
 */
export interface HRAssessmentData {
  overallScore: number;
  dimensions: Record<string, DimensionFeedback>;
  summary?: string;
  strengths?: string[];
  concerns?: string[];
}

// ============================================================================
// Video Assessment Data
// ============================================================================

/**
 * Hiring recommendation type
 */
export type HiringRecommendation = "hire" | "maybe" | "no_hire";

/**
 * Hiring signals for recruiters
 */
export interface HiringSignals {
  overallGreenFlags: string[];
  overallRedFlags: string[];
  recommendation: HiringRecommendation;
  recommendationRationale: string;
}

/**
 * Video assessment dimension scores with hiring signals
 */
export interface VideoDimensionScore {
  score: number;
  rationale: string;
  greenFlags: string[];
  redFlags: string[];
  observable_behaviors: string;
  timestamps: string[];
  trainable_gap: boolean;
}

/**
 * Key highlight from video assessment
 */
export interface VideoKeyHighlight {
  timestamp: string;
  type: "positive" | "negative";
  dimension: string;
  description: string;
  quote: string | null;
}

/**
 * Video assessment data stored in Prisma JSON field
 * Generated from screen recording analysis
 */
export interface VideoAssessmentData {
  evaluation_version: string;
  overall_score: number;
  dimension_scores: Record<string, VideoDimensionScore>;
  hiringSignals: HiringSignals;
  key_highlights: VideoKeyHighlight[];
  overall_summary: string;
  evaluation_confidence: "high" | "medium" | "low";
  insufficient_evidence_notes: string | null;
}

// ============================================================================
// Assessment Report Data (for results display)
// ============================================================================

/**
 * Skill category types for assessment scoring
 */
export type SkillCategory =
  | "communication"
  | "problem_decomposition"
  | "ai_leverage"
  | "code_quality"
  | "xfn_collaboration"
  | "time_management"
  | "technical_decision_making"
  | "presentation";

/**
 * Score level based on 1-5 scale
 */
export type ScoreLevel =
  | "exceptional"
  | "strong"
  | "adequate"
  | "developing"
  | "needs_improvement";

/**
 * Individual skill score with evidence
 */
export interface SkillScore {
  category: SkillCategory;
  score: number;
  level: ScoreLevel;
  evidence: string[];
  notes: string;
}

/**
 * Narrative feedback section
 */
export interface NarrativeFeedback {
  overallSummary: string;
  strengths: string[];
  areasForImprovement: string[];
  notableObservations: string[];
}

/**
 * Recommendation for improvement
 */
export interface Recommendation {
  category: SkillCategory;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  actionableSteps: string[];
}

/**
 * Assessment metrics displayed on results page
 */
export interface AssessmentMetrics {
  totalDurationMinutes: number | null;
  workingPhaseMinutes: number | null;
  coworkersContacted: number;
  aiToolsUsed: boolean;
  testsStatus: "passing" | "failing" | "none" | "unknown";
  codeReviewScore: number | null;
}

/**
 * Full assessment report data
 * Used to display results to candidates and recruiters
 */
export interface AssessmentReport {
  // Metadata
  generatedAt: string;
  assessmentId: string;
  candidateName?: string;

  // Overall scores
  overallScore: number;
  overallLevel: ScoreLevel;

  // Skill breakdown
  skillScores: SkillScore[];

  // Narrative feedback
  narrative: NarrativeFeedback;

  // Recommendations
  recommendations: Recommendation[];

  // Metrics (timing, collaboration, etc.)
  metrics?: AssessmentMetrics;

  // Version tracking
  version: string;
}
