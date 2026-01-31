// Voice hook types
export type {
  VoiceConnectionState,
  VoiceBaseOptions,
  VoiceBaseReturn,
  VoiceConfig,
  TranscriptMessage,
  AudioPermissionState,
  CategorizedError,
} from "./types";

// Base hook (for advanced use cases)
export { useVoiceBase } from "./use-voice-base";
export type { UseVoiceBaseOptions, UseVoiceBaseReturn } from "./use-voice-base";

// Coworker call hook
export { useCoworkerVoice } from "./use-coworker-voice";
export type {
  UseCoworkerVoiceOptions,
  UseCoworkerVoiceReturn,
} from "./use-coworker-voice";

// Defense call hook
export { useDefenseCall } from "./use-defense-call";
export type {
  UseDefenseCallOptions,
  UseDefenseCallReturn,
} from "./use-defense-call";
