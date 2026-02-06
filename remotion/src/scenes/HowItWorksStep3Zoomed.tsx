// remotion/src/scenes/HowItWorksStep3Zoomed.tsx
// "How It Works" Step 3: Review Standardized Evidence - ZOOMED VERSION
// Extra-large fonts and elements for small-screen viewing

import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { colors, animations } from '../lib/design-system';
import { fonts } from '../lib/fonts';

// Dimension scores
const dimensionScores = [
  { dimension: 'Communication', score: 4.5, percentile: 92, observableBehaviors: 'Clear requirement clarification' },
  { dimension: 'Problem Solving', score: 4.8, percentile: 96, observableBehaviors: 'Systematic debugging approach' },
  { dimension: 'Technical Skills', score: 4.2, percentile: 85, observableBehaviors: 'Clean code, proper abstractions' },
  { dimension: 'Collaboration', score: 4.6, percentile: 90, observableBehaviors: 'Active listening, feedback' },
  { dimension: 'AI Leverage', score: 3.9, percentile: 78, observableBehaviors: 'Effective prompting' },
  { dimension: 'Time Management', score: 4.1, percentile: 82, observableBehaviors: 'Prioritized tasks well' },
];

// Hiring signals
const greenFlags = [
  'Proactively clarified requirements',
  'Excellent stakeholder communication',
  'Effective AI tool usage',
  'Clean, documented code',
];

const redFlags = [
  'Could improve test coverage',
];

export const HowItWorksStep3Zoomed: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#f8fafc' }}>
      <ResultsDashboardZoomed />
    </AbsoluteFill>
  );
};

const ResultsDashboardZoomed: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Interface fade in
  const uiOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: uiOpacity, padding: 20 }}>
      {/* Main container - clean white card */}
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: colors.background,
          borderRadius: 28,
          border: `3px solid ${colors.border}`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Compact header with candidate info */}
        <CandidateHeader />

        {/* Scrollable content area */}
        <div style={{ flex: 1, padding: 36, overflowY: 'hidden', display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Overall Score Card */}
          <OverallScoreCard />

          {/* Dimension Scores Grid */}
          <DimensionScoresGrid />

          {/* Hiring Signals */}
          <HiringSignals />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const CandidateHeader: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  return (
    <div
      style={{
        height: 120,
        borderBottom: `3px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 40px',
        backgroundColor: '#fafafa',
        opacity: entrance,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          backgroundColor: colors.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.background,
          fontFamily: fonts.heading,
          fontWeight: 700,
          fontSize: 28,
          marginRight: 20,
        }}
      >
        AM
      </div>

      {/* Name and role */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <h1 style={{ fontFamily: fonts.heading, fontSize: 34, fontWeight: 700, margin: 0 }}>
            Alex Mitchell
          </h1>
          {/* Strength badge */}
          <div
            style={{
              padding: '8px 22px',
              borderRadius: 10,
              background: 'linear-gradient(to right, #fbbf24, #f59e0b)',
              fontFamily: fonts.heading,
              fontSize: 18,
              fontWeight: 700,
              color: '#78350f',
            }}
          >
            Exceptional
          </div>
        </div>
        <p style={{ fontFamily: fonts.heading, fontSize: 20, color: '#64748b', marginTop: 6 }}>
          Senior Frontend Engineer Simulation
        </p>
      </div>

      {/* Compare button */}
      <div
        style={{
          padding: '14px 28px',
          borderRadius: 14,
          border: `3px solid ${colors.border}`,
          fontFamily: fonts.heading,
          fontSize: 20,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          backgroundColor: 'white',
        }}
      >
        <span style={{ fontSize: 22 }}>👥</span>
        Compare
      </div>
    </div>
  );
};

const OverallScoreCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - 10,
    fps,
    config: animations.snappy,
  });

  // Animated score counter
  const displayScore = interpolate(frame, [15, 50], [0, 4.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        backgroundColor: '#f0fdf4',
        borderRadius: 24,
        border: '3px solid #bbf7d0',
        padding: 32,
        opacity: entrance,
        transform: `translateY(${(1 - entrance) * 20}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: 36,
      }}
    >
      {/* Score */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontFamily: fonts.heading,
            fontSize: 88,
            fontWeight: 700,
            color: '#16a34a',
          }}
        >
          {displayScore.toFixed(1)}
        </span>
        <span style={{ fontFamily: fonts.heading, fontSize: 36, color: '#86efac', fontWeight: 600 }}>
          / 5.0
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 3, height: 90, backgroundColor: '#bbf7d0' }} />

      {/* Description */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
          <p style={{ fontFamily: fonts.heading, fontSize: 24, fontWeight: 600, color: '#166534', margin: 0 }}>
            Overall Score
          </p>
          <div
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              backgroundColor: '#dcfce7',
              fontFamily: fonts.heading,
              fontSize: 18,
              fontWeight: 600,
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            📈 Top 8%
          </div>
        </div>
        <p
          style={{
            fontFamily: fonts.heading,
            fontSize: 20,
            color: '#15803d',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Exceptional communication and problem-solving. Clean, documented code ahead of schedule.
        </p>
      </div>
    </div>
  );
};

const DimensionScoresGrid: React.FC = () => {
  return (
    <div>
      <h2
        style={{
          fontFamily: fonts.heading,
          fontSize: 26,
          fontWeight: 700,
          marginBottom: 20,
        }}
      >
        Dimension Scores
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
        }}
      >
        {dimensionScores.map((dim, i) => (
          <DimensionCard key={dim.dimension} dimension={dim} index={i} />
        ))}
      </div>
    </div>
  );
};

interface DimensionCardProps {
  dimension: typeof dimensionScores[0];
  index: number;
}

