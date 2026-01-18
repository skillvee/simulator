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

// HR Interview hook
export { useVoiceConversation } from "./use-voice-conversation";
export type {
  UseVoiceConversationOptions,
  UseVoiceConversationReturn,
} from "./use-voice-conversation";

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

// Manager kickoff hook
export { useManagerKickoff } from "./use-manager-kickoff";
export type {
  UseManagerKickoffOptions,
  UseManagerKickoffReturn,
} from "./use-manager-kickoff";
