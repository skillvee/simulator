// remotion/src/scenes/ProductStep2.tsx
// Product page timeline: "Do the Actual Work"
// Uses REAL screen recording of candidate working in the Skillvee interface
// 12 seconds

import {
  AbsoluteFill,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { Video } from '@remotion/media';
import { animations } from '../lib/design-system';
import { fonts } from '../lib/fonts';

const CLIP = {
  src: staticFile('recordings/clip2-work.webm'),
  trimBefore: 10,     // Skip past initial greeting — shows the work phase
  playbackRate: 4,
};

export const ProductStep2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [durationInFrames - fps * 0.5, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scaleSpring = spring({ frame, fps, config: animations.snappy });
  const entranceScale = interpolate(scaleSpring, [0, 1], [0.96, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617', opacity: fadeIn * fadeOut, padding: 16 }}>
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
            src={CLIP.src}
            muted
            playbackRate={CLIP.playbackRate}
            trimBefore={CLIP.trimBefore}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Corner label */}
        <CornerLabel frame={frame} fps={fps} />
      </div>
    </AbsoluteFill>
  );
};

const CornerLabel: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const labelOpacity = interpolate(frame, [fps * 0.3, fps * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
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
        SCREEN RECORDING
      </span>
    </div>
  );
};
