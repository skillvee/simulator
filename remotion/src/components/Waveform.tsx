// remotion/src/components/Waveform.tsx
import { useCurrentFrame, interpolate } from 'remotion';
import { colors, borders } from '../lib/design-system';

type WaveformProps = {
  bars?: number;
  width?: number;
  height?: number;
  active?: boolean;
};

export const Waveform: React.FC<WaveformProps> = ({
  bars = 5,
  width = 60,
  height = 40,
  active = true,
}) => {
  const frame = useCurrentFrame();

  const barWidth = (width - (bars - 1) * 4) / bars;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        height,
      }}
    >
      {Array.from({ length: bars }).map((_, i) => {
        // Each bar animates at different phase
        const phase = (frame + i * 8) % 30;
        const barHeight = active
          ? interpolate(phase, [0, 15, 30], [0.3, 1, 0.3]) * height
          : height * 0.2;

        return (
          <div
            key={i}
            style={{
              width: barWidth,
              height: barHeight,
              backgroundColor: colors.accent,
              border: `${borders.width}px solid ${colors.border}`,
              borderRadius: borders.radius,
            }}
          />
        );
      })}
    </div>
  );
};
