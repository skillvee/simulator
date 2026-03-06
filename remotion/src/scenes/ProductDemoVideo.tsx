// remotion/src/scenes/ProductDemoVideo.tsx
// Product page hero: 30-second product demo using REAL screen recordings
// Pattern: Setup → Collaborate → Build → Review
// Uses actual product recordings from remotion/public/recordings/

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
import { colors, animations } from '../lib/design-system';
import { fonts } from '../lib/fonts';

const ACCENT = colors.accent;
const FPS = 30;

// Scene durations in seconds (30 total)
const SCENES = {
  setup: 7,           // A: clip1-creation.webm — recruiter creates simulation
  bridgeCollab: 1.5,  // B: "Now the candidate takes over."
  candidateWork: 8,   // C: clip2-work.webm — candidate chats with AI coworkers
  bridgeReview: 1.5,  // D: "Every moment. Captured."
  dashboard: 6,       // E: clip3-dashboard.webm — recruiter dashboard
  bridgeCompare: 1,   // F: "Compare with confidence."
  comparison: 5,      // G: clip4-comparison.webm — side-by-side comparison
} as const;

const dur = (s: number) => s * FPS;

// Clip configs — real product recordings
const CLIPS = {
  creation: {
    src: staticFile('recordings/clip1-creation.webm'),
    trimBefore: 2,
    playbackRate: 4,
  },
  work: {
    src: staticFile('recordings/clip2-work.webm'),
    trimBefore: 5,
    playbackRate: 5,
  },
  dashboard: {
    src: staticFile('recordings/clip3-dashboard.webm'),
    trimBefore: 2,
    playbackRate: 4,
  },
  compare: {
    src: staticFile('recordings/clip4-comparison.webm'),
    trimBefore: 0,
    playbackRate: 2.5,
  },
};

export const ProductDemoVideo: React.FC = () => {
  let t = 0;
  const seq = (duration: number) => {
    const from = t;
    t += duration;
    return { from, durationInFrames: duration };
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* A: Setup — Recruiter creates simulation */}
      <Sequence {...seq(dur(SCENES.setup))}>
        <RecordingScene
          clip={CLIPS.creation}
          label="SETUP"
          step={1}
        />
      </Sequence>

      {/* B: Bridge — "Now the candidate takes over." */}
      <Sequence {...seq(dur(SCENES.bridgeCollab))}>
        <TextSlide bg="#000000" textColor="#ffffff">
          <span>Now the candidate </span>
          <span style={{ color: ACCENT }}>takes over.</span>
        </TextSlide>
      </Sequence>

      {/* C: Candidate Work — chat with AI coworkers */}
      <Sequence {...seq(dur(SCENES.candidateWork))}>
        <RecordingScene
          clip={CLIPS.work}
          label="CANDIDATE VIEW"
          step={2}
        />
      </Sequence>

      {/* D: Bridge — "Every moment. Captured." */}
      <Sequence {...seq(dur(SCENES.bridgeReview))}>
        <TextSlide bg="#ffffff" textColor="#000000">
          <span>Every moment. </span>
          <span style={{ color: ACCENT }}>Captured.</span>
        </TextSlide>
      </Sequence>

      {/* E: Dashboard — Recruiter reviews results */}
      <Sequence {...seq(dur(SCENES.dashboard))}>
        <RecordingScene
          clip={CLIPS.dashboard}
          label="RECRUITER DASHBOARD"
          step={3}
        />
      </Sequence>

      {/* F: Bridge — "Compare with confidence." */}
      <Sequence {...seq(dur(SCENES.bridgeCompare))}>
        <TextSlide bg="#000000" textColor="#ffffff">
          <span>Compare with </span>
          <span style={{ color: ACCENT }}>confidence.</span>
        </TextSlide>
      </Sequence>

      {/* G: Comparison — Side-by-side candidate comparison */}
      <Sequence {...seq(dur(SCENES.comparison))}>
        <RecordingScene
          clip={CLIPS.compare}
          label="COMPARE CANDIDATES"
          step={4}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

// ─── Text slide with inline styled children ────────────────────────

const TextSlide: React.FC<{
  bg: string;
  textColor: string;
  children: React.ReactNode;
}> = ({ bg, textColor, children }) => {
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
          fontSize: 80,
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
  step: number;
}> = ({ clip, label, step }) => {
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
    config: animations.snappy,
  });
  const entranceScale = interpolate(scaleSpring, [0, 1], [0.96, 1]);

  // Label + step badge fade in
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

        {/* Step badge + label */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            opacity: labelOpacity,
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: fonts.heading,
              fontWeight: 700,
              fontSize: 22,
              color: '#fff',
              boxShadow: `0 0 20px ${ACCENT}60`,
            }}
          >
            {step}
          </div>
          <span
            style={{
              fontFamily: fonts.heading,
              fontSize: 16,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: 2,
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              padding: '6px 14px',
              borderRadius: 8,
            }}
          >
            {label}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
