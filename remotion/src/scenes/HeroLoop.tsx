// remotion/src/scenes/HeroLoop.tsx
// A short, loopable hero video for the homepage (8 seconds)
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { colors, borders, animations, spacing } from '../lib/design-system';
import { fonts } from '../lib/fonts';
import { Avatar } from '../components/Avatar';
import { Waveform } from '../components/Waveform';

// Team members for the demo
const coworkers = [
  { initials: 'AC', name: 'Alex Chen', role: 'Tech Lead', color: '#3b82f6' },
  { initials: 'MG', name: 'Maria Garcia', role: 'Product Manager', color: '#ec4899' },
];

// Skill scores for results preview
const skillScores = [
  { label: 'Communication', value: 92, color: colors.success },
  { label: 'Problem Solving', value: 87, color: colors.primary },
  { label: 'Collaboration', value: 95, color: colors.success },
];

export const HeroLoop: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (8 seconds total = 240 frames at 30fps)
  const chatStart = 0;
  const chatDuration = 3.5 * fps; // 0-3.5s: Chat interaction
  const voiceStart = chatDuration;
  const voiceDuration = 2 * fps; // 3.5-5.5s: Voice call
  const resultsStart = voiceStart + voiceDuration;
  const resultsDuration = 2.5 * fps; // 5.5-8s: Results preview

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Chat interaction scene */}
      <Sequence from={chatStart} durationInFrames={chatDuration}>
        <ChatScene />
      </Sequence>

      {/* Voice call scene */}
      <Sequence from={voiceStart} durationInFrames={voiceDuration}>
        <VoiceCallScene />
      </Sequence>

      {/* Results preview scene */}
      <Sequence from={resultsStart} durationInFrames={resultsDuration}>
        <ResultsScene />
      </Sequence>
    </AbsoluteFill>
  );
};

