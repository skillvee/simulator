/**
 * API Request & Response Schemas
 *
 * Zod schemas for validating API request bodies and response shapes.
 * Response schemas serve as contracts — if a route handler changes its
 * response shape, contract tests will fail immediately.
 */

import { z } from "zod";

/**
 * POST /api/chat - Send a message to a coworker
 */
export const ChatRequestSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID is required"),
  coworkerId: z.string().min(1, "Coworker ID is required"),
  message: z.string().min(1, "Message is required"),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/**
 * POST /api/call/token - Get token for coworker voice call
 */
export const CallTokenRequestSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID is required"),
  coworkerId: z.string().min(1, "Coworker ID is required"),
});
export type CallTokenRequest = z.infer<typeof CallTokenRequestSchema>;

// Note: Defense token schema was removed in RF-006. Defense calls now happen
// within the Slack interface using the call token API. The useDefenseCall hook
// will be reconfigured in RF-012 to work with the Slack call flow.

/**
 * POST /api/auth/register - Register a new user
 */
export const RegisterRequestSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
  // Role can only be USER or RECRUITER via signup (never ADMIN)
  role: z.enum(["USER", "RECRUITER"]).optional(),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

/**
 * POST /api/admin/scenarios - Create a new scenario
 * Note: repoUrl is now optional - it will be provisioned by the system
 */
export const ScenarioCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  companyName: z.string().min(1, "Company name is required"),
  companyDescription: z.string().min(1, "Company description is required"),
  taskDescription: z.string().min(1, "Task description is required"),
  repoUrl: z.string().optional(),
  techStack: z.array(z.string()).optional().default([]),
  targetLevel: z.enum(["junior", "mid", "senior", "staff"]).optional().default("mid"),
  archetypeId: z.string().min(1, "Role archetype is required"),
  isPublished: z.boolean().optional().default(false),
});
export type ScenarioCreate = z.infer<typeof ScenarioCreateSchema>;

/**
 * PUT /api/admin/scenarios/[id] - Update a scenario
 */
export const ScenarioUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  companyName: z.string().min(1, "Company name is required").optional(),
  companyDescription: z.string().min(1, "Company description is required").optional(),
  taskDescription: z.string().min(1, "Task description is required").optional(),
  repoUrl: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  targetLevel: z.enum(["junior", "mid", "senior", "staff"]).optional(),
  archetypeId: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
});
export type ScenarioUpdate = z.infer<typeof ScenarioUpdateSchema>;

/**
 * POST /api/assessment/create - Create a new assessment
 */
export const AssessmentCreateSchema = z.object({
  scenarioId: z.string().min(1, "Scenario ID is required"),
});
export type AssessmentCreate = z.infer<typeof AssessmentCreateSchema>;

/**
 * POST /api/assessment/finalize - Finalize an assessment
 */
export const AssessmentFinalizeSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID is required"),
});
export type AssessmentFinalize = z.infer<typeof AssessmentFinalizeSchema>;

/**
 * POST /api/recording/session - Recording session actions
 */
export const RecordingSessionSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID is required"),
  action: z.enum(
    ["start", "addChunk", "addScreenshot", "complete", "interrupt"],
    { errorMap: () => ({ message: "Invalid action" }) }
  ),
  segmentId: z.string().optional(),
  chunkPath: z.string().optional(),
  screenshotPath: z.string().optional(),
  testMode: z.boolean().optional(),
});
export type RecordingSession = z.infer<typeof RecordingSessionSchema>;

/**
 * POST /api/admin/scenarios/builder - Send message to scenario builder AI
 * POST /api/recruiter/simulations/builder - Send message to simulation builder AI
 */
export const ScenarioBuilderRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        text: z.string(),
        timestamp: z.string(),
      })
    )
    .optional()
    .default([]),
  scenarioData: z.record(z.unknown()).optional().default({}),
});
export type ScenarioBuilderRequest = z.infer<
  typeof ScenarioBuilderRequestSchema
>;

/**
 * POST /api/avatar/generate - Generate avatars for a scenario
 */
export const AvatarGenerateSchema = z.object({
  scenarioId: z.string().min(1, "Scenario ID is required"),
});
export type AvatarGenerate = z.infer<typeof AvatarGenerateSchema>;

/**
 * POST /api/call/log - Log a voice session
 */
export const VoiceSessionLogSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID is required"),
  coworkerId: z.string().min(1, "Coworker ID is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().optional(),
  transcript: z.array(
    z.object({
      role: z.string(),
      text: z.string(),
      timestamp: z.string(),
    })
  ),
  connectionEvents: z.array(
    z.object({
      event: z.string(),
      timestamp: z.string(),
      details: z.string().optional(),
    })
  ),
  tokenName: z.string().optional(),
  errorMessage: z.string().optional(),
  durationMs: z.number().int().optional(),
});
export type VoiceSessionLog = z.infer<typeof VoiceSessionLogSchema>;

// ─── Response Schemas (API Contracts) ───────────────────────────────────────

/**
 * Wrapper for all successful API responses: { success: true, data: T }
 */
export function apiSuccessSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  });
}

/**
 * Standard error response shape
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

/**
 * POST /api/chat — SSE stream chunk event
 */
export const ChatStreamChunkSchema = z.object({
  type: z.literal("chunk"),
  text: z.string(),
});

/**
 * POST /api/chat — SSE stream done event
 */
export const ChatStreamDoneSchema = z.object({
  type: z.literal("done"),
  timestamp: z.string(),
  prSubmitted: z.boolean(),
  defenseCallRequired: z.boolean(),
});

/**
 * GET /api/chat — response data shape
 */
export const ChatGetResponseSchema = apiSuccessSchema(
  z.object({
    messages: z.array(
      z.object({
        role: z.string(),
        text: z.string(),
        timestamp: z.string(),
      })
    ),
  })
);

/**
 * POST /api/assessment/complete — response data shape
 */
export const AssessmentCompleteResponseSchema = apiSuccessSchema(
  z.object({
    assessment: z.object({
      id: z.string(),
      status: z.string(),
      prUrl: z.string().nullable(),
      startedAt: z.union([z.string(), z.date()]),
    }),
    timing: z.object({
      startedAt: z.string(),
      completedWorkingAt: z.string(),
      workingDurationSeconds: z.number(),
    }),
  })
);

/**
 * POST /api/assessment/create — response data shape
 */
export const AssessmentCreateResponseSchema = apiSuccessSchema(
  z.object({
    assessment: z.object({
      id: z.string(),
      userId: z.string(),
      scenarioId: z.string(),
      status: z.string(),
    }).passthrough(), // Prisma model has additional fields
    isExisting: z.boolean(),
  })
);

/**
 * POST /api/call/token — response data shape
 */
export const CallTokenResponseSchema = apiSuccessSchema(
  z.object({
    token: z.string(),
    assessmentId: z.string(),
    coworkerId: z.string(),
    coworkerName: z.string(),
    coworkerRole: z.string(),
    isDefenseCall: z.boolean(),
  })
);

/**
 * POST /api/recording — response data shape
 */
export const RecordingUploadResponseSchema = apiSuccessSchema(
  z.object({
    path: z.string(),
    url: z.string(),
    type: z.enum(["video", "screenshot"]),
    chunkIndex: z.number().optional(),
    segmentId: z.string().nullable().optional(),
  })
);
