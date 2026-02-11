// remotion/src/scenes/ProductDemoVideo.tsx
// Product page hero: 30-second product demo showing the full Skillvee flow
// Phase 1: Recruiter creates simulation (real recruiter UI: dark blue sidebar + light content)
//   - Paste JD → AI generates → Confirm with challenges
// Phase 2: Candidate chats with AI coworkers (Slack dark UI)
// Phase 3: Candidate works + updates team (Slack dark UI with recording)
// Phase 4: Recruiter reviews results (real recruiter dashboard table + compare view)
// Large text for non-fullscreen viewing

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

// Recruiter UI colors (from sidebar.tsx: #0B1437)
const recruiter = {
  sidebar: '#0B1437',
  sidebarText: 'rgba(255,255,255,0.6)',
  sidebarTextActive: '#fff',
  sidebarHover: 'rgba(255,255,255,0.1)',
  sidebarBorder: 'rgba(255,255,255,0.1)',
  bg: '#ffffff',
  bgMuted: '#f8fafc',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
};

// Candidate Slack theme colors
const slack = {
  bgSidebar: '#1a2033',
  bgMain: '#222d42',
  bgHover: '#2a3650',
  bgSurface: '#303d54',
  border: '#2f3b4e',
  text: '#e8eaed',
  textMuted: '#8b919c',
};

// Scene timings (30 seconds total)
const SETUP_DURATION = 7;
const CANDIDATE_CHAT = 8;
const CODING_WORK = 8;
const RESULTS_REVIEW = 7;

export const ProductDemoVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617' }}>
      <Sequence durationInFrames={SETUP_DURATION * fps}>
        <SetupPhase />
      </Sequence>
      <Sequence from={SETUP_DURATION * fps} durationInFrames={CANDIDATE_CHAT * fps}>
        <CandidateChatPhase />
      </Sequence>
      <Sequence from={(SETUP_DURATION + CANDIDATE_CHAT) * fps} durationInFrames={CODING_WORK * fps}>
        <CodingWorkPhase />
      </Sequence>
      <Sequence from={(SETUP_DURATION + CANDIDATE_CHAT + CODING_WORK) * fps} durationInFrames={RESULTS_REVIEW * fps}>
        <ResultsPhase />
      </Sequence>
    </AbsoluteFill>
  );
};

// Phase label overlay
const PhaseLabel: React.FC<{ step: number; label: string }> = ({ step, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame, fps, config: animations.snappy });

  return (
    <div style={{
      position: 'absolute', top: 36, left: 36,
      display: 'flex', alignItems: 'center', gap: 16,
      opacity: interpolate(entrance, [0, 1], [0, 1]),
      transform: `translateY(${interpolate(entrance, [0, 1], [-20, 0])}px)`,
      zIndex: 10,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        backgroundColor: colors.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: fonts.heading, fontWeight: 700, fontSize: 26, color: '#fff',
        boxShadow: `0 0 30px ${colors.accent}60`,
      }}>{step}</div>
      <span style={{
        fontFamily: fonts.heading, fontSize: 28, fontWeight: 700,
        color: '#fff', textTransform: 'uppercase', letterSpacing: 2,
      }}>{label}</span>
    </div>
  );
};

