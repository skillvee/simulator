// remotion/src/scenes/HeroVideo.tsx
// 30-second hero video loop for homepage-v8
// Pure product demo - no text overlays (hero already has the messaging)

import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { colors, animations } from '../lib/design-system';
import { fonts } from '../lib/fonts';

// Scene timings in seconds (30 total, seamless loop)
const VOICE_CALL_DURATION = 8; // 0-8s: Voice call with manager
const CHAT_DURATION = 8; // 8-16s: Chat with PM
const CODING_DURATION = 8; // 16-24s: Coding
const SCORECARD_DURATION = 6; // 24-30s: Scorecard (fades to loop)

export const HeroVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617' }}>
      {/* Voice call (0-8s) */}
      <Sequence durationInFrames={VOICE_CALL_DURATION * fps}>
        <BrowserChrome phase="voice">
          <VoiceCallPhase />
        </BrowserChrome>
      </Sequence>

      {/* Chat with PM (8-16s) */}
      <Sequence from={VOICE_CALL_DURATION * fps} durationInFrames={CHAT_DURATION * fps}>
        <BrowserChrome phase="chat">
          <ChatPhase />
        </BrowserChrome>
      </Sequence>

      {/* Coding (16-24s) */}
      <Sequence from={(VOICE_CALL_DURATION + CHAT_DURATION) * fps} durationInFrames={CODING_DURATION * fps}>
        <BrowserChrome phase="code">
          <CodingPhase />
        </BrowserChrome>
      </Sequence>

      {/* Scorecard (24-30s) - fades out for seamless loop */}
      <Sequence from={(VOICE_CALL_DURATION + CHAT_DURATION + CODING_DURATION) * fps} durationInFrames={SCORECARD_DURATION * fps}>
        <ScorecardScene />
      </Sequence>
    </AbsoluteFill>
  );
};

