/**
 * Sound utilities for notification and call sounds
 * Uses Web Audio API for programmatic sound generation (no external files needed)
 */

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
      console.warn('Failed to initialize AudioContext:', error);
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
    console.warn('Failed to play message sound:', error);
  }
}

/**
 * Play a call ringing sound
 * Returns a stop function to halt the ringing
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
      // Create nodes for ring tone
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Connect nodes
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const currentTime = audioContext.currentTime;

      // Configure dual-tone ring (like a phone)
      oscillator1.frequency.setValueAtTime(440, currentTime); // A4
      oscillator2.frequency.setValueAtTime(480, currentTime); // Slightly detuned for richness

      // Volume envelope for single ring
      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(0.4, currentTime + 0.01); // Quick attack
      gainNode.gain.linearRampToValueAtTime(0.4, currentTime + 0.4); // Sustain
      gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.5); // Quick release

      // Play the ring tone
      oscillator1.start(currentTime);
      oscillator2.start(currentTime);
      oscillator1.stop(currentTime + 0.5);
      oscillator2.stop(currentTime + 0.5);

      // Schedule next ring (1.5 second intervals)
      if (isPlaying) {
        timeoutId = setTimeout(playRingTone, 1500);
      }
    } catch (error) {
      console.warn('Failed to play ring sound:', error);
    }
  };

  // Start the first ring immediately
  playRingTone();

  // Return stop function
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
      console.warn('Failed to close AudioContext:', error);
    }
  }
  audioContext = null;
}