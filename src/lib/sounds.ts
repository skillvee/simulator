/**
 * Sound utilities for notification and call sounds
 * Uses Web Audio API for programmatic sound generation (no external files needed)
 */

import { createLogger } from "@/lib/core";

const logger = createLogger("client:sounds");

let audioContext: AudioContext | null = null;
let userHasInteracted = false;

/**
 * Mark that the user has interacted with the page
 * Required for browser autoplay policies
 */
export function markUserInteraction() {
  userHasInteracted = true;

  // Initialize audio context on first interaction
  if (!audioContext && typeof window !== 'undefined' && window.AudioContext) {
    try {
      audioContext = new AudioContext();
    } catch (error) {
      logger.warn('Failed to initialize AudioContext', { error: error instanceof Error ? error.message : String(error) });
    }
  }
}

/**
 * Play a subtle message notification sound
 * Similar to Slack's "knock" sound
 */
export function playMessageSound() {
  if (!userHasInteracted || !audioContext) return;

  try {
    // Create nodes
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure sound - subtle pop/knock sound
    const currentTime = audioContext.currentTime;

    // Frequency sweep from 800Hz to 600Hz for a pleasant "pop"
    oscillator.frequency.setValueAtTime(800, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, currentTime + 0.05);
    oscillator.frequency.exponentialRampToValueAtTime(400, currentTime + 0.1);

    // Volume envelope - quick attack, quick decay for subtle sound
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.01); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.15); // Quick decay

    // Play the sound
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.15);
  } catch (error) {
    logger.warn('Failed to play message sound', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Play a call ringing sound — two short rings with a pause, like a standard phone.
 * Returns a stop function to halt the ringing.
 */
export function playCallRingSound(): { stop: () => void } {
  if (!userHasInteracted || !audioContext) {
    return { stop: () => {} };
  }

  let isPlaying = true;
  let timeoutId: NodeJS.Timeout | null = null;

  const playRingTone = () => {
    if (!isPlaying || !audioContext) return;

    try {
      const ctx = audioContext;
      const now = ctx.currentTime;

      // Two short bursts: ring-ring, then silence
      const bursts = [0, 0.3]; // start times for each burst

      for (const burstStart of bursts) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now + burstStart);

        const t = now + burstStart;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
        gain.gain.setValueAtTime(0.2, t + 0.18);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);

        osc.start(t);
        osc.stop(t + 0.2);
      }

      // Repeat after pause (ring-ring ... ring-ring)
      if (isPlaying) {
        timeoutId = setTimeout(playRingTone, 2000);
      }
    } catch (error) {
      logger.warn('Failed to play ring sound', { error: error instanceof Error ? error.message : String(error) });
    }
  };

  playRingTone();

  return {
    stop: () => {
      isPlaying = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }
  };
}

/**
 * Clean up audio resources
 * Call this when the component unmounts or the app closes
 */
export function cleanupAudio() {
  if (audioContext && audioContext.state !== 'closed') {
    try {
      audioContext.close();
    } catch (error) {
      logger.warn('Failed to close AudioContext', { error: error instanceof Error ? error.message : String(error) });
    }
  }
  audioContext = null;
}