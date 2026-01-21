// remotion/src/scenes/Scene6Results.tsx
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { colors, borders, animations } from '../lib/design-system';
import { fonts } from '../lib/fonts';
import { ProgressBar } from '../components/ProgressBar';

const skillScores = [
  { label: 'Communication', value: 87 },
  { label: 'Problem Solving', value: 92 },
  { label: 'AI Leverage', value: 78 },
  { label: 'Code Quality', value: 85 },
  { label: 'Collaboration', value: 90 },
  { label: 'Time Management', value: 82 },
];

export const Scene6Results: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (18 seconds total = 540 frames at 30fps)
  const titleEnd = 4 * fps; // 0-4s: "See HOW you work."
  const scoresEnd = 12 * fps; // 4-12s: Skill scores animate in
  // 12-18s: CTA

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* "See HOW you work." title (0-4s) */}
      <Sequence from={0} durationInFrames={titleEnd} premountFor={fps}>
        <TitleSection />
      </Sequence>

      {/* Skill scores (4-12s) */}
      <Sequence from={titleEnd} durationInFrames={scoresEnd - titleEnd} premountFor={fps}>
        <SkillScoresSection />
      </Sequence>

      {/* CTA (12-18s) */}
      <Sequence from={scoresEnd} durationInFrames={6 * fps} premountFor={fps}>
        <CTASection />
      </Sequence>
    </AbsoluteFill>
  );
};

const TitleSection: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  const fadeOut = interpolate(frame, [3 * fps, 4 * fps], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: 72,
          fontWeight: 700,
          color: colors.text,
          transform: `scale(${scale})`,
          textAlign: 'center',
        }}
      >
        See{' '}
        <span style={{ color: colors.accent, backgroundColor: colors.text, padding: '0 16px' }}>
          HOW
        </span>{' '}
        you work.
      </div>
    </AbsoluteFill>
  );
};

const SkillScoresSection: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Container fade in
  const containerOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Container slide in
  const containerSlide = spring({
    frame,
    fps,
    config: animations.snappy,
  });
  const containerY = interpolate(containerSlide, [0, 1], [30, 0]);

  // Fade out before CTA
  const fadeOut = interpolate(frame, [7 * fps, 8 * fps], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Stagger delay between each progress bar (in frames)
  const staggerDelay = 10;

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 48,
        opacity: containerOpacity * fadeOut,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          transform: `translateY(${containerY}px)`,
        }}
      >
        {/* Header */}
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 32,
            fontWeight: 700,
            color: colors.text,
            marginBottom: 32,
            textAlign: 'center',
          }}
        >
          Your Assessment Results
        </div>

        {/* Score card */}
        <div
          style={{
            border: `${borders.width}px solid ${colors.border}`,
            borderRadius: borders.radius,
            padding: 32,
            backgroundColor: colors.background,
          }}
        >
          {skillScores.map((skill, index) => (
            <ProgressBar
              key={skill.label}
              label={skill.label}
              value={skill.value}
              delay={index * staggerDelay}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const CTASection: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo fade in
  const logoOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const logoScale = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  // Button scale in (starts at 1s into CTA)
  const buttonDelay = 1 * fps;
  const buttonScale = spring({
    frame: frame - buttonDelay,
    fps,
    config: animations.bouncy,
  });

  // Button pulse
  const buttonPulse = frame > buttonDelay ? 1 + 0.03 * Math.sin((frame - buttonDelay) * 0.2) : 0;

  // URL fade in (starts at 2s into CTA)
  const urlDelay = 2 * fps;
  const urlOpacity = interpolate(frame, [urlDelay, urlDelay + 0.5 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.text,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
        }}
      >
        {/* Logo */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
          }}
        >
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 64,
              fontWeight: 700,
              color: colors.accent,
              letterSpacing: '-2px',
            }}
          >
            Skillvee
          </div>
        </div>

        {/* CTA Button */}
        <div
          style={{
            opacity: buttonScale > 0 ? 1 : 0,
            transform: `scale(${Math.max(0, buttonScale) * buttonPulse})`,
          }}
        >
          <div
            style={{
              padding: '16px 48px',
              backgroundColor: colors.accent,
              border: `${borders.width}px solid ${colors.background}`,
              borderRadius: borders.radius,
              fontFamily: fonts.heading,
              fontSize: 24,
              fontWeight: 700,
              color: colors.text,
              cursor: 'pointer',
            }}
          >
            Start Practicing
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            opacity: urlOpacity,
            fontFamily: fonts.mono,
            fontSize: 18,
            color: colors.background,
          }}
        >
          skillvee.com
        </div>
      </div>
    </AbsoluteFill>
  );
};
