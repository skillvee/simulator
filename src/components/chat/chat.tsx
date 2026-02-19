"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Headphones } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { useCallContext } from "./slack-layout";
import { CoworkerAvatar } from "./coworker-avatar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useManagerAutoStart } from "@/hooks";
import { playMessageSound, markUserInteraction } from "@/lib/sounds";
import type { ChatMessage, MessageReaction } from "@/types";

// Track which coworkers have already had sequential message reveal
// Module-level so it persists across remounts within the same session
const revealedCoworkers = new Set<string>();

interface Coworker {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

interface ChatProps {
  assessmentId: string;
  coworker: Coworker;
  onNewMessage?: (coworkerId: string) => void;
  /** Cached messages from parent — used to restore state instantly on coworker switch */
  cachedMessages?: ChatMessage[];
  /** Called whenever messages change so parent can cache them per-coworker */
  onMessagesChange?: (coworkerId: string, messages: ChatMessage[]) => void;
  /** Disable text input (e.g., during voice kickoff) */
  disableInput?: boolean;
  /** Reason displayed when input is disabled */
  disableReason?: string;
  /** Initial PR URL — if set and coworker is manager, enables defense mode */
  initialPrUrl?: string | null;
  /** Skip manager auto-start text messages (used when voice kickoff is active) */
  skipManagerAutoStart?: boolean;
}

// Note: PR submission handling and defense call flow will be implemented
// in RF-012 (Slack modifications). Defense now happens within the Slack
// interface - the candidate will call the manager after submitting a PR.

/**
 * Detect reactions based on user message content
 * Returns array of reactions that should be added to the user's message
 */
function detectReactions(userMessage: string, coworkerName: string, isFirstMessage: boolean): MessageReaction[] {
  const reactions: MessageReaction[] = [];
  const lowerMsg = userMessage.toLowerCase();

  // First message gets a wave
  if (isFirstMessage) {
    reactions.push({ emoji: "👋", reactorName: coworkerName });
    return reactions; // Only wave on first message, skip other reactions
  }

  // PR URL detection
  if (lowerMsg.includes("github.com") || lowerMsg.includes("gitlab.com") || lowerMsg.includes("bitbucket.org")) {
    reactions.push({ emoji: "👀", reactorName: coworkerName });
  }

  // Thank you detection
  if (lowerMsg.includes("thank") || lowerMsg.includes("thx") || lowerMsg.includes("thanks")) {
    reactions.push({ emoji: "👍", reactorName: coworkerName });
  }

  return reactions;
}

export function Chat({
  assessmentId,
  coworker,
  onNewMessage,
  cachedMessages,
  onMessagesChange,
  disableInput,
  disableReason,
  initialPrUrl,
  skipManagerAutoStart,
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(cachedMessages ?? []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [, setIsManagerTyping] = useState(false);
  const [isCoworkerTyping, setIsCoworkerTyping] = useState(false);
  const [userHasSentMessage, setUserHasSentMessage] = useState(false);
  const [defenseCallRequired, setDefenseCallRequired] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyLoadedRef = useRef<string | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Defense mode: disable text input when PR submitted and coworker is manager
  const isManagerCoworker = coworker.role.toLowerCase().includes("manager");
  const isDefenseMode = defenseCallRequired || !!(initialPrUrl && isManagerCoworker);
  const isInputDisabled = disableInput || isDefenseMode;

  // Check if currently in a call with this coworker
  const { activeCall, startCall } = useCallContext();
  const isInCall = activeCall?.coworkerId === coworker.id;

  // Function to start realistic typing pattern
  const startRealisticTyping = useCallback(() => {
    // Clear any existing typing interval
    if (typingIntervalRef.current) {
      clearTimeout(typingIntervalRef.current);
    }

    setIsCoworkerTyping(true);

    // Randomly decide the typing pattern (not always the same)
    const pattern = Math.random();

    if (pattern < 0.45) {
      // 45% - Just type continuously (most common in real chat)
      // No pauses, typing stays on until response arrives
      return;
    }

    if (pattern < 0.75) {
      // 30% - One brief pause (they're thinking mid-sentence)
      const firstTypingDuration = 2000 + Math.random() * 3000;
      typingIntervalRef.current = setTimeout(() => {
        setIsCoworkerTyping(false);
        const pauseDuration = 800 + Math.random() * 1200;
        typingIntervalRef.current = setTimeout(() => {
          setIsCoworkerTyping(true);
        }, pauseDuration);
      }, firstTypingDuration);
      return;
    }

    // 25% - Two pauses (rewriting/rethinking their response)
    let pauseCount = 0;
    const scheduleNextPause = () => {
      const typingDuration = 1500 + Math.random() * 2500;
      typingIntervalRef.current = setTimeout(() => {
        pauseCount++;
        if (pauseCount < 2) {
          setIsCoworkerTyping(false);
          const pauseDuration = 600 + Math.random() * 1000;
          typingIntervalRef.current = setTimeout(() => {
            setIsCoworkerTyping(true);
            scheduleNextPause();
          }, pauseDuration);
        }
        // After 2 pauses, stay typing until response arrives
      }, typingDuration);
    };
    scheduleNextPause();
  }, []);

  // Function to stop realistic typing pattern
  const stopRealisticTyping = useCallback(() => {
    if (typingIntervalRef.current) {
      clearTimeout(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setIsCoworkerTyping(false);
  }, []);

  // Callbacks for manager auto-start messages
  const handleManagerMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages((prev) => [...prev, ...newMessages]);
    // Notify parent component about new messages for unread count
    if (onNewMessage && newMessages.length > 0) {
      // Only count model messages (from the coworker)
      const modelMessages = newMessages.filter(msg => msg.role === 'model');
      modelMessages.forEach(() => {
        onNewMessage(coworker.id);
        // Play sound for each model message
        playMessageSound();
      });
    }
  }, [coworker.id, onNewMessage]);

  const handleTypingStart = useCallback(() => {
    setIsManagerTyping(true);
    startRealisticTyping();
  }, [startRealisticTyping]);

  const handleTypingEnd = useCallback(() => {
    setIsManagerTyping(false);
    stopRealisticTyping();
  }, [stopRealisticTyping]);

  // RF-015: Manager auto-start messages
  // Triggers initial manager messages after a short delay on first visit
  // When voice kickoff is active, skip text auto-delivery (messages come after call ends)
  const { managerId: autoStartManagerId } = useManagerAutoStart({
    assessmentId,
    currentCoworkerId: coworker.id,
    onMessagesReceived: handleManagerMessages,
    onTypingStart: handleTypingStart,
    onTypingEnd: handleTypingEnd,
    userHasSentMessage,
    skipAutoStart: skipManagerAutoStart,
  });

  // If we're viewing the manager's chat and messages haven't arrived yet,
  // show typing indicator instead of "Start a conversation" prompt
  const isManagerChat = autoStartManagerId === coworker.id;

  // Reveal manager-only history one message at a time with typing indicator
  const revealMessagesSequentially = useCallback(
    async (msgs: ChatMessage[]) => {
      for (let i = 0; i < msgs.length; i++) {
        // Show typing indicator before each message
        setIsCoworkerTyping(true);
        await new Promise((resolve) =>
          setTimeout(resolve, 1500 + Math.random() * 1500) // 1.5-3s typing
        );
        setIsCoworkerTyping(false);

        // Add this message
        setMessages((prev) => [...prev, msgs[i]]);
        playMessageSound();

        // Short pause between messages (0.5-1.5s)
        if (i < msgs.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 500 + Math.random() * 1000)
          );
        }
      }
    },
    []
  );

  // Sync messages back to parent cache whenever they change
  const onMessagesChangeRef = useRef(onMessagesChange);
  onMessagesChangeRef.current = onMessagesChange;
  useEffect(() => {
    if (messages.length > 0) {
      onMessagesChangeRef.current?.(coworker.id, messages);
    }
  }, [messages, coworker.id]);

  // Load chat history on mount
  // If we have cached messages, show them instantly but also fetch from API
  // in the background to fill in any messages missed during interrupted stagger delivery
  useEffect(() => {
    async function loadHistory() {
      // Prevent duplicate loads for the same coworker
      if (historyLoadedRef.current === coworker.id) return;
      historyLoadedRef.current = coworker.id;

      const hasCached = cachedMessages && cachedMessages.length > 0;

      // If we have cached messages, show them instantly (no loading state)
      // but still fetch from API below to reconcile any gaps
      if (!hasCached) {
        setIsLoading(true);
      }

      try {
        const data = await api<{ messages: ChatMessage[] }>(
          `/api/chat?assessmentId=${assessmentId}&coworkerId=${coworker.id}`
        );
        const history = data.messages || [];

        if (hasCached) {
          // Reconcile: if API has more messages than cache, update to full history
          if (history.length > (cachedMessages?.length ?? 0)) {
            setMessages(history);
          }
          // Otherwise cache is already up-to-date, no update needed
        } else {
          // No cache — first load for this coworker
          // If all messages are from the coworker (no user messages yet)
          // and we haven't revealed for this coworker before, reveal one-by-one
          const hasUserMessages = history.some((m) => m.role === "user");
          if (!hasUserMessages && history.length > 0 && !revealedCoworkers.has(coworker.id)) {
            revealedCoworkers.add(coworker.id);
            setIsLoading(false);
            await revealMessagesSequentially(history);
            return;
          } else {
            setMessages(history);
          }
        }
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load chat history:", err);
        historyLoadedRef.current = null; // Allow retry on error
        setIsLoading(false);
      }
    }
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, coworker.id, revealMessagesSequentially]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [coworker.id]);

  // Cleanup typing interval on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearTimeout(typingIntervalRef.current);
      }
    };
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isSending) return;

    // Mark that user has sent their first message
    if (!userHasSentMessage) {
      setUserHasSentMessage(true);
    }

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
      // Start API call immediately (runs in background during reading delay)
      const apiPromise = api<{
        response: string;
        timestamp: string;
        prSubmitted?: boolean;
        defenseCallRequired?: boolean;
      }>("/api/chat", {
        method: "POST",
        body: {
          assessmentId,
          coworkerId: coworker.id,
          message: userMessage.text,
        },
      });

      // Simulate "reading" delay before coworker starts typing
      // Longer messages take longer to read (~200ms per word, min 1.5s, max 5s)
      const wordCount = userMessage.text.split(/\s+/).length;
      const readingDelay = Math.min(5000, Math.max(1500, wordCount * 200)) + Math.random() * 1500;
      await new Promise(resolve => setTimeout(resolve, readingDelay));

      // Now start the realistic typing pattern (after they've "read" the message)
      startRealisticTyping();

      // Additional composing delay based on coworker response speed
      const getResponseDelay = (role: string): number => {
        const isManager = role.toLowerCase().includes("manager");
        if (isManager) return 2000 + Math.random() * 3000;  // 2-5s
        return 5000 + Math.random() * 10000;  // 5-15s
      };

      const delay = getResponseDelay(coworker.role);
      const delayPromise = new Promise(resolve => setTimeout(resolve, delay));

      // Wait for both API response and composing delay
      const [data] = await Promise.all([apiPromise, delayPromise]);

      const modelMessage: ChatMessage = {
        role: "model",
        text: data.response,
        timestamp: data.timestamp,
      };

      // Stop typing indicator before adding message
      stopRealisticTyping();

      setMessages((prev) => [...prev, modelMessage]);

      // Play notification sound for model message
      playMessageSound();

      // Notify parent component about new message for unread count
      if (onNewMessage) {
        onNewMessage(coworker.id);
      }

      // Detect if reactions should be added to the user's message
      // Count user messages before this one to detect first message
      const userMessageCountBefore = messages.filter(m => m.role === "user").length;
      const isFirstUserMessage = userMessageCountBefore === 0;
      const reactions = detectReactions(userMessage.text, coworker.name, isFirstUserMessage);

      // Add reactions with a delay (2-5 seconds) if any were detected
      if (reactions.length > 0) {
        const delay = 2000 + Math.random() * 3000;
        setTimeout(() => {
          setMessages(prev => {
            // Find the user message we just added (should be second to last now)
            const userMsgIndex = prev.length - 2;
            if (userMsgIndex >= 0 && prev[userMsgIndex].role === "user") {
              return prev.map((msg, idx) =>
                idx === userMsgIndex ? { ...msg, reactions } : msg
              );
            }
            return prev;
          });
        }, delay);
      }

      // Enable defense mode when PR is submitted — disables text input
      if (data.prSubmitted || data.defenseCallRequired) {
        setDefenseCallRequired(true);
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
      // Ensure typing is stopped even on error
      stopRealisticTyping();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Mark user interaction for autoplay policy compliance
    markUserInteraction();
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
      <div className="flex-1 min-h-0 shadow-sm flex flex-col" style={{background: "hsl(var(--slack-bg-main))", border: "1px solid hsl(var(--slack-border))"}}>
        {/* Header */}
        <header className="shrink-0 h-16 flex items-center justify-between px-6" style={{borderBottom: "1px solid hsl(var(--slack-border))"}}>
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h2 className="text-lg font-bold" style={{color: "hsl(var(--slack-text))"}}>{coworker.name}</h2>
              <span className="text-xs" style={{color: "hsl(var(--slack-text-muted))"}}>{coworker.role}</span>
            </div>
          </div>

          {/* Call Controls */}
          <div className="flex items-center gap-2">
            {isInCall ? (
              <div className="flex items-center gap-2 rounded-full bg-green-500 px-3 py-1.5 shadow-sm">
                <Headphones size={14} className="text-white" />
                <span className="text-sm font-medium text-white">In Call</span>
              </div>
            ) : isDefenseMode ? (
              <Button
                size="sm"
                className="shadow-sm rounded-full animate-pulse bg-primary text-primary-foreground"
                onClick={() => startCall(coworker.id, "coworker")}
              >
                <Headphones className="h-4 w-4 mr-2" /> Call Manager
              </Button>
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
                <div style={{color: "hsl(var(--slack-text-muted))"}}>Loading...</div>
              </div>
            ) : messages.length === 0 ? (
              isManagerChat ? (
                // Manager will auto-start — show typing indicator so the candidate
                // knows they don't need to initiate
                <div className="flex h-full flex-col justify-end pb-4">
                  <div className="flex gap-4">
                    <CoworkerAvatar
                      name={coworker.name}
                      avatarUrl={coworker.avatarUrl}
                      size="md"
                      className="mt-1 shadow-sm border border-border"
                    />
                    <div className="flex flex-col items-start">
                      <TypingIndicator coworkerName={coworker.name} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center py-20">
                  <div className="mb-4">
                    <CoworkerAvatar
                      name={coworker.name}
                      avatarUrl={coworker.avatarUrl}
                      size="lg"
                      className="shadow-md border border-border"
                    />
                  </div>
                  <h2 className="mb-2 text-lg font-semibold" style={{color: "hsl(var(--slack-text))"}}>
                    Start a conversation with {coworker.name}
                  </h2>
                  <p className="max-w-md text-sm" style={{color: "hsl(var(--slack-text-muted))"}}>
                    {coworker.name} is a {coworker.role}. Ask questions about the
                    project, codebase, or anything else you need help with.
                  </p>
                </div>
              )
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
                          style={isMe ? {} : {background: "hsl(var(--slack-bg-surface))", color: "hsl(var(--slack-text))"}}
                        >
                          {message.text}
                        </div>

                        {/* Reactions */}
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex gap-1 mt-1 px-1">
                            {message.reactions.map((reaction, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full cursor-default hover:bg-opacity-80 transition-colors"
                                style={{
                                  background: "hsl(var(--slack-bg-surface))",
                                  border: "1px solid hsl(var(--slack-border))"
                                }}
                                title={`${reaction.reactorName} reacted`}
                              >
                                <span>{reaction.emoji}</span>
                                <span className="text-xs" style={{color: "hsl(var(--slack-text-muted))"}}>1</span>
                              </span>
                            ))}
                          </div>
                        )}

                        <span className="text-xs mt-1.5 font-medium px-1" style={{color: "hsl(var(--slack-text-muted))"}}>
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Call Started Indicator */}
                {isInCall && (
                  <div className="flex justify-center my-6">
                    <div className="flex items-center gap-2 rounded-full px-4 py-1.5 shadow-sm" style={{background: "hsla(var(--slack-bg-surface), 0.5)", border: "1px solid hsl(var(--slack-border))"}}>
                      <div className="bg-green-900 p-1 rounded-full">
                        <Headphones className="h-3 w-3 text-green-400" />
                      </div>
                      <span className="text-xs font-medium" style={{color: "hsl(var(--slack-text))"}}>Call started</span>
                      <span className="text-[10px]" style={{color: "hsl(var(--slack-text-muted))"}}>• Now</span>
                    </div>
                  </div>
                )}

                {/* Typing indicator */}
                {isCoworkerTyping && (
                  <div className="flex gap-4">
                    <CoworkerAvatar
                      name={coworker.name}
                      avatarUrl={coworker.avatarUrl}
                      size="md"
                      className="mt-1 shadow-sm border [border-color:hsl(var(--slack-border))]"
                    />
                    <div className="flex flex-col items-start">
                      <TypingIndicator coworkerName={coworker.name} />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="shrink-0 p-4" style={{borderTop: "1px solid hsl(var(--slack-border))"}}>
          {isInputDisabled ? (
            <div className="flex items-center justify-center gap-3 py-3 px-4 rounded-full" style={{background: "hsl(var(--slack-bg-surface))", border: "1px solid hsl(var(--slack-border))"}}>
              <Headphones className="h-4 w-4 shrink-0" style={{color: "hsl(var(--slack-text-muted))"}} />
              <span className="text-sm" style={{color: "hsl(var(--slack-text-muted))"}}>
                {isDefenseMode
                  ? "Call your manager to walk through your PR"
                  : disableReason || "Text input is disabled"}
              </span>
              {isDefenseMode && !isInCall && (
                <Button
                  size="sm"
                  className="rounded-full ml-2 shrink-0"
                  onClick={() => startCall(coworker.id, "coworker")}
                >
                  <Headphones className="h-3 w-3 mr-1" /> Call Now
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 pl-4 rounded-full focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all" style={{background: "hsl(var(--slack-bg-input))", border: "1px solid hsl(var(--slack-border))"}}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onClick={() => markUserInteraction()}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                disabled={isSending}
                className="flex-1 bg-transparent border-none outline-none text-sm px-2 placeholder:text-slate-500"
                style={{color: "hsl(var(--slack-text))"}}
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
          )}
        </div>
      </div>
    </div>
  );
}

// Typing indicator component - matches bubble style
function TypingIndicator({ coworkerName }: { coworkerName: string }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl rounded-bl-sm shadow-sm" style={{background: "hsl(var(--slack-bg-surface))"}}>
        <div className="flex gap-1">
          <span
            className="h-2 w-2 animate-pulse rounded-full"
            style={{background: "hsla(var(--slack-text-muted), 0.6)", animationDelay: "0ms"}}
          />
          <span
            className="h-2 w-2 animate-pulse rounded-full"
            style={{background: "hsla(var(--slack-text-muted), 0.6)", animationDelay: "150ms"}}
          />
          <span
            className="h-2 w-2 animate-pulse rounded-full"
            style={{background: "hsla(var(--slack-text-muted), 0.6)", animationDelay: "300ms"}}
          />
        </div>
      </div>
      <span className="text-xs px-2" style={{color: "hsl(var(--slack-text-muted))"}}>
        {coworkerName} is typing...
      </span>
    </div>
  );
}
