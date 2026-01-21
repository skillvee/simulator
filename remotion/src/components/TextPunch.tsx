// remotion/src/components/TextPunch.tsx
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, animations } from '../lib/design-system';
import { fonts } from '../lib/fonts';

type TextPunchProps = {
  text: string;
  fontSize?: number;
  color?: string;
};

export const TextPunch: React.FC<TextPunchProps> = ({
  text,
  fontSize = 80,
  color = colors.text,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scale up from 0 with overshoot
  const scale = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  // Slight rotation for punch effect
  const rotation = interpolate(
    spring({ frame, fps, config: animations.snappy }),
    [0, 1],
    [-3, 0]
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      }}
    >
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize,
          fontWeight: 700,
          color,
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          textAlign: 'center',
          padding: 40,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
