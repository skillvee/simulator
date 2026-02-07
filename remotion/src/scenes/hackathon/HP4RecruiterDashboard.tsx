// remotion/src/scenes/hackathon/HP4RecruiterDashboard.tsx
// Uses ACTUAL Skillvee recruiter dashboard UI patterns
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { colors, animations } from '../../lib/design-system';
import { fonts } from '../../lib/fonts';

export const HP4RecruiterDashboard: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (30 seconds total = 900 frames at 30fps)
  const titleEnd = 3 * fps;          // 0-3s: Title punch
  const overviewEnd = 13 * fps;      // 3-13s: Candidate overview with score
  const dimensionsEnd = 22 * fps;    // 13-22s: Dimension score cards
  // 22-30s: Candidate comparison

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Title: Recruiter POV (0-3s) */}
      <Sequence durationInFrames={titleEnd}>
        <TitlePunch text="The Recruiter View" />
      </Sequence>

      {/* Candidate Overview (3-13s) */}
      <Sequence from={titleEnd} durationInFrames={10 * fps}>
        <CandidateOverview />
      </Sequence>

      {/* Dimension Scores (13-22s) */}
      <Sequence from={overviewEnd} durationInFrames={9 * fps}>
        <DimensionScores />
      </Sequence>

      {/* Candidate Comparison (22-30s) */}
      <Sequence from={dimensionsEnd} durationInFrames={8 * fps}>
        <CandidateComparison />
      </Sequence>
    </AbsoluteFill>
  );
};

const TitlePunch: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#8b5cf6', // Purple for recruiter section
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: 96,
          fontWeight: 700,
          color: '#fff',
          transform: `scale(${scale})`,
          textAlign: 'center',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

