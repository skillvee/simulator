// remotion/src/scenes/HeroVideo.tsx
// 30-second promotional hero video loop
// Pattern: Hook → Provoke → Prove → Provoke → Prove → Close

import {
  AbsoluteFill,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { Video } from '@remotion/media';
import { fonts } from '../lib/fonts';

const ACCENT = '#237CF1';
const FPS = 30;

// Scene durations in seconds (30 total)
const SCENES = {
  hook: 3, // A: hero-preview.mp4
  problem: 2, // B: "Resumes show potential." → "We show proof."
  candidateWork: 8.5, // C: clip2-work.webm
  bridge: 1.5, // D: "Every conversation. Captured."
  recruiterSetup: 1.5, // E: "Then you can assess confidently."
  dashboard: 5.5, // F: clip3-dashboard.webm
  evidence: 1.5, // G: "No gut feel. Just evidence."
  comparison: 4, // H: clip4-comparison.webm
  closer: 2.5, // I: SkillVee + tagline → fade to black
} as const;

const dur = (s: number) => s * FPS;

// Clip configs
const CLIPS = {
  preview: staticFile('recordings/hero-preview.mp4'),
  work: {
    src: staticFile('recordings/clip2-work.webm'),
    trimBefore: 5,
    playbackRate: 5,
  },
  dashboard: {
    src: staticFile('recordings/clip3-dashboard.webm'),
    trimBefore: 2,
    playbackRate: 5,
  },
  compare: {
    src: staticFile('recordings/clip4-comparison.webm'),
    trimBefore: 0,
    playbackRate: 2.7,
  },
};

export const HeroVideo: React.FC = () => {
  let t = 0;
  const seq = (duration: number) => {
    const from = t;
    t += duration;
    return { from, durationInFrames: duration };
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* A: Hook — hero-preview.mp4 */}
      <Sequence {...seq(dur(SCENES.hook))}>
        <HookScene />
      </Sequence>

      {/* B: Problem — "Resumes show potential." → "We show proof." */}
      <Sequence {...seq(dur(SCENES.problem))}>
        <TwoBeatText
          line1="Resumes show potential."
          line2="We show proof."
          line2Color={ACCENT}
          bg="#000000"
          textColor="#ffffff"
        />
      </Sequence>

      {/* C: Candidate Work — chat with AI coworkers */}
      <Sequence {...seq(dur(SCENES.candidateWork))}>
        <RecordingScene
          clip={CLIPS.work}
          label="CANDIDATE VIEW"
        />
      </Sequence>

      {/* D: Bridge — "Every conversation. Captured." */}
      <Sequence {...seq(dur(SCENES.bridge))}>
        <TextSlide bg="#ffffff" textColor="#000000">
          <span>Every conversation. </span>
          <span style={{ color: ACCENT }}>Captured.</span>
        </TextSlide>
      </Sequence>

      {/* E: Recruiter Setup — "Then you can assess confidently." */}
      <Sequence {...seq(dur(SCENES.recruiterSetup))}>
        <TextSlide bg="#000000" textColor="#ffffff">
          <span>Then you can assess </span>
          <span style={{ color: ACCENT }}>confidently.</span>
        </TextSlide>
      </Sequence>

      {/* F: Dashboard */}
      <Sequence {...seq(dur(SCENES.dashboard))}>
        <RecordingScene
          clip={CLIPS.dashboard}
          label="RECRUITER DASHBOARD"
        />
      </Sequence>

      {/* G: Evidence — "No gut feel. Just evidence." */}
      <Sequence {...seq(dur(SCENES.evidence))}>
        <TextSlide bg="#ffffff" textColor="#000000">
          <span>No gut feel. Just </span>
          <span style={{ color: ACCENT }}>evidence.</span>
        </TextSlide>
      </Sequence>

      {/* H: Comparison */}
      <Sequence {...seq(dur(SCENES.comparison))}>
        <RecordingScene
          clip={CLIPS.compare}
          label="COMPARE CANDIDATES"
        />
      </Sequence>

      {/* I: Closer — Brand + tagline → fade to black */}
      <Sequence {...seq(dur(SCENES.closer))}>
        <CloserScene />
      </Sequence>
    </AbsoluteFill>
  );
};

// ─── Scene A: Hero Preview Video ───────────────────────────────────

