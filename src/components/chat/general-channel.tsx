"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { CoworkerAvatar } from "./coworker-avatar";
import { Button } from "@/components/ui/button";
import { markUserInteraction } from "@/lib/sounds";

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
  onSendMessage?: (text: string) => void;
  onNewMessage?: () => void; // Callback when new ambient messages arrive
}

/**
 * #general channel component - displays ambient team chatter
 * Unlike DM views, all messages are left-aligned with avatar + name
 */
export function GeneralChannel({
  assessmentId,
  initialMessages,
  onSendMessage,
  onNewMessage,
}: GeneralChannelProps) {
  const [messages, setMessages] = useState<ChannelMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Expose a method to add ambient messages from parent
  useEffect(() => {
    // This will be used to add ambient messages dynamically
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const messageText = input.trim();
    setInput("");
    setIsSending(true);

    try {
      // Add user's message to the channel
      const userMessage: ChannelMessage = {
        senderName: "You",
        senderRole: "Software Engineer",
        text: messageText,
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Call the callback if provided
      if (onSendMessage) {
        onSendMessage(messageText);
      }

      // Simulate a response from a team member (for MVP)
      // In a real implementation, this would call an API
      setTimeout(() => {
        const responseMessage: ChannelMessage = {
          senderName: "Nina Volkov",
          senderRole: "Engineering Manager",
          senderAvatarUrl: "/avatars/nina-volkov.jpg",
          text: "Hey! Welcome to the team. Feel free to jump into any conversation here!",
          timestamp: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }),
        };
        setMessages((prev) => [...prev, responseMessage]);
        setIsSending(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

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

      {/* Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="p-4"
        style={{ borderTop: "1px solid hsl(var(--slack-border))" }}
      >
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message #general"
            disabled={isSending}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            style={{
              background: "hsl(var(--slack-bg-main))",
              border: "1px solid hsl(var(--slack-border))",
              color: "hsl(var(--slack-text))",
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isSending}
            className="shrink-0"
          >
            <Send size={18} />
          </Button>
        </div>
      </form>
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
