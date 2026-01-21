// remotion/src/components/Avatar.tsx
import { colors, borders } from '../lib/design-system';
import { fonts } from '../lib/fonts';

type AvatarProps = {
  initials: string;
  name: string;
  role?: string;
  size?: number;
  showStatus?: boolean;
  backgroundColor?: string;
};

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  name,
  role,
  size = 40,
  showStatus = true,
  backgroundColor = colors.accent,
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative' }}>
        <div
          style={{
            width: size,
            height: size,
            backgroundColor,
            border: `${borders.width}px solid ${colors.border}`,
            borderRadius: borders.radius,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily: fonts.mono,
            fontSize: size * 0.35,
            fontWeight: 700,
            color: colors.text,
          }}
        >
          {initials}
        </div>
        {showStatus && (
          <div
            style={{
              position: 'absolute',
              bottom: -2,
              left: -2,
              width: 10,
              height: 10,
              backgroundColor: colors.success,
              border: `${borders.width}px solid ${colors.border}`,
              borderRadius: borders.radius,
            }}
          />
        )}
      </div>
      {(name || role) && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {name && (
            <span
              style={{
                fontFamily: fonts.heading,
                fontSize: 28,
                fontWeight: 700,
                color: colors.text,
              }}
            >
              {name}
            </span>
          )}
          {role && (
            <span
              style={{
                fontFamily: fonts.heading,
                fontSize: 22,
                color: '#666',
              }}
            >
              {role}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
