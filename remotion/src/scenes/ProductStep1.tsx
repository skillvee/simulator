// remotion/src/scenes/ProductStep1.tsx
// Product page timeline: "Gather Requirements"
// Shows the ACTUAL Skillvee Slack-like interface:
//   - Dark sidebar with "S" logo, channels, team list
//   - Chat area with PM messages
//   - Floating voice call widget with manager
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
  bgSidebar: '#1a2033', // hsl(217, 25%, 12%)
  bgMain: '#222d42',    // hsl(217, 20%, 16%)
  bgHover: '#2a3650',   // hsl(217, 20%, 20%)
  bgSurface: '#303d54', // hsl(217, 20%, 22%)
  bgInput: '#1e2a3e',   // hsl(217, 20%, 14%)
  border: '#2f3b4e',    // hsl(217, 15%, 25%)
  text: '#e8eaed',      // hsl(210, 10%, 93%)
  textMuted: '#8b919c', // hsl(210, 10%, 60%)
};

const chatMessages = [
  { sender: 'Sarah Chen', role: 'user', text: "Hey! Welcome to the team. I've prepared the requirements for the analytics dashboard.", delay: 0.3 },
  { sender: 'You', role: 'me', text: "Thanks Sarah! Should the data refresh in real-time or on demand?", delay: 2 },
  { sender: 'Sarah Chen', role: 'user', text: "Great question - real-time via WebSocket. Users expect live updates. I'll send the API spec.", delay: 3.5 },
  { sender: 'You', role: 'me', text: "Got it. I'll sync with Marcus on the API schema first.", delay: 5.5 },
  { sender: 'Sarah Chen', role: 'user', text: "Perfect. He's available for a quick call if you need it. 👍", delay: 7 },
];

const teamMembers = [
  { name: 'Sarah Chen', role: 'Product Manager', initials: 'SC', online: true, selected: true, color: '#ec4899' },
  { name: 'Marcus Johnson', role: 'Tech Lead', initials: 'MJ', online: true, selected: false, color: '#3b82f6' },
  { name: 'Alex Rivera', role: 'Senior Engineer', initials: 'AR', online: true, selected: false, color: '#8b5cf6' },
  { name: 'Jordan Lee', role: 'Designer', initials: 'JL', online: false, selected: false, color: '#f97316' },
];

