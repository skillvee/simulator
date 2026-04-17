/**
 * API Request Schemas
 *
 * Re-exports all Zod schemas for API request validation.
 * Import from '@/lib/schemas' for convenience.
 */

export {
  ChatRequestSchema,
  type ChatRequest,
  CallTokenRequestSchema,
  type CallTokenRequest,
  RegisterRequestSchema,
  type RegisterRequest,
  ScenarioCreateSchema,
  type ScenarioCreate,
  ScenarioUpdateSchema,
  type ScenarioUpdate,
  AssessmentCreateSchema,
  type AssessmentCreate,
  AssessmentStartSchema,
  type AssessmentStart,
  AssessmentFinalizeSchema,
  type AssessmentFinalize,
  RecordingSessionSchema,
  type RecordingSession,
  ScenarioBuilderRequestSchema,
  type ScenarioBuilderRequest,
  AvatarGenerateSchema,
  type AvatarGenerate,
  VoiceSessionLogSchema,
  type VoiceSessionLog,
  CandidateEventBatchSchema,
  type CandidateEventBatch,
  ClientErrorReportSchema,
  type ClientErrorReport,
  // Response schemas (API contracts)
  apiSuccessSchema,
  ApiErrorResponseSchema,
  ChatStreamChunkSchema,
  ChatStreamDoneSchema,
  ChatGetResponseSchema,
  AssessmentCreateResponseSchema,
  CallTokenResponseSchema,
  RecordingUploadResponseSchema,
} from "./api";
