"use client";

import { useState, useEffect, useRef } from "react";

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
  onDoneClick?: () => void;
  showDoneButton?: boolean;
}

export function Chat({ assessmentId, coworker, onDoneClick, showDoneButton }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get coworker initials for avatar
  const initials = coworker.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Load chat history on mount
  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/chat?assessmentId=${assessmentId}&coworkerId=${coworker.id}`
        );
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId,
          coworkerId: coworker.id,
          message: userMessage.text,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const modelMessage: ChatMessage = {
          role: "model",
          text: data.response,
          timestamp: data.timestamp,
        };
        setMessages((prev) => [...prev, modelMessage]);
      } else {
        // Remove the optimistic message on error
        setMessages((prev) => prev.slice(0, -1));
        console.error("Failed to send message");
      }
    } catch (error) {
      // Remove the optimistic message on error
      setMessages((prev) => prev.slice(0, -1));
      console.error("Failed to send message:", error);
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="border-b-2 border-foreground bg-background px-4 py-3 flex items-center gap-3">
        {/* Coworker avatar */}
        <div className="w-10 h-10 bg-secondary border-2 border-foreground flex items-center justify-center">
          <span className="font-bold text-secondary-foreground text-sm font-mono">
            {initials}
          </span>
        </div>
        <div>
          <h1 className="font-bold text-lg">{coworker.name}</h1>
          <p className="text-sm text-muted-foreground">{coworker.role}</p>
        </div>
        {/* Online indicator */}
        <div className="ml-auto flex items-center gap-2">
          <div className="w-3 h-3 bg-secondary border border-foreground" />
          <span className="text-sm text-muted-foreground font-mono">online</span>
        </div>
      </header>

      {/* Messages area */}
      <main className="flex-1 overflow-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground font-mono">Loading...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-secondary border-2 border-foreground flex items-center justify-center mb-4">
              <span className="font-bold text-secondary-foreground text-2xl font-mono">
                {initials}
              </span>
            </div>
            <h2 className="font-bold text-lg mb-2">
              Start a conversation with {coworker.name}
            </h2>
            <p className="text-muted-foreground text-sm max-w-md">
              {coworker.name} is a {coworker.role}. Ask questions about the
              project, codebase, or anything else you need help with.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Date divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm font-mono text-muted-foreground px-2 border border-foreground bg-background">
                Today
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {messages.map((message, index) => (
              <div key={index} className="flex gap-3">
                {/* Avatar */}
                <div
                  className={`w-10 h-10 border-2 border-foreground flex items-center justify-center flex-shrink-0 ${
                    message.role === "user" ? "bg-foreground" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`font-bold text-sm font-mono ${
                      message.role === "user"
                        ? "text-background"
                        : "text-secondary-foreground"
                    }`}
                  >
                    {message.role === "user" ? "You" : initials}
                  </span>
                </div>

                {/* Message content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-bold">
                      {message.role === "user" ? "You" : coworker.name}
                    </span>
                    <span className="text-sm text-muted-foreground font-mono">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <div className="text-foreground whitespace-pre-wrap">
                    {message.text}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator when sending */}
            {isSending && (
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-secondary border-2 border-foreground flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-secondary-foreground text-sm font-mono">
                    {initials}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
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
            className="flex-1 px-4 py-3 border-2 border-foreground bg-background text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isSending}
            className="px-6 py-3 bg-foreground text-background font-bold border-2 border-foreground hover:bg-secondary hover:text-secondary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
          {showDoneButton && onDoneClick && (
            <button
              onClick={onDoneClick}
              disabled={isSending}
              className="px-6 py-3 bg-secondary text-secondary-foreground font-bold border-2 border-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              I'm Done
            </button>
          )}
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
          className="w-2 h-2 bg-foreground animate-pulse"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-2 h-2 bg-foreground animate-pulse"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-2 h-2 bg-foreground animate-pulse"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <span className="text-sm text-muted-foreground ml-2 font-mono">
        typing...
      </span>
    </div>
  );
}
