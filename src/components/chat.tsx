"use client";

import { useState, useEffect, useRef } from "react";
import { Phone } from "lucide-react";
import { api, ApiClientError } from "@/lib/api-client";
import { useCallContext } from "@/components/slack-layout";
import { CoworkerAvatar } from "@/components/coworker-avatar";

interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: string;
}

interface Coworker {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

interface ChatProps {
  assessmentId: string;
  coworker: Coworker;
  onPrSubmitted?: () => void;
}

export function Chat({
  assessmentId,
  coworker,
  onPrSubmitted,
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if currently in a call with this coworker
  const { activeCall } = useCallContext();
  const isInCall = activeCall?.coworkerId === coworker.id;

  // Load chat history on mount
  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      try {
        const data = await api<{ messages: ChatMessage[] }>(
          `/api/chat?assessmentId=${assessmentId}&coworkerId=${coworker.id}`
        );
        setMessages(data.messages || []);
      } catch (err) {
        console.error("Failed to load chat history:", err);
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

      // If PR was submitted, notify parent after a brief delay
      if (data.prSubmitted && onPrSubmitted) {
        setTimeout(() => {
          onPrSubmitted();
        }, 3000); // 3 second delay for natural conversation feel
      }
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
      <header className="flex items-center gap-3 border-b-2 border-foreground bg-background px-4 py-3">
        {/* Coworker avatar */}
        <CoworkerAvatar name={coworker.name} size="md" />
        <div>
          <h1 className="text-lg font-bold">{coworker.name}</h1>
          <p className="text-sm text-muted-foreground">{coworker.role}</p>
        </div>
        {/* Status indicator */}
        <div className="ml-auto flex items-center gap-2">
          {isInCall ? (
            <>
              {/* In-call indicator - green bar with phone icon */}
              <div className="flex items-center gap-2 border-2 border-green-600 bg-green-500 px-3 py-1">
                <Phone size={14} className="text-white" />
                <span className="font-mono text-sm font-bold text-white">
                  In call
                </span>
              </div>
            </>
          ) : (
            <>
              {/* Online indicator */}
              <div className="h-3 w-3 border border-foreground bg-secondary" />
              <span className="font-mono text-sm text-muted-foreground">
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
              <CoworkerAvatar name={coworker.name} size="lg" />
            </div>
            <h2 className="mb-2 text-lg font-bold">
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
              <span className="border border-foreground bg-background px-2 font-mono text-sm text-muted-foreground">
                Today
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {messages.map((message, index) => (
              <div key={index} className="flex gap-3">
                {/* Avatar */}
                {message.role === "user" ? (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-2 border-foreground bg-foreground">
                    <span className="font-mono text-sm font-bold text-background">
                      You
                    </span>
                  </div>
                ) : (
                  <div className="flex-shrink-0">
                    <CoworkerAvatar name={coworker.name} size="md" />
                  </div>
                )}

                {/* Message content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="font-bold">
                      {message.role === "user" ? "You" : coworker.name}
                    </span>
                    <span className="font-mono text-sm text-muted-foreground">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap text-foreground">
                    {message.text}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator when sending */}
            {isSending && (
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <CoworkerAvatar name={coworker.name} size="md" />
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="font-bold">{coworker.name}</span>
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
      <footer className="border-t-2 border-foreground bg-background px-4 py-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${coworker.name}...`}
            disabled={isSending}
            className="flex-1 border-2 border-foreground bg-background px-4 py-3 font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isSending}
            className="border-2 border-foreground bg-foreground px-6 py-3 font-bold text-background hover:bg-secondary hover:text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}

// Typing indicator component - neo-brutalist style
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <div className="flex gap-1">
        <span
          className="h-2 w-2 animate-pulse bg-foreground"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-2 w-2 animate-pulse bg-foreground"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-2 w-2 animate-pulse bg-foreground"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <span className="ml-2 font-mono text-sm text-muted-foreground">
        typing...
      </span>
    </div>
  );
}