// ============================
// RECRUITER SIDEBAR (shared between Phase 1 and Phase 4)
// Matches the actual RecruiterSidebar component
// ============================
const RecruiterSidebar: React.FC<{ activeNav?: 'assessments' | 'simulations' }> = ({ activeNav = 'simulations' }) => {
  return (
    <div style={{
      width: 280, backgroundColor: recruiter.sidebar,
      display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${recruiter.sidebarBorder}`,
    }}>
      {/* Logo header */}
      <div style={{
        height: 72, display: 'flex', alignItems: 'center',
        padding: '0 24px', borderBottom: `1px solid ${recruiter.sidebarBorder}`,
      }}>
        <span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 24, color: '#fff', letterSpacing: -0.5 }}>
          ✦ SkillVee
        </span>
      </div>

      {/* Create Simulation button */}
      <div style={{ padding: '20px 16px 12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '12px 20px', borderRadius: 10,
          backgroundColor: '#2563eb',
          fontFamily: fonts.heading, fontWeight: 600, fontSize: 18, color: '#fff',
        }}>
          + Create Simulation
        </div>
      </div>

      {/* Navigation */}
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[
          { label: 'Assessments', key: 'assessments' as const, icon: '📋' },
          { label: 'Simulations', key: 'simulations' as const, icon: '📁' },
        ].map((item) => (
          <div key={item.key} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderRadius: 10,
            backgroundColor: activeNav === item.key ? recruiter.sidebarHover : 'transparent',
            color: activeNav === item.key ? recruiter.sidebarTextActive : recruiter.sidebarText,
            fontFamily: fonts.heading, fontWeight: 500, fontSize: 18,
          }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>

      {/* User footer */}
      <div style={{ marginTop: 'auto', padding: 16, borderTop: `1px solid ${recruiter.sidebarBorder}` }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 12px', borderRadius: 10,
          backgroundColor: 'rgba(255,255,255,0.05)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            backgroundColor: 'rgba(37, 99, 235, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: fonts.heading, fontWeight: 600, fontSize: 16, color: '#93c5fd',
          }}>N</div>
          <div>
            <div style={{ fontFamily: fonts.heading, fontSize: 16, fontWeight: 500, color: '#fff' }}>Test Recruiter</div>
            <div style={{ fontFamily: fonts.heading, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>recruiter@test.com</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================
// Phase 1: Recruiter creates simulation
// Shows: Sidebar + "Create a New Simulation" with JD paste → generating animation
// ============================
const SetupPhase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [fps * 6, fps * 7], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Phase timing: 0-3.5s = JD paste view, 3.5-7s = generating animation
  const showGenerating = frame > 3.5 * fps;

  // Generating animation progress steps
  const generatingSteps = [
    "Extracting key job description insights",
    "Identifying required technical skills",
    "Analyzing seniority expectations",
    "Crafting realistic work challenges",
    "Designing team dynamics and personalities",
    "Assembling your simulation team",
  ];

  const currentStep = Math.min(
    Math.floor((frame - 3.5 * fps) / (fps * 0.5)),
    generatingSteps.length - 1
  );

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      <PhaseLabel step={1} label="Setup" />

      <div style={{
        width: '100%', height: '100%', display: 'flex',
        borderRadius: 20, overflow: 'hidden', margin: 16,
        boxShadow: '0 25px 80px -12px rgba(0,0,0,0.4)',
        marginTop: 80,
      }}>
        <RecruiterSidebar activeNav="simulations" />

        {/* Main content */}
        <div style={{ flex: 1, backgroundColor: recruiter.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
          {!showGenerating ? (
            // JD Paste view
            <JDPasteView frame={frame} fps={fps} />
          ) : (
            // Generating animation
            <GeneratingView frame={frame} fps={fps} steps={generatingSteps} currentStep={currentStep} />
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const JDPasteView: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const entrance = spring({ frame, fps, config: animations.snappy });

  return (
    <div style={{
      maxWidth: 800, width: '100%',
      opacity: interpolate(entrance, [0, 1], [0, 1]),
      transform: `translateY(${interpolate(entrance, [0, 1], [20, 0])}px)`,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontFamily: fonts.heading, fontSize: 38, fontWeight: 700, color: recruiter.text, marginBottom: 12 }}>
          Create a New Simulation
        </div>
        <div style={{ fontFamily: fonts.heading, fontSize: 22, color: recruiter.textMuted }}>
          Start with a job description or answer a few questions
        </div>
      </div>

      {/* JD Card */}
      <div style={{
        backgroundColor: '#fff', borderRadius: 20, padding: 36,
        border: `1px solid ${recruiter.border}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            backgroundColor: `${colors.accent}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }}>📋</div>
          <div>
            <div style={{ fontFamily: fonts.heading, fontSize: 24, fontWeight: 700, color: recruiter.text }}>
              Paste a Job Description
            </div>
            <div style={{ fontFamily: fonts.heading, fontSize: 16, color: recruiter.textMuted }}>
              Recommended — we'll extract everything automatically
            </div>
          </div>
        </div>

        {/* Textarea mock */}
        <div style={{
          minHeight: 200, borderRadius: 14, padding: 24,
          border: `1px solid ${recruiter.border}`,
          backgroundColor: recruiter.bgMuted,
        }}>
          {/* Typing animation */}
          <TypewriterText
            text="Senior Frontend Engineer at Acme Corp. We're looking for an experienced frontend developer to join our team. You'll be working on our React-based dashboard, building new features for our analytics platform..."
            frame={frame}
            fps={fps}
          />
        </div>

        {/* Continue button */}
        {frame > 2.5 * fps && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 28px', borderRadius: 12,
              backgroundColor: colors.accent,
              fontFamily: fonts.heading, fontWeight: 600, fontSize: 20, color: '#fff',
              boxShadow: `0 4px 12px ${colors.accent}40`,
            }}>
              Continue →
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TypewriterText: React.FC<{ text: string; frame: number; fps: number }> = ({ text, frame, fps }) => {
  const charsToShow = Math.min(Math.floor(frame / 1.2), text.length);
  const displayed = text.slice(0, charsToShow);
  const cursorOpacity = Math.floor(frame / 12) % 2 === 0 ? 1 : 0;

  return (
    <span style={{ fontFamily: fonts.heading, fontSize: 20, color: recruiter.textMuted, lineHeight: 1.6 }}>
      {displayed}
      <span style={{
        display: 'inline-block', width: 2, height: 22,
        backgroundColor: colors.accent, marginLeft: 2,
        opacity: charsToShow < text.length ? cursorOpacity : 0,
        verticalAlign: 'middle',
      }} />
    </span>
  );
};

const GeneratingView: React.FC<{ frame: number; fps: number; steps: string[]; currentStep: number }> = ({ frame, fps, steps, currentStep }) => {
  const localFrame = frame - 3.5 * fps;
  const entrance = spring({ frame: localFrame, fps, config: animations.snappy });
  const progressPct = Math.min((localFrame / (fps * 3)) * 100, 100);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      opacity: interpolate(entrance, [0, 1], [0, 1]),
      transform: `translateY(${interpolate(entrance, [0, 1], [20, 0])}px)`,
    }}>
      {/* Sparkle icon */}
      <div style={{
        fontSize: 56, marginBottom: 24, color: colors.accent,
        opacity: 0.6 + 0.4 * Math.sin(localFrame * 0.1),
      }}>✦</div>

      <div style={{ fontFamily: fonts.heading, fontSize: 34, fontWeight: 700, color: recruiter.text, marginBottom: 12 }}>
        Building your simulation
      </div>

      {/* Current step */}
      <div style={{ fontFamily: fonts.heading, fontSize: 20, color: recruiter.textMuted, marginBottom: 32 }}>
        {steps[Math.max(0, currentStep)]}...
      </div>

      {/* Progress bar */}
      <div style={{ width: 320, height: 8, borderRadius: 4, backgroundColor: '#e2e8f0', marginBottom: 32, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4,
          backgroundColor: colors.accent,
          width: `${progressPct}%`,
        }} />
      </div>

      {/* Completed steps with checkmarks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        {steps.slice(0, Math.max(0, currentStep)).map((step, i) => (
          <div key={i} style={{
            fontFamily: fonts.heading, fontSize: 16, color: 'rgba(100, 116, 139, 0.5)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {step} ✓
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================
// Phase 2: Candidate chats with AI coworkers (Slack UI)
// ============================
const CandidateChatPhase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [fps * 7, fps * 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const messages = [
    { sender: 'Sarah Chen', initials: 'SC', color: '#ec4899', isMe: false, text: "Welcome! Here's the analytics dashboard spec. Any questions?", delay: 0.5 },
    { sender: 'You', initials: 'You', color: colors.accent, isMe: true, text: "Should the data refresh real-time or on demand?", delay: 2 },
    { sender: 'Sarah Chen', initials: 'SC', color: '#ec4899', isMe: false, text: "Real-time via WebSocket. Users expect live updates.", delay: 3.5 },
    { sender: 'You', initials: 'You', color: colors.accent, isMe: true, text: "Got it. I'll sync with Marcus on the API first.", delay: 5 },
    { sender: 'Sarah Chen', initials: 'SC', color: '#ec4899', isMe: false, text: "Perfect! He's available for a quick call if needed. 👍", delay: 6.5 },
  ];

  return (
    <AbsoluteFill style={{
      background: 'radial-gradient(ellipse at 70% 50%, #1e293b 0%, #0f172a 70%)',
      opacity: fadeIn * fadeOut, padding: 16,
    }}>
      <PhaseLabel step={2} label="Collaborate" />

      <div style={{
        width: '100%', height: '100%', display: 'flex',
        borderRadius: 20, overflow: 'hidden',
        border: `1px solid ${slack.border}`, marginTop: 70,
        boxShadow: '0 25px 80px -12px rgba(0,0,0,0.6)',
      }}>
        {/* Slack Sidebar */}
        <div style={{
          width: 320, backgroundColor: slack.bgSidebar,
          borderRight: `1px solid ${slack.border}`, padding: 28,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              backgroundColor: colors.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontFamily: fonts.heading, fontWeight: 700, fontSize: 20,
            }}>S</div>
            <span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 24, color: slack.text }}>
              Skillvee
            </span>
          </div>

          <div style={{ fontFamily: fonts.heading, fontSize: 14, fontWeight: 600, color: slack.textMuted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
            Team
          </div>

          {[
            { name: 'Sarah Chen', role: 'Product Manager', initials: 'SC', color: '#ec4899', active: true },
            { name: 'Marcus Johnson', role: 'Tech Lead', initials: 'MJ', color: '#3b82f6' },
          ].map((person, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 14px', borderRadius: 10, marginBottom: 8,
              backgroundColor: person.active ? slack.bgHover : 'transparent',
              borderLeft: person.active ? `3px solid ${colors.accent}` : '3px solid transparent',
            }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  backgroundColor: person.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontFamily: fonts.heading, fontWeight: 600, fontSize: 18,
                }}>{person.initials}</div>
                <div style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 14, height: 14, borderRadius: '50%',
                  backgroundColor: '#22c55e', border: `2px solid ${slack.bgSidebar}`,
                }} />
              </div>
              <div>
                <div style={{ fontFamily: fonts.heading, fontWeight: 600, fontSize: 18, color: person.active ? colors.accent : slack.text }}>
                  {person.name}
                </div>
                <div style={{ fontFamily: fonts.heading, fontSize: 13, color: slack.textMuted }}>{person.role}</div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 'auto' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              padding: '12px 16px', borderRadius: 12,
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                backgroundColor: '#ef4444',
                opacity: 0.7 + 0.3 * Math.sin(frame * 0.15),
              }} />
              <span style={{ fontFamily: fonts.heading, fontSize: 16, color: '#ef4444', fontWeight: 600 }}>
                Screen Recording
              </span>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: slack.bgMain }}>
          <div style={{
            height: 70, display: 'flex', alignItems: 'center', padding: '0 28px',
            borderBottom: `1px solid ${slack.border}`,
          }}>
            <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 24, color: slack.text }}>
              Sarah Chen
            </div>
          </div>

          <div style={{ flex: 1, padding: '24px 28px', overflow: 'hidden' }}>
            {messages.map((msg, i) => {
              const msgFrame = frame - msg.delay * fps;
              if (msgFrame < 0) return null;
              const entrance = spring({ frame: msgFrame, fps, config: animations.snappy });

              return (
                <div key={i} style={{
                  display: 'flex', gap: 14, marginBottom: 24,
                  flexDirection: msg.isMe ? 'row-reverse' : 'row',
                  opacity: interpolate(entrance, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(entrance, [0, 1], [12, 0])}px)`,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    backgroundColor: msg.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontFamily: fonts.heading, fontWeight: 600, fontSize: 16,
                    flexShrink: 0,
                  }}>{msg.initials}</div>
                  <div style={{
                    maxWidth: 600, padding: '14px 22px', borderRadius: 18,
                    borderBottomRightRadius: msg.isMe ? 6 : 18,
                    borderBottomLeftRadius: msg.isMe ? 18 : 6,
                    backgroundColor: msg.isMe ? colors.accent : slack.bgSurface,
                    color: msg.isMe ? '#fff' : slack.text,
                    fontFamily: fonts.heading, fontSize: 22, lineHeight: 1.5,
                  }}>
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

// ============================
// Phase 3: Candidate works (Slack chat with progress updates)
// ============================
const CodingWorkPhase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [fps * 7, fps * 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const messages = [
    { sender: 'You', isMe: true, text: "Starting on the analytics dashboard. Setting up project structure.", delay: 0.5 },
    { sender: 'Marcus Johnson', isMe: false, text: "Sounds good. API docs are in the shared folder.", delay: 2 },
    { sender: 'You', isMe: true, text: "Real-time hook is working. Dashboard filters + charts done.", delay: 4 },
    { sender: 'You', isMe: true, text: "Moving to the CSV export feature now.", delay: 5.5 },
    { sender: 'Marcus Johnson', isMe: false, text: "Nice progress! Don't forget the date range edge cases.", delay: 7 },
  ];

  return (
    <AbsoluteFill style={{
      background: 'radial-gradient(ellipse at 50% 80%, #1e293b 0%, #0f172a 70%)',
      opacity: fadeIn * fadeOut, padding: 16,
    }}>
      <PhaseLabel step={3} label="Build" />

      <div style={{
        width: '100%', height: '100%', display: 'flex',
        borderRadius: 20, overflow: 'hidden',
        border: `1px solid ${slack.border}`, marginTop: 70,
        boxShadow: '0 25px 80px -12px rgba(0,0,0,0.6)',
      }}>
        {/* Slack Sidebar */}
        <div style={{
          width: 320, backgroundColor: slack.bgSidebar,
          borderRight: `1px solid ${slack.border}`, padding: 28,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              backgroundColor: colors.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontFamily: fonts.heading, fontWeight: 700, fontSize: 20,
            }}>S</div>
            <span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 24, color: slack.text }}>
              Skillvee
            </span>
          </div>

          <div style={{ fontFamily: fonts.heading, fontSize: 14, fontWeight: 600, color: slack.textMuted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
            Team
          </div>

          {[
            { name: 'Marcus Johnson', initials: 'MJ', color: '#3b82f6', active: true },
            { name: 'Sarah Chen', initials: 'SC', color: '#ec4899' },
          ].map((person, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 14px', borderRadius: 10, marginBottom: 8,
              backgroundColor: person.active ? slack.bgHover : 'transparent',
              borderLeft: person.active ? `3px solid ${colors.accent}` : '3px solid transparent',
            }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  backgroundColor: person.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontFamily: fonts.heading, fontWeight: 600, fontSize: 18,
                }}>{person.initials}</div>
                <div style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 14, height: 14, borderRadius: '50%',
                  backgroundColor: '#22c55e', border: `2px solid ${slack.bgSidebar}`,
                }} />
              </div>
              <div style={{ fontFamily: fonts.heading, fontWeight: 600, fontSize: 18, color: person.active ? colors.accent : slack.text }}>
                {person.name}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 'auto' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              padding: '12px 16px', borderRadius: 12, marginBottom: 12,
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                backgroundColor: '#ef4444',
                opacity: 0.7 + 0.3 * Math.sin(frame * 0.15),
              }} />
              <span style={{ fontFamily: fonts.heading, fontSize: 16, color: '#ef4444', fontWeight: 600 }}>
                Screen Recording
              </span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '10px 16px',
              backgroundColor: slack.bgSurface, borderRadius: 12,
              border: `1px solid ${slack.border}`,
            }}>
              <span style={{ fontFamily: fonts.mono, fontSize: 18, color: slack.textMuted }}>
                ⏱ {formatTime(Math.floor(frame / fps) + 1260)}
              </span>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: slack.bgMain }}>
          <div style={{
            height: 70, display: 'flex', alignItems: 'center', padding: '0 28px',
            borderBottom: `1px solid ${slack.border}`,
          }}>
            <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 24, color: slack.text }}>
              Marcus Johnson
            </div>
          </div>

          <div style={{ flex: 1, padding: '24px 28px', overflow: 'hidden' }}>
            {messages.map((msg, i) => {
              const msgFrame = frame - msg.delay * fps;
              if (msgFrame < 0) return null;
              const entrance = spring({ frame: msgFrame, fps, config: animations.snappy });

              return (
                <div key={i} style={{
                  display: 'flex', gap: 14, marginBottom: 24,
                  flexDirection: msg.isMe ? 'row-reverse' : 'row',
                  opacity: interpolate(entrance, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(entrance, [0, 1], [12, 0])}px)`,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    backgroundColor: msg.isMe ? colors.accent : '#3b82f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontFamily: fonts.heading, fontWeight: 600, fontSize: 16,
                    flexShrink: 0,
                  }}>{msg.isMe ? 'You' : 'MJ'}</div>
                  <div style={{
                    maxWidth: 600, padding: '14px 22px', borderRadius: 18,
                    borderBottomRightRadius: msg.isMe ? 6 : 18,
                    borderBottomLeftRadius: msg.isMe ? 18 : 6,
                    backgroundColor: msg.isMe ? colors.accent : slack.bgSurface,
                    color: msg.isMe ? '#fff' : slack.text,
                    fontFamily: fonts.heading, fontSize: 22, lineHeight: 1.5,
                  }}>
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

// ============================
// Phase 4: Recruiter reviews results
// Shows: Recruiter sidebar + dashboard table with candidate scores
// Matches the actual recruiter assessments dashboard
// ============================
const ResultsPhase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [fps * 6, fps * 7], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const candidates = [
    { name: 'Sarah Chen', email: 'sarah@test.com', initials: 'SC', score: 3.8, fit: 'Exceptional', stars: 4, dims: ['↑', '↑', '↗', '↑', '↑', '↗', '↑', '↗'], flags: 0, color: '#ec4899' },
    { name: 'Alice Johnson', email: 'alice@test.com', initials: 'AJ', score: 3.5, fit: 'Exceptional', stars: 3.5, dims: ['↑', '↗', '↗', '↑', '↗', '↑', '↑', '↗'], flags: 0, color: '#8b5cf6' },
    { name: 'Carla Nguyen', email: 'carla@test.com', initials: 'CN', score: 3.3, fit: 'Exceeds', stars: 3, dims: ['↗', '↗', '↗', '↑', '↑', '↑', '↗', '✓'], flags: 5, color: '#f97316' },
    { name: 'Marcus Johnson', email: 'marcus@test.com', initials: 'MJ', score: 2.6, fit: 'Meets', stars: 2.5, dims: ['✓', '↗', '↗', '✓', '↗', '✓', '↗', '✓'], flags: 11, color: '#3b82f6' },
    { name: 'Bob Martinez', email: 'bob@test.com', initials: 'BM', score: 2.5, fit: 'Meets', stars: 2, dims: ['✓', '↗', '✓', '✓', '↗', '✓', '↗', '✓'], flags: 15, color: '#6b7280' },
  ];

  const dimLabels = ['COMM', 'PROBLEM', 'TECH', 'COLLAB', 'ADAPT', 'LEAD', 'CREATE', 'TIME'];

  const fitColors: Record<string, { bg: string; text: string }> = {
    'Exceptional': { bg: '#dcfce7', text: '#15803d' },
    'Exceeds': { bg: '#dbeafe', text: '#1d4ed8' },
    'Meets': { bg: '#f1f5f9', text: '#64748b' },
  };

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      <PhaseLabel step={4} label="Review" />

      <div style={{
        width: '100%', height: '100%', display: 'flex',
        borderRadius: 20, overflow: 'hidden', margin: 16,
        boxShadow: '0 25px 80px -12px rgba(0,0,0,0.4)',
        marginTop: 80,
      }}>
        <RecruiterSidebar activeNav="assessments" />

        {/* Main content - Dashboard table */}
        <div style={{ flex: 1, backgroundColor: recruiter.bg, padding: '36px 40px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: fonts.heading, fontSize: 32, fontWeight: 700, color: recruiter.text, marginBottom: 6 }}>
              Frontend Developer Assessment
            </div>
            <div style={{ fontFamily: fonts.heading, fontSize: 18, color: recruiter.textMuted }}>
              5 of 5 candidates · Evaluated against mid-level expectations
            </div>
          </div>

          {/* Table */}
          <div style={{
            backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
            border: `1px solid ${recruiter.border}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            {/* Table header */}
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: '16px 24px', borderBottom: `1px solid ${recruiter.border}`,
              backgroundColor: recruiter.bgMuted,
            }}>
              <div style={{ width: 220, fontFamily: fonts.heading, fontSize: 14, fontWeight: 600, color: recruiter.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                Candidate
              </div>
              <div style={{ width: 80, fontFamily: fonts.heading, fontSize: 14, fontWeight: 600, color: recruiter.textMuted, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>
                Score
              </div>
              <div style={{ width: 100, fontFamily: fonts.heading, fontSize: 14, fontWeight: 600, color: recruiter.textMuted, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>
                Fit
              </div>
              {dimLabels.map((dim) => (
                <div key={dim} style={{ flex: 1, fontFamily: fonts.heading, fontSize: 12, fontWeight: 600, color: recruiter.textMuted, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>
                  {dim}
                </div>
              ))}
              <div style={{ width: 60, fontFamily: fonts.heading, fontSize: 14, fontWeight: 600, color: recruiter.textMuted, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>
                Flags
              </div>
            </div>

            {/* Rows */}
            {candidates.map((c, i) => {
              const rowEntrance = spring({ frame: frame - i * 5, fps, config: animations.snappy });
              const fit = fitColors[c.fit] || fitColors['Meets'];

              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center',
                  padding: '14px 24px',
                  borderBottom: i < candidates.length - 1 ? `1px solid ${recruiter.borderLight}` : 'none',
                  opacity: interpolate(rowEntrance, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(rowEntrance, [0, 1], [10, 0])}px)`,
                }}>
                  {/* Candidate */}
                  <div style={{ width: 220, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      backgroundColor: c.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontFamily: fonts.heading, fontWeight: 600, fontSize: 14,
                    }}>{c.initials}</div>
                    <div>
                      <div style={{ fontFamily: fonts.heading, fontSize: 16, fontWeight: 600, color: recruiter.text }}>{c.name}</div>
                      <div style={{ fontFamily: fonts.heading, fontSize: 13, color: recruiter.textMuted }}>{c.email}</div>
                    </div>
                  </div>

                  {/* Score with stars */}
                  <div style={{ width: 80, textAlign: 'center' }}>
                    <div style={{ fontFamily: fonts.heading, fontSize: 20, fontWeight: 700, color: recruiter.text }}>{c.score}</div>
                  </div>

                  {/* Fit badge */}
                  <div style={{ width: 100, display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                      padding: '4px 12px', borderRadius: 8,
                      backgroundColor: fit.bg, color: fit.text,
                      fontFamily: fonts.heading, fontSize: 14, fontWeight: 600,
                    }}>{c.fit}</div>
                  </div>

                  {/* Dimension arrows */}
                  {c.dims.map((dim, j) => (
                    <div key={j} style={{
                      flex: 1, textAlign: 'center',
                      fontFamily: fonts.heading, fontSize: 18,
                      color: dim === '↑' ? '#22c55e' : dim === '↗' ? colors.accent : '#64748b',
                    }}>
                      {dim}
                    </div>
                  ))}

                  {/* Flags */}
                  <div style={{ width: 60, textAlign: 'center' }}>
                    {c.flags > 0 && (
                      <span style={{ fontFamily: fonts.heading, fontSize: 14, color: '#f59e0b' }}>
                        ⚠ {c.flags}
                      </span>
                    )}
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

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};
