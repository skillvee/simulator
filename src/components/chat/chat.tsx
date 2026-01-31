"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, Send } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { useCallContext } from "./slack-layout";
import { CoworkerAvatar } from "./coworker-avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useManagerAutoStart } from "@/hooks";
import type { ChatMessage } from "@/types";

interface Coworker {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

interface ChatProps {
  assessmentId: string;
  coworker: Coworker;
}

// Note: PR submission handling and defense call flow will be implemented
// in RF-012 (Slack modifications). Defense now happens within the Slack
// interface - the candidate will call the manager after submitting a PR.

export function Chat({
  assessmentId,
  coworker,
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isManagerTyping, setIsManagerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyLoadedRef = useRef(false);

  // Check if currently in a call with this coworker
  const { activeCall } = useCallContext();
  const isInCall = activeCall?.coworkerId === coworker.id;

  // Callbacks for manager auto-start messages
  const handleManagerMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages((prev) => [...prev, ...newMessages]);
  }, []);

  const handleTypingStart = useCallback(() => {
    setIsManagerTyping(true);
  }, []);

  const handleTypingEnd = useCallback(() => {
    setIsManagerTyping(false);
  }, []);

  // RF-015: Manager auto-start messages
  // Triggers initial manager messages after 5-10 seconds on first visit
  useManagerAutoStart({
    assessmentId,
    currentCoworkerId: coworker.id,
    onMessagesReceived: handleManagerMessages,
    onTypingStart: handleTypingStart,
    onTypingEnd: handleTypingEnd,
  });

  // Load chat history on mount
  useEffect(() => {
    async function loadHistory() {
      // Prevent duplicate loads
      if (historyLoadedRef.current) return;
      historyLoadedRef.current = true;

      setIsLoading(true);
      try {
        const data = await api<{ messages: ChatMessage[] }>(
          `/api/chat?assessmentId=${assessmentId}&coworkerId=${coworker.id}`
        );
        setMessages(data.messages || []);
      } catch (err) {
        console.error("Failed to load chat history:", err);
        historyLoadedRef.current = false; // Allow retry on error
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, [assessmentId, coworker.id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [coworker.id]);

  const sendMessage = async () => {
    if (!input.trim() || isSending) return;

    const userMessage: ChatMessage = {
      role: "user",
      text: input.trim(),
      timestamp: new Date().toISOString(),
    };

    // Optimistically add user message
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const data = await api<{
        response: string;
        timestamp: string;
        prSubmitted?: boolean;
      }>("/api/chat", {
        method: "POST",
        body: {
          assessmentId,
          coworkerId: coworker.id,
          message: userMessage.text,
        },
      });
      const modelMessage: ChatMessage = {
        role: "model",
        text: data.response,
        timestamp: data.timestamp,
      };
      setMessages((prev) => [...prev, modelMessage]);

      // Note: PR detection and defense call flow will be handled in RF-012.
      // The manager will prompt the candidate to call them after PR submission.
    } catch (err) {
      // Remove the optimistic message on error
      setMessages((prev) => prev.slice(0, -1));
      if (err instanceof ApiClientError) {
        console.error("Failed to send message:", err.message);
      } else {
        console.error("Failed to send message:", err);
      }
    } finally {
      setIsSending(false);
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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3">
        {/* Coworker avatar */}
        <CoworkerAvatar name={coworker.name} avatarUrl={coworker.avatarUrl} size="md" />
        <div>
          <h1 className="text-lg font-semibold">{coworker.name}</h1>
          <p className="text-sm text-muted-foreground">{coworker.role}</p>
        </div>
        {/* Status indicator */}
        <div className="ml-auto flex items-center gap-2">
          {isInCall ? (
            <>
              {/* In-call indicator - green bar with phone icon */}
              <div className="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-1.5">
                <Phone size={14} className="text-white" />
                <span className="text-sm font-medium text-white">
                  In call
                </span>
              </div>
            </>
          ) : (
            <>
              {/* Online indicator */}
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">
                online
              </span>
            </>
          )}
        </div>
      </header>

      {/* Messages area */}
      <main className="flex-1 overflow-auto px-4 py-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="font-mono text-muted-foreground">Loading...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4">
              <CoworkerAvatar name={coworker.name} avatarUrl={coworker.avatarUrl} size="lg" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">
              Start a conversation with {coworker.name}
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {coworker.name} is a {coworker.role}. Ask questions about the
              project, codebase, or anything else you need help with.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Date divider */}
            <div className="mb-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-border" />
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                Today
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {messages.map((message, index) => (
              <div key={index} className="flex gap-3">
                {/* Avatar */}
                {message.role === "user" ? (
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                      You
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="flex-shrink-0">
                    <CoworkerAvatar name={coworker.name} avatarUrl={coworker.avatarUrl} size="md" />
                  </div>
                )}

                {/* Message content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="font-semibold">
                      {message.role === "user" ? "You" : coworker.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <div
                    className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator when sending or when manager is auto-typing */}
            {(isSending || isManagerTyping) && (
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <CoworkerAvatar name={coworker.name} avatarUrl={coworker.avatarUrl} size="md" />
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="font-semibold">{coworker.name}</span>
                  </div>
                  <TypingIndicator />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input area */}
      <footer className="border-t border-border bg-background px-4 py-3">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${coworker.name}...`}
            disabled={isSending}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isSending}
          >
            <Send className="mr-2 h-4 w-4" />
            Send
          </Button>
        </div>
      </footer>
    </div>
  );
}

// Typing indicator component - modern design
function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
      <div className="flex gap-1">
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <span className="text-sm text-muted-foreground">
        typing...
      </span>
    </div>
  );
}
