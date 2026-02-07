// remotion/src/scenes/hackathon/HP5WhyNow.tsx
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

export const HP5WhyNow: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (15 seconds total = 450 frames at 30fps)
  const titleEnd = 3 * fps;      // 0-3s: Title
  // 3-15s: Gemini capabilities

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Title (0-3s) */}
      <Sequence durationInFrames={titleEnd}>
        <TitlePunch />
      </Sequence>

      {/* Gemini Capabilities (3-15s) */}
      <Sequence from={titleEnd} durationInFrames={12 * fps}>
        <GeminiCapabilities />
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
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 64,
            fontWeight: 400,
            color: '#888',
            marginBottom: 16,
            transform: `scale(${scale})`,
          }}
        >
          Why is this possible
        </div>
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 120,
            fontWeight: 700,
            color: colors.accent,
            transform: `scale(${scale})`,
          }}
        >
          now?
        </div>
      </div>
    </AbsoluteFill>
  );
};

const GeminiCapabilities: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const capabilities = [
    {
      title: 'Real-time Voice at Scale',
      description: 'Gemini Live simulates realistic stakeholder conversations with memory — coworkers remember what was said earlier.',
      before: 'Required humans',
      after: 'Async, infinitely scalable',
      icon: '🎙️',
    },
    {
      title: 'Deep Video Analysis',
      description: 'Multimodal models analyze hour-long screen recordings to see exactly how candidates work.',
      before: 'Impossible to review at scale',
      after: 'Automated, accurate, comprehensive',
      icon: '🎬',
    },
  ];

  const geminiLogoOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0a0a',
        padding: 60,
      }}
    >
      {/* Gemini Logo/Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 48,
          opacity: geminiLogoOpacity,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, #4285f4 0%, #34a853 50%, #ea4335 100%)',
            borderRadius: 12,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 28 }}>✨</span>
        </div>
        <div>
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 32,
              fontWeight: 700,
              color: colors.background,
            }}
          >
            Powered by Gemini
          </div>
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 18,
              color: '#888',
            }}
          >
            The 10x unlock that wasn't possible before
          </div>
        </div>
      </div>

      {/* Capabilities */}
      <div style={{ display: 'flex', gap: 40 }}>
        {capabilities.map((cap, i) => {
          const delay = fps + i * 0.5 * fps;
          const scale = spring({
            frame: frame - delay,
            fps,
            config: animations.snappy,
          });

          const beforeAfterDelay = delay + fps;
          const transitionProgress = interpolate(
            frame,
            [beforeAfterDelay, beforeAfterDelay + fps],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          return (
            <div
              key={cap.title}
              style={{
                flex: 1,
                backgroundColor: '#1a1a1a',
                borderRadius: 24,
                padding: 40,
                transform: `scale(${Math.max(0, scale)})`,
                border: '1px solid #333',
              }}
            >
              {/* Icon */}
              <div style={{ fontSize: 48, marginBottom: 24 }}>{cap.icon}</div>

              {/* Title */}
              <div
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 32,
                  fontWeight: 700,
                  color: colors.background,
                  marginBottom: 16,
                }}
              >
                {cap.title}
              </div>

              {/* Description */}
              <div
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 20,
                  color: '#a0a0a0',
                  lineHeight: 1.5,
                  marginBottom: 32,
                }}
              >
                {cap.description}
              </div>

              {/* Before/After */}
              <div style={{ display: 'flex', gap: 16 }}>
                {/* Before */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 12,
                    padding: 16,
                    opacity: 1 - transitionProgress * 0.5,
                  }}
                >
                  <div
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#ef4444',
                      marginBottom: 8,
                    }}
                  >
                    BEFORE
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: 16,
                      color: '#fca5a5',
                    }}
                  >
                    {cap.before}
                  </div>
                </div>

                {/* Arrow */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    color: colors.accent,
                    fontSize: 24,
                    opacity: transitionProgress,
                  }}
                >
                  →
                </div>

                {/* After */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: 12,
                    padding: 16,
                    opacity: 0.5 + transitionProgress * 0.5,
                    transform: `scale(${0.95 + transitionProgress * 0.05})`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: 14,
                      fontWeight: 700,
                      color: colors.success,
                      marginBottom: 8,
                    }}
                  >
                    NOW
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: 16,
                      color: '#86efac',
                    }}
                  >
                    {cap.after}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
