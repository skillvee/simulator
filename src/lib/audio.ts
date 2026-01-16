// Audio utilities for capturing and playing audio in the browser

export type AudioPermissionState = "prompt" | "granted" | "denied" | "unavailable";

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
    audioContext = new AudioContext({ sampleRate: 24000 }); // Gemini outputs at 24kHz
  }
  return audioContext;
}

// Play audio from base64 PCM data
export async function playAudioChunk(base64Data: string): Promise<void> {
  const ctx = getAudioContext();

  // Resume context if suspended (required for autoplay policies)
  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  // Decode base64 to array buffer
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Convert to Int16 PCM
  const int16Array = new Int16Array(bytes.buffer);

  // Convert to Float32 for Web Audio API
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0; // Normalize to -1.0 to 1.0
  }

  // Create audio buffer
  const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
  audioBuffer.copyToChannel(float32Array, 0);

  // Play the buffer
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);
  source.start();
}

// Audio worklet processor for capturing audio
export const AUDIO_WORKLET_CODE = `
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];

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
  const blob = new Blob([AUDIO_WORKLET_CODE], { type: "application/javascript" });
  return URL.createObjectURL(blob);
}
