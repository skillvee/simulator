// Audio utilities for capturing and playing audio in the browser

import { createLogger } from "@/lib/core";

const logger = createLogger("client:media:audio");

export type AudioPermissionState =
  | "prompt"
  | "granted"
  | "denied"
  | "unavailable";

// Check if browser supports required audio APIs
export function checkAudioSupport(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    typeof AudioContext !== "undefined"
  );
}

// Check microphone permission state
export async function checkMicrophonePermission(): Promise<AudioPermissionState> {
  if (!checkAudioSupport()) {
    return "unavailable";
  }

  try {
    // Use Permissions API if available
    if (navigator.permissions) {
      const result = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      return result.state as AudioPermissionState;
    }
    // Fall back to prompt state if Permissions API not available
    return "prompt";
  } catch {
    // Permissions API not supported for microphone in this browser
    return "prompt";
  }
}

// Request microphone permission and return stream
export async function requestMicrophoneAccess(): Promise<MediaStream> {
  if (!checkAudioSupport()) {
    throw new Error("Audio capture is not supported in this browser");
  }

  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 16000, // Gemini Live expects 16kHz
    },
  });
}

// Convert audio blob to base64
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
        const base64 = reader.result.split(",")[1];
        resolve(base64 || "");
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Audio context for playback
let audioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext(); // Use browser's default sample rate
  }
  return audioContext;
}

/**
 * AudioStreamer - Handles audio playback with proper buffering and scheduling
 * Based on the working skillvee implementation
 */
export class AudioStreamer {
  private context: AudioContext;
  private audioQueue: Float32Array[] = [];
  private isPlaying = false;
  private sampleRate = 24000; // Gemini outputs at 24kHz
  private bufferSize: number;
  private processingBuffer = new Float32Array(0);
  private scheduledTime = 0;
  private gainNode: GainNode;
  private analyserNode: AnalyserNode;
  private isInitialized = false;
  private scheduledSources = new Set<AudioBufferSourceNode>();

