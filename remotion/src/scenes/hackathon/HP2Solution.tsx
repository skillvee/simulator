// remotion/src/scenes/hackathon/HP2Solution.tsx
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { colors, animations } from '../../lib/design-system';
import { fonts } from '../../lib/fonts';

export const HP2Solution: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (15 seconds total = 450 frames at 30fps)
  const headlineEnd = 6 * fps;   // 0-6s: Main headline with emphasis
  // 6-15s: How it works concept

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Headline: Watch Day 1 (0-6s) */}
      <Sequence durationInFrames={headlineEnd}>
        <SolutionHeadline />
      </Sequence>

      {/* Concept: 30-45 min simulation (6-15s) */}
      <Sequence from={headlineEnd} durationInFrames={9 * fps}>
        <SimulationConcept />
      </Sequence>
    </AbsoluteFill>
  );
};

const SolutionHeadline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1Opacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const line2Scale = spring({
    frame: frame - 0.8 * fps,
    fps,
    config: { damping: 10, stiffness: 80 },
  });

  const line3Opacity = interpolate(frame, [2 * fps, 2.5 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Highlight animation for "Day 1"
  const highlightWidth = interpolate(frame, [1.5 * fps, 2.5 * fps], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.text,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {/* Line 1: "For the first time" */}
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 48,
            fontWeight: 400,
            color: '#888',
            opacity: line1Opacity,
            marginBottom: 24,
          }}
        >
          For the first time
        </div>

        {/* Line 2: Main message */}
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 80,
            fontWeight: 700,
            color: colors.background,
            transform: `scale(${Math.max(0, line2Scale)})`,
            marginBottom: 24,
          }}
        >
          Watch a candidate do{' '}
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span style={{ color: colors.accent }}>Day 1</span>
            {/* Highlight underline */}
            <div
              style={{
                position: 'absolute',
                bottom: -4,
                left: 0,
                width: `${highlightWidth}%`,
                height: 8,
                backgroundColor: colors.accent,
                borderRadius: 4,
              }}
            />
          </span>
        </div>

        {/* Line 3: Before you hire */}
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 80,
            fontWeight: 700,
            color: colors.background,
            opacity: line3Opacity,
          }}
        >
          before you hire them
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SimulationConcept: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const steps = [
    { icon: '🎯', text: 'Gather requirements' },
    { icon: '💬', text: 'Collaborate with AI stakeholders' },
    { icon: '⌨️', text: 'Deliver real output' },
    { icon: '🎤', text: 'Defend their decisions' },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 80,
      }}
    >
      {/* Duration badge */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          right: 80,
          backgroundColor: colors.accent,
          color: colors.background,
          fontFamily: fonts.heading,
          fontSize: 32,
          fontWeight: 700,
          padding: '16px 32px',
          borderRadius: 50,
          opacity: titleOpacity,
        }}
      >
        30-45 min simulation
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: 56,
          fontWeight: 700,
          color: colors.text,
          marginBottom: 64,
          opacity: titleOpacity,
        }}
      >
        A real work simulation
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', gap: 40 }}>
        {steps.map((step, i) => {
          const delay = 0.5 * fps + i * 0.4 * fps;
          const scale = spring({
            frame: frame - delay,
            fps,
            config: animations.snappy,
          });

          const checkDelay = delay + 0.6 * fps;
          const checkScale = spring({
            frame: frame - checkDelay,
            fps,
            config: { damping: 8 },
          });

          return (
            <div
              key={i}
              style={{
                backgroundColor: colors.background,
                border: `2px solid ${colors.border}`,
                borderRadius: 20,
                padding: '32px 40px',
                transform: `scale(${Math.max(0, scale)})`,
                textAlign: 'center',
                width: 260,
                position: 'relative',
              }}
            >
              {/* Icon */}
              <div style={{ fontSize: 56, marginBottom: 16 }}>{step.icon}</div>

              {/* Text */}
              <div
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 24,
                  fontWeight: 500,
                  color: colors.text,
                }}
              >
                {step.text}
              </div>

              {/* Check mark */}
              <div
                style={{
                  position: 'absolute',
                  top: -12,
                  right: -12,
                  width: 36,
                  height: 36,
                  backgroundColor: colors.success,
                  borderRadius: '50%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  transform: `scale(${Math.max(0, checkScale)})`,
                  color: colors.background,
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                ✓
              </div>
            </div>
          );
        })}
      </div>

      {/* Arrow flow */}
      <div
        style={{
          display: 'flex',
          gap: 40,
          marginTop: 40,
          alignItems: 'center',
        }}
      >
        {[0, 1, 2].map((i) => {
          const arrowDelay = 2 * fps + i * 0.3 * fps;
          const arrowOpacity = interpolate(
            frame,
            [arrowDelay, arrowDelay + 0.3 * fps],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          return (
            <div
              key={i}
              style={{
                fontFamily: fonts.heading,
                fontSize: 32,
                color: colors.accent,
                opacity: arrowOpacity,
                marginLeft: i === 0 ? 120 : 180,
              }}
            >
              →
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
