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
 * POST /api/defense/token - Get token for defense call
 */
export const DefenseTokenRequestSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID is required"),
});
export type DefenseTokenRequest = z.infer<typeof DefenseTokenRequestSchema>;

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
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

/**
 * POST /api/admin/scenarios - Create a new scenario
 */
export const ScenarioCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  companyName: z.string().min(1, "Company name is required"),
  companyDescription: z.string().min(1, "Company description is required"),
  taskDescription: z.string().min(1, "Task description is required"),
  repoUrl: z.string().min(1, "Repository URL is required"),
  techStack: z.array(z.string()).optional().default([]),
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
  repoUrl: z.string().min(1, "Repository URL is required").optional(),
  techStack: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
});
export type ScenarioUpdate = z.infer<typeof ScenarioUpdateSchema>;