// Chat interaction scene
const ChatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Container fade in
  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Fade out at end
  const fadeOut = interpolate(frame, [3 * fps, 3.5 * fps], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const messages = [
    { text: "Welcome to the team! Ready to discuss the payment API architecture?", isUser: false, delay: 15 },
    { text: "Absolutely! I've reviewed the requirements. Should we start with the authentication flow?", isUser: true, delay: 45 },
    { text: "Perfect approach. Let's hop on a quick call to align.", isUser: false, delay: 75 },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        opacity: fadeIn * fadeOut,
        padding: spacing.xxl,
      }}
    >
      {/* Browser-style frame */}
      <div
        style={{
          width: '100%',
          height: '100%',
          border: `${borders.width}px solid ${colors.border}`,
          borderRadius: borders.radius,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Browser header */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: colors.muted,
            borderBottom: `${borders.width}px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#EF4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FBBF24' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#10B981' }} />
          </div>
          <div
            style={{
              flex: 1,
              backgroundColor: colors.background,
              borderRadius: 6,
              padding: '6px 16px',
              fontFamily: fonts.mono,
              fontSize: 14,
              color: colors.mutedForeground,
            }}
          >
            skillvee.com/simulation
          </div>
        </div>

        {/* Chat interface */}
        <div style={{ display: 'flex', flex: 1 }}>
          {/* Sidebar with coworkers */}
          <div
            style={{
              width: 220,
              borderRight: `${borders.width}px solid ${colors.border}`,
              padding: spacing.md,
              backgroundColor: colors.background,
            }}
          >
            <div
              style={{
                fontFamily: fonts.heading,
                fontSize: 11,
                fontWeight: 700,
                color: colors.mutedForeground,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: spacing.md,
              }}
            >
              Your Team
            </div>
            {coworkers.map((member, i) => {
              const slideIn = spring({
                frame: frame - i * 5,
                fps,
                config: animations.snappy,
              });
              return (
                <div
                  key={member.name}
                  style={{
                    padding: '8px 12px',
                    marginBottom: 4,
                    borderRadius: 8,
                    backgroundColor: i === 0 ? `${colors.primary}15` : 'transparent',
                    opacity: slideIn,
                    transform: `translateX(${(1 - slideIn) * -30}px)`,
                  }}
                >
                  <Avatar
                    initials={member.initials}
                    name={member.name}
                    role={member.role}
                    size={28}
                    backgroundColor={member.color}
                    showStatus={true}
                  />
                </div>
              );
            })}
          </div>

          {/* Chat area */}
          <div style={{ flex: 1, padding: spacing.lg, display: 'flex', flexDirection: 'column' }}>
            {/* Chat header */}
            <div
              style={{
                paddingBottom: spacing.md,
                borderBottom: `${borders.width}px solid ${colors.border}`,
                marginBottom: spacing.md,
              }}
            >
              <Avatar
                initials="AC"
                name="Alex Chen"
                role="Tech Lead"
                size={36}
                backgroundColor="#3b82f6"
                showStatus={true}
              />
            </div>

            {/* Messages */}
            <div style={{ flex: 1 }}>
              {messages.map((msg, i) => {
                const msgProgress = spring({
                  frame: frame - msg.delay,
                  fps,
                  config: animations.snappy,
                });
                const opacity = interpolate(msgProgress, [0, 1], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                const translateX = (1 - msgProgress) * (msg.isUser ? 50 : -50);

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: msg.isUser ? 'flex-end' : 'flex-start',
                      marginBottom: spacing.md,
                      opacity,
                      transform: `translateX(${translateX}px)`,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '75%',
                        padding: '12px 18px',
                        backgroundColor: msg.isUser ? colors.primary : colors.muted,
                        borderRadius: borders.radius,
                        fontFamily: fonts.heading,
                        fontSize: 18,
                        lineHeight: 1.5,
                        color: msg.isUser ? colors.primaryForeground : colors.text,
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Voice call scene
const VoiceCallScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Zoom in from chat
  const scaleIn = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  // Fade out at end
  const fadeOut = interpolate(frame, [1.5 * fps, 2 * fps], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Waveform active state
  const waveformActive = frame > 10 && frame < 1.5 * fps;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.dark,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          backgroundColor: colors.background,
          border: `${borders.width}px solid ${colors.border}`,
          borderRadius: borders.radius * 2,
          padding: spacing.xxl,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: 400,
          transform: `scale(${scaleIn})`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 12,
            fontWeight: 700,
            color: colors.mutedForeground,
            textTransform: 'uppercase',
            letterSpacing: 2,
            marginBottom: spacing.lg,
          }}
        >
          Voice Call
        </div>

        <Avatar
          initials="AC"
          name="Alex Chen"
          role="Tech Lead"
          size={72}
          backgroundColor="#3b82f6"
          showStatus={false}
        />

        <div style={{ marginTop: spacing.lg }}>
          <Waveform bars={7} width={140} height={50} active={waveformActive} />
        </div>

        <div
          style={{
            marginTop: spacing.md,
            fontFamily: fonts.mono,
            fontSize: 12,
            color: colors.success,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              backgroundColor: colors.success,
              borderRadius: '50%',
            }}
          />
          Discussing architecture...
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Results preview scene
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in
  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Container scale
  const scaleIn = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeIn,
      }}
    >
      <div
        style={{
          transform: `scale(${scaleIn})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Header */}
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 28,
            fontWeight: 700,
            color: colors.text,
            marginBottom: spacing.lg,
            textAlign: 'center',
          }}
        >
          Assessment Complete
        </div>

        {/* Score card */}
        <div
          style={{
            border: `${borders.width}px solid ${colors.border}`,
            borderRadius: borders.radius,
            padding: spacing.xl,
            backgroundColor: colors.background,
            minWidth: 450,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          }}
        >
          {skillScores.map((skill, index) => {
            const barDelay = 10 + index * 12;
            const barProgress = spring({
              frame: frame - barDelay,
              fps,
              config: animations.smooth,
            });
            const barWidth = barProgress * skill.value;

            return (
              <div key={skill.label} style={{ marginBottom: index < skillScores.length - 1 ? spacing.md : 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: 14,
                      fontWeight: 500,
                      color: colors.text,
                    }}
                  >
                    {skill.label}
                  </span>
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: 14,
                      fontWeight: 700,
                      color: skill.color,
                    }}
                  >
                    {Math.round(barProgress * skill.value)}%
                  </span>
                </div>
                <div
                  style={{
                    height: 10,
                    backgroundColor: colors.muted,
                    borderRadius: 5,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${barWidth}%`,
                      backgroundColor: skill.color,
                      borderRadius: 5,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Skillvee branding */}
        <div
          style={{
            marginTop: spacing.lg,
            fontFamily: fonts.heading,
            fontSize: 20,
            fontWeight: 700,
            color: colors.primary,
          }}
        >
          Skillvee
        </div>
      </div>
    </AbsoluteFill>
  );
};
