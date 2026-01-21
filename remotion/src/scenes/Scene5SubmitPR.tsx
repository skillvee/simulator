// remotion/src/scenes/Scene5SubmitPR.tsx
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
import { Typewriter } from '../components/Typewriter';

export const Scene5SubmitPR: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (12 seconds = 360 frames at 30fps)
  const textPunchEnd = 2 * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* "REAL CODE REVIEWS." (0-2s) */}
      <Sequence durationInFrames={textPunchEnd} premountFor={fps}>
        <TextPunch text="REAL CODE REVIEWS." fontSize={72} />
      </Sequence>

      {/* PR Chat Interface (2-12s) */}
      <Sequence from={textPunchEnd} durationInFrames={10 * fps} premountFor={fps}>
        <PRChatInterface />
      </Sequence>
    </AbsoluteFill>
  );
};

const PRChatInterface: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // UI fade in
  const uiOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Container slide in
  const containerSlide = spring({
    frame,
    fps,
    config: animations.snappy,
  });
  const containerY = interpolate(containerSlide, [0, 1], [50, 0]);

  // Timing for messages
  // 0-3s: User message typing with PR link
  // 3-4s: Manager typing indicator
  // 4-7s: Manager reply appears
  // 7-10s: Call button pulses

  const userMessageComplete = 3 * fps;
  const typingIndicatorStart = 3 * fps;
  const typingIndicatorEnd = 4 * fps;
  const managerReplyStart = 4 * fps;
  const callButtonPulseStart = 7 * fps;

  // Manager typing indicator
  const showTypingIndicator = frame >= typingIndicatorStart && frame < typingIndicatorEnd;

  // Manager reply visibility
  const showManagerReply = frame >= managerReplyStart;
  const managerReplyEntrance = spring({
    frame: frame - managerReplyStart,
    fps,
    config: animations.snappy,
  });

  // Call button pulse
  const showCallButton = frame >= callButtonPulseStart;
  const callButtonEntrance = spring({
    frame: frame - callButtonPulseStart,
    fps,
    config: animations.bouncy,
  });

  // Pulsing animation for call button
  const pulseScale = showCallButton
    ? 1 + 0.05 * Math.sin((frame - callButtonPulseStart) * 0.3)
    : 1;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        opacity: uiOpacity,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 48,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 700,
          transform: `translateY(${containerY}px)`,
        }}
      >
        {/* Chat Header */}
        <div
          style={{
            padding: '16px 24px',
            border: `${borders.width}px solid ${colors.border}`,
            borderBottom: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.background,
          }}
        >
          <Avatar
            initials="AC"
            name="Alex Chen"
            role="Tech Lead"
            size={40}
            backgroundColor="#3b82f6"
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

        {/* Messages Area */}
        <div
          style={{
            border: `${borders.width}px solid ${colors.border}`,
            padding: 24,
            minHeight: 280,
            backgroundColor: colors.background,
          }}
        >
          {/* User message with PR link */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '12px 16px',
                backgroundColor: colors.accent,
                border: `${borders.width}px solid ${colors.border}`,
                borderRadius: borders.radius,
              }}
            >
              <Typewriter
                text="Hey Alex! PR is ready for review: github.com/acme/payments/pull/147"
                fontSize={14}
                charFrames={2}
                showCursor={frame < userMessageComplete}
                fontFamily={fonts.heading}
              />
            </div>
          </div>

          {/* Manager typing indicator */}
          {showTypingIndicator && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: 16,
              }}
            >
              <TypingIndicator />
            </div>
          )}

          {/* Manager reply */}
          {showManagerReply && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: 16,
                opacity: managerReplyEntrance,
                transform: `translateX(${(1 - managerReplyEntrance) * -50}px)`,
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  backgroundColor: colors.background,
                  border: `${borders.width}px solid ${colors.border}`,
                  borderRadius: borders.radius,
                  fontFamily: fonts.heading,
                  fontSize: 14,
                  color: colors.text,
                }}
              >
                Cool! Let's hop on a call to discuss.
              </div>
            </div>
          )}

          {/* Call button */}
          {showCallButton && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginTop: 24,
                opacity: callButtonEntrance,
                transform: `scale(${callButtonEntrance * pulseScale})`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 20px',
                  backgroundColor: colors.success,
                  border: `${borders.width}px solid ${colors.border}`,
                  borderRadius: borders.radius,
                  cursor: 'pointer',
                }}
              >
                <PhoneIcon />
                <span
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 14,
                    fontWeight: 700,
                    color: colors.text,
                  }}
                >
                  Start Call
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div
          style={{
            border: `${borders.width}px solid ${colors.border}`,
            borderTop: 'none',
            padding: 16,
            backgroundColor: colors.background,
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
            Message Alex Chen...
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const TypingIndicator: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: colors.background,
        border: `${borders.width}px solid ${colors.border}`,
        borderRadius: borders.radius,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {[0, 1, 2].map((i) => {
        const dotOpacity = interpolate(
          (frame + i * 5) % 30,
          [0, 10, 20, 30],
          [0.3, 1, 0.3, 0.3]
        );
        return (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              backgroundColor: colors.text,
              borderRadius: '50%',
              opacity: dotOpacity,
            }}
          />
        );
      })}
    </div>
  );
};

const PhoneIcon: React.FC = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={colors.text}
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
  >
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
  </svg>
);
