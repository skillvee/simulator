"use client";

import { useState, useRef, useEffect } from "react";
import { createLogger } from "@/lib/core";
import { CoworkerAvatar } from "./coworker-avatar";
import { markUserInteraction } from "@/lib/sounds";

const logger = createLogger("client:chat:general-channel");

export interface ChannelMessage {
  senderName: string;
  senderRole: string;
  senderAvatarUrl?: string;
  text: string;
  timestamp: string; // Display timestamp like "9:02 AM"
  reactions?: Array<{ emoji: string; count: number }>;
}

interface GeneralChannelProps {
  assessmentId: string;
  initialMessages: ChannelMessage[]; // Pre-scripted messages
  onNewMessage?: () => void; // Callback when new ambient messages arrive
}

/**
 * #general channel component - displays ambient team chatter
 * Unlike DM views, all messages are left-aligned with avatar + name
 */
export function GeneralChannel({
  assessmentId: _assessmentId,
  initialMessages,
  onNewMessage: _onNewMessage,
}: GeneralChannelProps) {
  const [messages, setMessages] = useState<ChannelMessage[]>(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      className="flex h-full flex-col rounded-xl overflow-hidden"
      style={{
        background: "hsl(var(--slack-bg-surface))",
        border: "1px solid hsl(var(--slack-border))",
      }}
      onClick={() => markUserInteraction()}
    >
      {/* Channel Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid hsl(var(--slack-border))" }}
      >
        <div>
          <h2
            className="text-lg font-bold"
            style={{ color: "hsl(var(--slack-text))" }}
          >
            # general
          </h2>
          <p
            className="text-xs mt-0.5"
            style={{ color: "hsl(var(--slack-text-muted))" }}
          >
            Team-wide announcements and chat
          </p>
        </div>
        <div
          className="text-xs"
          style={{ color: "hsl(var(--slack-text-muted))" }}
        >
          {messages.length} messages
        </div>
      </div>

      {/* Messages Container - scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message, index) => (
          <ChannelMessageItem key={index} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Read-only notice */}
      <div
        className="px-4 py-3 text-center"
        style={{ borderTop: "1px solid hsl(var(--slack-border))" }}
      >
        <span
          className="text-xs"
          style={{ color: "hsl(var(--slack-text-muted))" }}
        >
          This is a team-wide announcements channel
        </span>
      </div>
    </div>
  );
}

/**
 * Individual channel message - left-aligned with avatar + name
 */
function ChannelMessageItem({ message }: { message: ChannelMessage }) {
  return (
    <div className="flex gap-3 hover:bg-muted/30 -mx-2 px-2 py-1 rounded transition-colors">
      {/* Avatar */}
      <div className="shrink-0 mt-0.5">
        <CoworkerAvatar
          name={message.senderName}
          avatarUrl={message.senderAvatarUrl || null}
          size="sm"
        />
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header: Name + Timestamp */}
        <div className="flex items-baseline gap-2 mb-0.5">
          <span
            className="font-semibold text-sm"
            style={{ color: "hsl(var(--slack-text))" }}
          >
            {message.senderName}
          </span>
          <span
            className="text-xs"
            style={{ color: "hsl(var(--slack-text-muted))" }}
          >
            {message.timestamp}
          </span>
        </div>

        {/* Message Text */}
        <div
          className="text-sm leading-relaxed break-words"
          style={{ color: "hsl(var(--slack-text))" }}
        >
          {message.text}
        </div>

        {/* Reactions (if any) */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex gap-1 mt-1.5">
            {message.reactions.map((reaction, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                style={{
                  background: "hsl(var(--slack-bg-hover))",
                  border: "1px solid hsl(var(--slack-border))",
                }}
              >
                <span>{reaction.emoji}</span>
                <span style={{ color: "hsl(var(--slack-text-muted))" }}>
                  {reaction.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
