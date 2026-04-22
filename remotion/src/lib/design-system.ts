// remotion/src/lib/design-system.ts
//
// Video design tokens. Palette aligns with the Skillvee web app:
//   - Primary brand: #237CF1 (Tailwind `primary`)
//   - Dark site bg:  #020617 (Tailwind `slate-950`)
// Token names mirror shadcn/ui so scene code reads like the website.
export const colors = {
  // Surfaces
  background: '#FFFFFF',
  dark: '#020617',           // matches the site's hero bg
  muted: '#F1F5F9',          // slate-100 — subtle surface
  border: '#E2E8F0',         // slate-200

  // Text
  text: '#000000',           // legacy alias, prefer `foreground`
  foreground: '#0F172A',     // slate-900 — primary text
  mutedForeground: '#64748B',// slate-500 — secondary text

  // Brand
  accent: '#237CF1',         // legacy alias, prefer `primary`
  primary: '#237CF1',
  primaryForeground: '#FFFFFF',

  // Status
  success: '#22C55E',        // green-500
  successLight: '#DCFCE7',   // green-100
  warning: '#F59E0B',        // amber-500
  destructive: '#EF4444',    // red-500

  // Evaluation tier colors (matches scorecard semantics)
  developing: '#F59E0B',     // amber — needs improvement
  proficient: '#22C55E',     // green — meets bar
  strong: '#237CF1',         // brand blue — above bar
  exceptional: '#0F766E',    // teal-700 — top tier
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
