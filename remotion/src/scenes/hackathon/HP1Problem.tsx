// remotion/src/scenes/hackathon/HP1Problem.tsx
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

export const HP1Problem: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (25 seconds total = 750 frames at 30fps)
  const stat1End = 5 * fps;      // 0-5s: "74% of resumes are AI-generated"
  const stat2End = 10 * fps;     // 5-10s: Interview stats
  const stat3End = 15 * fps;     // 10-15s: "45% use AI in interviews"
  const punchEnd = 20 * fps;     // 15-20s: "You're evaluating their copilot"
  // 20-25s: Current tools don't work

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Stat 1: AI Resumes (0-5s) */}
      <Sequence durationInFrames={stat1End}>
        <StatReveal
          number="74%"
          text="of resumes are now AI-generated"
          subtext="They all look the same"
        />
      </Sequence>

      {/* Stat 2: Interview Hell (5-10s) */}
      <Sequence from={stat1End} durationInFrames={5 * fps}>
        <StatReveal
          number="38+"
          text="hours per hire across 4-5 rounds"
          subtext="Engineering teams are drowning"
        />
      </Sequence>

      {/* Stat 3: AI in Interviews (10-15s) */}
      <Sequence from={stat2End} durationInFrames={5 * fps}>
        <StatReveal
          number="45%"
          text="of candidates use AI during interviews"
          subtext="Even interviews aren't reliable anymore"
        />
      </Sequence>

      {/* Punch: Copilot (15-20s) */}
      <Sequence from={stat3End} durationInFrames={5 * fps}>
        <PunchMessage />
      </Sequence>

      {/* Current Tools (20-25s) */}
      <Sequence from={punchEnd} durationInFrames={5 * fps}>
        <CurrentToolsFail />
      </Sequence>
    </AbsoluteFill>
  );
};

interface StatRevealProps {
  number: string;
  text: string;
  subtext: string;
}

const StatReveal: React.FC<StatRevealProps> = ({ number, text, subtext }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const numberScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const textOpacity = interpolate(frame, [0.5 * fps, 1 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const subtextOpacity = interpolate(frame, [1.5 * fps, 2 * fps], [0, 1], {
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
        {/* Big Number */}
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 280,
            fontWeight: 700,
            color: colors.accent,
            transform: `scale(${numberScale})`,
            lineHeight: 1,
          }}
        >
          {number}
        </div>

        {/* Main Text */}
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 56,
            fontWeight: 500,
            color: colors.background,
            opacity: textOpacity,
            marginTop: 24,
          }}
        >
          {text}
        </div>

        {/* Subtext */}
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 36,
            fontWeight: 400,
            color: '#888',
            opacity: subtextOpacity,
            marginTop: 16,
          }}
        >
          {subtext}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const PunchMessage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1Scale = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  const line2Scale = spring({
    frame: frame - 0.5 * fps,
    fps,
    config: animations.snappy,
  });

  const emphasisPulse = 1 + 0.05 * Math.sin((frame - fps) * 0.3);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.text,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 72,
            fontWeight: 500,
            color: colors.background,
            transform: `scale(${Math.max(0, line1Scale)})`,
            marginBottom: 24,
          }}
        >
          You're not evaluating the person
        </div>
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 96,
            fontWeight: 700,
            color: colors.accent,
            transform: `scale(${Math.max(0, line2Scale) * emphasisPulse})`,
          }}
        >
          You're evaluating their copilot
        </div>
      </div>
    </AbsoluteFill>
  );
};

const CurrentToolsFail: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tools = [
    { name: 'HackerRank', issue: 'Bans AI. Tests trivia.' },
    { name: 'Take-homes', issue: "Can't verify who wrote it." },
    { name: 'More interviews', issue: "6 weeks. Still guessing." },
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
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: 48,
          fontWeight: 700,
          color: colors.text,
          marginBottom: 60,
          textAlign: 'center',
        }}
      >
        Current tools make it worse
      </div>

      <div style={{ display: 'flex', gap: 48 }}>
        {tools.map((tool, i) => {
          const delay = i * 0.3 * fps;
          const scale = spring({
            frame: frame - delay,
            fps,
            config: animations.snappy,
          });

          return (
            <div
              key={tool.name}
              style={{
                backgroundColor: '#fef2f2',
                border: '2px solid #fca5a5',
                borderRadius: 16,
                padding: '40px 48px',
                transform: `scale(${Math.max(0, scale)})`,
                textAlign: 'center',
                width: 340,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 36,
                  fontWeight: 700,
                  color: '#dc2626',
                  marginBottom: 16,
                }}
              >
                {tool.name}
              </div>
              <div
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 24,
                  color: '#7f1d1d',
                }}
              >
                {tool.issue}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
