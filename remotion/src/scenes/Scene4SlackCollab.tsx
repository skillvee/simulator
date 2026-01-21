// remotion/src/scenes/Scene4SlackCollab.tsx
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
import { TextPunch } from '../components/TextPunch';
import { Avatar } from '../components/Avatar';
import { ChatBubble } from '../components/ChatBubble';
import { Waveform } from '../components/Waveform';

// Team members data
const teamMembers = [
  { initials: 'AC', name: 'Alex Chen', role: 'Tech Lead', color: '#3b82f6' },
  { initials: 'MG', name: 'Maria Garcia', role: 'Product Manager', color: '#ec4899' },
  { initials: 'ML', name: 'Marcus Lee', role: 'Senior Engineer', color: '#8b5cf6' },
  { initials: 'PS', name: 'Priya Sharma', role: 'Designer', color: '#f97316' },
  { initials: 'JO', name: "James O'Brien", role: 'QA Engineer', color: '#06b6d4' },
];

// Conversations for each team member
const conversations: Record<string, Array<{ message: string; isUser: boolean; delay: number }>> = {
  'Alex Chen': [
    { message: "Hey! Welcome to the team. I'm excited to have you on the Payments project.", isUser: false, delay: 0.5 },
    { message: "Thanks Alex! Looking forward to diving in. What's the first priority?", isUser: true, delay: 1.5 },
  ],
  'Maria Garcia': [
    { message: "Hi! I've prepared the requirements doc. Main focus: PCI compliance and 99.9% uptime.", isUser: false, delay: 0.5 },
    { message: "Got it. I'll review the compliance requirements first. Any deadline concerns?", isUser: true, delay: 1.5 },
  ],
  'Marcus Lee': [
    { message: "Here's the auth service pattern we use:", isUser: false, delay: 0.3 },
    { message: "const auth = await validateToken(req);\nif (!auth.valid) throw new AuthError();", isUser: false, delay: 1 },
    { message: "Clean pattern! I'll follow this for the payment endpoints.", isUser: true, delay: 2 },
  ],
};

export const Scene4SlackCollab: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (22 seconds = 660 frames at 30fps)
  const textPunchEnd = 2 * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* "REAL TEAMWORK." (0-2s) */}
      <Sequence durationInFrames={textPunchEnd} premountFor={fps}>
        <TextPunch text="REAL TEAMWORK." fontSize={72} />
      </Sequence>

      {/* Slack Interface (2-22s) */}
      <Sequence from={textPunchEnd} durationInFrames={20 * fps} premountFor={fps}>
        <SlackInterface />
      </Sequence>
    </AbsoluteFill>
  );
};

