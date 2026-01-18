import type { AudioPermissionState } from "@/lib/audio";
import type { TranscriptMessage } from "@/lib/gemini";
import type { CategorizedError } from "@/lib/error-recovery";

/**
 * Unified connection state for all voice hooks.
 * All 4 hooks now use this consistent type including "retrying".
 */
export type VoiceConnectionState =
  | "idle"
  | "requesting-permission"
  | "connecting"
  | "connected"
  | "error"
  | "ended"
  | "retrying";

/**
 * Base options shared by all voice hooks.
 */
export interface VoiceBaseOptions {
  assessmentId: string;
  onTranscriptUpdate?: (transcript: TranscriptMessage[]) => void;
  onConnectionStateChange?: (state: VoiceConnectionState) => void;
  onError?: (error: string) => void;
  maxRetries?: number;
}

/**
 * Base return type shared by all voice hooks.
 */
export interface VoiceBaseReturn {
  connectionState: VoiceConnectionState;
  permissionState: AudioPermissionState;
  transcript: TranscriptMessage[];
  error: string | null;
  categorizedError: CategorizedError | null;
  isAudioSupported: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  retryCount: number;
  maxRetries: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  retry: () => Promise<void>;
}

/**
 * Configuration for the base voice hook.
 */
export interface VoiceConfig {
  /** API endpoint to get the ephemeral token */
  tokenEndpoint: string;
  /** Initial greeting message to send */
  initialGreeting: string;
  /** Progress storage key for session recovery (optional) */
  progressType?: string;
  /** Whether to enable session recovery (save/load progress) */
  enableSessionRecovery?: boolean;
}

// Re-export for convenience
export type { TranscriptMessage } from "@/lib/gemini";
export type { AudioPermissionState } from "@/lib/audio";
export type { CategorizedError } from "@/lib/error-recovery";
