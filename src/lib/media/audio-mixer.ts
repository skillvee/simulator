// Audio mixer for combining microphone input with system audio output
// into a single MediaStream audio track for recording.

import { createLogger } from "@/lib/core";
import { getAudioContext } from "./audio";

const logger = createLogger("client:media:audio-mixer");

export interface AudioMixer {
  /** The mixed audio track to add to the recording stream */
  audioTrack: MediaStreamTrack;
  /**
   * Bus node for system audio (e.g. AI voice playback). Connect any
   * AudioNode here and its output will be summed with the mic into
   * the recorded audio track.
   */
  systemAudioInput: AudioNode;
  /** The AudioContext used by this mixer */
  audioContext: AudioContext;
  /** Stop and clean up all resources */
  stop: () => void;
}

/**
 * Creates an audio mixer that combines:
 * 1. Microphone input (candidate's voice)
 * 2. System audio output (AI voice responses played via AudioContext)
 *
 * Returns an AudioMixer with a mixed audio track that can be added
 * to the composite MediaStream before recording.
 *
 * Connect AI voice (or any other AudioNode you want captured) to
 * `systemAudioInput`. Both inputs are summed into `audioTrack` via
 * a single MediaStreamDestination — no MediaStream loopback, which
 * is unreliable in Chrome's Web Audio implementation.
 */
export function createAudioMixer(micStream: MediaStream): AudioMixer {
  // Reuse the singleton AudioContext that AudioStreamer (AI voice playback)
  // already lives on. Web Audio forbids connecting nodes across contexts —
  // a fresh `new AudioContext()` here would cause InvalidAccessError when
  // the streamer's analyser node is connected into our mixer bus,
  // silently dropping AI voice from the recording.
  const audioContext = getAudioContext();

  // Single destination node — both mic and system audio sum here, and
  // its .stream is the recorded audio track.
  const mixedDestination = audioContext.createMediaStreamDestination();

  // Mic input → mixer bus
  const micSource = audioContext.createMediaStreamSource(micStream);
  micSource.connect(mixedDestination);
  // Don't connect mic to speakers (would cause feedback)

  const audioTrack = mixedDestination.stream.getAudioTracks()[0];
  if (!audioTrack) {
    throw new Error("Audio mixer failed to produce an audio track");
  }

  logger.info("Audio mixer created", {
    micTracks: String(micStream.getAudioTracks().length),
    sampleRate: String(audioContext.sampleRate),
  });

  return {
    audioTrack,
    systemAudioInput: mixedDestination,
    audioContext,
    stop: () => {
      try {
        micSource.disconnect();
      } catch {
        // already disconnected
      }
      // Do NOT call audioContext.close() — it's the shared singleton used by
      // AudioStreamer for ongoing AI voice playback elsewhere in the app.
      logger.info("Audio mixer stopped");
    },
  };
}
