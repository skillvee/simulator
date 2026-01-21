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

  // Scene timing (5 seconds total = 150 frames at 30fps)
  const leetcodeEnd = 2.5 * fps; // 0-2.5s: LeetCode problem
  const glitchEnd = 3 * fps; // 2.5-3s: Glitch
  const message1End = 4 * fps; // 3-4s: "This isn't how real work looks"
  // 4-5s: "There's a better way" + gold wipe

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* LeetCode problem (0-2.5s) */}
      <Sequence durationInFrames={leetcodeEnd} premountFor={fps}>
        <LeetCodeProblem />
      </Sequence>

      {/* Glitch effect (2.5-3s) */}
      <Sequence from={leetcodeEnd} durationInFrames={0.5 * fps} premountFor={fps}>
        <GlitchEffect />
      </Sequence>

      {/* "This isn't how real work looks" (3-4s) */}
      <Sequence from={glitchEnd} durationInFrames={1 * fps} premountFor={fps}>
        <MessageOne />
      </Sequence>

      {/* "There's a better way" + gold wipe (4-5s) */}
      <Sequence from={message1End} durationInFrames={1 * fps} premountFor={fps}>
        <MessageTwo />
      </Sequence>
    </AbsoluteFill>
  );
};

const LeetCodeProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 0.3 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Typing effect for cursor blink
  const cursorOpacity = Math.floor(frame / 15) % 2 === 0 ? 1 : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1a1a1a',
        opacity,
      }}
    >
      {/* LeetCode Header Bar */}
      <div
        style={{
          height: 60,
          backgroundColor: '#282828',
          borderBottom: '1px solid #3d3d3d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              backgroundColor: '#ffa116',
              borderRadius: 4,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontFamily: fonts.heading,
              fontWeight: 700,
              fontSize: 20,
              color: '#1a1a1a',
            }}
          >
            {'<'}
          </div>
          <span
            style={{
              fontFamily: fonts.heading,
              fontSize: 24,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            LeetCode
          </span>
        </div>

        {/* Timer */}
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 28,
            color: '#ffa116',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ color: '#666' }}>⏱</span>
          00:45:23
        </div>
      </div>

      {/* Main Content - Two Panel Layout */}
      <div style={{ display: 'flex', flex: 1, height: 'calc(100% - 60px)' }}>
        {/* Left Panel - Problem Description */}
        <div
          style={{
            width: '45%',
            borderRight: '1px solid #3d3d3d',
            padding: 32,
            overflow: 'hidden',
          }}
        >
          {/* Problem Title */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontFamily: fonts.heading,
                fontSize: 32,
                fontWeight: 700,
                color: '#fff',
                marginBottom: 12,
              }}
            >
              206. Reverse Linked List
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span
                style={{
                  backgroundColor: '#00b8a3',
                  color: '#1a1a1a',
                  padding: '4px 12px',
                  fontFamily: fonts.heading,
                  fontSize: 18,
                  fontWeight: 700,
                  borderRadius: 4,
                }}
              >
                Easy
              </span>
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 18,
                  color: '#666',
                }}
              >
                Linked List
              </span>
            </div>
          </div>

          {/* Problem Description */}
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 24,
              color: '#ebebeb',
              lineHeight: 1.6,
            }}
          >
            <p style={{ marginBottom: 20 }}>
              Given the <code style={{ backgroundColor: '#3d3d3d', padding: '2px 8px', borderRadius: 4, color: '#ffa116' }}>head</code> of a singly linked list, reverse the list, and return the reversed list.
            </p>
            <div style={{ marginTop: 24, color: '#666', fontSize: 20 }}>
              <strong style={{ color: '#ebebeb' }}>Constraints:</strong>
              <ul style={{ marginTop: 12, marginLeft: 20 }}>
                <li>Time complexity must be O(n)</li>
                <li>0 ≤ n ≤ 5000</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div
          style={{
            width: '55%',
            backgroundColor: '#1e1e1e',
            padding: 24,
          }}
        >
          {/* Editor Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              marginBottom: 16,
              borderBottom: '1px solid #3d3d3d',
              paddingBottom: 12,
            }}
          >
            <div
              style={{
                backgroundColor: '#2d2d2d',
                padding: '8px 16px',
                fontFamily: fonts.mono,
                fontSize: 18,
                color: '#fff',
                borderBottom: '2px solid #ffa116',
              }}
            >
              JavaScript
            </div>
          </div>

          {/* Code Content */}
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 22,
              lineHeight: 1.8,
            }}
          >
            <div>
              <span style={{ color: '#6a9955' }}>{'/**'}</span>
            </div>
            <div>
              <span style={{ color: '#6a9955' }}>{' * @param {ListNode} head'}</span>
            </div>
            <div>
              <span style={{ color: '#6a9955' }}>{' * @return {ListNode}'}</span>
            </div>
            <div>
              <span style={{ color: '#6a9955' }}>{' */'}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#c586c0' }}>var</span>{' '}
              <span style={{ color: '#dcdcaa' }}>reverseList</span>{' '}
              <span style={{ color: '#d4d4d4' }}>=</span>{' '}
              <span style={{ color: '#c586c0' }}>function</span>
              <span style={{ color: '#ffd700' }}>(</span>
              <span style={{ color: '#9cdcfe' }}>head</span>
              <span style={{ color: '#ffd700' }}>)</span>{' '}
              <span style={{ color: '#ffd700' }}>{'{'}</span>
            </div>
            <div style={{ paddingLeft: 32 }}>
              <span style={{ color: '#6a9955' }}>{'// Your code here'}</span>
              <span
                style={{
                  display: 'inline-block',
                  width: 3,
                  height: 28,
                  backgroundColor: '#fff',
                  marginLeft: 4,
                  opacity: cursorOpacity,
                }}
              />
            </div>
            <div>
              <span style={{ color: '#ffd700' }}>{'}'}</span>
              <span style={{ color: '#d4d4d4' }}>;</span>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const GlitchEffect: React.FC = () => {
  const frame = useCurrentFrame();

  // Random glitch bars
  const glitchIntensity = interpolate(frame, [0, 8, 15], [0, 1, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a1a' }}>
      {/* Glitch bars */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${(i * 8 + (frame * 5)) % 100}%`,
            height: 30 + (frame % 15),
            backgroundColor:
              i % 3 === 0 ? '#ffa116' : i % 3 === 1 ? '#ff4444' : 'rgba(255,255,255,0.4)',
            opacity: glitchIntensity * 0.9,
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
          fontSize: 100,
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
  const wipeProgress = interpolate(frame, [0.3 * fps, 1 * fps], [0, 100], {
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
            fontSize: 110,
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
