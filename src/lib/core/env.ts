import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),
    AUTH_SECRET: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GEMINI_API_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    GITHUB_TOKEN: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    E2E_TEST_MODE: z
      .enum(["true", "false"])
      .optional()
      .transform((val) => val === "true"),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_E2E_TEST_MODE: z
      .enum(["true", "false"])
      .optional()
      .transform((val) => val === "true"),
    // Skip screen recording permission prompts in E2E tests (RF-001)
    NEXT_PUBLIC_SKIP_SCREEN_RECORDING: z
      .enum(["true", "false"])
      .optional()
      .transform((val) => val === "true"),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    E2E_TEST_MODE: process.env.E2E_TEST_MODE,
    NEXT_PUBLIC_E2E_TEST_MODE: process.env.NEXT_PUBLIC_E2E_TEST_MODE,
    NEXT_PUBLIC_SKIP_SCREEN_RECORDING:
      process.env.NEXT_PUBLIC_SKIP_SCREEN_RECORDING,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

/**
 * Check if E2E test mode is enabled with double-gate safety.
 * Returns true only when:
 * 1. NODE_ENV is "development"
 * 2. E2E_TEST_MODE env var is "true"
 *
 * This ensures E2E test mode can NEVER be accidentally enabled in production.
 */
export function isE2ETestMode(): boolean {
  return process.env.NODE_ENV === "development" && env.E2E_TEST_MODE === true;
}

/**
 * Client-side check for E2E test mode with double-gate safety.
 * Returns true only when:
 * 1. NODE_ENV is "development"
 * 2. NEXT_PUBLIC_E2E_TEST_MODE env var is "true"
 */
export function isE2ETestModeClient(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    env.NEXT_PUBLIC_E2E_TEST_MODE === true
  );
}

/**
 * Check if screen recording should be skipped (RF-001).
 * Returns true when:
 * 1. NODE_ENV is "development"
 * 2. Either NEXT_PUBLIC_SKIP_SCREEN_RECORDING or NEXT_PUBLIC_E2E_TEST_MODE is "true"
 *
 * This enables bypassing screen recording permission prompts in E2E tests.
 */
export function shouldSkipScreenRecording(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    (env.NEXT_PUBLIC_SKIP_SCREEN_RECORDING === true ||
      env.NEXT_PUBLIC_E2E_TEST_MODE === true)
  );
}
