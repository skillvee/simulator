// remotion/src/scenes/ProductStep3.tsx
// Product page timeline: "Present and Defend"
// Shows the ACTUAL Skillvee Slack interface during PR defense:
//   - Slack sidebar with team + active voice call widget
//   - Voice call with Tech Lead asking pushback questions
//   - Waveform visualization matching FloatingCallBar
// Large text for non-fullscreen viewing (10 seconds)

import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { colors, animations } from '../lib/design-system';
import { fonts } from '../lib/fonts';

// Slack theme colors (from globals.css .slack-theme)
const slack = {
  bgSidebar: '#1a2033',
  bgMain: '#222d42',
  bgHover: '#2a3650',
  bgSurface: '#303d54',
  bgInput: '#1e2a3e',
  border: '#2f3b4e',
  text: '#e8eaed',
  textMuted: '#8b919c',
};

const teamMembers = [
  { name: 'Sarah Chen', role: 'Product Manager', initials: 'SC', online: true, color: '#ec4899' },
  { name: 'Marcus Johnson', role: 'Tech Lead', initials: 'MJ', online: true, selected: true, color: '#3b82f6' },
  { name: 'Alex Rivera', role: 'Senior Engineer', initials: 'AR', online: false, color: '#8b5cf6' },
  { name: 'Jordan Lee', role: 'Designer', initials: 'JL', online: false, color: '#f97316' },
];

// Pushback questions that appear during the defense call
const pushbackQuestions = [
  { text: "Why did you choose WebSockets over SSE?", start: 1, end: 3.5 },
  { text: "What happens if the connection drops?", start: 3.5, end: 6 },
  { text: "How would this scale to 10k users?", start: 6, end: 9 },
];

