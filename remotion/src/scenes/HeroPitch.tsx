// remotion/src/scenes/HeroPitch.tsx
//
// CONCEPT-DRIVEN HERO — 30s, 1920x1080 @ 30fps, silent autoplay loop.
//
// This deliberately does NOT use real app footage. Every visual is
// hand-composed in Remotion. Rationale: the real product at 30fps fights
// the viewer's eye (too much white space, too many small UI elements);
// a synthetic, motion-designed pitch sells the concept harder.
//
// Structure (FEAR → HOPE → PROOF → DESIRE):
//   Act 1 — AI Broke Hiring            0.0 – 5.0s
//   Act 2 — There's another way        5.0 – 9.0s
//   Act 3a — They collaborate          9.0 – 13.0s
//   Act 3b — They understand the AI    13.0 – 16.0s
//   Act 3c — Scorecard                 16.0 – 22.0s
//   Act 4 — Closer / CTA               22.0 – 29.0s
//   Loop seam                          29.0 – 30.0s

import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { colors } from '../lib/design-system';
import { fonts } from '../lib/fonts';

// ── Palette (aliases) ────────────────────────────────────────────────
const DARK = colors.dark;
const WHITE = '#FFFFFF';
const PRIMARY = colors.primary;
const RED = colors.destructive;
const MUTED = colors.mutedForeground;
const GREEN = colors.success;

// ── Helpers ──────────────────────────────────────────────────────────

/** Clamp-safe interpolate with easeInOut cubic by default. Accepts any
 *  matched-length keyframe arrays (2 points for A→B, 4 for fade-in-out, etc.). */
