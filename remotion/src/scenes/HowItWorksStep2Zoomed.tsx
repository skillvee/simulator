// remotion/src/scenes/HowItWorksStep2Zoomed.tsx
// "How It Works" Step 2: Candidates Do Real Work - ZOOMED VERSION
// Focuses on the voice call modal and a compact chat view

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
    <AbsoluteFill style={{ opacity: uiOpacity, padding: 32 }}>
      {/* Main container - dark themed, no browser chrome */}
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1e293b',
          borderRadius: 24,
          border: '2px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        {/* Sidebar - Compact team list */}
        <div
          style={{
            width: 320,
            borderRight: '2px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0f172a',
          }}
        >
          {/* Header */}
          <div
            style={{
              height: 80,
              borderBottom: '2px solid #334155',
              display: 'flex',
              alignItems: 'center',
              padding: '0 24px',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: colors.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.background,
                fontFamily: fonts.heading,
                fontWeight: 700,
                fontSize: 20,
              }}
            >
              S
            </div>
            <span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 22, color: 'white' }}>
              Skillvee
            </span>
          </div>

          {/* Team list */}
          <div style={{ flex: 1, padding: 16, overflowY: 'hidden' }}>
            <div
              style={{
                fontFamily: fonts.heading,
                fontSize: 13,
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                marginBottom: 16,
                paddingLeft: 12,
              }}
            >
              Your Team
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
              height: 70,
              borderTop: '2px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 20px',
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
              height: 90,
              borderBottom: '2px solid #334155',
              display: 'flex',
              alignItems: 'center',
              padding: '0 28px',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                backgroundColor: '#ec4899',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.background,
                fontFamily: fonts.heading,
                fontWeight: 600,
                fontSize: 18,
              }}
            >
              SC
            </div>
            <div>
              <div style={{ fontFamily: fonts.heading, fontWeight: 600, fontSize: 22, color: 'white' }}>
                Sarah Chen
              </div>
              <div style={{ fontFamily: fonts.heading, fontSize: 14, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e' }} />
                Online
              </div>
            </div>
            {/* Call button */}
            <div
              style={{
                marginLeft: 'auto',
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: colors.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 22 }}>📞</span>
            </div>
          </div>

          {/* Messages - Larger text */}
          <div style={{ flex: 1, padding: 28, overflowY: 'hidden' }}>
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
              height: 80,
              borderTop: '2px solid #334155',
              display: 'flex',
              alignItems: 'center',
              padding: '0 28px',
            }}
          >
            <div
              style={{
                flex: 1,
                height: 52,
                backgroundColor: '#0f172a',
                borderRadius: 12,
                border: '2px solid #334155',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                fontFamily: fonts.heading,
                fontSize: 17,
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
        gap: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        padding: '10px 18px',
        borderRadius: 10,
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: '#ef4444',
          opacity: pulse,
        }}
      />
      <span style={{ fontFamily: fonts.heading, fontSize: 15, color: '#ef4444', fontWeight: 600 }}>
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
        gap: 14,
        padding: '12px 16px',
        borderRadius: 14,
        backgroundColor: isSelected ? `${colors.accent}20` : 'transparent',
        border: isSelected ? `2px solid ${colors.accent}40` : '2px solid transparent',
        opacity: entrance,
        transform: `translateX(${(1 - entrance) * -30}px)`,
      }}
    >
      <div style={{ position: 'relative' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: coworker.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.background,
            fontFamily: fonts.heading,
            fontWeight: 600,
            fontSize: 14,
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
            width: 14,
            height: 14,
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
            fontSize: 16,
            color: isSelected ? colors.accent : 'white',
          }}
        >
          {coworker.name}
        </div>
        <div style={{ fontFamily: fonts.heading, fontSize: 13, color: '#64748b' }}>
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
        gap: 16,
        marginBottom: 24,
        opacity: entrance,
        transform: `translateY(${(1 - entrance) * 20}px)`,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          backgroundColor: isUser ? '#475569' : avatar?.color || '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.background,
          fontFamily: fonts.heading,
          fontWeight: 600,
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {isUser ? 'You' : avatar?.initials || '?'}
      </div>

      {/* Message */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
          <span style={{ fontFamily: fonts.heading, fontWeight: 600, fontSize: 18, color: 'white' }}>
            {sender}
          </span>
          <span style={{ fontFamily: fonts.heading, fontSize: 13, color: '#64748b' }}>
            now
          </span>
        </div>
        <div style={{ fontFamily: fonts.heading, fontSize: 18, lineHeight: 1.6, color: '#cbd5e1' }}>
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
          borderRadius: 28,
          padding: 56,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: 500,
          transform: `scale(${overlayEntrance})`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          border: '2px solid #334155',
        }}
      >
        {!showComplete ? (
          <>
            {/* Voice Call label */}
            <div
              style={{
                fontFamily: fonts.heading,
                fontSize: 14,
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: 3,
                marginBottom: 32,
              }}
            >
              Voice Call
            </div>

            {/* Tech Lead avatar */}
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.background,
                fontFamily: fonts.heading,
                fontWeight: 700,
                fontSize: 40,
                marginBottom: 20,
                boxShadow: '0 0 60px rgba(59, 130, 246, 0.5)',
              }}
            >
              MJ
            </div>

            <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 28, color: 'white', marginBottom: 6 }}>
              Marcus Johnson
            </div>
            <div style={{ fontFamily: fonts.heading, fontSize: 18, color: '#64748b', marginBottom: 32 }}>
              Tech Lead
            </div>

            {/* Waveform */}
            <div style={{ marginBottom: 32 }}>
              <Waveform active={waveformActive} />
            </div>

            {/* Connection status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontFamily: fonts.mono,
                fontSize: 15,
                color: colors.success,
                padding: '10px 20px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: colors.success,
                }}
              />
              Discussing API architecture...
            </div>

            {/* Call controls */}
            <div style={{ display: 'flex', gap: 20, marginTop: 40 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  color: 'white',
                }}
              >
                ✕
              </div>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundColor: colors.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
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
                width: 120,
                height: 120,
                borderRadius: '50%',
                backgroundColor: colors.success,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 32,
                boxShadow: '0 0 60px rgba(34, 197, 94, 0.5)',
              }}
            >
              <span style={{ fontSize: 60, color: colors.background }}>✓</span>
            </div>
            <div style={{ fontFamily: fonts.heading, fontSize: 32, fontWeight: 700, color: 'white', marginBottom: 12 }}>
              Call Complete
            </div>
            <div style={{ fontFamily: fonts.heading, fontSize: 20, color: '#94a3b8' }}>
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
  const barWidth = 8;
  const maxHeight = 60;
  const gap = 10;

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
