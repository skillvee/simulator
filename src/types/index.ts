/**
 * Centralized Type Definitions
 *
 * Re-exports all domain types for consistent imports across the codebase.
 * Import from '@/types' instead of individual files.
 *
 * @example
 * import { ChatMessage, CodeReviewData, ParsedProfile } from '@/types';
 */

// Assessment types (Prisma JSON fields)
export type {
  CodeQualitySeverity,
  CodeQualityCategory,
  CodeQualityFinding,
  PatternUsage,
  PatternFinding,
  SecuritySeverity,
  SecurityCategory,
  SecurityFinding,
  MaintainabilityAssessment,
  TestCoverage,
  CodeStyleConsistency,
  CodeReviewSummary,
  CodeReviewData,
  DimensionFeedback,
  HRAssessmentData,
  // Video assessment types
  HiringRecommendation,
  HiringSignals,
  VideoDimensionScore,
  VideoKeyHighlight,
  VideoAssessmentData,
  // Report types
  SkillCategory as ReportSkillCategory,
  ScoreLevel,
  SkillScore,
  NarrativeFeedback,
  Recommendation,
  AssessmentMetrics,
  AssessmentReport,
  // Video evaluation result types (for results page)
  VideoDimension,
  VideoSkillEvaluation,
  VideoEvaluationResult,
  // Rubric system types (data-driven assessment)
  RubricLevelLabel,
  ArchetypeSeniorityLevel,
  DimensionConfidence,
  RubricDimensionScore,
  DetectedRedFlag,
  RubricAssessmentOutput,
  ArchetypeFitResult,
  HiringManagerOutput,
} from "./assessment";

// Conversation types
export type {
  ChatMessage,
  TranscriptMessage,
  ConversationWithMeta,
  CoworkerMemory,
} from "./conversation";

// Coworker types
export type {
  CoworkerKnowledge,
  PersonalityStyle,
  CoworkerPersona,
  DecorativeTeamMember,
  StatusScheduleEntry,
} from "./coworker";

// CV/Profile types
export type {
  WorkExperience,
  Education,
  SkillCategory,
  ProficiencyLevel,
  Skill,
  Certification,
  LanguageProficiency,
  Language,
  SeniorityLevel,
  FilterSeniorityLevel,
  ParseQuality,
  ParsedProfile,
} from "./cv";

// API response types
export type { ApiSuccess, ApiError, ApiResponse } from "./api";
export {
  createSuccessResponse,
  createErrorResponse,
  isApiSuccess,
  isApiError,
} from "./api";
