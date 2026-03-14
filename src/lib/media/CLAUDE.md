# src/lib/media - Recording & Media Capture

Browser-based screen, webcam, and audio capture for assessment recording. All modules are client-side only (SSR-safe with `typeof window` checks).

## Architecture

```
Screen (getDisplayMedia) ──┐
                           ├→ CanvasCompositor ──→ canvas.captureStream()
Webcam (getUserMedia)    ──┘     (PiP overlay)            ↓
                                                   VideoRecorder ──→ Chunks + Screenshots
                                                   (MediaRecorder)

Microphone (getUserMedia) ──→ AudioStreamer ──→ Web Audio API (24kHz playback)
```

## Key Files

| File | Purpose | Browser API |
|------|---------|-------------|
| `screen.ts` | Screen sharing lifecycle | `getDisplayMedia` |
| `webcam.ts` | Camera capture + smart snapshots | `getUserMedia` |
| `audio.ts` | Mic input + Gemini audio streaming/playback | Web Audio API, AudioWorklet |
| `video-recorder.ts` | MediaRecorder wrapper with codec negotiation | MediaRecorder |
| `canvas-compositor.ts` | Screen + webcam PiP compositing | Canvas 2D, `captureStream()` |

## Key Constraints

- **Frame rates**: 5 fps ideal, 10 fps max (battery/bandwidth efficient)
- **Codec priority**: VP9 → VP8 → WebM → MP4 (auto-negotiated via `getBestMimeType()`)
- **Audio**: Mic at 16kHz (Gemini input), playback at 24kHz (Gemini output)
- **Webcam resolution**: 640x480 max
- **Recording chunks**: 10s intervals, screenshots every 30s

## Patterns

**Smart webcam snapshot** (`captureBestWebcamSnapshot()`): Captures 5 frames at 400ms intervals, returns the largest blob (heuristic: sharp frames with eyes open compress larger).

**Canvas compositor** uses `setInterval()` instead of `requestAnimationFrame()` so recording continues when tab is unfocused.

**AudioStreamer** schedules playback 200ms ahead with 320ms buffer window to prevent gaps:
```typescript
const streamer = getAudioStreamer();
await streamer.initialize();  // Must call to resume suspended AudioContext (iOS)
streamer.addPCM16(chunk);     // Int16 PCM → Float32 conversion (/ 32768)
```

## Gotchas

- **No SSR**: All functions check `typeof window === "undefined"` for Next.js safety
- **MediaRecorder doesn't exist in Node.js**: Must mock in tests
- **AudioStreamer must be initialized**: Call `await initialize()` after construction (iOS AudioContext suspension)
- **Int16 PCM is little-endian**: Uses `dataView.getInt16(i * 2, true)` for byte order
- **`canvas.roundRect()` is modern-only**: May fail on older browsers
- **Screenshot timeout**: 5-second timeout if video metadata doesn't load
- **Echo cancellation**: Enabled by default on mic capture
- **Cleanup required**: CanvasCompositor creates video elements that must be cleaned up to prevent memory leaks
