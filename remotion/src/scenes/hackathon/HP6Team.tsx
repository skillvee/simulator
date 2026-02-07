// remotion/src/scenes/hackathon/HP6Team.tsx
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

export const HP6Team: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (20 seconds total = 600 frames at 30fps)
  const titleEnd = 3 * fps;      // 0-3s: Title
  const teamEnd = 17 * fps;      // 3-17s: Team intro
  // 17-20s: "We ship fast"

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Title (0-3s) */}
      <Sequence durationInFrames={titleEnd}>
        <TitlePunch />
      </Sequence>

      {/* Team Intro (3-17s) */}
      <Sequence from={titleEnd} durationInFrames={14 * fps}>
        <TeamIntro />
      </Sequence>

      {/* We Ship Fast (17-20s) */}
      <Sequence from={teamEnd} durationInFrames={3 * fps}>
        <WeShipFast />
      </Sequence>
    </AbsoluteFill>
  );
};

const TitlePunch: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.text,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: 120,
          fontWeight: 700,
          color: colors.background,
          transform: `scale(${scale})`,
        }}
      >
        The Team
      </div>
    </AbsoluteFill>
  );
};

const TeamIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const team = [
    {
      name: 'German Reyes',
      role: 'CEO',
      initials: 'GR',
      color: colors.accent,
      credentials: [
        '2 HR Tech exits (acquired by Buk)',
        '$0 → $1.4M ARR startup growth',
        'GPM at Walmart eCommerce',
        'Berkeley MBA',
      ],
    },
    {
      name: 'Matias Hoyl',
      role: 'CTO',
      initials: 'MH',
      color: '#8b5cf6',
      credentials: [
        'Meta GenAI team',
        'Stanford MS',
        'Built Zapien (35K users)',
        '2x Stanford Learning Design winner',
      ],
    },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        padding: 80,
        justifyContent: 'center',
      }}
    >
      {/* Team cards */}
      <div style={{ display: 'flex', gap: 60, justifyContent: 'center' }}>
        {team.map((member, i) => {
          const delay = i * 0.4 * fps;
          const scale = spring({
            frame: frame - delay,
            fps,
            config: animations.snappy,
          });

          return (
            <div
              key={member.name}
              style={{
                width: 500,
                backgroundColor: colors.background,
                border: `2px solid ${colors.border}`,
                borderRadius: 24,
                padding: 48,
                transform: `scale(${Math.max(0, scale)})`,
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  backgroundColor: member.color,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontFamily: fonts.heading,
                  fontSize: 48,
                  fontWeight: 700,
                  color: colors.background,
                  marginBottom: 24,
                }}
              >
                {member.initials}
              </div>

              {/* Name and role */}
              <div
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 36,
                  fontWeight: 700,
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                {member.name}
              </div>
              <div
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 24,
                  fontWeight: 500,
                  color: member.color,
                  marginBottom: 24,
                }}
              >
                {member.role}
              </div>

              {/* Credentials */}
              <div>
                {member.credentials.map((cred, j) => {
                  const credDelay = delay + (j + 1) * 0.2 * fps;
                  const credOpacity = interpolate(
                    frame,
                    [credDelay, credDelay + 0.3 * fps],
                    [0, 1],
                    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                  );

                  return (
                    <div
                      key={j}
                      style={{
                        fontFamily: fonts.heading,
                        fontSize: 20,
                        color: '#666',
                        marginBottom: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        opacity: credOpacity,
                      }}
                    >
                      <span style={{ color: colors.success, fontSize: 16 }}>✓</span>
                      {cred}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Partnership note */}
      <div
        style={{
          textAlign: 'center',
          marginTop: 48,
          opacity: interpolate(frame, [4 * fps, 4.5 * fps], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 24,
            color: '#888',
          }}
        >
          Building together for 8+ years
        </div>
      </div>
    </AbsoluteFill>
  );
};

const WeShipFast: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 80 },
  });

  const points = [
    { icon: '🏆', text: 'HR Tech exits — we know the buyer' },
    { icon: '🤖', text: 'Meta GenAI — we can build this' },
    { icon: '🚀', text: 'This prototype — we ship fast' },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.text,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 80,
      }}
    >
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: 64,
          fontWeight: 700,
          color: colors.background,
          marginBottom: 48,
          transform: `scale(${scale})`,
          textAlign: 'center',
        }}
      >
        Why Us?
      </div>

      <div style={{ display: 'flex', gap: 48 }}>
        {points.map((point, i) => {
          const delay = 0.3 * fps + i * 0.2 * fps;
          const pointScale = spring({
            frame: frame - delay,
            fps,
            config: animations.snappy,
          });

          return (
            <div
              key={i}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: '24px 32px',
                transform: `scale(${Math.max(0, pointScale)})`,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <span style={{ fontSize: 32 }}>{point.icon}</span>
              <span
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 24,
                  color: colors.background,
                }}
              >
                {point.text}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
