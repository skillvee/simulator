// remotion/src/scenes/HowItWorksStep3.tsx
// "How It Works" Step 3: Review Standardized Evidence
// Shows the recruiter results dashboard with scorecards and hiring signals

import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { colors, animations } from '../lib/design-system';
import { fonts } from '../lib/fonts';

// Dimension scores matching actual platform
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

export const HowItWorksStep3: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#f8fafc' }}>
      <ResultsDashboard />
    </AbsoluteFill>
  );
};

const ResultsDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Interface fade in
  const uiOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: uiOpacity, padding: 40 }}>
      {/* Browser container */}
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: colors.background,
          borderRadius: 16,
          border: `1px solid ${colors.border}`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Browser header */}
        <div
          style={{
            height: 48,
            backgroundColor: '#f1f5f9',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#22c55e' }} />
          </div>
          <div
            style={{
              flex: 1,
              marginLeft: 16,
              backgroundColor: colors.background,
              borderRadius: 6,
              padding: '6px 16px',
              fontFamily: fonts.mono,
              fontSize: 13,
              color: '#64748b',
            }}
          >
            skillvee.com/recruiter/candidates/alex-mitchell
          </div>
        </div>

        {/* Dashboard content */}
        <div style={{ flex: 1, padding: 32, overflowY: 'hidden' }}>
          {/* Header */}
          <DashboardHeader />

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

const DashboardHeader: React.FC = () => {
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
        marginBottom: 24,
        opacity: entrance,
        transform: `translateY(${(1 - entrance) * 20}px)`,
      }}
    >
      {/* Back link */}
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: 13,
          color: '#64748b',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span>←</span>
        Back to Candidates
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontFamily: fonts.heading, fontSize: 28, fontWeight: 700, margin: 0 }}>
              Alex Mitchell
            </h1>
            {/* Strength badge */}
            <div
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                background: 'linear-gradient(to right, #fbbf24, #f59e0b)',
                fontFamily: fonts.heading,
                fontSize: 13,
                fontWeight: 600,
                color: '#78350f',
              }}
            >
              Exceptional
            </div>
          </div>
          <p style={{ fontFamily: fonts.heading, fontSize: 14, color: '#64748b', marginTop: 4 }}>
            Senior Frontend Engineer Simulation
          </p>
          <p style={{ fontFamily: fonts.heading, fontSize: 13, color: '#94a3b8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📅</span>
            Completed January 15, 2025
          </p>
        </div>

        {/* Compare button */}
        <div
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            fontFamily: fonts.heading,
            fontSize: 14,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>👥</span>
          Compare with others
        </div>
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
  const displayScore = interpolate(frame, [15, 45], [0, 4.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        backgroundColor: colors.background,
        borderRadius: 16,
        border: `1px solid ${colors.border}`,
        padding: 24,
        marginBottom: 24,
        opacity: entrance,
        transform: `translateY(${(1 - entrance) * 20}px)`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontFamily: fonts.heading, fontSize: 14, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>
            Overall Score
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span
              style={{
                fontFamily: fonts.heading,
                fontSize: 48,
                fontWeight: 700,
                color: '#16a34a',
              }}
            >
              {displayScore.toFixed(1)}
            </span>
            <span style={{ fontFamily: fonts.heading, fontSize: 20, color: '#94a3b8' }}>
              / 5.0
            </span>
          </div>
        </div>

        {/* Percentile badge */}
        <div
          style={{
            padding: '8px 16px',
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
          <span>📈</span>
          Top 8%
        </div>
      </div>

      <p
        style={{
          fontFamily: fonts.heading,
          fontSize: 14,
          color: '#64748b',
          marginTop: 16,
          paddingTop: 16,
          borderTop: `1px solid ${colors.border}`,
          lineHeight: 1.6,
        }}
      >
        Alex demonstrated exceptional communication and problem-solving skills throughout the simulation.
        Proactively clarified requirements and delivered clean, well-documented code ahead of schedule.
      </p>
    </div>
  );
};

const DimensionScoresGrid: React.FC = () => {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2
        style={{
          fontFamily: fonts.heading,
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        Dimension Scores
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
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
    frame: frame - 30 - index * 5,
    fps,
    config: animations.snappy,
  });

  // Animated score bar
  const barWidth = interpolate(
    frame,
    [40 + index * 5, 70 + index * 5],
    [0, (dimension.score / 5) * 100],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return '#16a34a';
    if (score >= 3.5) return '#2563eb';
    if (score >= 2.5) return '#57534e';
    return '#dc2626';
  };

  return (
    <div
      style={{
        backgroundColor: colors.background,
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        padding: 16,
        opacity: entrance,
        transform: `translateY(${(1 - entrance) * 20}px)`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: fonts.heading, fontSize: 15, fontWeight: 500 }}>
          {dimension.dimension}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontFamily: fonts.heading,
              fontSize: 20,
              fontWeight: 700,
              color: getScoreColor(dimension.score),
            }}
          >
            {dimension.score.toFixed(1)}
          </span>
          <div
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              backgroundColor: dimension.percentile >= 90 ? '#dcfce7' : dimension.percentile >= 75 ? '#dbeafe' : '#f5f5f4',
              fontFamily: fonts.heading,
              fontSize: 11,
              fontWeight: 500,
              color: dimension.percentile >= 90 ? '#166534' : dimension.percentile >= 75 ? '#1e40af' : '#57534e',
            }}
          >
            Top {100 - dimension.percentile}%
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div
        style={{
          height: 6,
          backgroundColor: '#f1f5f9',
          borderRadius: 3,
          marginBottom: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${barWidth}%`,
            backgroundColor: getScoreColor(dimension.score),
            borderRadius: 3,
            transition: 'width 0.3s',
          }}
        />
      </div>

      <p style={{ fontFamily: fonts.heading, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
        {dimension.observableBehaviors}
      </p>
    </div>
  );
};

const HiringSignals: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - 80,
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
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        Hiring Signals
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {/* Green Flags */}
        <div
          style={{
            backgroundColor: '#f0fdf4',
            borderRadius: 12,
            border: '1px solid #bbf7d0',
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: fonts.heading,
              fontSize: 15,
              fontWeight: 600,
              color: '#166534',
              marginBottom: 16,
            }}
          >
            <span>✓</span>
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
            borderRadius: 12,
            border: '1px solid #fecaca',
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: fonts.heading,
              fontSize: 15,
              fontWeight: 600,
              color: '#991b1b',
              marginBottom: 16,
            }}
          >
            <span>⚠</span>
            Red Flags ({redFlags.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {redFlags.map((flag, i) => (
              <RedFlagItem key={i} flag={flag} index={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Hire Recommendation */}
      <HireRecommendation />
    </div>
  );
};

const GreenFlagItem: React.FC<{ flag: string; index: number }> = ({ flag, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - 90 - index * 5,
    fps,
    config: animations.snappy,
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        opacity: entrance,
        transform: `translateX(${(1 - entrance) * 20}px)`,
      }}
    >
      <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 14 }}>↑</span>
      <span style={{ fontFamily: fonts.heading, fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
        {flag}
      </span>
    </div>
  );
};

const RedFlagItem: React.FC<{ flag: string; index: number }> = ({ flag, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - 90 - index * 5,
    fps,
    config: animations.snappy,
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        opacity: entrance,
        transform: `translateX(${(1 - entrance) * 20}px)`,
      }}
    >
      <span style={{ color: '#dc2626', fontWeight: 600, fontSize: 14 }}>↓</span>
      <span style={{ fontFamily: fonts.heading, fontSize: 13, color: '#991b1b', lineHeight: 1.5 }}>
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
  const pulse = 1 + 0.02 * Math.sin((frame - 110) * 0.1);

  return (
    <div
      style={{
        marginTop: 24,
        backgroundColor: '#f0fdf4',
        borderRadius: 16,
        border: '2px solid #22c55e',
        padding: 24,
        textAlign: 'center',
        opacity: entrance,
        transform: `scale(${entrance * pulse})`,
        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 32px',
          backgroundColor: '#22c55e',
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 28 }}>✓</span>
        <span
          style={{
            fontFamily: fonts.heading,
            fontSize: 24,
            fontWeight: 700,
            color: colors.background,
          }}
        >
          RECOMMEND HIRE
        </span>
      </div>
      <p
        style={{
          fontFamily: fonts.heading,
          fontSize: 15,
          color: '#166534',
          lineHeight: 1.6,
          maxWidth: 600,
          margin: '0 auto',
        }}
      >
        Alex is an exceptional candidate who demonstrated strong technical skills, excellent communication,
        and effective use of AI tools. Strong recommendation to proceed with final interviews.
      </p>
    </div>
  );
};
