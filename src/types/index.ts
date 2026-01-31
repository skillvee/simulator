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
  VideoDimensionScore,
  VideoAssessmentData,
  // Report types
  SkillCategory as ReportSkillCategory,
  ScoreLevel,
  SkillScore,
  NarrativeFeedback,
  Recommendation,
  AssessmentMetrics,
  AssessmentReport,
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
