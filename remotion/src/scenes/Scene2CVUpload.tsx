// remotion/src/scenes/Scene2CVUpload.tsx
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { colors, borders, animations } from '../lib/design-system';
import { fonts } from '../lib/fonts';
import { TextPunch } from '../components/TextPunch';

export const Scene2CVUpload: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (12 seconds = 360 frames at 30fps)
  const textPunchEnd = 2 * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* "YOUR EXPERIENCE MATTERS" (0-2s) */}
      <Sequence from={0} durationInFrames={textPunchEnd} premountFor={fps}>
        <TextPunch text="YOUR EXPERIENCE MATTERS." fontSize={72} />
      </Sequence>

      {/* Upload UI (2-12s) */}
      <Sequence from={textPunchEnd} durationInFrames={10 * fps} premountFor={fps}>
        <UploadInterface />
      </Sequence>
    </AbsoluteFill>
  );
};

const UploadInterface: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // UI fade in
  const uiOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // PDF drop animation (starts at 3s into this sequence = frame 90)
  const dropStart = 3 * fps;
  const dropProgress = spring({
    frame: frame - dropStart,
    fps,
    config: animations.bouncy,
  });

  // Profile card build (starts at 6s = frame 180)
  const profileStart = 6 * fps;
  const profileProgress = spring({
    frame: frame - profileStart,
    fps,
    config: animations.snappy,
  });

  const pdfY = interpolate(dropProgress, [0, 1], [-200, 0]);
  const pdfOpacity = frame > dropStart ? 1 : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        padding: 60,
        opacity: uiOpacity,
      }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: 14,
          fontWeight: 500,
          color: colors.text,
          marginBottom: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontWeight: 700 }}>Skillvee</span>
        <span style={{ color: '#666' }}>/</span>
        <span>Secure Payments Gateway Implementation</span>
      </div>

      {/* Progress steps */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          marginBottom: 60,
        }}
      >
        {['CV Upload', 'HR Interview', 'Manager Kickoff', 'Coding Task', 'PR Defense'].map(
          (step, i) => (
            <div
              key={step}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: fonts.heading,
                fontSize: 12,
                color: i === 0 ? colors.text : '#999',
                fontWeight: i === 0 ? 700 : 400,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  border: `${borders.width}px solid ${i === 0 ? colors.text : '#ccc'}`,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontFamily: fonts.mono,
                  fontSize: 10,
                  backgroundColor: i === 0 ? colors.accent : 'transparent',
                }}
              >
                {i + 1}
              </div>
              {step}
            </div>
          )
        )}
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', gap: 60 }}>
        {/* Upload zone */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 32,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            Upload Your CV
          </div>
          <div
            style={{
              border: `2px dashed ${colors.border}`,
              padding: 60,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
              position: 'relative',
              backgroundColor:
                frame > dropStart ? 'rgba(247, 218, 80, 0.1)' : 'transparent',
            }}
          >
            {/* PDF icon dropping */}
            {frame > dropStart && (
              <div
                style={{
                  transform: `translateY(${pdfY}px)`,
                  opacity: pdfOpacity,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 80,
                    backgroundColor: '#ff4444',
                    border: `${borders.width}px solid ${colors.border}`,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'white',
                  }}
                >
                  PDF
                </div>
                <div
                  style={{
                    marginTop: 12,
                    fontFamily: fonts.mono,
                    fontSize: 12,
                  }}
                >
                  resume.pdf
                </div>
              </div>
            )}
            {frame <= dropStart && (
              <>
                <div style={{ fontSize: 32, marginBottom: 12 }}>+</div>
                <div style={{ fontFamily: fonts.heading, fontSize: 14 }}>
                  Upload your CV
                </div>
              </>
            )}
          </div>
        </div>

        {/* Profile card */}
        {frame > profileStart && (
          <div
            style={{
              flex: 1,
              border: `${borders.width}px solid ${colors.border}`,
              padding: 24,
              transform: `scale(${profileProgress})`,
              transformOrigin: 'top left',
            }}
          >
            <div
              style={{
                fontFamily: fonts.heading,
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              Alex Johnson
            </div>
            <div
              style={{
                fontFamily: fonts.heading,
                fontSize: 14,
                color: '#666',
                marginBottom: 24,
              }}
            >
              Senior Software Engineer
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS'].map(
                (skill, i) => {
                  const tagDelay = profileStart + i * 5;
                  const tagProgress = spring({
                    frame: frame - tagDelay,
                    fps: 30,
                    config: animations.snappy,
                  });
                  return (
                    <div
                      key={skill}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: colors.accent,
                        border: `${borders.width}px solid ${colors.border}`,
                        fontFamily: fonts.mono,
                        fontSize: 12,
                        transform: `scale(${tagProgress})`,
                      }}
                    >
                      {skill}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
