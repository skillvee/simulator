// remotion/src/scenes/HowItWorksStep1.tsx
// "How It Works" Step 1: Create Your Simulation
// Shows the recruiter chat-based simulation builder with live preview panel

import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { colors, animations } from '../lib/design-system';
import { fonts } from '../lib/fonts';

// Conversation data simulating recruiter building a simulation
const conversationMessages = [
  {
    role: 'model',
    text: "Hi! I'm here to help you create a work simulation. What role are you hiring for?",
    delay: 0,
  },
  {
    role: 'user',
    text: "Senior Frontend Engineer at TechCorp. We use React, TypeScript, and Next.js.",
    delay: 1.5,
  },
  {
    role: 'model',
    text: "Got it! I'll create a realistic frontend task. What's the main challenge this role will face?",
    delay: 3.5,
  },
  {
    role: 'user',
    text: "They'll need to build a dashboard component that integrates with our analytics API.",
    delay: 5.5,
  },
  {
    role: 'model',
    text: "Perfect. I'm setting up the simulation now with a PM and Tech Lead for them to collaborate with...",
    delay: 7.5,
  },
];

// Preview data that builds up as conversation progresses
const previewStages = [
  { frame: 0, data: null },
  {
    frame: 90, // After user's first message
    data: {
      name: 'Senior Frontend Engineer',
      company: 'TechCorp',
      techStack: ['React', 'TypeScript', 'Next.js'],
    },
  },
  {
    frame: 195, // After task description
    data: {
      name: 'Senior Frontend Engineer',
      company: 'TechCorp',
      techStack: ['React', 'TypeScript', 'Next.js'],
      task: 'Build dashboard component with analytics API integration',
    },
  },
  {
    frame: 270, // After coworkers mentioned
    data: {
      name: 'Senior Frontend Engineer',
      company: 'TechCorp',
      techStack: ['React', 'TypeScript', 'Next.js'],
      task: 'Build dashboard component with analytics API integration',
      coworkers: [
        { name: 'Sarah Chen', role: 'Product Manager', initials: 'SC' },
        { name: 'Marcus Johnson', role: 'Tech Lead', initials: 'MJ' },
      ],
    },
  },
];

export const HowItWorksStep1: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#f8fafc' }}>
      {/* Main simulation builder interface */}
      <SimulationBuilderInterface />
    </AbsoluteFill>
  );
};

const SimulationBuilderInterface: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Interface fade in
  const uiOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Get current preview data based on frame
  const getCurrentPreview = () => {
    for (let i = previewStages.length - 1; i >= 0; i--) {
      if (frame >= previewStages[i].frame) {
        return previewStages[i].data;
      }
    }
    return null;
  };

  const previewData = getCurrentPreview();

  return (
    <AbsoluteFill
      style={{
        opacity: uiOpacity,
        padding: 40,
      }}
    >
      {/* Browser-like container */}
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
            skillvee.com/recruiter/simulations/new
          </div>
        </div>

        {/* Main content area - split layout */}
        <div style={{ flex: 1, display: 'flex' }}>
          {/* Chat Panel */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              borderRight: `1px solid ${colors.border}`,
            }}
          >
            {/* Chat header */}
            <div
              style={{
                height: 72,
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: colors.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.background,
                  fontFamily: fonts.heading,
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                AI
              </div>
              <div>
                <div style={{ fontFamily: fonts.heading, fontWeight: 600, fontSize: 16 }}>
                  Simulation Builder
                </div>
                <div style={{ fontFamily: fonts.heading, fontSize: 13, color: '#64748b' }}>
                  Chat with AI to create your simulation
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div style={{ flex: 1, padding: 24, overflowY: 'hidden' }}>
              {conversationMessages.map((msg, i) => (
                <ChatMessage
                  key={i}
                  role={msg.role as 'user' | 'model'}
                  text={msg.text}
                  delay={msg.delay * fps}
                />
              ))}
              <TypingIndicator />
            </div>

            {/* Input area */}
            <div
              style={{
                height: 72,
                borderTop: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px',
                gap: 12,
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 44,
                  backgroundColor: '#f8fafc',
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  fontFamily: fonts.heading,
                  fontSize: 14,
                  color: '#94a3b8',
                }}
              >
                Describe your simulation...
              </div>
              <div
                style={{
                  height: 44,
                  padding: '0 20px',
                  backgroundColor: colors.accent,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: fonts.heading,
                  fontWeight: 600,
                  fontSize: 14,
                  color: colors.background,
                }}
              >
                Send
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div
            style={{
              width: 380,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#fafafa',
            }}
          >
            {/* Preview header */}
            <div
              style={{
                height: 72,
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '0 24px',
              }}
            >
              <div style={{ fontFamily: fonts.heading, fontWeight: 600, fontSize: 16 }}>
                Preview
              </div>
              <div style={{ fontFamily: fonts.heading, fontSize: 13, color: '#64748b' }}>
                Simulation data collected so far
              </div>
            </div>

            {/* Preview content */}
            <div style={{ flex: 1, padding: 20, overflowY: 'hidden' }}>
              <PreviewPanel data={previewData} />
            </div>

            {/* Save button */}
            <div
              style={{
                height: 72,
                borderTop: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 20px',
              }}
            >
              <SaveButton isReady={previewData?.coworkers !== undefined} />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

interface ChatMessageProps {
  role: 'user' | 'model';
  text: string;
  delay: number;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ role, text, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: animations.snappy,
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateY = interpolate(entrance, [0, 1], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (frame < delay) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        marginBottom: 20,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          backgroundColor: role === 'user' ? '#1e293b' : colors.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.background,
          fontFamily: fonts.heading,
          fontWeight: 700,
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {role === 'user' ? 'You' : 'AI'}
      </div>

      {/* Message content */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: fonts.heading,
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 4,
          }}
        >
          {role === 'user' ? 'You' : 'Simulation Builder'}
        </div>
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 15,
            lineHeight: 1.5,
            color: '#334155',
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
};

const TypingIndicator: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Show typing indicator after last message
  const showAfter = 8 * fps;
  if (frame < showAfter) return null;

  const entrance = spring({
    frame: frame - showAfter,
    fps,
    config: animations.snappy,
  });

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        marginBottom: 20,
        opacity: entrance,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          backgroundColor: colors.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.background,
          fontFamily: fonts.heading,
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        AI
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: fonts.heading,
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 4,
          }}
        >
          Simulation Builder
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: colors.accent,
                  opacity: 0.4 + 0.3 * Math.sin((frame + i * 5) * 0.15),
                }}
              />
            ))}
          </div>
          <span style={{ fontFamily: fonts.heading, fontSize: 13, color: '#64748b' }}>
            thinking...
          </span>
        </div>
      </div>
    </div>
  );
};

