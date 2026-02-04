// remotion/src/scenes/HowItWorksStep3Zoomed.tsx
// "How It Works" Step 3: Review Standardized Evidence - ZOOMED VERSION
// Focuses on the scorecard and hiring recommendation (no browser chrome or header)

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
  { dimension: 'Communication', score: 4.5, percentile: 92, observableBehaviors: 'Clear requirement clarification, concise updates' },
  { dimension: 'Problem Solving', score: 4.8, percentile: 96, observableBehaviors: 'Systematic debugging, creative solutions' },
  { dimension: 'Technical Skills', score: 4.2, percentile: 85, observableBehaviors: 'Clean code, proper abstractions' },
  { dimension: 'Collaboration', score: 4.6, percentile: 90, observableBehaviors: 'Active listening, constructive feedback' },
  { dimension: 'AI Leverage', score: 3.9, percentile: 78, observableBehaviors: 'Effective prompting, code validation' },
  { dimension: 'Time Management', score: 4.1, percentile: 82, observableBehaviors: 'Prioritized tasks, met deadlines' },
];

// Hiring signals
const greenFlags = [
  'Proactively clarified requirements before coding',
  'Excellent communication with stakeholders',
  'Used AI tools effectively to accelerate work',
  'Clean, well-documented code submission',
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
    <AbsoluteFill style={{ opacity: uiOpacity, padding: 32 }}>
      {/* Main container - clean white card */}
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: colors.background,
          borderRadius: 24,
          border: `2px solid ${colors.border}`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Compact header with candidate info */}
        <CandidateHeader />

        {/* Scrollable content area */}
        <div style={{ flex: 1, padding: 32, overflowY: 'hidden', display: 'flex', flexDirection: 'column', gap: 28 }}>
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
        height: 100,
        borderBottom: `2px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        backgroundColor: '#fafafa',
        opacity: entrance,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: colors.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.background,
          fontFamily: fonts.heading,
          fontWeight: 700,
          fontSize: 20,
          marginRight: 16,
        }}
      >
        AM
      </div>

      {/* Name and role */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h1 style={{ fontFamily: fonts.heading, fontSize: 26, fontWeight: 700, margin: 0 }}>
            Alex Mitchell
          </h1>
          {/* Strength badge */}
          <div
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              background: 'linear-gradient(to right, #fbbf24, #f59e0b)',
              fontFamily: fonts.heading,
              fontSize: 14,
              fontWeight: 700,
              color: '#78350f',
            }}
          >
            Exceptional
          </div>
        </div>
        <p style={{ fontFamily: fonts.heading, fontSize: 15, color: '#64748b', marginTop: 4 }}>
          Senior Frontend Engineer Simulation • Completed Jan 15, 2025
        </p>
      </div>

      {/* Compare button */}
      <div
        style={{
          padding: '12px 24px',
          borderRadius: 12,
          border: `2px solid ${colors.border}`,
          fontFamily: fonts.heading,
          fontSize: 15,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          backgroundColor: 'white',
        }}
      >
        <span>👥</span>
        Compare Candidates
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
        borderRadius: 20,
        border: '2px solid #bbf7d0',
        padding: 28,
        opacity: entrance,
        transform: `translateY(${(1 - entrance) * 20}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: 32,
      }}
    >
      {/* Score */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span
          style={{
            fontFamily: fonts.heading,
            fontSize: 72,
            fontWeight: 700,
            color: '#16a34a',
          }}
        >
          {displayScore.toFixed(1)}
        </span>
        <span style={{ fontFamily: fonts.heading, fontSize: 28, color: '#86efac', fontWeight: 600 }}>
          / 5.0
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 2, height: 80, backgroundColor: '#bbf7d0' }} />

      {/* Description */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <p style={{ fontFamily: fonts.heading, fontSize: 18, fontWeight: 600, color: '#166534', margin: 0 }}>
            Overall Score
          </p>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              backgroundColor: '#dcfce7',
              fontFamily: fonts.heading,
              fontSize: 14,
              fontWeight: 600,
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            📈 Top 8%
          </div>
        </div>
        <p
          style={{
            fontFamily: fonts.heading,
            fontSize: 16,
            color: '#15803d',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Exceptional communication and problem-solving. Delivered clean, well-documented code ahead of schedule.
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
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        Dimension Scores
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
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
        borderRadius: 16,
        border: `2px solid ${colors.border}`,
        padding: 18,
        opacity: entrance,
        transform: `translateY(${(1 - entrance) * 20}px)`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: fonts.heading, fontSize: 16, fontWeight: 600 }}>
          {dimension.dimension}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontFamily: fonts.heading,
              fontSize: 24,
              fontWeight: 700,
              color: getScoreColor(dimension.score),
            }}
          >
            {dimension.score.toFixed(1)}
          </span>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              backgroundColor: getBgColor(dimension.percentile),
              fontFamily: fonts.heading,
              fontSize: 12,
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
          height: 8,
          backgroundColor: '#f1f5f9',
          borderRadius: 4,
          marginBottom: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${barWidth}%`,
            backgroundColor: getScoreColor(dimension.score),
            borderRadius: 4,
          }}
        />
      </div>

      <p style={{ fontFamily: fonts.heading, fontSize: 14, color: '#64748b', lineHeight: 1.5, margin: 0 }}>
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
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        Hiring Signals
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        {/* Green Flags */}
        <div
          style={{
            backgroundColor: '#f0fdf4',
            borderRadius: 16,
            border: '2px solid #bbf7d0',
            padding: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontFamily: fonts.heading,
              fontSize: 17,
              fontWeight: 700,
              color: '#166534',
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 20 }}>✓</span>
            Green Flags ({greenFlags.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {greenFlags.map((flag, i) => (
              <GreenFlagItem key={i} flag={flag} index={i} />
            ))}
          </div>
        </div>

        {/* Red Flags */}
        <div
          style={{
            backgroundColor: '#fef2f2',
            borderRadius: 16,
            border: '2px solid #fecaca',
            padding: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontFamily: fonts.heading,
              fontSize: 17,
              fontWeight: 700,
              color: '#991b1b',
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 20 }}>⚠</span>
            Red Flags ({redFlags.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
        gap: 10,
        opacity: entrance,
        transform: `translateX(${(1 - entrance) * 20}px)`,
      }}
    >
      <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 16 }}>↑</span>
      <span style={{ fontFamily: fonts.heading, fontSize: 14, color: '#166534', lineHeight: 1.5 }}>
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
        gap: 10,
        opacity: entrance,
        transform: `translateX(${(1 - entrance) * 20}px)`,
      }}
    >
      <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 16 }}>↓</span>
      <span style={{ fontFamily: fonts.heading, fontSize: 14, color: '#991b1b', lineHeight: 1.5 }}>
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
        borderRadius: 16,
        border: '3px solid #22c55e',
        padding: 20,
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
          gap: 10,
          padding: '14px 28px',
          backgroundColor: '#22c55e',
          borderRadius: 14,
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 28 }}>✓</span>
        <span
          style={{
            fontFamily: fonts.heading,
            fontSize: 22,
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
          fontSize: 14,
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
