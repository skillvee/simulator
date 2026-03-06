// remotion/src/scenes/ProductStep3.tsx
// Product page timeline: "Present and Defend"
// Uses REAL screen recording of candidate work + dashboard review
// Shows the later portion of the candidate experience flowing into review
// 10 seconds

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
import { animations } from '../lib/design-system';
import { fonts } from '../lib/fonts';

// Show candidate work (later portion) then transition to dashboard review
const CLIP_WORK = {
  src: staticFile('recordings/clip2-work.webm'),
  trimBefore: 20,     // Late in the session — shows wrap-up / defense phase
  playbackRate: 5,
};

const CLIP_DASHBOARD = {
  src: staticFile('recordings/clip3-dashboard.webm'),
  trimBefore: 2,
  playbackRate: 3,
};

export const ProductStep3: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617' }}>
      {/* First 5 seconds: candidate work (later portion / defense) */}
      <Sequence durationInFrames={5 * fps}>
        <RecordingScene clip={CLIP_WORK} label="PRESENT & DEFEND" />
      </Sequence>

      {/* Last 5 seconds: recruiter reviews the results */}
      <Sequence from={5 * fps} durationInFrames={5 * fps}>
        <RecordingScene clip={CLIP_DASHBOARD} label="RECRUITER REVIEW" />
      </Sequence>
    </AbsoluteFill>
  );
};

const RecordingScene: React.FC<{
  clip: { src: string; trimBefore: number; playbackRate: number };
  label: string;
}> = ({ clip, label }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [durationInFrames - fps * 0.3, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scaleSpring = spring({ frame, fps, config: animations.snappy });
  const entranceScale = interpolate(scaleSpring, [0, 1], [0.96, 1]);

  const labelOpacity = interpolate(frame, [fps * 0.3, fps * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut, padding: 16 }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${entranceScale})`,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.12)',
            overflow: 'hidden',
            boxShadow: '0 20px 60px -10px rgba(0,0,0,0.6), 0 0 40px rgba(35, 124, 241, 0.08)',
          }}
        >
          <Video
            src={clip.src}
            muted
            playbackRate={clip.playbackRate}
            trimBefore={clip.trimBefore}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
