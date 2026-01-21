// remotion/src/scenes/Scene1Opening.tsx
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { colors, animations } from '../lib/design-system';
import { fonts } from '../lib/fonts';

export const Scene1Opening: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (8 seconds total = 240 frames at 30fps)
  const leetcodeEnd = 3 * fps; // 0-3s: LeetCode problem
  const glitchEnd = 4 * fps; // 3-4s: Glitch
  const message1End = 6 * fps; // 4-6s: "This isn't how real work looks"
  // 6-8s: "There's a better way" + gold wipe

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* LeetCode problem (0-3s) */}
      <Sequence durationInFrames={leetcodeEnd} premountFor={fps}>
        <LeetCodeProblem />
      </Sequence>

      {/* Glitch effect (3-4s) */}
      <Sequence from={leetcodeEnd} durationInFrames={fps} premountFor={fps}>
        <GlitchEffect />
      </Sequence>

      {/* "This isn't how real work looks" (4-6s) */}
      <Sequence from={glitchEnd} durationInFrames={2 * fps} premountFor={fps}>
        <MessageOne />
      </Sequence>

      {/* "There's a better way" + gold wipe (6-8s) */}
      <Sequence from={message1End} durationInFrames={2 * fps} premountFor={fps}>
        <MessageTwo />
      </Sequence>
    </AbsoluteFill>
  );
};

const LeetCodeProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1e1e1e',
        padding: 60,
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: fonts.mono,
          color: '#d4d4d4',
          fontSize: 14,
        }}
      >
        <div style={{ color: '#569cd6', marginBottom: 20 }}>
          // Problem #2847: Reverse Linked List
        </div>
        <div style={{ marginBottom: 10, color: '#6a9955' }}>
          /**
        </div>
        <div style={{ color: '#6a9955', marginLeft: 4 }}>
          * Given the head of a singly linked list,
        </div>
        <div style={{ color: '#6a9955', marginLeft: 4 }}>
          * reverse the list, and return the reversed list.
        </div>
        <div style={{ color: '#6a9955', marginLeft: 4 }}>
          * Time complexity must be O(n).
        </div>
        <div style={{ color: '#6a9955', marginBottom: 20 }}>
          */
        </div>
        <div>
          <span style={{ color: '#c586c0' }}>function</span>{' '}
          <span style={{ color: '#dcdcaa' }}>reverseList</span>
          <span style={{ color: '#ffd700' }}>(</span>
          <span style={{ color: '#9cdcfe' }}>head</span>
          <span style={{ color: '#ffd700' }}>)</span>{' '}
          <span style={{ color: '#ffd700' }}>{'{'}</span>
        </div>
        <div style={{ marginLeft: 20, color: '#6a9955' }}>
          // Your code here...
        </div>
        <div>
          <span style={{ color: '#ffd700' }}>{'}'}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const GlitchEffect: React.FC = () => {
  const frame = useCurrentFrame();

  // Random glitch bars
  const glitchIntensity = interpolate(frame, [0, 15, 30], [0, 1, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#1e1e1e' }}>
      {/* Glitch bars */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${(i * 10 + (frame * 3)) % 100}%`,
            height: 20 + (frame % 10),
            backgroundColor:
              i % 2 === 0 ? colors.accent : 'rgba(255,255,255,0.3)',
            opacity: glitchIntensity * 0.8,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const MessageOne: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: animations.snappy,
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
          fontSize: 64,
          fontWeight: 700,
          color: colors.background,
          transform: `scale(${scale})`,
          textAlign: 'center',
          padding: 40,
        }}
      >
        This isn't how
        <br />
        real work looks.
      </div>
    </AbsoluteFill>
  );
};

const MessageTwo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  // Gold wipe from left
  const wipeProgress = interpolate(frame, [fps, 2 * fps], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.text }}>
      {/* Text */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 72,
            fontWeight: 700,
            color: colors.accent,
            transform: `scale(${scale})`,
          }}
        >
          There's a better way.
        </div>
      </AbsoluteFill>

      {/* Gold wipe overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${wipeProgress}%`,
          height: '100%',
          backgroundColor: colors.accent,
        }}
      />
    </AbsoluteFill>
  );
};