export const ProductStep1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [fps * 9, fps * 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Show voice call widget at 8 seconds
  const showCall = frame >= 8 * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617', opacity: fadeIn * fadeOut, padding: 16 }}>
      {/* Slack-like layout */}
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
          {/* Header with logo */}
          <div style={{
            height: 80,
            display: 'flex',
            alignItems: 'center',
            padding: '0 28px',
            borderBottom: `1px solid ${slack.border}`,
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: colors.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontFamily: fonts.heading,
              fontWeight: 700,
              fontSize: 24,
              marginRight: 14,
            }}>
              S
            </div>
            <span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 28, color: slack.text }}>
              Skillvee
            </span>
          </div>

          {/* Channels */}
          <div style={{ padding: '24px 16px 12px' }}>
            <div style={{ fontFamily: fonts.heading, fontSize: 15, fontWeight: 600, color: slack.textMuted, textTransform: 'uppercase', letterSpacing: 2, padding: '0 12px', marginBottom: 12 }}>
              Channels
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              borderRadius: 10,
              backgroundColor: 'transparent',
              borderLeft: '2px solid transparent',
            }}>
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 14px',
                    borderRadius: 10,
                    backgroundColor: member.selected ? slack.bgHover : 'transparent',
                    borderLeft: member.selected ? `3px solid ${colors.accent}` : '3px solid transparent',
                    opacity: member.online ? interpolate(memberEntrance, [0, 1], [0, 1]) : 0.5 * interpolate(memberEntrance, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(memberEntrance, [0, 1], [-20, 0])}px)`,
                  }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        backgroundColor: member.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontFamily: fonts.heading,
                        fontWeight: 600,
                        fontSize: 18,
                        border: `2px solid ${slack.bgSidebar}`,
                      }}>
                        {member.initials}
                      </div>
                      <div style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        backgroundColor: member.online ? '#22c55e' : '#9ca3af',
                        border: `2px solid ${slack.bgSidebar}`,
                      }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: fonts.heading,
                        fontSize: 20,
                        fontWeight: member.selected ? 700 : 600,
                        color: member.selected ? colors.accent : slack.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {member.name}
                      </div>
                      <div style={{ fontFamily: fonts.heading, fontSize: 14, color: slack.textMuted }}>
                        {member.role}
                      </div>
                    </div>
                    {/* Headphones icon for call */}
                    {member.online && !member.selected && (
                      <div style={{ color: slack.textMuted, fontSize: 20 }}>🎧</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating call widget */}
          {showCall && <CallWidget />}
        </div>

        {/* Main chat area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: slack.bgMain,
        }}>
          {/* Chat header */}
          <div style={{
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            borderBottom: `1px solid ${slack.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 26, color: slack.text }}>
                  Sarah Chen
                </div>
                <div style={{ fontFamily: fonts.heading, fontSize: 16, color: slack.textMuted }}>
                  Product Manager
                </div>
              </div>
            </div>
            {/* Start Call button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 22px',
              borderRadius: 24,
              border: `1px solid ${slack.border}`,
              fontFamily: fonts.heading,
              fontSize: 18,
              color: slack.text,
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
                  display: 'flex',
                  gap: 16,
                  marginBottom: 28,
                  flexDirection: isMe ? 'row-reverse' : 'row',
                  opacity: interpolate(entrance, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(entrance, [0, 1], [15, 0])}px)`,
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: isMe ? colors.accent : '#ec4899',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontFamily: fonts.heading,
                    fontWeight: 600,
                    fontSize: 18,
                    flexShrink: 0,
                    marginTop: 4,
                  }}>
                    {isMe ? 'You' : 'SC'}
                  </div>

                  {/* Bubble */}
                  <div style={{
                    maxWidth: 700,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      padding: '16px 24px',
                      borderRadius: 20,
                      borderBottomRightRadius: isMe ? 6 : 20,
                      borderBottomLeftRadius: isMe ? 20 : 6,
                      backgroundColor: isMe ? colors.accent : slack.bgSurface,
                      color: isMe ? '#fff' : slack.text,
                      fontFamily: fonts.heading,
                      fontSize: 24,
                      lineHeight: 1.5,
                    }}>
                      {msg.text}
                    </div>
                    <div style={{
                      fontFamily: fonts.heading,
                      fontSize: 14,
                      color: slack.textMuted,
                      marginTop: 6,
                      paddingLeft: 4,
                      paddingRight: 4,
                    }}>
                      {isMe ? '2:34 PM' : '2:33 PM'}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {frame > 7.5 * fps && frame < 8.5 * fps && (
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', backgroundColor: '#ec4899',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontFamily: fonts.heading, fontWeight: 600, fontSize: 18, flexShrink: 0,
                }}>SC</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{
                    padding: '16px 24px',
                    borderRadius: 20,
                    borderBottomLeftRadius: 6,
                    backgroundColor: slack.bgSurface,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    {[0, 1, 2].map((d) => (
                      <div key={d} style={{
                        width: 10, height: 10, borderRadius: '50%',
                        backgroundColor: slack.textMuted,
                        opacity: 0.4 + 0.4 * Math.sin((frame + d * 6) * 0.2),
                      }} />
                    ))}
                  </div>
                  <div style={{ fontFamily: fonts.heading, fontSize: 14, color: slack.textMuted, marginTop: 4 }}>
                    Sarah Chen is typing...
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div style={{ padding: 20, borderTop: `1px solid ${slack.border}` }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 12px 12px 24px',
              borderRadius: 28,
              backgroundColor: slack.bgInput,
              border: `1px solid ${slack.border}`,
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

// Floating call widget (appears at bottom of sidebar)
const CallWidget: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const callStart = 8 * fps;
  const localFrame = frame - callStart;

  const entrance = spring({ frame: localFrame, fps, config: animations.bouncy });

  return (
    <div style={{
      padding: 16,
      opacity: interpolate(entrance, [0, 1], [0, 1]),
      transform: `translateY(${interpolate(entrance, [0, 1], [30, 0])}px)`,
    }}>
      <div style={{
        backgroundColor: slack.bgSurface,
        borderRadius: 20,
        padding: 20,
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
          }}>
            MJ
          </div>
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
            const h = 10 + Math.abs(Math.sin((localFrame * 0.15) + i * 0.5)) * 22;
            return (
              <div key={i} style={{
                width: 4, height: h, borderRadius: 2,
                backgroundColor: `${colors.accent}80`,
              }} />
            );
          })}
        </div>

        {/* End call button */}
        <div style={{
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            backgroundColor: '#ef4444', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: '#fff',
          }}>
            ✕
          </div>
        </div>
      </div>
    </div>
  );
};
