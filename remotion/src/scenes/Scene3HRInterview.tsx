// remotion/src/scenes/Scene3HRInterview.tsx
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
import { Waveform } from '../components/Waveform';
import { ChatBubble } from '../components/ChatBubble';

export const Scene3HRInterview: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (18 seconds = 540 frames at 30fps)
  const textPunchEnd = 2 * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* "REAL CONVERSATIONS." (0-2s) */}
      <Sequence durationInFrames={textPunchEnd} premountFor={fps}>
        <TextPunch text="REAL CONVERSATIONS." fontSize={72} />
      </Sequence>

      {/* Interview UI (2-18s) */}
      <Sequence from={textPunchEnd} durationInFrames={16 * fps} premountFor={fps}>
        <InterviewInterface />
      </Sequence>
    </AbsoluteFill>
  );
};

const InterviewInterface: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // UI fade in
  const uiOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Checkmark overlay timing (14-16s mark = 12-14s into this sequence)
  const checkmarkStart = 12 * fps;
  const showCheckmark = frame >= checkmarkStart;
  const checkmarkProgress = spring({
    frame: frame - checkmarkStart,
    fps,
    config: animations.bouncy,
  });

  // Waveform is active until checkmark appears
  const waveformActive = frame < checkmarkStart;

  // Chat messages with staggered appearance
  const chatMessages = [
    { message: "Hi Alex! Welcome to Skillvee. I'm Sarah, and I'll be conducting your HR interview today.", isUser: false, delay: 1 * fps },
    { message: "Thank you Sarah! I'm excited to be here and learn more about this opportunity.", isUser: true, delay: 3 * fps },
    { message: "Can you tell me about a challenging project you've worked on recently?", isUser: false, delay: 5 * fps },
    { message: "I led the migration of our payment system to a microservices architecture, improving reliability by 40%.", isUser: true, delay: 7.5 * fps },
    { message: "That's impressive! How did you handle the team coordination?", isUser: false, delay: 10 * fps },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        padding: 60,
        opacity: uiOpacity,
      }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: 14,
          fontWeight: 500,
          color: colors.text,
          marginBottom: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontWeight: 700 }}>Skillvee</span>
        <span style={{ color: '#666' }}>/</span>
        <span>Secure Payments Gateway Implementation</span>
      </div>

      {/* Progress steps */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          marginBottom: 60,
        }}
      >
        {['CV Upload', 'HR Interview', 'Manager Kickoff', 'Coding Task', 'PR Defense'].map(
          (step, i) => (
            <div
              key={step}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: fonts.heading,
                fontSize: 12,
                color: i <= 1 ? colors.text : '#999',
                fontWeight: i === 1 ? 700 : 400,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  border: `${borders.width}px solid ${i <= 1 ? colors.text : '#ccc'}`,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontFamily: fonts.mono,
                  fontSize: 10,
                  backgroundColor: i === 0 ? colors.success : i === 1 ? colors.accent : 'transparent',
                }}
              >
                {i === 0 ? '✓' : i + 1}
              </div>
              {step}
            </div>
          )
        )}
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', gap: 60, flex: 1 }}>
        {/* Left side - HR Avatar with waveform */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: `${borders.width}px solid ${colors.border}`,
            padding: 40,
            position: 'relative',
          }}
        >
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 12,
              color: '#666',
              marginBottom: 24,
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            Voice Interview
          </div>

          <Avatar
            initials="SM"
            name="Sarah Mitchell"
            role="HR Recruiter"
            size={80}
            backgroundColor={colors.accent}
          />

          <div style={{ marginTop: 32 }}>
            <Waveform bars={7} width={120} height={50} active={waveformActive} />
          </div>

          <div
            style={{
              marginTop: 24,
              fontFamily: fonts.mono,
              fontSize: 12,
              color: waveformActive ? colors.success : '#666',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                backgroundColor: waveformActive ? colors.success : '#666',
                borderRadius: '50%',
              }}
            />
            {waveformActive ? 'Speaking...' : 'Interview Complete'}
          </div>
        </div>

        {/* Right side - Chat transcript */}
        <div
          style={{
            flex: 1,
            border: `${borders.width}px solid ${colors.border}`,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: `${borders.width}px solid ${colors.border}`,
            }}
          >
            Interview Transcript
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            {chatMessages.map((msg, i) => (
              <ChatBubble
                key={i}
                message={msg.message}
                isUser={msg.isUser}
                delay={msg.delay}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Checkmark overlay */}
      {showCheckmark && (
        <AbsoluteFill
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            transform: `scale(${checkmarkProgress})`,
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
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
                fontSize: 60,
                color: colors.background,
              }}
            >
              ✓
            </span>
          </div>
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 32,
              fontWeight: 700,
              color: colors.text,
            }}
          >
            HR Interview Complete
          </div>
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 16,
              color: '#666',
              marginTop: 12,
            }}
          >
            Moving to Manager Kickoff...
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
