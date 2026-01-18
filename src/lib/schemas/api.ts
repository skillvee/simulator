/**
 * API Request Schemas
 *
 * Zod schemas for validating API request bodies.
 * Each schema exports both the schema and the inferred TypeScript type.
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

/**
 * POST /api/kickoff/token - Get token for manager kickoff call
 */
export const KickoffTokenRequestSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID is required"),
});
export type KickoffTokenRequest = z.infer<typeof KickoffTokenRequestSchema>;

/**
 * POST /api/defense/token - Get token for defense call
 */
export const DefenseTokenRequestSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID is required"),
});
export type DefenseTokenRequest = z.infer<typeof DefenseTokenRequestSchema>;
