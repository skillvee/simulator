// remotion/src/components/ProgressBar.tsx
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, borders, animations } from '../lib/design-system';
import { fonts } from '../lib/fonts';

type ProgressBarProps = {
  label: string;
  value: number; // 0-100
  delay?: number;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  value,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: animations.smooth,
  });

  const currentValue = Math.round(progress * value);
  const barWidth = progress * value;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 8,
          fontFamily: fonts.heading,
          fontSize: 14,
          color: colors.text,
        }}
      >
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{currentValue}</span>
      </div>
      <div
        style={{
          width: '100%',
          height: 24,
          backgroundColor: colors.background,
          border: `${borders.width}px solid ${colors.border}`,
          borderRadius: borders.radius,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: '100%',
            backgroundColor: colors.accent,
          }}
        />
      </div>
    </div>
  );
};