// Actual Skillvee candidate overview card
const CandidateOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardScale = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  const scoreScale = spring({
    frame: frame - 0.5 * fps,
    fps,
    config: { damping: 8 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background, padding: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          {/* Back link */}
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 14,
              color: colors.mutedForeground,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            ← Back to Candidates
          </div>

          {/* Candidate name with strength badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                fontFamily: fonts.heading,
                fontSize: 40,
                fontWeight: 700,
                color: colors.foreground,
              }}
            >
              Jane Cooper
            </div>
            {/* Exceptional badge - gold gradient like actual app */}
            <div
              style={{
                background: colors.exceptional,
                padding: '6px 16px',
                borderRadius: 999,
                fontFamily: fonts.heading,
                fontSize: 14,
                fontWeight: 600,
                color: '#78350f',
              }}
            >
              Exceptional
            </div>
          </div>

          {/* Scenario and date */}
          <div
            style={{
              marginTop: 12,
              fontFamily: fonts.heading,
              fontSize: 16,
              color: colors.mutedForeground,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <span>Full-Stack Developer Assessment</span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              📅 Jan 15, 2026
            </span>
          </div>
        </div>

        {/* Compare button */}
        <div
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            fontFamily: fonts.heading,
            fontSize: 14,
            fontWeight: 500,
            color: colors.foreground,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          👥 Compare with others
        </div>
      </div>

      {/* Overall Score Card - matches actual app */}
      <div
        style={{
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: 32,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transform: `scale(${cardScale})`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32 }}>
          {/* Score */}
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span
              style={{
                fontFamily: fonts.heading,
                fontSize: 72,
                fontWeight: 700,
                color: colors.success, // Green for high score
                transform: `scale(${Math.max(0, scoreScale)})`,
                display: 'inline-block',
              }}
            >
              4.6
            </span>
            <span
              style={{
                fontFamily: fonts.heading,
                fontSize: 24,
                color: colors.mutedForeground,
                marginLeft: 4,
              }}
            >
              / 5.0
            </span>
          </div>

          {/* Percentile badge */}
          <div
            style={{
              background: colors.exceptional,
              padding: '8px 16px',
              borderRadius: 8,
              fontFamily: fonts.heading,
              fontSize: 16,
              fontWeight: 600,
              color: '#78350f',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: interpolate(frame, [fps, 1.5 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          >
            📈 Top 8%
          </div>
        </div>

        {/* Summary */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 24,
            borderTop: `1px solid ${colors.border}`,
            fontFamily: fonts.heading,
            fontSize: 16,
            color: colors.foreground,
            lineHeight: 1.6,
            opacity: interpolate(frame, [1.5 * fps, 2 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          Jane demonstrated exceptional problem-solving skills and clear communication throughout the assessment.
          She effectively gathered requirements, collaborated with stakeholders, and delivered high-quality code
          with thoughtful architecture decisions.
        </div>
      </div>

      {/* Green/Red Flags - Hiring Signals */}
      <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
        {/* Green Flags */}
        <div
          style={{
            flex: 1,
            backgroundColor: `${colors.success}08`,
            border: `1px solid ${colors.success}30`,
            borderRadius: 12,
            padding: 24,
            opacity: interpolate(frame, [2.5 * fps, 3 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 16,
              fontWeight: 600,
              color: colors.success,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            ✓ Where they shined
          </div>
          {['Asked clarifying questions proactively', 'Clean, well-structured code', 'Excellent stakeholder communication'].map((flag, i) => (
            <div
              key={i}
              style={{
                fontFamily: fonts.heading,
                fontSize: 14,
                color: colors.foreground,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <span style={{ color: colors.success }}>•</span>
              {flag}
            </div>
          ))}
        </div>

        {/* Areas to probe */}
        <div
          style={{
            flex: 1,
            backgroundColor: `${colors.warning}08`,
            border: `1px solid ${colors.warning}30`,
            borderRadius: 12,
            padding: 24,
            opacity: interpolate(frame, [3 * fps, 3.5 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 16,
              fontWeight: 600,
              color: '#d97706',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            ⚠ Areas to probe
          </div>
          {['Could improve on time estimation', 'Limited experience with testing'].map((flag, i) => (
            <div
              key={i}
              style={{
                fontFamily: fonts.heading,
                fontSize: 14,
                color: colors.foreground,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <span style={{ color: '#d97706' }}>•</span>
              {flag}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Dimension Score Cards - matches actual DimensionScoreCard component
const DimensionScores: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dimensions = [
    { name: 'Communication', score: 5, percentile: 95, borderColor: colors.success, behaviors: ['Clear explanations to stakeholders', 'Asked excellent clarifying questions'] },
    { name: 'Problem Solving', score: 5, percentile: 92, borderColor: colors.success, behaviors: ['Broke down complex problems effectively', 'Considered edge cases'] },
    { name: 'AI Leverage', score: 4, percentile: 78, borderColor: colors.success, behaviors: ['Used AI for boilerplate, wrote core logic manually'] },
    { name: 'Code Quality', score: 4, percentile: 85, borderColor: colors.success, behaviors: ['Clean architecture', 'Good naming conventions'] },
    { name: 'Collaboration', score: 5, percentile: 90, borderColor: colors.success, behaviors: ['Proactively sought feedback', 'Responded well to suggestions'] },
    { name: 'Time Management', score: 3, percentile: 65, borderColor: '#eab308', behaviors: ['Completed on time', 'Could improve estimation'], trainable: true },
  ];

  // Score circles renderer
  const renderScoreCircles = (score: number) => {
    return (
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            style={{
              fontSize: 18,
              color: i <= score ? '#44403c' : '#d6d3d1',
            }}
          >
            {i <= score ? '●' : '○'}
          </span>
        ))}
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background, padding: 60 }}>
      {/* Header */}
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: 32,
          fontWeight: 700,
          color: colors.foreground,
          marginBottom: 32,
        }}
      >
        Dimension Scores
      </div>

      {/* Grid of dimension cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 20,
        }}
      >
        {dimensions.map((dim, i) => {
          const delay = i * 0.15 * fps;
          const cardScale = spring({
            frame: frame - delay,
            fps,
            config: animations.snappy,
          });

          return (
            <div
              key={dim.name}
              style={{
                backgroundColor: colors.background,
                border: `1px solid ${colors.border}`,
                borderLeft: `4px solid ${dim.borderColor}`,
                borderRadius: 8,
                padding: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transform: `scale(${Math.max(0, cardScale)})`,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 16,
                    fontWeight: 500,
                    color: colors.foreground,
                  }}
                >
                  {dim.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {renderScoreCircles(dim.score)}
                  <div
                    style={{
                      backgroundColor: dim.percentile >= 90 ? `${colors.success}15` : dim.percentile >= 75 ? `${colors.primary}15` : '#f5f5f4',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontFamily: fonts.heading,
                      fontSize: 12,
                      fontWeight: 500,
                      color: dim.percentile >= 90 ? colors.success : dim.percentile >= 75 ? colors.primary : '#78716c',
                    }}
                  >
                    {dim.percentile >= 75 ? `Top ${100 - dim.percentile}%` : `${dim.percentile}th`}
                  </div>
                </div>
              </div>

              {/* Trainable badge if applicable */}
              {dim.trainable && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#fef3c7',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontFamily: fonts.heading,
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#b45309',
                    marginBottom: 12,
                  }}
                >
                  🎓 Trainable
                </div>
              )}

              {/* Behaviors */}
              <div>
                {dim.behaviors.map((behavior, j) => (
                  <div
                    key={j}
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: 14,
                      color: '#78716c',
                      marginBottom: 6,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <span style={{ color: '#a8a29e' }}>•</span>
                    {behavior}
                  </div>
                ))}
              </div>

              {/* Timestamp chips */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {['2:34', '5:12'].map((ts, j) => (
                  <div
                    key={j}
                    style={{
                      backgroundColor: `${colors.primary}10`,
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontFamily: fonts.heading,
                      fontSize: 12,
                      color: colors.primary,
                    }}
                  >
                    {ts}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Side-by-side candidate comparison
const CandidateComparison: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const candidates = [
    {
      name: 'Jane Cooper',
      score: 4.6,
      strengthLevel: 'Exceptional',
      percentile: 92,
      recommended: true,
      dimensions: { communication: 5, problemSolving: 5, aiLeverage: 4 },
    },
    {
      name: 'Alex Johnson',
      score: 3.8,
      strengthLevel: 'Strong',
      percentile: 75,
      recommended: false,
      dimensions: { communication: 4, problemSolving: 4, aiLeverage: 3 },
    },
    {
      name: 'Sam Williams',
      score: 3.2,
      strengthLevel: 'Proficient',
      percentile: 55,
      recommended: false,
      dimensions: { communication: 3, problemSolving: 3, aiLeverage: 4 },
    },
  ];

  const getStrengthStyle = (level: string) => {
    switch (level) {
      case 'Exceptional':
        return { background: colors.exceptional, color: '#78350f' };
      case 'Strong':
        return { background: colors.strong, color: '#166534' };
      case 'Proficient':
        return { background: colors.proficient, color: '#1d4ed8' };
      default:
        return { background: colors.developing, color: '#57534e' };
    }
  };

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background, padding: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 40,
            fontWeight: 700,
            color: colors.foreground,
            marginBottom: 8,
          }}
        >
          Compare Candidates
        </div>
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 20,
            color: colors.mutedForeground,
          }}
        >
          No gut feel — just evidence
        </div>
      </div>

      {/* Comparison cards */}
      <div style={{ display: 'flex', gap: 24 }}>
        {candidates.map((candidate, i) => {
          const delay = i * 0.2 * fps;
          const cardScale = spring({
            frame: frame - delay,
            fps,
            config: animations.snappy,
          });
          const strengthStyle = getStrengthStyle(candidate.strengthLevel);

          return (
            <div
              key={candidate.name}
              style={{
                flex: 1,
                backgroundColor: candidate.recommended ? `${colors.primary}05` : colors.background,
                border: `2px solid ${candidate.recommended ? colors.primary : colors.border}`,
                borderRadius: 16,
                padding: 28,
                transform: `scale(${Math.max(0, cardScale)})`,
                position: 'relative',
              }}
            >
              {/* Recommended badge */}
              {candidate.recommended && (
                <div
                  style={{
                    position: 'absolute',
                    top: -12,
                    right: 20,
                    backgroundColor: colors.primary,
                    color: '#fff',
                    fontFamily: fonts.heading,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '6px 14px',
                    borderRadius: 999,
                  }}
                >
                  ★ Recommended
                </div>
              )}

              {/* Name */}
              <div
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 24,
                  fontWeight: 700,
                  color: colors.foreground,
                  marginBottom: 8,
                }}
              >
                {candidate.name}
              </div>

              {/* Strength badge */}
              <div
                style={{
                  display: 'inline-block',
                  background: strengthStyle.background,
                  color: strengthStyle.color,
                  fontFamily: fonts.heading,
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '5px 12px',
                  borderRadius: 999,
                  marginBottom: 20,
                }}
              >
                {candidate.strengthLevel}
              </div>

              {/* Score */}
              <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 20 }}>
                <span
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 48,
                    fontWeight: 700,
                    color: candidate.score >= 4 ? colors.success : candidate.score >= 3 ? colors.primary : '#78716c',
                  }}
                >
                  {candidate.score.toFixed(1)}
                </span>
                <span
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 20,
                    color: colors.mutedForeground,
                    marginLeft: 4,
                  }}
                >
                  / 5.0
                </span>
              </div>

              {/* Dimension breakdown */}
              <div style={{ marginBottom: 20 }}>
                {Object.entries(candidate.dimensions).map(([key, value]) => {
                  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
                  return (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: fonts.heading,
                          fontSize: 14,
                          color: colors.mutedForeground,
                        }}
                      >
                        {label}
                      </span>
                      <span
                        style={{
                          fontFamily: fonts.mono,
                          fontSize: 14,
                          fontWeight: 600,
                          color: value >= 4 ? colors.success : value >= 3 ? '#d97706' : colors.destructive,
                        }}
                      >
                        {value}/5
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Percentile */}
              <div
                style={{
                  backgroundColor: colors.muted,
                  borderRadius: 10,
                  padding: 14,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 14,
                    color: colors.mutedForeground,
                    marginBottom: 4,
                  }}
                >
                  Percentile
                </div>
                <div
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 20,
                    fontWeight: 700,
                    color: candidate.percentile >= 90 ? colors.success : candidate.percentile >= 75 ? colors.primary : colors.foreground,
                  }}
                >
                  {candidate.percentile >= 75 ? `Top ${100 - candidate.percentile}%` : `${candidate.percentile}th`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