const DimensionCard: React.FC<DimensionCardProps> = ({ dimension, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - 30 - index * 4,
    fps,
    config: animations.snappy,
  });

  // Animated score bar
  const barWidth = interpolate(
    frame,
    [45 + index * 4, 80 + index * 4],
    [0, (dimension.score / 5) * 100],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return '#16a34a';
    if (score >= 3.5) return '#2563eb';
    if (score >= 2.5) return '#57534e';
    return '#dc2626';
  };

  const getBgColor = (percentile: number) => {
    if (percentile >= 90) return '#dcfce7';
    if (percentile >= 75) return '#dbeafe';
    return '#f5f5f4';
  };

  const getTextColor = (percentile: number) => {
    if (percentile >= 90) return '#166534';
    if (percentile >= 75) return '#1e40af';
    return '#57534e';
  };

  return (
    <div
      style={{
        backgroundColor: colors.background,
        borderRadius: 20,
        border: `3px solid ${colors.border}`,
        padding: 22,
        opacity: entrance,
        transform: `translateY(${(1 - entrance) * 20}px)`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontFamily: fonts.heading, fontSize: 20, fontWeight: 600 }}>
          {dimension.dimension}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              fontFamily: fonts.heading,
              fontSize: 30,
              fontWeight: 700,
              color: getScoreColor(dimension.score),
            }}
          >
            {dimension.score.toFixed(1)}
          </span>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              backgroundColor: getBgColor(dimension.percentile),
              fontFamily: fonts.heading,
              fontSize: 16,
              fontWeight: 600,
              color: getTextColor(dimension.percentile),
            }}
          >
            Top {100 - dimension.percentile}%
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div
        style={{
          height: 12,
          backgroundColor: '#f1f5f9',
          borderRadius: 6,
          marginBottom: 14,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${barWidth}%`,
            backgroundColor: getScoreColor(dimension.score),
            borderRadius: 6,
          }}
        />
      </div>

      <p style={{ fontFamily: fonts.heading, fontSize: 18, color: '#64748b', lineHeight: 1.5, margin: 0 }}>
        {dimension.observableBehaviors}
      </p>
    </div>
  );
};

const HiringSignals: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - 90,
    fps,
    config: animations.snappy,
  });

  return (
    <div
      style={{
        opacity: entrance,
        transform: `translateY(${(1 - entrance) * 20}px)`,
      }}
    >
      <h2
        style={{
          fontFamily: fonts.heading,
          fontSize: 26,
          fontWeight: 700,
          marginBottom: 20,
        }}
      >
        Hiring Signals
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
        {/* Green Flags */}
        <div
          style={{
            backgroundColor: '#f0fdf4',
            borderRadius: 20,
            border: '3px solid #bbf7d0',
            padding: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontFamily: fonts.heading,
              fontSize: 22,
              fontWeight: 700,
              color: '#166534',
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 24 }}>✓</span>
            Green Flags ({greenFlags.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {greenFlags.map((flag, i) => (
              <GreenFlagItem key={i} flag={flag} index={i} />
            ))}
          </div>
        </div>

        {/* Red Flags */}
        <div
          style={{
            backgroundColor: '#fef2f2',
            borderRadius: 20,
            border: '3px solid #fecaca',
            padding: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontFamily: fonts.heading,
              fontSize: 22,
              fontWeight: 700,
              color: '#991b1b',
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 24 }}>⚠</span>
            Red Flags ({redFlags.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {redFlags.map((flag, i) => (
              <RedFlagItem key={i} flag={flag} index={i} />
            ))}
          </div>
        </div>

        {/* Hire Recommendation */}
        <HireRecommendation />
      </div>
    </div>
  );
};

const GreenFlagItem: React.FC<{ flag: string; index: number }> = ({ flag, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - 100 - index * 4,
    fps,
    config: animations.snappy,
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        opacity: entrance,
        transform: `translateX(${(1 - entrance) * 20}px)`,
      }}
    >
      <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 20 }}>↑</span>
      <span style={{ fontFamily: fonts.heading, fontSize: 18, color: '#166534', lineHeight: 1.5 }}>
        {flag}
      </span>
    </div>
  );
};

const RedFlagItem: React.FC<{ flag: string; index: number }> = ({ flag, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - 100 - index * 4,
    fps,
    config: animations.snappy,
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        opacity: entrance,
        transform: `translateX(${(1 - entrance) * 20}px)`,
      }}
    >
      <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 20 }}>↓</span>
      <span style={{ fontFamily: fonts.heading, fontSize: 18, color: '#991b1b', lineHeight: 1.5 }}>
        {flag}
      </span>
    </div>
  );
};

const HireRecommendation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - 110,
    fps,
    config: animations.bouncy,
  });

  // Pulse effect for the badge
  const pulse = 1 + 0.015 * Math.sin((frame - 110) * 0.12);

  return (
    <div
      style={{
        backgroundColor: '#f0fdf4',
        borderRadius: 20,
        border: '4px solid #22c55e',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        opacity: entrance,
        transform: `scale(${entrance * pulse})`,
        boxShadow: '0 8px 24px rgba(34, 197, 94, 0.25)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '18px 36px',
          backgroundColor: '#22c55e',
          borderRadius: 18,
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 36 }}>✓</span>
        <span
          style={{
            fontFamily: fonts.heading,
            fontSize: 28,
            fontWeight: 700,
            color: colors.background,
          }}
        >
          HIRE
        </span>
      </div>
      <p
        style={{
          fontFamily: fonts.heading,
          fontSize: 18,
          color: '#166534',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        Strong technical skills, excellent communication. Recommend final interview.
      </p>
    </div>
  );
};