export const ProductStep3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [fps * 9, fps * 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617', opacity: fadeIn * fadeOut, padding: 16 }}>
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        borderRadius: 20, overflow: 'hidden',
        border: `1px solid ${slack.border}`,
        boxShadow: '0 25px 80px -12px rgba(0,0,0,0.6)',
      }}>
        {/* Sidebar */}
        <div style={{
          width: 380, backgroundColor: slack.bgSidebar,
          borderRight: `1px solid ${slack.border}`,
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            height: 80, display: 'flex', alignItems: 'center',
            padding: '0 28px', borderBottom: `1px solid ${slack.border}`,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              backgroundColor: colors.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontFamily: fonts.heading, fontWeight: 700, fontSize: 24,
              marginRight: 14,
            }}>S</div>
            <span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 28, color: slack.text }}>
              Skillvee
            </span>
          </div>

          {/* Channels */}
          <div style={{ padding: '24px 16px 12px' }}>
            <div style={{ fontFamily: fonts.heading, fontSize: 15, fontWeight: 600, color: slack.textMuted, textTransform: 'uppercase', letterSpacing: 2, padding: '0 12px', marginBottom: 12 }}>
              Channels
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10 }}>
              <span style={{ fontFamily: fonts.heading, fontSize: 20, color: slack.textMuted }}>#</span>
              <span style={{ fontFamily: fonts.heading, fontSize: 20, color: slack.text }}>general</span>
            </div>
          </div>

          {/* Team */}
          <div style={{ padding: '12px 16px', flex: 1, overflow: 'hidden' }}>
            <div style={{ fontFamily: fonts.heading, fontSize: 15, fontWeight: 600, color: slack.textMuted, textTransform: 'uppercase', letterSpacing: 2, padding: '0 12px', marginBottom: 12 }}>
              Team
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {teamMembers.map((member, i) => {
                const memberEntrance = spring({ frame: frame - i * 4, fps, config: animations.snappy });
                return (
                  <div key={member.name} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 14px', borderRadius: 10,
                    backgroundColor: member.selected ? slack.bgHover : 'transparent',
                    borderLeft: member.selected ? `3px solid ${colors.accent}` : '3px solid transparent',
                    opacity: member.online ? interpolate(memberEntrance, [0, 1], [0, 1]) : 0.5 * interpolate(memberEntrance, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(memberEntrance, [0, 1], [-20, 0])}px)`,
                  }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        backgroundColor: member.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontFamily: fonts.heading, fontWeight: 600, fontSize: 18,
                        border: `2px solid ${slack.bgSidebar}`,
                      }}>{member.initials}</div>
                      <div style={{
                        position: 'absolute', bottom: -2, right: -2,
                        width: 14, height: 14, borderRadius: '50%',
                        backgroundColor: member.online ? '#22c55e' : '#9ca3af',
                        border: `2px solid ${slack.bgSidebar}`,
                      }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: fonts.heading, fontSize: 20,
                        fontWeight: member.selected ? 700 : 600,
                        color: member.selected ? colors.accent : slack.text,
                      }}>{member.name}</div>
                      <div style={{ fontFamily: fonts.heading, fontSize: 14, color: slack.textMuted }}>
                        {member.role}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating Call Widget - always visible in this scene */}
          <CallWidget />
        </div>

        {/* Main area - Defense call view */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          backgroundColor: slack.bgMain, justifyContent: 'center', alignItems: 'center',
        }}>
          {/* Defense call central UI */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: 60, maxWidth: 900,
          }}>
            {/* Label */}
            <div style={{
              fontFamily: fonts.heading, fontSize: 18, fontWeight: 700,
              color: slack.textMuted, textTransform: 'uppercase', letterSpacing: 4,
              marginBottom: 40,
            }}>
              PR Defense Call
            </div>

            {/* Tech Lead avatar - large */}
            <div style={{
              width: 160, height: 160, borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontFamily: fonts.heading, fontWeight: 700, fontSize: 56,
              marginBottom: 28, position: 'relative',
            }}>
              {/* Pulse ring */}
              <div style={{
                position: 'absolute', width: '100%', height: '100%',
                borderRadius: '50%', border: '3px solid #3b82f6',
                opacity: 0.3 + Math.sin(frame * 0.1) * 0.2,
                transform: `scale(${1.15 + Math.sin(frame * 0.1) * 0.1})`,
              }} />
              MJ
            </div>

            <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 38, color: slack.text, marginBottom: 8 }}>
              Marcus Johnson
            </div>
            <div style={{ fontFamily: fonts.heading, fontSize: 22, color: slack.textMuted, marginBottom: 40 }}>
              Tech Lead - Reviewing your PR
            </div>

            {/* Large waveform */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, height: 80, marginBottom: 36 }}>
              {Array.from({ length: 20 }).map((_, i) => {
                const waveTime = frame * 0.12;
                const offset = i * 0.3;
                const height = Math.abs(Math.sin(waveTime + offset) * Math.cos(waveTime * 0.5 + offset)) * 55 + 16;
                return (
                  <div key={i} style={{
                    width: 7, height, borderRadius: 4,
                    backgroundColor: colors.accent,
                    opacity: 0.4 + Math.abs(Math.sin(waveTime + i * 0.2)) * 0.4,
                  }} />
                );
              })}
            </div>

            {/* Current pushback question */}
            {pushbackQuestions.map((q, i) => {
              const isActive = frame >= q.start * fps && frame < q.end * fps;
              if (!isActive) return null;

              const entrance = spring({ frame: frame - q.start * fps, fps, config: animations.snappy });

              return (
                <div key={i} style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '2px solid rgba(255,255,255,0.15)',
                  padding: '18px 36px', borderRadius: 18,
                  opacity: interpolate(entrance, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(entrance, [0, 1], [10, 0])}px) scale(${interpolate(entrance, [0, 1], [0.95, 1])})`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 24 }}>💬</span>
                    <span style={{
                      fontFamily: fonts.heading, fontSize: 28, color: '#e2e8f0', fontStyle: 'italic',
                    }}>
                      &ldquo;{q.text}&rdquo;
                    </span>
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

// Floating call widget (matches FloatingCallBar from the actual product)
const CallWidget: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, config: animations.bouncy });

  return (
    <div style={{
      padding: 16,
      opacity: interpolate(entrance, [0, 1], [0, 1]),
      transform: `translateY(${interpolate(entrance, [0, 1], [30, 0])}px)`,
    }}>
      <div style={{
        backgroundColor: slack.bgSurface, borderRadius: 20, padding: 20,
        border: `1px solid ${slack.border}`,
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
      }}>
        {/* Green connected bar */}
        <div style={{ height: 4, borderRadius: 2, backgroundColor: '#22c55e', marginBottom: 16 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            backgroundColor: '#3b82f6', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: fonts.heading, fontWeight: 600, fontSize: 16,
            boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.3)',
          }}>MJ</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fonts.heading, fontSize: 18, fontWeight: 600, color: slack.text }}>
              Marcus Johnson
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e' }} />
              <span style={{ fontFamily: fonts.heading, fontSize: 14, color: '#22c55e' }}>Connected</span>
            </div>
          </div>
        </div>

        {/* Waveform */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 36, marginBottom: 16, justifyContent: 'center' }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const h = 10 + Math.abs(Math.sin((frame * 0.15) + i * 0.5)) * 22;
            return (
              <div key={i} style={{
                width: 4, height: h, borderRadius: 2,
                backgroundColor: `${colors.accent}80`,
              }} />
            );
          })}
        </div>

        {/* Buttons: mute + end call */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            backgroundColor: slack.bgHover, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${slack.border}`,
            fontSize: 18, color: slack.text,
          }}>🎤</div>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            backgroundColor: '#ef4444', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: '#fff',
          }}>✕</div>
        </div>
      </div>
    </div>
  );
};
