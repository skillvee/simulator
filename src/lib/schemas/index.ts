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
  AssessmentFinalizeSchema,
  type AssessmentFinalize,
  RecordingSessionSchema,
  type RecordingSession,
  ScenarioBuilderRequestSchema,
  type ScenarioBuilderRequest,
  AvatarGenerateSchema,
  type AvatarGenerate,
} from "./api";
