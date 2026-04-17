"use client";

import { useEffect, useRef, type RefObject } from "react";

interface AudioWaveformProps {
  /** Whether the AI is speaking */
  isSpeaking: boolean;
  /** Whether the user's mic is active */
  isListening: boolean;
  /** Whether the user has muted their mic */
  isMuted: boolean;
  /** Ref to current mic RMS volume (0-1 range, updated by worklet) */
  micVolumeRef: RefObject<number>;
  /** Function to get AI output frequency data from the AudioStreamer's AnalyserNode */
  getOutputFrequencyData: () => Uint8Array | null;
  /** Number of bars to render */
  barCount?: number;
}

const SPEAKING_COLOR = "hsl(var(--primary))";
const LISTENING_COLOR = "hsl(142.1 76.2% 36.3%)"; // green-600

/**
 * Audio waveform visualization driven by real audio data.
 *
 * - When AI is speaking: reads frequency bins from the AudioStreamer's AnalyserNode
 *   and maps them to bar heights.
 * - When user is talking (mic active, not muted): reads RMS volume from the
 *   AudioWorklet and generates a symmetric wave pattern from it.
 * - When idle: shows a flat line.
 */
export function AudioWaveform({
  isSpeaking,
  isListening,
  isMuted,
  micVolumeRef,
  getOutputFrequencyData,
  barCount = 24,
}: AudioWaveformProps) {
  const barsRef = useRef<HTMLDivElement>(null);

  const isActive = isSpeaking || (isListening && !isMuted);

  useEffect(() => {
    if (!isActive || !barsRef.current) return;

    const container = barsRef.current;
    const barElements = container.children;
    let animationId: number;

    const animate = () => {
      if (isSpeaking) {
        // AI speaking: use real frequency data from AnalyserNode
        const freqData = getOutputFrequencyData();
        if (freqData && freqData.length > 0) {
          const binCount = freqData.length;
          for (let i = 0; i < barElements.length; i++) {
            const el = barElements[i] as HTMLElement;
            // Map bar index to frequency bin (distribute across available bins)
            const binIndex = Math.floor((i / barElements.length) * binCount);
            const value = freqData[binIndex] / 255; // Normalize to 0-1
            const height = Math.max(6, value * 100);
            el.style.height = `${height}%`;
            el.style.backgroundColor = SPEAKING_COLOR;
            el.style.opacity = String(0.5 + value * 0.4);
          }
        } else {
          // No frequency data yet, show minimal bars
          for (let i = 0; i < barElements.length; i++) {
            const el = barElements[i] as HTMLElement;
            el.style.height = "6%";
            el.style.backgroundColor = SPEAKING_COLOR;
            el.style.opacity = "0.4";
          }
        }
      } else {
        // User mic active: use RMS volume to create a wave pattern
        const volume = micVolumeRef.current;
        // Amplify: typical speech RMS is 0.01-0.15, scale up for visibility
        const scaledVolume = Math.min(1, volume * 8);

        for (let i = 0; i < barElements.length; i++) {
          const el = barElements[i] as HTMLElement;
          // Create a symmetric bell curve centered in the middle
          const center = barElements.length / 2;
          const distFromCenter = Math.abs(i - center) / center;
          const envelope = 1 - distFromCenter * distFromCenter; // Parabolic falloff
          const height = Math.max(6, scaledVolume * envelope * 100);
          el.style.height = `${height}%`;
          el.style.backgroundColor = LISTENING_COLOR;
          el.style.opacity = String(0.4 + scaledVolume * envelope * 0.5);
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isActive, isSpeaking, barCount, getOutputFrequencyData, micVolumeRef]);

  // Idle state: flat line
  if (!isActive) {
    return (
      <div className="flex-1 flex justify-center items-center h-10 px-2">
        <div
          className="h-[2px] w-full rounded-full opacity-30"
          style={{ background: "hsl(var(--slack-bg-hover))" }}
        />
      </div>
    );
  }

  return (
    <div
      ref={barsRef}
      className="flex-1 flex justify-center items-center h-10 gap-[2px] px-2"
    >
      {Array.from({ length: barCount }, (_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full transition-[height] duration-75 ease-out"
          style={{ height: "6%" }}
        />
      ))}
    </div>
  );
}
