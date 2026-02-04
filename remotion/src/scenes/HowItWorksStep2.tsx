// remotion/src/scenes/HowItWorksStep2.tsx
// "How It Works" Step 2: Candidates Do Real Work
// Shows the Slack-like candidate experience with AI coworkers and voice calls

import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { colors, animations } from '../lib/design-system';
import { fonts } from '../lib/fonts';

// Coworker data matching actual platform
const coworkers = [
  { id: '1', name: 'Sarah Chen', role: 'Product Manager', initials: 'SC', color: '#ec4899', online: true },
  { id: '2', name: 'Marcus Johnson', role: 'Tech Lead', initials: 'MJ', color: '#3b82f6', online: true },
  { id: '3', name: 'Alex Rivera', role: 'Senior Engineer', initials: 'AR', color: '#8b5cf6', online: true },
  { id: '4', name: 'Jordan Kim', role: 'Designer', initials: 'JK', color: '#f97316', online: false },
  { id: '5', name: 'Taylor Moore', role: 'QA Engineer', initials: 'TM', color: '#06b6d4', online: false },
];

// Chat conversation with PM
const chatMessages = [
  {
    sender: 'Sarah Chen',
    text: "Hey! Welcome to the team. I've prepared the requirements for your first task.",
    delay: 0.5,
  },
  {
    sender: 'You',
    text: "Thanks Sarah! Excited to get started. What's the priority?",
    delay: 2,
  },
  {
    sender: 'Sarah Chen',
    text: "We need a dashboard component that shows real-time analytics. Here are the specs...",
    delay: 3.5,
  },
  {
    sender: 'You',
    text: "Got it. Should I sync with Marcus on the API integration?",
    delay: 5.5,
  },
  {
    sender: 'Sarah Chen',
    text: "Yes! He's expecting your call. He can walk you through the data structure.",
    delay: 7,
  },
];

export const HowItWorksStep2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Show voice call overlay after chat (starting at 9 seconds)
  const showVoiceCall = frame >= 9 * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: '#f8fafc' }}>
      <SlackInterface />
      {showVoiceCall && <VoiceCallOverlay />}
    </AbsoluteFill>
  );
};

