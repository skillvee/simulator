"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Headphones } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { useCallContext } from "./slack-layout";
import { CoworkerAvatar } from "./coworker-avatar";
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
  const { activeCall, startCall } = useCallContext();
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
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex-1 min-h-0 shadow-sm flex flex-col" style={{background: "hsl(217, 20%, 16%)", border: "1px solid hsl(217, 15%, 25%)"}}>
        {/* Header */}
        <header className="shrink-0 h-16 flex items-center justify-between px-6" style={{borderBottom: "1px solid hsl(217, 15%, 25%)"}}>
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h2 className="text-lg font-bold" style={{color: "hsl(210, 10%, 93%)"}}>{coworker.name}</h2>
              <span className="text-xs" style={{color: "hsl(210, 10%, 60%)"}}>{coworker.role}</span>
            </div>
          </div>

          {/* Call Controls */}
          <div className="flex items-center gap-2">
            {isInCall ? (
              <div className="flex items-center gap-2 rounded-full bg-green-500 px-3 py-1.5 shadow-sm">
                <Headphones size={14} className="text-white" />
                <span className="text-sm font-medium text-white">In Call</span>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="shadow-sm rounded-full"
                onClick={() => startCall(coworker.id, "coworker")}
              >
                <Headphones className="h-4 w-4 mr-2" /> Start Call
              </Button>
            )}
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          <div className="py-6 space-y-6">
            {isLoading ? (
              <div className="flex h-full items-center justify-center py-20">
                <div style={{color: "hsl(210, 10%, 60%)"}}>Loading...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center py-20">
                <div className="mb-4">
                  <CoworkerAvatar
                    name={coworker.name}
                    avatarUrl={coworker.avatarUrl}
                    size="lg"
                    className="shadow-md border border-border"
                  />
                </div>
                <h2 className="mb-2 text-lg font-semibold" style={{color: "hsl(210, 10%, 93%)"}}>
                  Start a conversation with {coworker.name}
                </h2>
                <p className="max-w-md text-sm" style={{color: "hsl(210, 10%, 60%)"}}>
                  {coworker.name} is a {coworker.role}. Ask questions about the
                  project, codebase, or anything else you need help with.
                </p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => {
                  const isMe = message.role === "user";
                  return (
                    <div key={index} className={`flex gap-4 ${isMe ? "flex-row-reverse" : ""}`}>
                      {/* Avatar */}
                      {isMe ? (
                        <Avatar className="h-10 w-10 mt-1 shadow-sm border border-border">
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                            You
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <CoworkerAvatar
                          name={coworker.name}
                          avatarUrl={coworker.avatarUrl}
                          size="md"
                          className="mt-1 shadow-sm border border-border"
                        />
                      )}

                      {/* Message content */}
                      <div className={`flex flex-col max-w-[60%] ${isMe ? "items-end" : "items-start"}`}>
                        <div
                          className={`px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "rounded-bl-sm"
                          }`}
                          style={isMe ? {} : {background: "hsl(217, 20%, 22%)", color: "hsl(210, 10%, 93%)"}}
                        >
                          {message.text}
                        </div>
                        <span className="text-xs mt-1.5 font-medium px-1" style={{color: "hsl(210, 10%, 60%)"}}>
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Call Started Indicator */}
                {isInCall && (
                  <div className="flex justify-center my-6">
                    <div className="flex items-center gap-2 rounded-full px-4 py-1.5 shadow-sm" style={{background: "hsla(217, 20%, 22%, 0.5)", border: "1px solid hsl(217, 15%, 25%)"}}>
                      <div className="bg-green-100 dark:bg-green-900 p-1 rounded-full">
                        <Headphones className="h-3 w-3 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-xs font-medium" style={{color: "hsl(210, 10%, 93%)"}}>Call started</span>
                      <span className="text-[10px]" style={{color: "hsl(210, 10%, 60%)"}}>• Now</span>
                    </div>
                  </div>
                )}

                {/* Typing indicator */}
                {(isSending || isManagerTyping) && (
                  <div className="flex gap-4">
                    <CoworkerAvatar
                      name={coworker.name}
                      avatarUrl={coworker.avatarUrl}
                      size="md"
                      className="mt-1 shadow-sm border [border-color:hsl(var(--slack-border))]"
                    />
                    <div className="flex flex-col items-start">
                      <TypingIndicator />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="shrink-0 p-4" style={{borderTop: "1px solid hsl(217, 15%, 25%)"}}>
          <div className="flex items-center gap-2 p-2 pl-4 rounded-full focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all" style={{background: "hsl(217, 20%, 14%)", border: "1px solid hsl(217, 15%, 25%)"}}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={isSending}
              className="flex-1 bg-transparent border-none outline-none text-sm px-2"
              style={{color: "hsl(210, 10%, 93%)"}}
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || isSending}
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
    <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl rounded-bl-sm shadow-sm" style={{background: "hsl(217, 20%, 22%)"}}>
      <div className="flex gap-1">
        <span
          className="h-2 w-2 animate-pulse rounded-full"
          style={{background: "hsla(210, 10%, 60%, 0.6)", animationDelay: "0ms"}}
        />
        <span
          className="h-2 w-2 animate-pulse rounded-full"
          style={{background: "hsla(210, 10%, 60%, 0.6)", animationDelay: "150ms"}}
        />
        <span
          className="h-2 w-2 animate-pulse rounded-full"
          style={{background: "hsla(210, 10%, 60%, 0.6)", animationDelay: "300ms"}}
        />
      </div>
    </div>
  );
}