const easedInterp = (
  frame: number,
  input: number[],
  output: number[],
  easing: (v: number) => number = Easing.inOut(Easing.cubic),
) =>
  interpolate(frame, input, output, {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Spring entrance returning 0→1. `damping: 200` per best-practices. */
const useSpringIn = (frame: number, fps: number) =>
  spring({ frame, fps, config: { damping: 200 } });

/** A reusable soft radial glow. */
const AccentGlow: React.FC<{
  x?: number;
  y?: number;
  strength?: number;
  spread?: number;
  color?: string;
}> = ({
  x = 50,
  y = 50,
  strength = 0.25,
  spread = 55,
  color = PRIMARY,
}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle at ${x}% ${y}%, ${color}${alpha(strength)} 0%, transparent ${spread}%)`,
      pointerEvents: 'none',
    }}
  />
);

/** Hex alpha suffix from 0..1. */
function alpha(n: number): string {
  const v = Math.max(0, Math.min(1, n));
  const hex = Math.round(v * 255)
    .toString(16)
    .padStart(2, '0');
  return hex;
}

// ── Root ─────────────────────────────────────────────────────────────

export const HeroPitch: React.FC = () => {
  const { fps } = useVideoConfig();
  const s = (sec: number) => Math.round(sec * fps);

  // Timeline
  const ACT1 = s(5);
  const ACT2 = s(4);
  const ACT3A = s(4);
  const ACT3B = s(3);
  const ACT3C = s(6);
  const ACT4 = s(7);
  const LOOP = s(1);

  let cursor = 0;
  const seq = (dur: number) => {
    const from = cursor;
    cursor += dur;
    return { from, durationInFrames: dur };
  };

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <Sequence {...seq(ACT1)}>
        <Act1 />
      </Sequence>
      <Sequence {...seq(ACT2)}>
        <Act2 />
      </Sequence>
      <Sequence {...seq(ACT3A)}>
        <Act3aCollaborate />
      </Sequence>
      <Sequence {...seq(ACT3B)}>
        <Act3bReviewAI />
      </Sequence>
      <Sequence {...seq(ACT3C)}>
        <Act3cScorecard />
      </Sequence>
      <Sequence {...seq(ACT4)}>
        <Act4Closer />
      </Sequence>
      <Sequence {...seq(LOOP)}>
        <LoopSeam />
      </Sequence>
    </AbsoluteFill>
  );
};

// ── ACT 1 ────────────────────────────────────────────────────────────
//   0.0–0.8s  blue scan reveals "AI BROKE HIRING."
//   0.8–2.5s  headline holds silently
//   2.5–5.0s  strike-through beat: Resumes. Interviews. Tests.

const Act1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const strikesStart = Math.round(2.5 * fps); // frame 75
  const inStrikes = frame >= strikesStart;

  const fadeOut = easedInterp(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: DARK, opacity: fadeOut }}>
      <AccentGlow y={65} strength={0.18} />

      {!inStrikes ? (
        <Act1Headline />
      ) : (
        <Act1Strikes startFrame={strikesStart} />
      )}
    </AbsoluteFill>
  );
};

const Act1Headline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const text = 'AI BROKE HIRING.';
  const scanLineDuration = Math.round(0.8 * fps); // 24f

  // Scan line: a glowing vertical bar traveling L→R across the frame.
  const scanX = easedInterp(
    frame,
    [0, scanLineDuration],
    [-5, 105],
    Easing.out(Easing.cubic),
  );
  const scanOpacity = easedInterp(
    frame,
    [0, 6, scanLineDuration - 4, scanLineDuration],
    [0, 1, 1, 0],
  );

  // Each char's reveal is tied to scanX crossing its position. Characters
  // are roughly centered; we spread them across 20%–80% of viewport width.
  const totalChars = text.length;
  const startX = 20;
  const endX = 80;

  // After headline appears, add a subtle scale pulse once
  const headlineSpring = useSpringIn(frame - scanLineDuration, fps);

  return (
    <AbsoluteFill
      style={{ justifyContent: 'center', alignItems: 'center' }}
    >
      {/* The scan line itself */}
      <div
        style={{
          position: 'absolute',
          left: `${scanX}%`,
          top: 0,
          bottom: 0,
          width: 3,
          transform: 'translateX(-50%)',
          background: `linear-gradient(180deg, transparent 0%, ${PRIMARY} 50%, transparent 100%)`,
          boxShadow: `0 0 24px ${PRIMARY}`,
          opacity: scanOpacity,
        }}
      />

      {/* Headline — each char becomes visible when scan passes it */}
      <h1
        style={{
          margin: 0,
          fontFamily: fonts.heading,
          fontWeight: 700,
          fontSize: 148,
          letterSpacing: '-0.02em',
          color: WHITE,
          textAlign: 'center',
          transform: `scale(${0.985 + headlineSpring * 0.015})`,
          lineHeight: 1.05,
        }}
      >
        {text.split('').map((ch, i) => {
          const charX = startX + (i / Math.max(1, totalChars - 1)) * (endX - startX);
          const opacity = scanX >= charX - 2 ? 1 : 0;
          return (
            <span
              key={`${ch}-${i}`}
              style={{
                opacity,
                transition: 'none',
                display: 'inline-block',
                whiteSpace: 'pre',
              }}
            >
              {ch}
            </span>
          );
        })}
      </h1>
    </AbsoluteFill>
  );
};

const Act1Strikes: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - startFrame;

  const words: { text: string; delay: number }[] = [
    { text: 'Resumes.', delay: 0 },
    { text: 'Interviews.', delay: Math.round(0.45 * fps) },
    { text: 'Tests.', delay: Math.round(0.9 * fps) },
  ];

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
        flexDirection: 'column',
      }}
    >
      {words.map((w) => (
        <StrikeWord key={w.text} text={w.text} delay={w.delay} localFrame={local} fps={fps} />
      ))}
    </AbsoluteFill>
  );
};

const StrikeWord: React.FC<{
  text: string;
  delay: number;
  localFrame: number;
  fps: number;
}> = ({ text, delay, localFrame, fps }) => {
  const f = localFrame - delay;

  const textOpacity = easedInterp(f, [0, 10], [0, 1]);
  const textY = easedInterp(f, [0, 14], [18, 0]);
  const textScale = easedInterp(f, [0, 14], [0.96, 1]);

  // Strike-through animates width 0→100% starting ~10 frames after word appears
  const strikeStart = 10;
  const strikeDur = Math.round(0.35 * fps);
  const strikeProgress = easedInterp(
    f,
    [strikeStart, strikeStart + strikeDur],
    [0, 100],
    Easing.out(Easing.cubic),
  );
  const strikeVisible = f > strikeStart ? 1 : 0;

  return (
    <div
      style={{
        position: 'relative',
        opacity: textOpacity,
        transform: `translateY(${textY}px) scale(${textScale})`,
        padding: '4px 16px',
      }}
    >
      <span
        style={{
          fontFamily: fonts.heading,
          fontWeight: 700,
          fontSize: 96,
          letterSpacing: '-0.02em',
          color: WHITE,
          lineHeight: 1,
        }}
      >
        {text}
      </span>
      {/* Red strike-through line */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 16,
          height: 6,
          width: `calc(${strikeProgress}% - 32px)`,
          backgroundColor: RED,
          boxShadow: `0 0 12px ${RED}88`,
          opacity: strikeVisible,
          transformOrigin: 'left center',
          borderRadius: 2,
        }}
      />
    </div>
  );
};

// ── ACT 2 ────────────────────────────────────────────────────────────
//   5.0–6.0s  blue panel wipes across
//   6.0–9.0s  "What if you could just watch them work?"

const Act2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Wipe: blue panel sweeps L→R from 5.0–6.0s
  const wipeDur = Math.round(1 * fps);
  const wipeProgress = easedInterp(
    frame,
    [0, wipeDur],
    [0, 100],
    Easing.inOut(Easing.cubic),
  );

  const hopeStart = wipeDur;
  const localHope = frame - hopeStart;

  const line1Progress = useSpringIn(localHope, fps);
  const line1Y = easedInterp(line1Progress, [0, 1], [24, 0]);
  const line1Opacity = easedInterp(localHope, [0, 10], [0, 1]);

  // "watch them work" fades in slightly later and in brand blue
  const line2Local = localHope - Math.round(0.4 * fps);
  const line2Progress = useSpringIn(line2Local, fps);
  const line2Y = easedInterp(line2Progress, [0, 1], [24, 0]);
  const line2Opacity = easedInterp(line2Local, [0, 10], [0, 1]);

  const fadeOut = easedInterp(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: DARK, opacity: fadeOut }}>
      <AccentGlow y={50} strength={0.2} spread={60} />

      {/* Blue wipe traveling L→R, fading as it finishes */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(90deg, ${PRIMARY}ff 0%, ${PRIMARY}cc 60%, ${PRIMARY}00 100%)`,
          clipPath: `inset(0 ${100 - wipeProgress}% 0 0)`,
          opacity: 1 - easedInterp(frame, [wipeDur - 8, wipeDur + 8], [0, 1]),
        }}
      />

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: fonts.heading,
              fontWeight: 600,
              fontSize: 78,
              letterSpacing: '-0.02em',
              color: WHITE,
              opacity: line1Opacity,
              transform: `translateY(${line1Y}px)`,
            }}
          >
            What if you could just…
          </div>
          <div
            style={{
              fontFamily: fonts.heading,
              fontWeight: 700,
              fontSize: 112,
              letterSpacing: '-0.02em',
              color: PRIMARY,
              opacity: line2Opacity,
              transform: `translateY(${line2Y}px)`,
              textShadow: `0 0 40px ${PRIMARY}44`,
            }}
          >
            watch them work?
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── ACT 3A — Collaborate ─────────────────────────────────────────────
// Chat-like panel with 3 staggered bubbles showing a realistic exchange.