interface PreviewPanelProps {
  data: {
    name?: string;
    company?: string;
    techStack?: string[];
    task?: string;
    coworkers?: Array<{ name: string; role: string; initials: string }>;
  } | null;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ data }) => {
  if (!data) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center',
          padding: 20,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: `${colors.accent}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 28 }}>📝</span>
        </div>
        <p style={{ fontFamily: fonts.heading, fontSize: 14, color: '#64748b' }}>
          Start chatting to build your simulation
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Basic Info Section */}
      <div>
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 12,
            fontWeight: 600,
            color: '#64748b',
            marginBottom: 12,
          }}
        >
          Basic Info
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PreviewField label="Name" value={data.name} />
          <PreviewField label="Company" value={data.company} />
          {data.task && <PreviewField label="Task" value={data.task} truncate />}
          {data.techStack && (
            <div>
              <span style={{ fontFamily: fonts.heading, fontSize: 13, color: '#64748b' }}>
                Tech Stack:
              </span>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {data.techStack.map((tech, i) => (
                  <TechBadge key={i} tech={tech} delay={i * 3} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Coworkers Section */}
      {data.coworkers && (
        <div>
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 12,
              fontWeight: 600,
              color: '#64748b',
              marginBottom: 12,
            }}
          >
            Coworkers ({data.coworkers.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.coworkers.map((coworker, i) => (
              <CoworkerCard key={i} coworker={coworker} delay={i * 10} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PreviewField: React.FC<{ label: string; value?: string; truncate?: boolean }> = ({
  label,
  value,
  truncate,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  const displayValue =
    truncate && value && value.length > 50 ? value.slice(0, 50) + '...' : value;

  return (
    <div style={{ opacity: entrance }}>
      <span style={{ fontFamily: fonts.heading, fontSize: 13, color: '#64748b' }}>
        {label}:
      </span>
      <span style={{ fontFamily: fonts.heading, fontSize: 13, marginLeft: 6 }}>
        {displayValue || 'Not set'}
      </span>
    </div>
  );
};

const TechBadge: React.FC<{ tech: string; delay: number }> = ({ tech, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: animations.bouncy,
  });

  return (
    <div
      style={{
        padding: '4px 10px',
        backgroundColor: `${colors.accent}15`,
        borderRadius: 6,
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.accent,
        fontWeight: 500,
        transform: `scale(${entrance})`,
      }}
    >
      {tech}
    </div>
  );
};

const CoworkerCard: React.FC<{
  coworker: { name: string; role: string; initials: string };
  delay: number;
}> = ({ coworker, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: animations.snappy,
  });

  return (
    <div
      style={{
        backgroundColor: colors.background,
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        padding: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: entrance,
        transform: `translateX(${(1 - entrance) * 20}px)`,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: `${colors.accent}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: fonts.heading,
          fontSize: 11,
          fontWeight: 600,
          color: colors.accent,
        }}
      >
        {coworker.initials}
      </div>
      <div>
        <div style={{ fontFamily: fonts.heading, fontSize: 13, fontWeight: 600 }}>
          {coworker.name}
        </div>
        <div style={{ fontFamily: fonts.heading, fontSize: 11, color: '#64748b' }}>
          {coworker.role}
        </div>
      </div>
    </div>
  );
};

const SaveButton: React.FC<{ isReady: boolean }> = ({ isReady }) => {
  const frame = useCurrentFrame();

  const pulse = isReady ? 1 + 0.02 * Math.sin(frame * 0.1) : 1;

  return (
    <div
      style={{
        width: '100%',
        height: 44,
        backgroundColor: isReady ? colors.accent : '#e2e8f0',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fonts.heading,
        fontWeight: 600,
        fontSize: 14,
        color: isReady ? colors.background : '#94a3b8',
        transform: `scale(${pulse})`,
        transition: 'background-color 0.3s',
      }}
    >
      {isReady ? '✓ Save Simulation' : 'Save Simulation'}
    </div>
  );
};
