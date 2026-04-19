# src/hooks - Voice & Recording Hooks

## Structure

```
src/hooks/
├── voice/
│   ├── types.ts                    # VoiceConnectionState, shared types
│   ├── use-voice-base.ts           # ~400 LOC shared logic
│   ├── use-coworker-voice.ts       # ~110 LOC coworker call hook
│   ├── use-defense-call.ts         # ~120 LOC PR defense hook
│   └── index.ts                    # Re-exports
├── use-screen-recording.ts         # Screen recording hook
└── index.ts                        # Main re-exports
```

## Voice Hooks Architecture

Hook-based voice flows extend `useVoiceBase`, which provides:
- Connection state management (idle → requesting-permission → connecting → connected/error → ended)
- Audio capture initialization (16kHz input to Gemini)
- Audio playback queue (24kHz output from Gemini)
- WebSocket message handling
- Retry with exponential backoff
- Session recovery (optional)

Important: the assessment Slack/work page does **not** currently use this hook stack for its live coworker calls. That path runs through `src/components/chat/floating-call-bar.tsx`, mounted by `SlackLayout`.

## Real Call Entrypoints

- `src/components/chat/floating-call-bar.tsx` is the live Gemini coworker call used on `/work`. If you are changing call-opening behavior, Gemini Live setup, turn bootstrapping, or audio capture timing for the assessment UI, start here.
- `src/lib/ai/live-session.ts` is the shared Gemini Live transport/bootstrap layer. Both `FloatingCallBar` and `useVoiceBase` depend on it for token fetches, Live session setup, opening-turn coordination, audio capture wiring, and teardown.
- `src/hooks/voice/use-voice-base.ts` is the shared hook implementation for hook-driven voice flows such as `useCoworkerVoice` and `useDefenseCall`.
- If you change first-turn behavior, update both test paths: `src/components/chat/floating-call-bar.test.tsx` and `src/hooks/voice/use-voice-base-connect.test.ts`.

### Shared VoiceConnectionState

```typescript
type VoiceConnectionState =
  | "idle"
  | "requesting-permission"
  | "connecting"
  | "connected"
  | "error"
  | "ended"
  | "retrying";
```

### Hook-Specific Features

| Hook | Token Endpoint | Session Recovery | Retry | Additional Data |
|------|----------------|------------------|-------|-----------------|
| `useCoworkerVoice` | `/api/call/token` | Yes | Yes | coworkerId |
| `useDefenseCall` | Configurable | No | Yes | managerName, managerRole, prUrl |

## Usage

```typescript
import { useVoiceConversation } from "@/hooks/voice";

const { connectionState, connect, disconnect, transcript } = useVoiceConversation({
  assessmentId: "...",
  onTranscriptUpdate: (t) => console.log(t),
  onConnectionStateChange: (s) => console.log(s),
  onError: (e) => console.error(e),
});
```

## Voice Patterns

- AudioContext requires user interaction to resume from suspended state
- Use `sessionConnected` flag in callbacks - refs can be stale in closures
- Audio: 16kHz input (to Gemini), 24kHz output (from Gemini)

## Gotchas

- `historyLoadedRef` (or similar refs guarding against duplicate loads) must reset to `false` on error — otherwise failed loads can't be retried
- Manager auto-start messages need assessment-level dedup (`assessment.managerGreetingDelivered` flag), not conversation-level checks, to prevent race conditions with concurrent updates

## Cleanup

Always stop MediaStream tracks and close WebSocket connections in useEffect cleanup.
The base hook handles this automatically.

## Extending for New Call Types

To add a new voice call type:

1. Create a new file in `src/hooks/voice/`
2. Import and use `useVoiceBase` with your config
3. Add hook-specific state (from token response) and end call logic
4. Export from `src/hooks/voice/index.ts`

Example:
```typescript
export function useNewCallType(options) {
  const base = useVoiceBase({
    ...options,
    config: {
      tokenEndpoint: "/api/new-call/token",
      initialGreeting: "Hello!",
      enableSessionRecovery: false,
    },
  });

  const endCall = useCallback(async () => {
    base.setEndedAt(new Date());
    base.disconnect();
    // Save transcript to server...
  }, [base]);

  return { ...base, endCall };
}
```
