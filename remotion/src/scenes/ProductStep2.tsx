// remotion/src/scenes/ProductStep2.tsx
// Product page timeline: "Do the Actual Work"
// Shows the ACTUAL Skillvee interface during work phase:
//   - Slack sidebar with team + screen recording indicator
//   - Chat messages about coding progress
//   - Work status updates and AI copilot usage
// Large text for non-fullscreen viewing (12 seconds)

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

const chatMessages = [
  { sender: 'You', role: 'me', text: "Starting on the analytics dashboard. Setting up the project structure first.", delay: 0.5 },
  { sender: 'Marcus Johnson', role: 'user', text: "Sounds good. The API endpoints are documented in the shared folder. Let me know if you need help.", delay: 2.5 },
  { sender: 'You', role: 'me', text: "Got it. Using the real-time WebSocket approach Sarah mentioned. The useRealTimeData hook is working well.", delay: 4.5 },
  { sender: 'You', role: 'me', text: "Dashboard filters + chart section done. Moving to the CSV export feature now.", delay: 7 },
  { sender: 'Marcus Johnson', role: 'user', text: "Nice progress! Don't forget to handle the date range edge cases.", delay: 9 },
];

const teamMembers = [
  { name: 'Sarah Chen', role: 'Product Manager', initials: 'SC', online: true, color: '#ec4899' },
  { name: 'Marcus Johnson', role: 'Tech Lead', initials: 'MJ', online: true, selected: true, color: '#3b82f6' },
  { name: 'Alex Rivera', role: 'Senior Engineer', initials: 'AR', online: true, color: '#8b5cf6' },
  { name: 'Jordan Lee', role: 'Designer', initials: 'JL', online: false, color: '#f97316' },
];

export const ProductStep2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [fps * 11, fps * 12], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617', opacity: fadeIn * fadeOut, padding: 16 }}>
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        borderRadius: 20,
        overflow: 'hidden',
        border: `1px solid ${slack.border}`,
        boxShadow: '0 25px 80px -12px rgba(0,0,0,0.6)',
      }}>
        {/* Sidebar */}
        <div style={{
          width: 380,
          backgroundColor: slack.bgSidebar,
          borderRight: `1px solid ${slack.border}`,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            height: 80,
            display: 'flex',
            alignItems: 'center',
            padding: '0 28px',
            borderBottom: `1px solid ${slack.border}`,
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
                    {member.online && !member.selected && (
                      <div style={{ color: slack.textMuted, fontSize: 20 }}>🎧</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Screen Recording indicator */}
          <div style={{ padding: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              padding: '14px 20px', borderRadius: 14,
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                backgroundColor: '#ef4444',
                opacity: 0.7 + 0.3 * Math.sin(frame * 0.15),
              }} />
              <span style={{ fontFamily: fonts.heading, fontSize: 18, color: '#ef4444', fontWeight: 600 }}>
                Screen Recording
              </span>
            </div>

            {/* Timer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, marginTop: 12, padding: '10px 16px',
              backgroundColor: slack.bgSurface, borderRadius: 12,
              border: `1px solid ${slack.border}`,
            }}>
              <span style={{ fontFamily: fonts.mono, fontSize: 20, color: slack.textMuted }}>
                ⏱ {formatTime(Math.floor(frame / fps) + 1260)}
              </span>
            </div>
          </div>
        </div>

        {/* Main chat area */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          backgroundColor: slack.bgMain,
        }}>
          {/* Chat header */}
          <div style={{
            height: 80, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 32px',
            borderBottom: `1px solid ${slack.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 26, color: slack.text }}>
                  Marcus Johnson
                </div>
                <div style={{ fontFamily: fonts.heading, fontSize: 16, color: slack.textMuted }}>
                  Tech Lead
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 22px', borderRadius: 24,
              border: `1px solid ${slack.border}`,
              fontFamily: fonts.heading, fontSize: 18, color: slack.text,
            }}>
              🎧 Start Call
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '28px 36px', overflow: 'hidden' }}>
            {chatMessages.map((msg, i) => {
              const msgFrame = frame - msg.delay * fps;
              if (msgFrame < 0) return null;

              const entrance = spring({ frame: msgFrame, fps, config: animations.snappy });
              const isMe = msg.role === 'me';

              return (
                <div key={i} style={{
                  display: 'flex', gap: 16, marginBottom: 28,
                  flexDirection: isMe ? 'row-reverse' : 'row',
                  opacity: interpolate(entrance, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(entrance, [0, 1], [15, 0])}px)`,
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    backgroundColor: isMe ? colors.accent : '#3b82f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontFamily: fonts.heading, fontWeight: 600, fontSize: 18,
                    flexShrink: 0, marginTop: 4,
                  }}>
                    {isMe ? 'You' : 'MJ'}
                  </div>
                  <div style={{
                    maxWidth: 700, display: 'flex', flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      padding: '16px 24px', borderRadius: 20,
                      borderBottomRightRadius: isMe ? 6 : 20,
                      borderBottomLeftRadius: isMe ? 20 : 6,
                      backgroundColor: isMe ? colors.accent : slack.bgSurface,
                      color: isMe ? '#fff' : slack.text,
                      fontFamily: fonts.heading, fontSize: 24, lineHeight: 1.5,
                    }}>
                      {msg.text}
                    </div>
                    <div style={{
                      fontFamily: fonts.heading, fontSize: 14, color: slack.textMuted,
                      marginTop: 6, paddingLeft: 4, paddingRight: 4,
                    }}>
                      {isMe ? formatTime(Math.floor(msg.delay * 60) + 1260) : formatTime(Math.floor(msg.delay * 60) + 1259)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input area */}
          <div style={{ padding: 20, borderTop: `1px solid ${slack.border}` }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 12px 12px 24px', borderRadius: 28,
              backgroundColor: slack.bgInput, border: `1px solid ${slack.border}`,
            }}>
              <span style={{ fontFamily: fonts.heading, fontSize: 20, color: '#64748b', flex: 1 }}>
                Type a message...
              </span>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                backgroundColor: colors.accent, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#fff', fontSize: 20 }}>↑</span>
              </div>
            </div>
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
