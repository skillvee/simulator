// remotion/src/scenes/HowItWorksStep2Zoomed.tsx
// "How It Works" Step 2: Candidates Do Real Work - ZOOMED VERSION
// Extra-large fonts and elements for small-screen viewing

import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { colors, animations } from '../lib/design-system';
import { fonts } from '../lib/fonts';

// Coworker data
const coworkers = [
  { id: '1', name: 'Sarah Chen', role: 'Product Manager', initials: 'SC', color: '#ec4899', online: true },
  { id: '2', name: 'Marcus Johnson', role: 'Tech Lead', initials: 'MJ', color: '#3b82f6', online: true },
  { id: '3', name: 'Alex Rivera', role: 'Senior Engineer', initials: 'AR', color: '#8b5cf6', online: true },
];

// Chat conversation with PM (compact version)
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
    text: "We need a dashboard component that shows real-time analytics...",
    delay: 3.5,
  },
  {
    sender: 'You',
    text: "Got it. Should I sync with Marcus on the API integration?",
    delay: 5.5,
  },
  {
    sender: 'Sarah Chen',
    text: "Yes! He's expecting your call.",
    delay: 7,
  },
];

export const HowItWorksStep2Zoomed: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Show voice call overlay after chat (starting at 8 seconds)
  const showVoiceCall = frame >= 8 * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f172a' }}>
      <SlackInterfaceZoomed />
      {showVoiceCall && <VoiceCallOverlay />}
    </AbsoluteFill>
  );
};

const SlackInterfaceZoomed: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Interface fade in
  const uiOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: uiOpacity, padding: 20 }}>
      {/* Main container - dark themed, no browser chrome */}
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1e293b',
          borderRadius: 28,
          border: '3px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        {/* Sidebar - Compact team list */}
        <div
          style={{
            width: 380,
            borderRight: '3px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0f172a',
          }}
        >
          {/* Header */}
          <div
            style={{
              height: 100,
              borderBottom: '3px solid #334155',
              display: 'flex',
              alignItems: 'center',
              padding: '0 32px',
              gap: 18,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                backgroundColor: colors.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.background,
                fontFamily: fonts.heading,
                fontWeight: 700,
                fontSize: 26,
              }}
            >
              S
            </div>
            <span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 30, color: 'white' }}>
              Skillvee
            </span>
          </div>

          {/* Team list */}
          <div style={{ flex: 1, padding: 20, overflowY: 'hidden' }}>
            <div
              style={{
                fontFamily: fonts.heading,
                fontSize: 16,
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: 2,
                marginBottom: 20,
                paddingLeft: 16,
              }}
            >
              Your Team
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {coworkers.map((coworker, i) => (
                <CoworkerListItem
                  key={coworker.id}
                  coworker={coworker}
                  isSelected={coworker.id === '1'}
                  delay={i * 5}
                />
              ))}
            </div>
          </div>

          {/* Recording indicator */}
          <div
            style={{
              height: 90,
              borderTop: '3px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 24px',
            }}
          >
            <RecordingBadge />
          </div>
        </div>

        {/* Main chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Chat header */}
          <div
            style={{
              height: 110,
              borderBottom: '3px solid #334155',
              display: 'flex',
              alignItems: 'center',
              padding: '0 36px',
              gap: 20,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: '#ec4899',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.background,
                fontFamily: fonts.heading,
                fontWeight: 600,
                fontSize: 24,
              }}
            >
              SC
            </div>
            <div>
              <div style={{ fontFamily: fonts.heading, fontWeight: 600, fontSize: 30, color: 'white' }}>
                Sarah Chen
              </div>
              <div style={{ fontFamily: fonts.heading, fontSize: 18, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#22c55e' }} />
                Online
              </div>
            </div>
            {/* Call button */}
            <div
              style={{
                marginLeft: 'auto',
                width: 60,
                height: 60,
                borderRadius: 16,
                backgroundColor: colors.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 28 }}>📞</span>
            </div>
          </div>

          {/* Messages - Larger text */}
          <div style={{ flex: 1, padding: 36, overflowY: 'hidden' }}>
            {chatMessages.map((msg, i) => (
              <SlackMessage
                key={i}
                sender={msg.sender}
                text={msg.text}
                delay={msg.delay * 30}
              />
            ))}
          </div>

          {/* Input */}
          <div
            style={{
              height: 100,
              borderTop: '3px solid #334155',
              display: 'flex',
              alignItems: 'center',
              padding: '0 36px',
            }}
          >
            <div
              style={{
                flex: 1,
                height: 64,
                backgroundColor: '#0f172a',
                borderRadius: 16,
                border: '3px solid #334155',
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px',
                fontFamily: fonts.heading,
                fontSize: 22,
                color: '#64748b',
              }}
            >
              Message Sarah Chen...
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const RecordingBadge: React.FC = () => {
  const frame = useCurrentFrame();

  // Pulsing animation
  const pulse = 0.7 + 0.3 * Math.sin(frame * 0.15);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        padding: '14px 24px',
        borderRadius: 14,
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: '#ef4444',
          opacity: pulse,
        }}
      />
      <span style={{ fontFamily: fonts.heading, fontSize: 20, color: '#ef4444', fontWeight: 600 }}>
        Screen Recording Active
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
        gap: 18,
        padding: '16px 20px',
        borderRadius: 18,
        backgroundColor: isSelected ? `${colors.accent}20` : 'transparent',
        border: isSelected ? `3px solid ${colors.accent}40` : '3px solid transparent',
        opacity: entrance,
        transform: `translateX(${(1 - entrance) * -30}px)`,
      }}
    >
      <div style={{ position: 'relative' }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: coworker.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.background,
            fontFamily: fonts.heading,
            fontWeight: 600,
            fontSize: 20,
          }}
        >
          {coworker.initials}
        </div>
        {/* Status dot */}
        <div
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: coworker.online ? '#22c55e' : '#64748b',
            border: '3px solid #0f172a',
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: fonts.heading,
            fontWeight: 600,
            fontSize: 22,
            color: isSelected ? colors.accent : 'white',
          }}
        >
          {coworker.name}
        </div>
        <div style={{ fontFamily: fonts.heading, fontSize: 17, color: '#64748b' }}>
          {coworker.role}
        </div>
      </div>
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
        gap: 20,
        marginBottom: 32,
        opacity: entrance,
        transform: `translateY(${(1 - entrance) * 20}px)`,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          backgroundColor: isUser ? '#475569' : avatar?.color || '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.background,
          fontFamily: fonts.heading,
          fontWeight: 600,
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {isUser ? 'You' : avatar?.initials || '?'}
      </div>

      {/* Message */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
          <span style={{ fontFamily: fonts.heading, fontWeight: 600, fontSize: 24, color: 'white' }}>
            {sender}
          </span>
          <span style={{ fontFamily: fonts.heading, fontSize: 16, color: '#64748b' }}>
            now
          </span>
        </div>
        <div style={{ fontFamily: fonts.heading, fontSize: 24, lineHeight: 1.6, color: '#cbd5e1' }}>
          {text}
        </div>
      </div>
    </div>
  );
};

const VoiceCallOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const callStartFrame = 8 * fps;
  const localFrame = frame - callStartFrame;

  // Overlay entrance
  const overlayEntrance = spring({
    frame: localFrame,
    fps,
    config: animations.bouncy,
  });

  // Show call complete at 12.5 seconds (4.5 seconds into call)
  const showComplete = frame >= 12.5 * fps;
  const completeEntrance = spring({
    frame: frame - 12.5 * fps,
    fps,
    config: animations.bouncy,
  });

  // Waveform active during call
  const waveformActive = !showComplete;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: `rgba(0, 0, 0, ${0.9 * overlayEntrance})`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          backgroundColor: '#1e293b',
          borderRadius: 32,
          padding: 72,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: 600,
          transform: `scale(${overlayEntrance})`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          border: '3px solid #334155',
        }}
      >
        {!showComplete ? (
          <>
            {/* Voice Call label */}
            <div
              style={{
                fontFamily: fonts.heading,
                fontSize: 20,
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: 4,
                marginBottom: 40,
              }}
            >
              Voice Call
            </div>

            {/* Tech Lead avatar */}
            <div
              style={{
                width: 160,
                height: 160,
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.background,
                fontFamily: fonts.heading,
                fontWeight: 700,
                fontSize: 56,
                marginBottom: 28,
                boxShadow: '0 0 80px rgba(59, 130, 246, 0.5)',
              }}
            >
              MJ
            </div>

            <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 38, color: 'white', marginBottom: 8 }}>
              Marcus Johnson
            </div>
            <div style={{ fontFamily: fonts.heading, fontSize: 24, color: '#64748b', marginBottom: 40 }}>
              Tech Lead
            </div>

            {/* Waveform */}
            <div style={{ marginBottom: 40 }}>
              <Waveform active={waveformActive} />
            </div>

            {/* Connection status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                fontFamily: fonts.mono,
                fontSize: 20,
                color: colors.success,
                padding: '14px 28px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                borderRadius: 14,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  backgroundColor: colors.success,
                }}
              />
              Discussing API architecture...
            </div>

            {/* Call controls */}
            <div style={{ display: 'flex', gap: 24, marginTop: 48 }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  color: 'white',
                }}
              >
                ✕
              </div>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: colors.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
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
                width: 160,
                height: 160,
                borderRadius: '50%',
                backgroundColor: colors.success,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 40,
                boxShadow: '0 0 80px rgba(34, 197, 94, 0.5)',
              }}
            >
              <span style={{ fontSize: 80, color: colors.background }}>✓</span>
            </div>
            <div style={{ fontFamily: fonts.heading, fontSize: 42, fontWeight: 700, color: 'white', marginBottom: 16 }}>
              Call Complete
            </div>
            <div style={{ fontFamily: fonts.heading, fontSize: 26, color: '#94a3b8' }}>
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

  const bars = 9;
  const barWidth = 12;
  const maxHeight = 80;
  const gap = 14;

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
              backgroundColor: active ? colors.accent : '#334155',
              borderRadius: barWidth / 2,
              transition: 'height 0.1s',
            }}
          />
        );
      })}
    </div>
  );
};
