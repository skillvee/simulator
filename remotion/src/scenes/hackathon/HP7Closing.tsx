// remotion/src/scenes/hackathon/HP7Closing.tsx
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { colors, animations } from '../../lib/design-system';
import { fonts } from '../../lib/fonts';

export const HP7Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene timing (15 seconds total = 450 frames at 30fps)
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const taglineOpacity = interpolate(frame, [fps, 1.5 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const urlOpacity = interpolate(frame, [2 * fps, 2.5 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ctaScale = spring({
    frame: frame - 3 * fps,
    fps,
    config: animations.bouncy,
  });

  // Subtle pulsing glow effect
  const glowIntensity = 0.3 + 0.1 * Math.sin(frame * 0.1);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.text,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          background: `radial-gradient(circle, rgba(35, 124, 241, ${glowIntensity}) 0%, transparent 70%)`,
          borderRadius: '50%',
        }}
      />

      {/* Content */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        {/* Logo */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 120,
              fontWeight: 700,
              color: colors.background,
              letterSpacing: -2,
            }}
          >
            Skillvee
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 36,
            color: colors.accent,
            opacity: taglineOpacity,
            marginBottom: 48,
          }}
        >
          Watch them do Day 1 before you hire them
        </div>

        {/* URL */}
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 28,
            color: '#888',
            opacity: urlOpacity,
            marginBottom: 48,
          }}
        >
          skillvee.com
        </div>

        {/* CTA Button */}
        <div
          style={{
            transform: `scale(${Math.max(0, ctaScale)})`,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              backgroundColor: colors.accent,
              color: colors.background,
              fontFamily: fonts.heading,
              fontSize: 28,
              fontWeight: 700,
              padding: '20px 48px',
              borderRadius: 50,
              boxShadow: `0 0 40px rgba(35, 124, 241, 0.4)`,
            }}
          >
            <span>Try the Demo</span>
            <span style={{ fontSize: 24 }}>→</span>
          </div>
        </div>
      </div>

      {/* Hackathon badge */}
      <div
        style={{
          position: 'absolute',
          bottom: 48,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          opacity: interpolate(frame, [4 * fps, 4.5 * fps], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            background: 'linear-gradient(135deg, #4285f4 0%, #34a853 50%, #ea4335 100%)',
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 24 }}>✨</span>
        </div>
        <span
          style={{
            fontFamily: fonts.heading,
            fontSize: 20,
            color: '#666',
          }}
        >
          Built with Gemini
        </span>
      </div>
    </AbsoluteFill>
  );
};
