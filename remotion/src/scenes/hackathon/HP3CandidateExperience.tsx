// remotion/src/scenes/hackathon/HP3CandidateExperience.tsx
// Uses ACTUAL Skillvee UI patterns from the product
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

export const HP3CandidateExperience: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (40 seconds total = 1200 frames at 30fps)
  const titleEnd = 3 * fps;           // 0-3s: Title punch
  const slackOverviewEnd = 13 * fps;  // 3-13s: Slack layout with sidebar
  const chatEnd = 25 * fps;           // 13-25s: Chat messages
  const callEnd = 35 * fps;           // 25-35s: Voice call with floating bar
  // 35-40s: Completion

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Title: Candidate POV (0-3s) */}
      <Sequence durationInFrames={titleEnd}>
        <TitlePunch text="The Candidate Experience" />
      </Sequence>

      {/* Slack Overview with Sidebar (3-13s) */}
      <Sequence from={titleEnd} durationInFrames={10 * fps}>
        <SlackLayout showChat={false} />
      </Sequence>

      {/* Chat Messages (13-25s) */}
      <Sequence from={slackOverviewEnd} durationInFrames={12 * fps}>
        <SlackLayout showChat={true} />
      </Sequence>

      {/* Voice Call (25-35s) */}
      <Sequence from={chatEnd} durationInFrames={10 * fps}>
        <VoiceCallScene />
      </Sequence>

      {/* Completion (35-40s) */}
      <Sequence from={callEnd} durationInFrames={5 * fps}>
        <CompletionScene />
      </Sequence>
    </AbsoluteFill>
  );
};