  constructor(context: AudioContext) {
    this.context = context;
    this.bufferSize = Math.floor(this.sampleRate * 0.32); // 320ms buffer
    this.gainNode = this.context.createGain();
    this.analyserNode = this.context.createAnalyser();
    this.analyserNode.fftSize = 64;
    this.analyserNode.smoothingTimeConstant = 0.4;
    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.context.destination);
  }

  /**
   * Get frequency data from the analyser node for waveform visualization.
   * Returns a Uint8Array of frequency bin values (0-255).
   */
  getFrequencyData(): Uint8Array {
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }

  /**
   * Connect the audio output to an additional destination node.
   * Used by the screen recording mixer to capture AI voice responses.
   */
  connectToDestination(destination: MediaStreamAudioDestinationNode): void {
    this.analyserNode.connect(destination);
  }

  /**
   * Disconnect from an additional destination node.
   */
  disconnectFromDestination(destination: MediaStreamAudioDestinationNode): void {
    try {
      this.analyserNode.disconnect(destination);
    } catch {
      // Ignore if not connected
    }
  }

  async initialize(): Promise<void> {
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
    this.scheduledTime = this.context.currentTime + 0.05; // 50ms initial delay
    this.gainNode.gain.setValueAtTime(1, this.context.currentTime);
    this.isInitialized = true;
  }

  // Stream audio from base64 PCM data
  streamAudioBase64(base64Data: string): void {
    if (!this.isInitialized) {
      return;
    }

    // Decode base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    this.streamAudio(bytes);
  }

  // Stream audio from Uint8Array (Int16 PCM)
  streamAudio(chunk: Uint8Array): void {
    if (!this.isInitialized || !chunk || chunk.length === 0) {
      return;
    }

    try {
      // Convert Int16 to Float32
      const float32Array = new Float32Array(chunk.length / 2);
      const dataView = new DataView(
        chunk.buffer,
        chunk.byteOffset,
        chunk.byteLength
      );

      for (let i = 0; i < chunk.length / 2; i++) {
        const int16 = dataView.getInt16(i * 2, true); // little-endian
        float32Array[i] = int16 / 32768; // Scale to [-1.0, 1.0]
      }

      // Accumulate in processing buffer
      const newBuffer = new Float32Array(
        this.processingBuffer.length + float32Array.length
      );
      newBuffer.set(this.processingBuffer);
      newBuffer.set(float32Array, this.processingBuffer.length);
      this.processingBuffer = newBuffer;

      // Split into playable chunks
      while (this.processingBuffer.length >= this.bufferSize) {
        const buffer = this.processingBuffer.slice(0, this.bufferSize);
        this.audioQueue.push(buffer);
        this.processingBuffer = this.processingBuffer.slice(this.bufferSize);
      }

      // Start playback if not already playing
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.scheduleNextBuffer();
      }
    } catch (error) {
      logger.error("Audio processing error", { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private scheduleNextBuffer(): void {
    if (!this.isPlaying) return;

    const SCHEDULE_AHEAD_TIME = 0.2;

    try {
      // Schedule buffers within look-ahead window
      while (
        this.audioQueue.length > 0 &&
        this.scheduledTime < this.context.currentTime + SCHEDULE_AHEAD_TIME
      ) {
        const audioData = this.audioQueue.shift()!;
        const audioBuffer = this.createAudioBuffer(audioData);
        const source = this.context.createBufferSource();

        // Track source
        this.scheduledSources.add(source);
        source.onended = () => {
          this.scheduledSources.delete(source);
        };

        source.buffer = audioBuffer;
        source.connect(this.gainNode);

        const startTime = Math.max(
          this.scheduledTime,
          this.context.currentTime
        );
        source.start(startTime);
        this.scheduledTime = startTime + audioBuffer.duration;
      }

      // Schedule next check
      if (this.audioQueue.length > 0) {
        const nextCheckTime =
          (this.scheduledTime - this.context.currentTime) * 1000;
        setTimeout(
          () => this.scheduleNextBuffer(),
          Math.max(0, nextCheckTime - 50)
        );
      } else {
        this.isPlaying = false;
      }
    } catch (error) {
      logger.error("Audio scheduling error", { error: error instanceof Error ? error.message : String(error) });
      this.isPlaying = false;
    }
  }

  private createAudioBuffer(audioData: Float32Array): AudioBuffer {
    const audioBuffer = this.context.createBuffer(
      1,
      audioData.length,
      this.sampleRate
    );
    audioBuffer.getChannelData(0).set(audioData);
    return audioBuffer;
  }

  stop(): void {
    this.isPlaying = false;

    // Stop all active sources
    for (const source of this.scheduledSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Ignore errors from already stopped sources
      }
    }
    this.scheduledSources.clear();

    this.audioQueue = [];
    this.processingBuffer = new Float32Array(0);
    this.scheduledTime = this.context.currentTime;
  }
}

// Singleton audio streamer instance
let audioStreamer: AudioStreamer | null = null;

export async function getAudioStreamer(): Promise<AudioStreamer> {
  if (!audioStreamer) {
    const ctx = getAudioContext();
    audioStreamer = new AudioStreamer(ctx);
    await audioStreamer.initialize();
  }
  return audioStreamer;
}

// Play audio from base64 PCM data using the streamer
export async function playAudioChunk(base64Data: string): Promise<void> {
  const streamer = await getAudioStreamer();
  streamer.streamAudioBase64(base64Data);
}

// Stop all audio playback
export function stopAudioPlayback(): void {
  if (audioStreamer) {
    audioStreamer.stop();
  }
}

// Get frequency data from the audio streamer for waveform visualization
export function getOutputFrequencyData(): Uint8Array | null {
  if (!audioStreamer) return null;
  return audioStreamer.getFrequencyData();
}

/**
 * Connect the singleton AudioStreamer to a capture destination so that
 * AI voice responses are included in the screen recording.
 */
export async function connectAudioStreamerToCapture(
  destination: MediaStreamAudioDestinationNode
): Promise<void> {
  const streamer = await getAudioStreamer();
  streamer.connectToDestination(destination);
}

/**
 * Disconnect the singleton AudioStreamer from a capture destination.
 */
export async function disconnectAudioStreamerFromCapture(
  destination: MediaStreamAudioDestinationNode
): Promise<void> {
  const streamer = await getAudioStreamer();
  streamer.disconnectFromDestination(destination);
}

// Audio worklet processor for capturing audio
export const AUDIO_WORKLET_CODE = `
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.volumeFrameCount = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];

    // Compute RMS volume every ~6 frames (~23ms at 128 samples/frame)
    this.volumeFrameCount++;
    if (this.volumeFrameCount >= 6) {
      this.volumeFrameCount = 0;
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sum / channelData.length);
      this.port.postMessage({ type: 'volume', volume: rms });
    }

    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bufferIndex++] = channelData[i];

      if (this.bufferIndex >= this.bufferSize) {
        // Convert Float32 to Int16 PCM
        const int16Buffer = new Int16Array(this.bufferSize);
        for (let j = 0; j < this.bufferSize; j++) {
          const s = Math.max(-1, Math.min(1, this.buffer[j]));
          int16Buffer[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send to main thread
        this.port.postMessage({
          type: 'audio',
          data: int16Buffer.buffer,
        }, [int16Buffer.buffer]);

        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
`;

// Create a blob URL for the audio worklet
export function createAudioWorkletBlobUrl(): string {
  const blob = new Blob([AUDIO_WORKLET_CODE], {
    type: "application/javascript",
  });
  return URL.createObjectURL(blob);
}
