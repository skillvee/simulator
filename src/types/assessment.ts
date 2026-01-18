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
 * Video assessment dimension scores
 */
export interface VideoDimensionScore {
  score: number;
  confidence: number;
  evidence: string[];
  feedback: string;
}

/**
 * Video assessment data stored in Prisma JSON field
 * Generated from screen recording analysis
 */
export interface VideoAssessmentData {
  overallScore: number;
  dimensions: Record<string, VideoDimensionScore>;
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  behavioralObservations?: string[];
  technicalObservations?: string[];
}