// Browser chrome wrapper
const BrowserChrome: React.FC<{ children: React.ReactNode; phase: string }> = ({ children, phase }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in at start of each phase
  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
  // Fade out at end
  const fadeOut = interpolate(frame, [fps * 7, fps * 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const scale = spring({ frame, fps, config: animations.snappy });
  const scaleValue = interpolate(scale, [0, 1], [0.95, 1]);

  return (
    <AbsoluteFill
      style={{
        padding: 40,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeIn * fadeOut,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1600,
          height: '100%',
          backgroundColor: '#0f172a',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.15)',
          overflow: 'hidden',
          transform: `scale(${scaleValue})`,
          boxShadow: '0 25px 80px -12px rgba(0,0,0,0.7), 0 0 60px rgba(35, 124, 241, 0.1)',
        }}
      >
        {/* Browser header */}
        <div
          style={{
            height: 52,
            backgroundColor: '#1e293b',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#eab308' }} />
            <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#22c55e' }} />
          </div>
          <div
            style={{
              flex: 1,
              backgroundColor: '#0f172a',
              borderRadius: 8,
              padding: '10px 20px',
              marginLeft: 16,
            }}
          >
            <span style={{ fontFamily: fonts.mono, fontSize: 15, color: '#64748b' }}>
              app.skillvee.com/simulation
            </span>
          </div>
          {/* Recording indicator with pulse */}
          <RecordingIndicator frame={frame} />
        </div>

        {/* Content area */}
        <div style={{ flex: 1, height: 'calc(100% - 52px)', position: 'relative' }}>
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Animated recording indicator
const RecordingIndicator: React.FC<{ frame: number }> = ({ frame }) => {
  const pulse = Math.sin(frame * 0.15) * 0.3 + 0.7;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        padding: '8px 16px',
        borderRadius: 24,
        border: '1px solid rgba(239, 68, 68, 0.3)',
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: '#ef4444',
          opacity: pulse,
          boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
        }}
      />
      <span style={{ fontFamily: fonts.mono, fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
        REC
      </span>
    </div>
  );
};

// Voice call with manager - more dynamic
const VoiceCallPhase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Waveform animation - more organic movement
  const waveTime = frame * 0.12;

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at center, #1e293b 0%, #0f172a 70%)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {/* Avatar with glow */}
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${colors.accent} 0%, #1e40af 100%)`,
            margin: '0 auto 28px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: `0 0 60px ${colors.accent}50, 0 0 100px ${colors.accent}20`,
            position: 'relative',
          }}
        >
          {/* Pulse ring */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: `2px solid ${colors.accent}`,
              opacity: 0.3 + Math.sin(frame * 0.1) * 0.2,
              transform: `scale(${1.1 + Math.sin(frame * 0.1) * 0.1})`,
            }}
          />
          <span style={{ fontSize: 56, color: '#fff', fontFamily: fonts.heading, fontWeight: 700 }}>
            SM
          </span>
        </div>

        {/* Name */}
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 36,
            fontWeight: 700,
            color: '#fff',
            marginBottom: 8,
          }}
        >
          Sarah Mitchell
        </div>
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 20,
            color: '#64748b',
            marginBottom: 40,
          }}
        >
          Engineering Manager
        </div>

        {/* Waveform - more bars, smoother animation */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 3, height: 80 }}>
          {Array.from({ length: 32 }).map((_, i) => {
            const offset = i * 0.3;
            const height = Math.abs(Math.sin(waveTime + offset) * Math.cos(waveTime * 0.5 + offset)) * 50 + 15;
            return (
              <div
                key={i}
                style={{
                  width: 4,
                  height,
                  backgroundColor: colors.accent,
                  borderRadius: 2,
                  opacity: 0.4 + Math.abs(Math.sin(waveTime + i * 0.2)) * 0.4,
                }}
              />
            );
          })}
        </div>

        {/* Call duration */}
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 16,
            color: '#22c55e',
            marginTop: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
            }}
          />
          {formatTime(Math.floor(frame / fps))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Format seconds to mm:ss
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Chat with PM - animated messages
const ChatPhase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Messages appear over time with typing indicators
  const messages = [
    { from: 'user', text: "Hi Alex! Sarah mentioned you have context on the dashboard requirements?", delay: 0.5 },
    { from: 'pm', text: "Hey! Yes - the key priorities are:", delay: 2 },
    { from: 'pm', text: "1. Real-time data updates (WebSocket)\n2. Filter by date range\n3. Export to CSV", delay: 3.5 },
    { from: 'user', text: "Got it. Any specific libraries we should use for the real-time updates?", delay: 5.5 },
    { from: 'pm', text: "We're using SWR already - just add the subscription option. Check useRealTimeData hook.", delay: 7 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f172a' }}>
      <div style={{ display: 'flex', height: '100%' }}>
        {/* Sidebar */}
        <div
          style={{
            width: 300,
            borderRight: '1px solid rgba(255,255,255,0.1)',
            padding: 20,
            backgroundColor: '#0c1222',
          }}
        >
          <div style={{ fontFamily: fonts.heading, fontSize: 12, color: '#64748b', marginBottom: 20, letterSpacing: 1 }}>
            TEAM MEMBERS
          </div>
          {[
            { name: 'Sarah Mitchell', role: 'Eng Manager', active: false, status: 'away' },
            { name: 'Alex Chen', role: 'Product Manager', active: true, status: 'online' },
            { name: 'Jordan Lee', role: 'Senior Engineer', active: false, status: 'online' },
          ].map((person, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: 14,
                borderRadius: 12,
                backgroundColor: person.active ? 'rgba(35, 124, 241, 0.15)' : 'transparent',
                marginBottom: 8,
                border: person.active ? '1px solid rgba(35, 124, 241, 0.3)' : '1px solid transparent',
              }}
            >
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: person.active ? colors.accent : '#334155',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 16, color: '#fff', fontFamily: fonts.heading, fontWeight: 700 }}>
                    {person.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                {/* Status dot */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: person.status === 'online' ? '#22c55e' : '#eab308',
                    border: '2px solid #0c1222',
                  }}
                />
              </div>
              <div>
                <div style={{ fontFamily: fonts.heading, fontSize: 15, fontWeight: 600, color: '#fff' }}>
                  {person.name}
                </div>
                <div style={{ fontFamily: fonts.heading, fontSize: 13, color: '#64748b' }}>
                  {person.role}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Chat header */}
          <div
            style={{
              height: 72,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 28px',
              backgroundColor: '#0f172a',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: colors.accent,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 14,
              }}
            >
              <span style={{ fontSize: 14, color: '#fff', fontFamily: fonts.heading, fontWeight: 700 }}>AC</span>
            </div>
            <div>
              <div style={{ fontFamily: fonts.heading, fontSize: 18, fontWeight: 600, color: '#fff' }}>
                Alex Chen
              </div>
              <div style={{ fontFamily: fonts.heading, fontSize: 13, color: '#22c55e' }}>
                Online
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: 28, overflow: 'hidden' }}>
            {messages.map((msg, i) => {
              const msgFrame = frame - msg.delay * fps;
              const isVisible = msgFrame > 0;
              const messageOpacity = interpolate(
                msgFrame,
                [0, fps * 0.3],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );
              const messageY = interpolate(
                msgFrame,
                [0, fps * 0.3],
                [15, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );

              if (!isVisible) return null;

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: 16,
                    opacity: messageOpacity,
                    transform: `translateY(${messageY}px)`,
                  }}
                >
                  <div
                    style={{
                      maxWidth: 480,
                      padding: '14px 18px',
                      borderRadius: 16,
                      backgroundColor: msg.from === 'user' ? colors.accent : '#1e293b',
                      fontFamily: fonts.heading,
                      fontSize: 16,
                      color: '#fff',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      boxShadow: msg.from === 'user'
                        ? '0 4px 12px rgba(35, 124, 241, 0.3)'
                        : '0 4px 12px rgba(0,0,0,0.2)',
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Coding with screen recording - enhanced
const CodingPhase: React.FC = () => {
  const frame = useCurrentFrame();

  // Cursor blink
  const cursorOpacity = Math.floor(frame / 12) % 2 === 0 ? 1 : 0;

  // Typing effect - faster
  const typedChars = Math.floor(frame / 2.5);
  const codeLines = [
    "export function Dashboard() {",
    "  const { data, isLoading, error } = useRealTimeData({",
    "    subscribe: true,",
    "    refreshInterval: 1000,",
    "  });",
    "",
    "  const [filters, setFilters] = useState<Filters>({});",
    "  const filteredData = useMemo(",
    "    () => applyFilters(data, filters),",
    "    [data, filters]",
    "  );",
    "",
    "  if (isLoading) return <LoadingSpinner />;",
    "  if (error) return <ErrorState error={error} />;",
    "",
    "  return (",
    "    <div className=\"dashboard-container\">",
    "      <DateRangeFilter onChange={setFilters} />",
    "      <DataGrid data={filteredData} />",
    "      <ExportButton data={filteredData} />",
    "    </div>",
    "  );",
    "}",
  ];

  const fullCode = codeLines.join('\n');
  const displayedCode = fullCode.slice(0, typedChars);

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f172a' }}>
      <div style={{ display: 'flex', height: '100%' }}>
        {/* File tree */}
        <div
          style={{
            width: 280,
            borderRight: '1px solid rgba(255,255,255,0.1)',
            padding: 20,
            backgroundColor: '#0c1222',
          }}
        >
          <div style={{ fontFamily: fonts.mono, fontSize: 12, color: '#64748b', marginBottom: 20, letterSpacing: 1 }}>
            EXPLORER
          </div>
          {[
            { name: 'src', indent: 0, isFolder: true, expanded: true },
            { name: 'components', indent: 1, isFolder: true, expanded: true },
            { name: 'Dashboard.tsx', indent: 2, isFolder: false, active: true },
            { name: 'DataGrid.tsx', indent: 2, isFolder: false },
            { name: 'DateRangeFilter.tsx', indent: 2, isFolder: false },
            { name: 'ExportButton.tsx', indent: 2, isFolder: false },
            { name: 'hooks', indent: 1, isFolder: true, expanded: true },
            { name: 'useRealTimeData.ts', indent: 2, isFolder: false },
            { name: 'utils', indent: 1, isFolder: true },
          ].map((file, i) => (
            <div
              key={i}
              style={{
                paddingLeft: file.indent * 18 + 10,
                paddingTop: 7,
                paddingBottom: 7,
                paddingRight: 10,
                fontFamily: fonts.mono,
                fontSize: 14,
                color: file.active ? '#fff' : '#94a3b8',
                backgroundColor: file.active ? 'rgba(35, 124, 241, 0.15)' : 'transparent',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                borderLeft: file.active ? `2px solid ${colors.accent}` : '2px solid transparent',
              }}
            >
              <span style={{ color: file.isFolder ? '#eab308' : file.active ? colors.accent : '#64748b', fontSize: 14 }}>
                {file.isFolder ? (file.expanded ? '📂' : '📁') : '📄'}
              </span>
              {file.name}
            </div>
          ))}
        </div>

        {/* Code editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Tab bar */}
          <div
            style={{
              display: 'flex',
              gap: 2,
              padding: '12px 20px 0',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: '#0c1222',
            }}
          >
            <div
              style={{
                padding: '10px 18px',
                backgroundColor: '#0f172a',
                borderTop: `2px solid ${colors.accent}`,
                fontFamily: fonts.mono,
                fontSize: 14,
                color: '#fff',
                borderRadius: '6px 6px 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ color: '#3b82f6' }}>⚛</span>
              Dashboard.tsx
            </div>
          </div>

          {/* Code content */}
          <div style={{ flex: 1, padding: '20px 28px', overflow: 'hidden' }}>
            <pre
              style={{
                fontFamily: fonts.mono,
                fontSize: 15,
                lineHeight: 1.7,
                color: '#e2e8f0',
                margin: 0,
              }}
            >
              {displayedCode.split('\n').map((line, i) => (
                <div key={i} style={{ display: 'flex' }}>
                  <span style={{ color: '#475569', width: 40, flexShrink: 0, textAlign: 'right', marginRight: 20 }}>
                    {i + 1}
                  </span>
                  <span style={{ flex: 1 }}>
                    {highlightSyntax(line)}
                    {i === displayedCode.split('\n').length - 1 && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: 2,
                          height: 18,
                          backgroundColor: '#fff',
                          marginLeft: 1,
                          opacity: cursorOpacity,
                          verticalAlign: 'middle',
                        }}
                      />
                    )}
                  </span>
                </div>
              ))}
            </pre>
          </div>

          {/* AI Copilot indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              right: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              padding: '10px 18px',
              borderRadius: 10,
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}
          >
            <span style={{ fontSize: 16 }}>✨</span>
            <span style={{ fontFamily: fonts.mono, fontSize: 13, color: '#a78bfa', fontWeight: 500 }}>
              AI Copilot Active
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Enhanced syntax highlighting
const highlightSyntax = (line: string): React.ReactNode => {
  // Keywords
  if (/^\s*(export|function|const|return|if|import|from)\b/.test(line)) {
    return colorize(line);
  }
  // JSX
  if (line.includes('<') && line.includes('>')) {
    return colorize(line);
  }
  return colorize(line);
};

const colorize = (line: string): React.ReactNode => {
  // Simple colorization
  const parts: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  // Keywords in purple
  const keywords = ['export', 'function', 'const', 'return', 'if', 'import', 'from'];
  for (const kw of keywords) {
    if (remaining.includes(kw)) {
      const idx = remaining.indexOf(kw);
      if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
      parts.push(<span key={key++} style={{ color: '#c084fc' }}>{kw}</span>);
      remaining = remaining.slice(idx + kw.length);
    }
  }

  // Strings in green
  const stringMatch = remaining.match(/(["'`]).*?\1/);
  if (stringMatch) {
    const idx = remaining.indexOf(stringMatch[0]);
    if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
    parts.push(<span key={key++} style={{ color: '#22c55e' }}>{stringMatch[0]}</span>);
    remaining = remaining.slice(idx + stringMatch[0].length);
  }

  // JSX tags in cyan
  if (remaining.includes('<')) {
    return <span style={{ color: '#22d3ee' }}>{line}</span>;
  }

  if (parts.length > 0) {
    parts.push(<span key={key++}>{remaining}</span>);
    return <>{parts}</>;
  }

  return line;
};

// Scorecard Scene - simplified, loops back smoothly
const ScorecardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const skills = [
    { label: 'Communication', score: 92 },
    { label: 'Problem Solving', score: 88 },
    { label: 'AI Leverage', score: 85 },
    { label: 'Collaboration', score: 94 },
    { label: 'Code Quality', score: 87 },
  ];

  // Fade in and out for seamless loop
  const fadeIn = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [fps * 5, fps * 6], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const containerScale = spring({ frame, fps, config: animations.snappy });

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at center, #1e293b 0%, #020617 70%)',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeIn * fadeOut,
      }}
    >
      <div
        style={{
          transform: `scale(${interpolate(containerScale, [0, 1], [0.9, 1])})`,
          opacity: interpolate(containerScale, [0, 1], [0, 1]),
        }}
      >
        {/* Scorecard */}
        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 24,
            padding: 48,
            minWidth: 600,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 25px 80px -12px rgba(0,0,0,0.6), 0 0 40px rgba(35, 124, 241, 0.1)',
          }}
        >
          {/* Candidate header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              marginBottom: 36,
              paddingBottom: 24,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${colors.accent} 0%, #1e40af 100%)`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: `0 0 30px ${colors.accent}40`,
              }}
            >
              <span style={{ fontSize: 24, color: '#fff', fontFamily: fonts.heading, fontWeight: 700 }}>
                JD
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: '#fff' }}>
                Jane Doe
              </div>
              <div style={{ fontFamily: fonts.heading, fontSize: 15, color: '#64748b' }}>
                Senior Frontend Engineer
              </div>
            </div>
            <div
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                padding: '10px 24px',
                borderRadius: 24,
                border: '1px solid rgba(34, 197, 94, 0.3)',
              }}
            >
              <span style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: '#22c55e' }}>
                89/100
              </span>
            </div>
          </div>

          {/* Skills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {skills.map((skill, i) => {
              const delay = i * 6;
              const progress = spring({
                frame: frame - delay,
                fps,
                config: { damping: 20, stiffness: 80 },
              });
              const barWidth = interpolate(Math.max(0, progress), [0, 1], [0, skill.score]);

              return (
                <div key={skill.label}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontFamily: fonts.heading, fontSize: 15, color: '#94a3b8' }}>
                      {skill.label}
                    </span>
                    <span style={{ fontFamily: fonts.mono, fontSize: 15, color: '#22c55e', fontWeight: 700 }}>
                      {Math.round(barWidth)}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      backgroundColor: '#334155',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${barWidth}%`,
                        background: 'linear-gradient(90deg, #22c55e 0%, #10b981 100%)',
                        borderRadius: 4,
                        boxShadow: '0 0 10px rgba(34, 197, 94, 0.4)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
