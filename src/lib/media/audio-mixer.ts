// Audio mixer for combining microphone input with system audio output
// into a single MediaStream audio track for recording.

import { createLogger } from "@/lib/core";

const logger = createLogger("client:media:audio-mixer");

export interface AudioMixer {
  /** The mixed audio track to add to the recording stream */
  audioTrack: MediaStreamTrack;
  /** The AudioContext destination node — connect system audio sources here */
  systemAudioDestination: MediaStreamAudioDestinationNode;
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
 * The system audio destination node should be used as the output
 * for the AudioStreamer (instead of ctx.destination) so that AI
 * voice responses are captured in the recording.
 */
export function createAudioMixer(micStream: MediaStream): AudioMixer {
  const audioContext = new AudioContext();

  // Destination node that captures mixed audio as a MediaStream
  const mixedDestination = audioContext.createMediaStreamDestination();

  // Also route to speakers so the candidate hears the AI
  // (mixedDestination alone would only capture, not play)

  // 1. Microphone input → mixed destination
  const micSource = audioContext.createMediaStreamSource(micStream);
  micSource.connect(mixedDestination);
  // Don't connect mic to speakers (would cause feedback)

  // 2. System audio destination — AudioStreamer should connect here
  //    instead of directly to audioContext.destination
  const systemAudioDestination = audioContext.createMediaStreamDestination();

  // Route system audio to both the mixer and the speakers
  const systemSource = audioContext.createMediaStreamSource(
    systemAudioDestination.stream
  );
  systemSource.connect(mixedDestination); // → recording
  systemSource.connect(audioContext.destination); // → speakers

  const audioTrack = mixedDestination.stream.getAudioTracks()[0];

  logger.info("Audio mixer created", {
    micTracks: String(micStream.getAudioTracks().length),
    sampleRate: String(audioContext.sampleRate),
  });

  return {
    audioTrack,
    systemAudioDestination,
    audioContext,
    stop: () => {
      micSource.disconnect();
      systemSource.disconnect();
      mixedDestination.disconnect();
      audioContext.close().catch(() => {});
      logger.info("Audio mixer stopped");
    },
  };
}