const TitlePunch: React.FC<{ text: string }> = ({ text }) => {
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
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: 96,
          fontWeight: 700,
          color: colors.primaryForeground,
          transform: `scale(${scale})`,
          textAlign: 'center',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

// Actual Skillvee Slack-style layout
const SlackLayout: React.FC<{ showChat: boolean }> = ({ showChat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sidebarSlide = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  const coworkers = [
    { id: '1', name: 'Sarah Mitchell', role: 'Engineering Manager', online: true, initials: 'SM', color: '#6366f1' },
    { id: '2', name: 'Jake Liu', role: 'Product Manager', online: true, initials: 'JL', color: '#8b5cf6' },
    { id: '3', name: 'Alex Chen', role: 'Tech Lead', online: true, initials: 'AC', color: '#f59e0b' },
    { id: '4', name: 'Maria Garcia', role: 'Designer', online: false, initials: 'MG', color: '#94a3b8' },
    { id: '5', name: 'Tom Wilson', role: 'DevOps', online: false, initials: 'TW', color: '#94a3b8' },
  ];

  const messages = [
    { role: 'model', name: 'Sarah Mitchell', text: "Hey! Welcome to the team. I've got a task for you.", delay: 0 },
    { role: 'model', name: 'Sarah Mitchell', text: "We need to implement user authentication for our app.", delay: 1.5 },
    { role: 'user', name: 'You', text: "Thanks! Should I use OAuth or JWT for this?", delay: 4 },
    { role: 'model', name: 'Sarah Mitchell', text: "JWT would be perfect. Check with Jake on the API spec.", delay: 6 },
    { role: 'user', name: 'You', text: "Got it. I'll ping him now.", delay: 8 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Sidebar - 280px like real app */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 280,
          backgroundColor: colors.background,
          borderRight: `1px solid ${colors.border}`,
          transform: `translateX(${interpolate(sidebarSlide, [0, 1], [-280, 0])}px)`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header with Skillvee logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              backgroundColor: colors.primary,
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: colors.primaryForeground,
              fontFamily: fonts.heading,
              fontWeight: 700,
              fontSize: 18,
              marginRight: 12,
            }}
          >
            S
          </div>
          <span
            style={{
              fontFamily: fonts.heading,
              fontWeight: 700,
              fontSize: 18,
              color: colors.foreground,
            }}
          >
            Skillvee
          </span>
        </div>

        {/* Team section */}
        <div style={{ padding: '16px 12px' }}>
          <div
            style={{
              padding: '0 12px',
              marginBottom: 8,
              fontFamily: fonts.heading,
              fontSize: 11,
              fontWeight: 600,
              color: colors.mutedForeground,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Team
          </div>

          {/* Coworker list */}
          {coworkers.map((cw, i) => {
            const delay = 0.5 * fps + i * 0.15 * fps;
            const itemOpacity = interpolate(frame, [delay, delay + 0.3 * fps], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const isSelected = i === 0;

            return (
              <div
                key={cw.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  borderRadius: 12,
                  opacity: itemOpacity,
                  backgroundColor: isSelected ? `${colors.primary}15` : 'transparent',
                  boxShadow: isSelected ? `0 0 0 1px ${colors.primary}30` : 'none',
                }}
              >
                {/* Avatar with status dot */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: cw.online ? cw.color : colors.muted,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontFamily: fonts.heading,
                      fontSize: 12,
                      fontWeight: 600,
                      color: cw.online ? '#fff' : colors.mutedForeground,
                      border: `2px solid ${colors.background}`,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    }}
                  >
                    {cw.initials}
                  </div>
                  {/* Status dot */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: cw.online ? colors.success : `${colors.mutedForeground}60`,
                      border: `2px solid ${colors.background}`,
                    }}
                  />
                </div>

                {/* Name and role */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: 14,
                      fontWeight: 600,
                      color: cw.online ? colors.foreground : colors.mutedForeground,
                    }}
                  >
                    {cw.name}
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: 10,
                      color: colors.mutedForeground,
                    }}
                  >
                    {cw.role}
                  </div>
                </div>

                {/* Headphone icon for online users */}
                {cw.online && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      color: colors.mutedForeground,
                      fontSize: 14,
                    }}
                  >
                    🎧
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div
        style={{
          position: 'absolute',
          left: 280,
          right: 0,
          top: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Chat container with rounded corners like real app */}
        <div
          style={{
            flex: 1,
            margin: 16,
            backgroundColor: colors.background,
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Chat header */}
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <div>
              <div style={{ fontFamily: fonts.heading, fontSize: 18, fontWeight: 700, color: colors.foreground }}>
                Sarah Mitchell
              </div>
              <div style={{ fontFamily: fonts.heading, fontSize: 12, color: colors.mutedForeground }}>
                Engineering Manager
              </div>
            </div>

            {/* Start Call button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 999,
                border: `1px solid ${colors.border}`,
                fontFamily: fonts.heading,
                fontSize: 14,
                fontWeight: 500,
                color: colors.foreground,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              🎧 Start Call
            </div>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {showChat ? (
              messages.map((msg, i) => {
                const msgDelay = msg.delay * fps;
                const msgOpacity = interpolate(frame, [msgDelay, msgDelay + 0.3 * fps], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                const msgSlide = interpolate(frame, [msgDelay, msgDelay + 0.3 * fps], [20, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                const isUser = msg.role === 'user';

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 16,
                      flexDirection: isUser ? 'row-reverse' : 'row',
                      opacity: msgOpacity,
                      transform: `translateY(${msgSlide}px)`,
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: isUser ? colors.primary : '#6366f1',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontFamily: fonts.heading,
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#fff',
                        flexShrink: 0,
                        marginTop: 4,
                        border: `1px solid ${colors.border}`,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      }}
                    >
                      {isUser ? 'You' : 'SM'}
                    </div>

                    {/* Message bubble */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-end' : 'flex-start',
                        maxWidth: '60%',
                      }}
                    >
                      <div
                        style={{
                          padding: '12px 20px',
                          borderRadius: 16,
                          // Sharp corner on bottom-right for user, bottom-left for model
                          borderBottomRightRadius: isUser ? 4 : 16,
                          borderBottomLeftRadius: isUser ? 16 : 4,
                          backgroundColor: isUser ? colors.primary : colors.muted,
                          color: isUser ? colors.primaryForeground : colors.foreground,
                          fontFamily: fonts.heading,
                          fontSize: 15,
                          lineHeight: 1.5,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                      >
                        {msg.text}
                      </div>
                      <div
                        style={{
                          fontFamily: fonts.heading,
                          fontSize: 11,
                          color: colors.mutedForeground,
                          marginTop: 6,
                          fontWeight: 500,
                          padding: '0 4px',
                        }}
                      >
                        {`9:${15 + i * 2}`.padStart(4, '0')} AM
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Empty state */
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: '#6366f1',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontFamily: fonts.heading,
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#fff',
                    marginBottom: 16,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  SM
                </div>
                <div
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 18,
                    fontWeight: 600,
                    color: colors.foreground,
                    marginBottom: 8,
                  }}
                >
                  Start a conversation with Sarah Mitchell
                </div>
                <div
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 14,
                    color: colors.mutedForeground,
                    maxWidth: 400,
                  }}
                >
                  Sarah is the Engineering Manager. Ask questions about the project or codebase.
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div
            style={{
              padding: 16,
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: colors.muted,
                padding: '8px 8px 8px 16px',
                borderRadius: 999,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div
                style={{
                  flex: 1,
                  fontFamily: fonts.heading,
                  fontSize: 14,
                  color: colors.mutedForeground,
                }}
              >
                Type a message...
              </div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: colors.primary,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: colors.primaryForeground,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              >
                ➤
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Voice call scene with floating call bar
const VoiceCallScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const barSlide = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  // Waveform animation
  const waveformActive = frame > fps;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Reuse slack layout background */}
      <SlackLayout showChat={true} />

      {/* Floating Call Bar - matches actual component */}
      <div
        style={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          width: 256,
          transform: `translateY(${interpolate(barSlide, [0, 1], [100, 0])}px)`,
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: `${colors.primary}10`,
            filter: 'blur(20px)',
            borderRadius: 16,
          }}
        />

        {/* Card */}
        <div
          style={{
            position: 'relative',
            backgroundColor: colors.background,
            borderRadius: 16,
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            border: `1px solid ${colors.border}`,
            overflow: 'hidden',
          }}
        >
          {/* Content */}
          <div style={{ padding: 16 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Avatar with pulsing glow */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      inset: -4,
                      borderRadius: '50%',
                      backgroundColor: `${colors.success}30`,
                      animation: 'pulse 2s ease-in-out infinite',
                    }}
                  />
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: '#6366f1',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontFamily: fonts.heading,
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#fff',
                      position: 'relative',
                      border: `2px solid ${colors.background}`,
                    }}
                  >
                    SM
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily: fonts.heading, fontSize: 14, fontWeight: 700, color: colors.foreground }}>
                    On Call
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: 12,
                      color: colors.success,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: colors.success,
                      }}
                    />
                    Connected
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              {/* Mute button */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: `1px solid ${colors.border}`,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: 18,
                }}
              >
                🎤
              </div>

              {/* Waveform */}
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, height: 40 }}>
                {waveformActive ? (
                  [...Array(12)].map((_, i) => {
                    const height = 4 + Math.sin((frame * 0.3) + i * 0.5) * 16;
                    return (
                      <div
                        key={i}
                        style={{
                          width: 4,
                          height: Math.max(4, height),
                          backgroundColor: `${colors.primary}60`,
                          borderRadius: 2,
                        }}
                      />
                    );
                  })
                ) : (
                  <div style={{ height: 4, width: '100%', backgroundColor: colors.muted, borderRadius: 2 }} />
                )}
              </div>

              {/* End call button */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: colors.destructive,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#fff',
                  fontSize: 16,
                  boxShadow: `0 4px 12px ${colors.destructive}40`,
                }}
              >
                📞
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Label */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          backgroundColor: colors.success,
          color: '#fff',
          fontFamily: fonts.heading,
          fontSize: 14,
          fontWeight: 600,
          padding: '8px 16px',
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#fff' }} />
        Voice Call Active
      </div>
    </AbsoluteFill>
  );
};

// Completion scene
const CompletionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const checkScale = spring({
    frame,
    fps,
    config: { damping: 8 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {/* Success checkmark */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            backgroundColor: colors.successLight,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '0 auto 24px',
            transform: `scale(${checkScale})`,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: colors.success,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: 40,
              color: '#fff',
            }}
          >
            ✓
          </div>
        </div>

        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 48,
            fontWeight: 700,
            color: colors.foreground,
            marginBottom: 16,
          }}
        >
          Simulation Complete
        </div>

        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 24,
            color: colors.mutedForeground,
          }}
        >
          All tasks completed • Screen recorded • Ready for review
        </div>
      </div>
    </AbsoluteFill>
  );
};