const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <Video
        src={CLIPS.preview}
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </AbsoluteFill>
  );
};

// ─── Scene B: Two-beat text punch ──────────────────────────────────

const TwoBeatText: React.FC<{
  line1: string;
  line2: string;
  line2Color?: string;
  bg: string;
  textColor: string;
}> = ({ line1, line2, line2Color, bg, textColor }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const switchFrame = Math.floor(durationInFrames * 0.5);

  // Line 1
  const scale1 = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });
  const rot1 = interpolate(scale1, [0, 1], [-3, 0]);
  const opacity1 = frame < switchFrame ? 1 : 0;

  // Line 2
  const frame2 = Math.max(0, frame - switchFrame);
  const scale2 = spring({
    frame: frame2,
    fps,
    config: { damping: 20, stiffness: 200 },
  });
  const rot2 = interpolate(scale2, [0, 1], [-3, 0]);
  const opacity2 = frame >= switchFrame ? 1 : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      {/* Line 1 */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: opacity1,
        }}
      >
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 90,
            fontWeight: 700,
            color: textColor,
            transform: `scale(${scale1}) rotate(${rot1}deg)`,
            textAlign: 'center',
            padding: 40,
          }}
        >
          {line1}
        </div>
      </AbsoluteFill>

      {/* Line 2 */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: opacity2,
        }}
      >
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 100,
            fontWeight: 700,
            color: line2Color || textColor,
            transform: `scale(${scale2}) rotate(${rot2}deg)`,
            textAlign: 'center',
            padding: 40,
          }}
        >
          {line2}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Generic text slide with inline styled children ────────────────

const TextSlide: React.FC<{
  bg: string;
  textColor: string;
  fontSize?: number;
  children: React.ReactNode;
}> = ({ bg, textColor, fontSize = 80, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });
  const rotation = interpolate(scale, [0, 1], [-2, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bg,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize,
          fontWeight: 700,
          color: textColor,
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          textAlign: 'center',
          padding: 40,
          lineHeight: 1.2,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

// ─── Screen recording scene ────────────────────────────────────────

const RecordingScene: React.FC<{
  clip: { src: string; trimBefore: number; playbackRate: number };
  label: string;
}> = ({ clip, label }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const fadeOut = interpolate(
    frame,
    [durationInFrames - fps * 0.3, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const scaleSpring = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 200 },
  });
  const entranceScale = interpolate(scaleSpring, [0, 1], [0.96, 1]);

  // Label fade in
  const labelOpacity = interpolate(frame, [fps * 0.3, fps * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        opacity: fadeIn * fadeOut,
        backgroundColor: '#020617',
        padding: '12px 16px',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${entranceScale})`,
          position: 'relative',
        }}
      >
        {/* Video */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.12)',
            overflow: 'hidden',
            boxShadow:
              '0 20px 60px -10px rgba(0,0,0,0.6), 0 0 40px rgba(35, 124, 241, 0.08)',
          }}
        >
          <Video
            src={clip.src}
            muted
            playbackRate={clip.playbackRate}
            trimBefore={clip.trimBefore}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>

        {/* Corner label */}
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            opacity: labelOpacity,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            padding: '6px 14px',
            borderRadius: 8,
          }}
        >
          {/* Pulsing dot */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              opacity: Math.sin(frame * 0.15) * 0.3 + 0.7,
              boxShadow: '0 0 6px rgba(239, 68, 68, 0.5)',
            }}
          />
          <span
            style={{
              fontFamily: fonts.heading,
              fontSize: 13,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: 1.5,
            }}
          >
            {label}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene J: Brand closer ─────────────────────────────────────────

const CloserScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Brand name spring
  const brandScale = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 200 },
  });

  // Tagline fades in after brand
  const taglineOpacity = interpolate(frame, [fps * 0.5, fps * 1.0], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const taglineY = interpolate(frame, [fps * 0.5, fps * 1.0], [15, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Fade out to black for seamless loop
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fps * 1, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeOut,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {/* Brand */}
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 100,
            fontWeight: 700,
            color: '#ffffff',
            transform: `scale(${brandScale})`,
            marginBottom: 16,
          }}
        >
          SkillVee
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 36,
            fontWeight: 500,
            color: ACCENT,
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
          }}
        >
          Watch Day One. Then decide.
        </div>
      </div>
    </AbsoluteFill>
  );
};
