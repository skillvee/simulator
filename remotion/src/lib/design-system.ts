// remotion/src/lib/design-system.ts
export const colors = {
  background: '#FFFFFF',
  text: '#000000',
  accent: '#237CF1',
  border: '#e2e8f0',
  success: '#22c55e',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borders = {
  width: 1,
  radius: 12,
} as const;

// Animation configs for consistent feel
export const animations = {
  snappy: { damping: 20, stiffness: 200 },
  bouncy: { damping: 8 },
  smooth: { damping: 200 },
} as const;

// Timing (in seconds, convert to frames with fps)
export const timing = {
  textPunchDuration: 2,
  fadeInDuration: 0.5,
  typewriterCharFrames: 2,
} as const;
