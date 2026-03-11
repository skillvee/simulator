"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { getInitials } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { DecorativeTeamMember } from "@/types";

interface DecorateChatProps {
  member: DecorativeTeamMember;
  managerName: string;
}

interface Message {
  role: "user" | "model";
  text: string;
  timestamp: string;
}

/**
 * Chat component for decorative (away/in-meeting) team members.
 * Shows status banner and sends a single canned response after first message.
 */
export function DecorativeChat({ member, managerName }: DecorateChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [hasResponded, setHasResponded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      text: input.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add user message
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // If this is the first message and member has a canned response, send it after delay
    if (!hasResponded && member.cannedResponse) {
      setHasResponded(true);
      setIsTyping(true);

      // Random delay between 30-60 seconds (30000-60000ms)
      const delay = Math.floor(Math.random() * 30000) + 30000;

      setTimeout(() => {
        setIsTyping(false);
        const cannedText = member.cannedResponse!.replace(
          "{managerName}",
          managerName
        );
        const modelMessage: Message = {
          role: "model",
          text: cannedText,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, modelMessage]);
      }, delay);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const initials = getInitials(member.name);
  const statusBannerColor =
    member.availability === "in-meeting"
      ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
      : "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800";
  const statusTextColor =
    member.availability === "in-meeting"
      ? "text-red-700 dark:text-red-300"
      : "text-yellow-700 dark:text-yellow-300";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-background shadow-sm">
        {/* Header */}
        <header className="flex shrink-0 flex-col border-b border-border">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <h2 className="text-lg font-bold">{member.name}</h2>
                <span className="text-xs text-muted-foreground">
                  {member.role}
                </span>
              </div>
            </div>
          </div>

          {/* Status Banner */}
          {member.statusMessage && (
            <div className={`border-t px-6 py-3 ${statusBannerColor}`}>
              <p className={`text-sm font-medium ${statusTextColor}`}>
                {member.name} is{" "}
                {member.availability === "in-meeting" ? "in a meeting" : "away"}{" "}
                - {member.statusMessage}
              </p>
            </div>
          )}
        </header>

        {/* Messages area */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6">
          <div className="space-y-6 py-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-20 text-center">
                <div className="mb-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-border bg-muted shadow-md">
                    <span className="text-xl font-medium text-muted-foreground">
                      {initials}
                    </span>
                  </div>
                </div>
                <h2 className="mb-2 text-lg font-semibold">
                  {member.name} is currently unavailable
                </h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  {member.statusMessage || "This team member is away."}
                </p>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  You can still send them a message and they&apos;ll respond
                  when available.
                </p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => {
                  const isMe = message.role === "user";
                  return (
                    <div
                      key={index}
                      className={`flex gap-4 ${isMe ? "flex-row-reverse" : ""}`}
                    >
                      {/* Avatar */}
                      {isMe ? (
                        <Avatar className="mt-1 h-10 w-10 border border-border shadow-sm">
                          <AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
                            You
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted shadow-sm">
                          <span className="text-xs font-medium text-muted-foreground">
                            {initials}
                          </span>
                        </div>
                      )}

                      {/* Message content */}
                      <div
                        className={`flex max-w-[60%] flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`rounded-2xl px-5 py-3 text-[15px] leading-relaxed shadow-sm ${
                            isMe
                              ? "rounded-br-sm bg-primary text-primary-foreground"
                              : "rounded-bl-sm bg-muted text-foreground"
                          }`}
                        >
                          {message.text}
                        </div>
                        <span className="mt-1.5 px-1 text-xs font-medium text-muted-foreground">
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex gap-4">
                    <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted shadow-sm">
                      <span className="text-xs font-medium text-muted-foreground">
                        {initials}
                      </span>
                    </div>
                    <div className="flex flex-col items-start">
                      <TypingIndicator />
                    </div>
                  </div>
                )}

                {/* Unavailable note after first response */}
                {hasResponded && !isTyping && messages.length > 1 && (
                  <div className="flex justify-center">
                    <div className="rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
                      {member.name} is currently unavailable
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-border p-4">
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted p-2 pl-4 transition-all focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/20">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 border-none bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim()}
              className="h-9 w-9 rounded-full shadow-sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Typing indicator component - matches bubble style
function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-5 py-3 shadow-sm">
      <div className="flex gap-1">
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/60"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/60"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/60"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