const Act3aCollaborate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = easedInterp(frame, [0, 10], [0, 1]);
  const fadeOut = easedInterp(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
  );

  // AI proposes → Sarah pushes back with architectural judgment → AI defers.
  // Reads as a SENIOR engineer making the call, not receiving direction.
  const bubbles: { from: 'sarah' | 'coworker'; text: string; at: number }[] = [
    { from: 'coworker', text: 'Want me to add Redis for the session layer?', at: 10 },
    { from: 'sarah', text: 'Pass \u2014 JWT keeps us stateless. Less infra, no SPOF.', at: Math.round(1.1 * fps) },
    { from: 'coworker', text: 'Good call. Opening the PR with JWT.', at: Math.round(2.1 * fps) },
  ];

  return (
    <AbsoluteFill
      style={{ backgroundColor: DARK, opacity: fadeIn * fadeOut }}
    >
      <AccentGlow x={75} y={30} strength={0.15} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 140px',
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '0.24em',
            color: PRIMARY,
            marginBottom: 32,
            opacity: easedInterp(frame, [0, 12], [0, 1]),
          }}
        >
          REAL CONVERSATIONS WITH AI COWORKERS
        </div>

        {/* Chat panel */}
        <div
          style={{
            width: '76%',
            maxWidth: 1200,
            backgroundColor: '#0B1324',
            border: `1px solid #1E293B`,
            borderRadius: 20,
            padding: '36px 48px',
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
            boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5)',
          }}
        >
          {bubbles.map((b, i) => (
            <ChatBubble
              key={i}
              from={b.from}
              text={b.text}
              delay={b.at}
              frame={frame}
              fps={fps}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ChatBubble: React.FC<{
  from: 'sarah' | 'coworker';
  text: string;
  delay: number;
  frame: number;
  fps: number;
}> = ({ from, text, delay, frame, fps }) => {
  const f = frame - delay;
  const sp = useSpringIn(f, fps);
  const opacity = easedInterp(f, [0, 10], [0, 1]);
  const y = easedInterp(sp, [0, 1], [16, 0]);

  const isSarah = from === 'sarah';
  const avatarColor = isSarah ? PRIMARY : '#A855F7';
  const avatarLabel = isSarah ? 'S' : 'AI';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isSarah ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 16,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          flexShrink: 0,
          width: 44,
          height: 44,
          borderRadius: '50%',
          backgroundColor: avatarColor,
          color: WHITE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: fonts.heading,
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: '0',
        }}
      >
        {avatarLabel}
      </div>

      {/* Bubble */}
      <div
        style={{
          maxWidth: '78%',
          backgroundColor: isSarah ? PRIMARY : '#1E293B',
          color: isSarah ? WHITE : '#E2E8F0',
          padding: '14px 22px',
          borderRadius: 16,
          borderTopRightRadius: isSarah ? 4 : 16,
          borderTopLeftRadius: isSarah ? 16 : 4,
          fontFamily: fonts.heading,
          fontSize: 30,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          lineHeight: 1.35,
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ── ACT 3B — "Do they actually understand the AI?" ───────────────────
// The critical differentiator. Poses the question every hiring manager
// is asking in 2026, then proves Skillvee answers it:
//   Eyebrow → question → 3 proof behaviors → AI Leverage score bar
// The score bar directly hands off into Act 3c's full scorecard.

const Act3bReviewAI: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = easedInterp(frame, [0, 8], [0, 1]);
  const fadeOut = easedInterp(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
  );

  // Eyebrow: 0–18f
  const eyebrowOp = easedInterp(frame, [0, 14], [0, 1]);

  // Headline: 9–36f
  const headlineSpring = useSpringIn(frame - 9, fps);
  const headlineOp = easedInterp(frame, [9, 24], [0, 1]);
  const headlineY = easedInterp(headlineSpring, [0, 1], [18, 0]);

  // Bullets: 36, 48, 60f — 0.4s apart
  const bullets = [
    { text: 'Questioned AI\u2019s output', delay: 36 },
    { text: 'Caught what it missed', delay: 48 },
    { text: 'Explained their reasoning', delay: 60 },
  ];

  // AI Leverage score bar: 72f → animates to 8.2 over ~16 frames
  const barOp = easedInterp(frame, [72, 84], [0, 1]);
  const barTarget = 82; // 8.2 out of 10 = 82%
  const barWidth = easedInterp(
    frame,
    [72, 88],
    [0, barTarget],
    Easing.out(Easing.cubic),
  );
  const scoreNum = easedInterp(
    frame,
    [72, 88],
    [0, 8.2],
    Easing.out(Easing.cubic),
  );

  return (
    <AbsoluteFill
      style={{ backgroundColor: DARK, opacity: fadeIn * fadeOut }}
    >
      <AccentGlow strength={0.18} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '80px 140px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '0.26em',
            color: PRIMARY,
            opacity: eyebrowOp,
          }}
        >
          THE REAL TEST
        </div>

        {/* Big headline question */}
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 86,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: WHITE,
            textAlign: 'center',
            lineHeight: 1.1,
            opacity: headlineOp,
            transform: `translateY(${headlineY}px)`,
          }}
        >
          Do they actually <span style={{ color: PRIMARY }}>understand</span>{' '}
          the AI?
        </div>

        {/* 3 proof points */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            alignItems: 'flex-start',
          }}
        >
          {bullets.map((b) => (
            <ProofBullet
              key={b.text}
              text={b.text}
              delay={b.delay}
              frame={frame}
              fps={fps}
            />
          ))}
        </div>

        {/* AI Leverage score bar — handoff to scorecard */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            opacity: barOp,
            marginTop: 12,
          }}
        >
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 28,
              fontWeight: 600,
              color: '#CBD5E1',
              letterSpacing: '-0.01em',
            }}
          >
            AI Leverage
          </div>
          <div
            style={{
              width: 360,
              height: 16,
              backgroundColor: '#1E293B',
              borderRadius: 999,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${barWidth}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${PRIMARY}cc 0%, ${PRIMARY} 100%)`,
                boxShadow: `0 0 16px ${PRIMARY}77`,
                borderRadius: 999,
              }}
            />
          </div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 36,
              fontWeight: 700,
              color: WHITE,
              letterSpacing: '-0.02em',
            }}
          >
            {scoreNum.toFixed(1)}
            <span
              style={{
                fontSize: 22,
                color: MUTED,
                marginLeft: 4,
              }}
            >
              /10
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** A single proof point: green ✓ + text, spring-enters from below. */
const ProofBullet: React.FC<{
  text: string;
  delay: number;
  frame: number;
  fps: number;
}> = ({ text, delay, frame, fps }) => {
  const f = frame - delay;
  const sp = useSpringIn(f, fps);
  const op = easedInterp(f, [0, 10], [0, 1]);
  const y = easedInterp(sp, [0, 1], [12, 0]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        opacity: op,
        transform: `translateY(${y}px)`,
      }}
    >
      {/* Checkmark chip */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          backgroundColor: `${GREEN}22`,
          border: `1px solid ${GREEN}55`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: GREEN,
          fontSize: 22,
          fontWeight: 700,
          fontFamily: fonts.heading,
          flexShrink: 0,
        }}
      >
        ✓
      </div>
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: 36,
          fontWeight: 500,
          color: '#E2E8F0',
          letterSpacing: '-0.01em',
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ── ACT 3C — Scorecard ───────────────────────────────────────────────
// The payoff. 6 dimension rows animate in with bars filling + counters.

type DimensionRow = {
  label: string;
  score: number; // 0–10
  color: string;
};

const DIMENSIONS: DimensionRow[] = [
  { label: 'Communication', score: 9.2, color: PRIMARY },
  { label: 'Problem Solving', score: 8.7, color: '#06B6D4' },
  { label: 'AI Leverage', score: 8.2, color: '#A855F7' },
  { label: 'Collaboration', score: 9.5, color: GREEN },
  { label: 'Code Quality', score: 9.1, color: '#F59E0B' },
  { label: 'Time Management', score: 8.8, color: '#EC4899' },
];

const Act3cScorecard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = easedInterp(frame, [0, 10], [0, 1]);
  const fadeOut = easedInterp(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
  );

  // Header
  const hdrOp = easedInterp(frame, [0, 14], [0, 1]);
  const hdrY = easedInterp(frame, [0, 14], [14, 0]);

  // Rows stagger: row i starts at frame 16 + i*18
  const rowStart = 16;
  const rowStagger = Math.round(0.6 * fps); // 18f

  // Verdict chip
  const verdictOp = easedInterp(frame, [160, 175], [0, 1]);
  const verdictY = easedInterp(frame, [160, 175], [16, 0]);

  return (
    <AbsoluteFill
      style={{ backgroundColor: DARK, opacity: fadeIn * fadeOut }}
    >
      <AccentGlow y={60} strength={0.18} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '60px 160px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Header */}
        <div
          style={{
            marginBottom: 32,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            opacity: hdrOp,
            transform: `translateY(${hdrY}px)`,
          }}
        >
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '0.24em',
              color: PRIMARY,
            }}
          >
            LIVE EVALUATION
          </div>
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 60,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: WHITE,
            }}
          >
            Sarah Chen
          </div>
        </div>

        {/* Rows */}
        <div
          style={{
            width: '84%',
            maxWidth: 1400,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {DIMENSIONS.map((d, i) => (
            <ScoreRow
              key={d.label}
              dimension={d}
              delay={rowStart + i * rowStagger}
              frame={frame}
              fps={fps}
            />
          ))}
        </div>

        {/* Verdict chip */}
        <div
          style={{
            marginTop: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 22px',
            backgroundColor: `${GREEN}1A`,
            border: `1px solid ${GREEN}66`,
            borderRadius: 999,
            fontFamily: fonts.heading,
            fontSize: 26,
            fontWeight: 700,
            color: GREEN,
            opacity: verdictOp,
            transform: `translateY(${verdictY}px)`,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: GREEN,
              boxShadow: `0 0 10px ${GREEN}`,
            }}
          />
          Above bar on all dimensions.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ScoreRow: React.FC<{
  dimension: DimensionRow;
  delay: number;
  frame: number;
  fps: number;
}> = ({ dimension, delay, frame, fps }) => {
  const f = frame - delay;

  const rowSpring = useSpringIn(f, fps);
  const rowY = easedInterp(rowSpring, [0, 1], [14, 0]);
  const rowOp = easedInterp(f, [0, 12], [0, 1]);

  // Bar fills from 0 to score% over ~22 frames
  const barTarget = (dimension.score / 10) * 100;
  const barWidth = easedInterp(
    f,
    [8, 30],
    [0, barTarget],
    Easing.out(Easing.cubic),
  );

  // Score number counts 0→score over ~22 frames. Use `Easing.out.cubic` so
  // the counter ticks up quickly at the start (feels like a real counter) and
  // settles into the final value — NOT `inOut` which dawdles at the start.
  const scoreNum = easedInterp(
    f,
    [8, 30],
    [0, dimension.score],
    Easing.out(Easing.cubic),
  );
  const scoreDisplay = scoreNum.toFixed(1);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        opacity: rowOp,
        transform: `translateY(${rowY}px)`,
      }}
    >
      {/* Label */}
      <div
        style={{
          width: 260,
          flexShrink: 0,
          fontFamily: fonts.heading,
          fontWeight: 600,
          fontSize: 28,
          letterSpacing: '-0.01em',
          color: '#E2E8F0',
          textAlign: 'right',
        }}
      >
        {dimension.label}
      </div>

      {/* Bar */}
      <div
        style={{
          flex: 1,
          height: 18,
          backgroundColor: '#1E293B',
          borderRadius: 999,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${dimension.color}cc 0%, ${dimension.color} 100%)`,
            borderRadius: 999,
            boxShadow: `0 0 18px ${dimension.color}66`,
          }}
        />
      </div>

      {/* Score */}
      <div
        style={{
          width: 120,
          flexShrink: 0,
          fontFamily: fonts.mono,
          fontWeight: 700,
          fontSize: 40,
          letterSpacing: '-0.02em',
          color: WHITE,
          textAlign: 'left',
        }}
      >
        {scoreDisplay}
      </div>

      {/* Trend arrow */}
      <div
        style={{
          width: 28,
          flexShrink: 0,
          fontFamily: fonts.heading,
          fontSize: 22,
          fontWeight: 700,
          color: GREEN,
          opacity: easedInterp(f, [24, 34], [0, 1]),
        }}
      >
        ↑
      </div>
    </div>
  );
};