const SlackInterface: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // UI fade in
  const uiOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Sidebar slide in
  const sidebarSlide = spring({
    frame,
    fps,
    config: animations.snappy,
  });
  const sidebarX = interpolate(sidebarSlide, [0, 1], [-200, 0]);

  // Determine active member based on timing
  // 0-4s (0-120 frames): Alex Chen
  // 4-8s (120-240 frames): Maria Garcia
  // 8-12s (240-360 frames): Marcus Lee
  // 12-20s (360-600 frames): Back to Alex Chen with voice call
  const getActiveMember = () => {
    if (frame < 4 * fps) return 'Alex Chen';
    if (frame < 8 * fps) return 'Maria Garcia';
    if (frame < 12 * fps) return 'Marcus Lee';
    return 'Alex Chen';
  };

  const activeMember = getActiveMember();
  const activeMemberData = teamMembers.find((m) => m.name === activeMember)!;

  // Voice call overlay (12-20s = 360-600 frames)
  const showVoiceCall = frame >= 12 * fps;
  const voiceCallProgress = spring({
    frame: frame - 12 * fps,
    fps,
    config: animations.bouncy,
  });

  // Call checkmark (appears at 18s = 540 frames, which is 16s into interface = 480 frames)
  const showCallCheckmark = frame >= 16 * fps;
  const checkmarkProgress = spring({
    frame: frame - 16 * fps,
    fps,
    config: animations.bouncy,
  });

  // Waveform active during call until checkmark
  const waveformActive = showVoiceCall && !showCallCheckmark;

  // Get current messages for active member
  const currentMessages = conversations[activeMember] || [];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        opacity: uiOpacity,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 40px',
          borderBottom: `${borders.width}px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 18,
            fontWeight: 700,
            color: colors.text,
          }}
        >
          Skillvee Workspace
        </div>
        <span style={{ color: '#666' }}>/</span>
        <span
          style={{
            fontFamily: fonts.heading,
            fontSize: 14,
            color: '#666',
          }}
        >
          #payments-team
        </span>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <div
          style={{
            width: 260,
            borderRight: `${borders.width}px solid ${colors.border}`,
            padding: 20,
            transform: `translateX(${sidebarX}px)`,
            backgroundColor: colors.background,
          }}
        >
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 12,
              fontWeight: 700,
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 16,
            }}
          >
            Team Members
          </div>

          {teamMembers.map((member, i) => {
            const isActive = member.name === activeMember;
            const memberSlide = spring({
              frame: frame - i * 3,
              fps,
              config: animations.snappy,
            });
            const memberOpacity = interpolate(memberSlide, [0, 1], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const memberX = interpolate(memberSlide, [0, 1], [-50, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            return (
              <div
                key={member.name}
                style={{
                  padding: '10px 12px',
                  marginBottom: 4,
                  backgroundColor: isActive ? colors.accent : 'transparent',
                  border: isActive
                    ? `${borders.width}px solid ${colors.border}`
                    : `${borders.width}px solid transparent`,
                  opacity: memberOpacity,
                  transform: `translateX(${memberX}px)`,
                  cursor: 'pointer',
                }}
              >
                <Avatar
                  initials={member.initials}
                  name={member.name}
                  role={member.role}
                  size={32}
                  backgroundColor={member.color}
                  showStatus={true}
                />
              </div>
            );
          })}
        </div>

        {/* Main chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Chat header */}
          <div
            style={{
              padding: '16px 24px',
              borderBottom: `${borders.width}px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Avatar
              initials={activeMemberData.initials}
              name={activeMemberData.name}
              role={activeMemberData.role}
              size={40}
              backgroundColor={activeMemberData.color}
            />
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: 12,
                color: '#666',
              }}
            >
              Direct Message
            </div>
          </div>

          {/* Messages area */}
          <div
            style={{
              flex: 1,
              padding: 24,
              overflowY: 'hidden',
            }}
          >
            {currentMessages.map((msg, i) => (
              <ChatBubble
                key={`${activeMember}-${i}`}
                message={msg.message}
                isUser={msg.isUser}
                delay={msg.delay * fps}
              />
            ))}
          </div>

          {/* Input area */}
          <div
            style={{
              padding: 20,
              borderTop: `${borders.width}px solid ${colors.border}`,
            }}
          >
            <div
              style={{
                border: `${borders.width}px solid ${colors.border}`,
                padding: '12px 16px',
                fontFamily: fonts.heading,
                fontSize: 14,
                color: '#999',
              }}
            >
              Message {activeMemberData.name}...
            </div>
          </div>
        </div>
      </div>

      {/* Voice call overlay */}
      {showVoiceCall && (
        <AbsoluteFill
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: voiceCallProgress,
          }}
        >
          <div
            style={{
              backgroundColor: colors.background,
              border: `${borders.width}px solid ${colors.border}`,
              padding: 48,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: 400,
              transform: `scale(${voiceCallProgress})`,
            }}
          >
            {!showCallCheckmark ? (
              <>
                <div
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    marginBottom: 24,
                  }}
                >
                  Voice Call
                </div>

                <Avatar
                  initials="AC"
                  name="Alex Chen"
                  role="Tech Lead"
                  size={80}
                  backgroundColor="#3b82f6"
                  showStatus={false}
                />

                <div style={{ marginTop: 32 }}>
                  <Waveform bars={7} width={160} height={60} active={waveformActive} />
                </div>

                <div
                  style={{
                    marginTop: 24,
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
                  Connected - Discussing architecture...
                </div>

                <div
                  style={{
                    marginTop: 32,
                    display: 'flex',
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      backgroundColor: '#ef4444',
                      border: `${borders.width}px solid ${colors.border}`,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontFamily: fonts.mono,
                      fontSize: 20,
                    }}
                  >
                    X
                  </div>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      backgroundColor: colors.accent,
                      border: `${borders.width}px solid ${colors.border}`,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontFamily: fonts.mono,
                      fontSize: 16,
                    }}
                  >
                    M
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transform: `scale(${checkmarkProgress})`,
                }}
              >
                <div
                  style={{
                    width: 100,
                    height: 100,
                    backgroundColor: colors.success,
                    border: `${borders.width}px solid ${colors.border}`,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 24,
                  }}
                >
                  <span
                    style={{
                      fontSize: 50,
                      color: colors.background,
                    }}
                  >
                    ✓
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 24,
                    fontWeight: 700,
                    color: colors.text,
                  }}
                >
                  Call Complete
                </div>
                <div
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 14,
                    color: '#666',
                    marginTop: 8,
                  }}
                >
                  Architecture aligned. Ready to code!
                </div>
              </div>
            )}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