const SlackInterface: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Interface fade in
  const uiOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Currently selected coworker
  const selectedCoworkerId = '1'; // Sarah Chen

  return (
    <AbsoluteFill style={{ opacity: uiOpacity, padding: 40 }}>
      {/* Browser container */}
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: colors.background,
          borderRadius: 16,
          border: `1px solid ${colors.border}`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Browser header with recording indicator */}
        <div
          style={{
            height: 48,
            backgroundColor: '#f1f5f9',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#22c55e' }} />
          </div>
          <div
            style={{
              flex: 1,
              marginLeft: 16,
              backgroundColor: colors.background,
              borderRadius: 6,
              padding: '6px 16px',
              fontFamily: fonts.mono,
              fontSize: 13,
              color: '#64748b',
            }}
          >
            skillvee.com/assessment/chat
          </div>
          {/* Recording indicator */}
          <RecordingIndicator />
        </div>

        {/* Slack-like layout */}
        <div style={{ flex: 1, display: 'flex' }}>
          {/* Sidebar */}
          <div
            style={{
              width: 280,
              borderRight: `1px solid ${colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: colors.background,
            }}
          >
            {/* Skillvee header */}
            <div
              style={{
                height: 64,
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: colors.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.background,
                  fontFamily: fonts.heading,
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                S
              </div>
              <span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 18 }}>
                Skillvee
              </span>
            </div>

            {/* Team list */}
            <div style={{ flex: 1, padding: 12, overflowY: 'hidden' }}>
              <div
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 12,
                  paddingLeft: 12,
                }}
              >
                Team
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {coworkers.map((coworker, i) => (
                  <CoworkerListItem
                    key={coworker.id}
                    coworker={coworker}
                    isSelected={coworker.id === selectedCoworkerId}
                    delay={i * 3}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Main chat area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Chat header */}
            <div
              style={{
                height: 64,
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: '#ec4899',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.background,
                  fontFamily: fonts.heading,
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                SC
              </div>
              <div>
                <div style={{ fontFamily: fonts.heading, fontWeight: 600, fontSize: 16 }}>
                  Sarah Chen
                </div>
                <div style={{ fontFamily: fonts.heading, fontSize: 12, color: '#22c55e' }}>
                  Online
                </div>
              </div>
              {/* Call button */}
              <div
                style={{
                  marginLeft: 'auto',
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: 16 }}>📞</span>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, padding: 24, overflowY: 'hidden' }}>
              {chatMessages.map((msg, i) => (
                <SlackMessage
                  key={i}
                  sender={msg.sender}
                  text={msg.text}
                  delay={msg.delay * fps}
                />
              ))}
            </div>

            {/* Input */}
            <div
              style={{
                height: 64,
                borderTop: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px',
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 44,
                  backgroundColor: '#f8fafc',
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  fontFamily: fonts.heading,
                  fontSize: 14,
                  color: '#94a3b8',
                }}
              >
                Message Sarah Chen...
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const RecordingIndicator: React.FC = () => {
  const frame = useCurrentFrame();

  // Pulsing animation
  const pulse = 0.7 + 0.3 * Math.sin(frame * 0.15);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#fef2f2',
        padding: '6px 12px',
        borderRadius: 6,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: '#ef4444',
          opacity: pulse,
        }}
      />
      <span style={{ fontFamily: fonts.heading, fontSize: 12, color: '#ef4444', fontWeight: 500 }}>
        Recording
      </span>
    </div>
  );
};

interface CoworkerListItemProps {
  coworker: typeof coworkers[0];
  isSelected: boolean;
  delay: number;
}

const CoworkerListItem: React.FC<CoworkerListItemProps> = ({ coworker, isSelected, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: animations.snappy,
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
        borderRadius: 12,
        backgroundColor: isSelected ? `${colors.accent}10` : 'transparent',
        border: isSelected ? `1px solid ${colors.accent}30` : '1px solid transparent',
        opacity: coworker.online ? entrance : entrance * 0.5,
        transform: `translateX(${(1 - entrance) * -30}px)`,
      }}
    >
      <div style={{ position: 'relative' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: coworker.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.background,
            fontFamily: fonts.heading,
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          {coworker.initials}
        </div>
        {/* Status dot */}
        <div
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: coworker.online ? '#22c55e' : '#9ca3af',
            border: '2px solid white',
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: fonts.heading,
            fontWeight: 600,
            fontSize: 14,
            color: isSelected ? colors.accent : colors.text,
          }}
        >
          {coworker.name}
        </div>
        <div style={{ fontFamily: fonts.heading, fontSize: 11, color: '#64748b' }}>
          {coworker.role}
        </div>
      </div>
      {/* Call button for online coworkers */}
      {coworker.online && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            backgroundColor: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
          }}
        >
          🎧
        </div>
      )}
    </div>
  );
};

interface SlackMessageProps {
  sender: string;
  text: string;
  delay: number;
}

const SlackMessage: React.FC<SlackMessageProps> = ({ sender, text, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: animations.snappy,
  });

  if (frame < delay) return null;

  const isUser = sender === 'You';
  const avatar = isUser ? null : coworkers.find((c) => c.name === sender);

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        marginBottom: 20,
        opacity: entrance,
        transform: `translateY(${(1 - entrance) * 20}px)`,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          backgroundColor: isUser ? '#1e293b' : avatar?.color || '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.background,
          fontFamily: fonts.heading,
          fontWeight: 600,
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {isUser ? 'You' : avatar?.initials || '?'}
      </div>

      {/* Message */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: fonts.heading, fontWeight: 600, fontSize: 15 }}>
            {sender}
          </span>
          <span style={{ fontFamily: fonts.heading, fontSize: 12, color: '#94a3b8' }}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div style={{ fontFamily: fonts.heading, fontSize: 15, lineHeight: 1.5, color: '#334155' }}>
          {text}
        </div>
      </div>
    </div>
  );
};

const VoiceCallOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const callStartFrame = 9 * fps;
  const localFrame = frame - callStartFrame;

  // Overlay entrance
  const overlayEntrance = spring({
    frame: localFrame,
    fps,
    config: animations.bouncy,
  });

  // Show call complete at 13 seconds (4 seconds into call)
  const showComplete = frame >= 13 * fps;
  const completeEntrance = spring({
    frame: frame - 13 * fps,
    fps,
    config: animations.bouncy,
  });

  // Waveform active during call
  const waveformActive = !showComplete;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: `rgba(0, 0, 0, ${0.85 * overlayEntrance})`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          backgroundColor: colors.background,
          borderRadius: 20,
          padding: 48,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: 420,
          transform: `scale(${overlayEntrance})`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {!showComplete ? (
          <>
            {/* Voice Call label */}
            <div
              style={{
                fontFamily: fonts.heading,
                fontSize: 12,
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: 2,
                marginBottom: 24,
              }}
            >
              Voice Call
            </div>

            {/* Tech Lead avatar */}
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.background,
                fontFamily: fonts.heading,
                fontWeight: 700,
                fontSize: 32,
                marginBottom: 16,
              }}
            >
              MJ
            </div>

            <div style={{ fontFamily: fonts.heading, fontWeight: 600, fontSize: 20, marginBottom: 4 }}>
              Marcus Johnson
            </div>
            <div style={{ fontFamily: fonts.heading, fontSize: 14, color: '#64748b', marginBottom: 24 }}>
              Tech Lead
            </div>

            {/* Waveform */}
            <div style={{ marginBottom: 24 }}>
              <Waveform active={waveformActive} />
            </div>

            {/* Connection status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: fonts.mono,
                fontSize: 13,
                color: colors.success,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: colors.success,
                }}
              />
              Connected - Discussing API architecture...
            </div>

            {/* Call controls */}
            <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                }}
              >
                ✕
              </div>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: colors.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                🎤
              </div>
            </div>
          </>
        ) : (
          /* Call Complete State */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transform: `scale(${completeEntrance})`,
            }}
          >
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                backgroundColor: colors.success,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <span style={{ fontSize: 50, color: colors.background }}>✓</span>
            </div>
            <div style={{ fontFamily: fonts.heading, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
              Call Complete
            </div>
            <div style={{ fontFamily: fonts.heading, fontSize: 16, color: '#64748b' }}>
              API architecture aligned. Ready to code!
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

const Waveform: React.FC<{ active: boolean }> = ({ active }) => {
  const frame = useCurrentFrame();

  const bars = 7;
  const barWidth = 6;
  const maxHeight = 50;
  const gap = 8;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap, height: maxHeight }}>
      {Array.from({ length: bars }).map((_, i) => {
        const baseHeight = 0.3 + 0.4 * Math.sin(i * 0.8);
        const animatedHeight = active
          ? baseHeight + 0.3 * Math.sin((frame + i * 8) * 0.2)
          : baseHeight * 0.3;

        return (
          <div
            key={i}
            style={{
              width: barWidth,
              height: maxHeight * Math.max(0.2, animatedHeight),
              backgroundColor: active ? colors.accent : '#e2e8f0',
              borderRadius: barWidth / 2,
              transition: 'height 0.1s',
            }}
          />
        );
      })}
    </div>
  );
};