// ── ACT 4 — CTA ──────────────────────────────────────────────────────
//   0.0–2.0s  "Stop guessing."   (brand blue)
//   2.0–4.0s  "Start knowing."   (white)
//   4.0–7.0s  fade to white → Skillvee wordmark (no tagline — the two
//             preceding beats carry the message; a logo alone feels
//             confident, not cluttered)

const Act4Closer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1End = Math.round(2 * fps); // 60
  const line2End = Math.round(4 * fps); // 120
  const brandStart = Math.round(4 * fps); // 120

  // "Stop guessing." visible 0–2s, fades at edges
  const line1Op = easedInterp(
    frame,
    [0, 12, line1End - 10, line1End],
    [0, 1, 1, 0],
  );
  const line1Spring = useSpringIn(frame, fps);
  const line1Y = easedInterp(line1Spring, [0, 1], [24, 0]);

  // "Start knowing." visible 2–4s, fades at edges
  const l2Frame = frame - line1End;
  const line2Op = easedInterp(
    l2Frame,
    [0, 12, line2End - line1End - 10, line2End - line1End],
    [0, 1, 1, 0],
  );
  const line2Spring = useSpringIn(l2Frame, fps);
  const line2Y = easedInterp(line2Spring, [0, 1], [24, 0]);

  // Brand section — white bg, logo only
  const bF = frame - brandStart;
  const bgOp = easedInterp(bF, [0, 12], [0, 1]);
  const logoSpring = useSpringIn(bF - 4, fps);
  const logoScale = easedInterp(logoSpring, [0, 1], [0.92, 1]);
  const logoY = easedInterp(logoSpring, [0, 1], [20, 0]);

  // NO fadeOut here — Act 4 holds its white background + logo through the
  // end of the scene. The LoopSeam then handles the white → dark fade so
  // the transition is continuous (white → fading to dark → dark at t=0).

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <AccentGlow strength={0.16} />

      {/* Two-line type */}
      <AbsoluteFill
        style={{ justifyContent: 'center', alignItems: 'center' }}
      >
        {frame < line1End ? (
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 148,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: PRIMARY,
              textAlign: 'center',
              opacity: line1Op,
              transform: `translateY(${line1Y}px)`,
              textShadow: `0 0 60px ${PRIMARY}44`,
            }}
          >
            Stop guessing.
          </div>
        ) : frame < line2End ? (
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 148,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: WHITE,
              textAlign: 'center',
              opacity: line2Op,
              transform: `translateY(${line2Y}px)`,
            }}
          >
            Start knowing.
          </div>
        ) : null}
      </AbsoluteFill>

      {/* Brand section fades over everything from 4s on */}
      <AbsoluteFill
        style={{
          backgroundColor: WHITE,
          opacity: bgOp,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: bgOp,
          background: `radial-gradient(circle at 50% 45%, ${PRIMARY}14 0%, transparent 55%)`,
          pointerEvents: 'none',
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: bgOp,
        }}
      >
        <Img
          src={staticFile('skillvee-logo.png')}
          style={{
            width: 480,
            height: 'auto',
            transform: `translateY(${logoY}px) scale(${logoScale})`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── LOOP SEAM ────────────────────────────────────────────────────────
// Fades white → dark + accent glow, landing on a state that matches
// Act 1's first frame so the restart is visually seamless.

const LoopSeam: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const t = easedInterp(frame, [0, durationInFrames], [0, 1]);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: WHITE }} />
      <AbsoluteFill
        style={{
          backgroundColor: DARK,
          opacity: t,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 65%, ${PRIMARY}30 0%, transparent 55%)`,
          opacity: t,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
