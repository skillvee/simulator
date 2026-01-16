"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ScenarioBuilderData } from "@/lib/scenario-builder";
import { Markdown } from "@/components/markdown";

interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export function ScenarioBuilderClient() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scenarioData, setScenarioData] = useState<ScenarioBuilderData>({});
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load initial greeting
  useEffect(() => {
    async function loadGreeting() {
      try {
        const response = await fetch("/api/admin/scenarios/builder");
        if (response.ok) {
          const data = await response.json();
          setMessages([
            {
              role: "model",
              text: data.greeting,
              timestamp: data.timestamp,
            },
          ]);
        } else {
          setError("Failed to start the scenario builder");
        }
      } catch (err) {
        console.error("Failed to load greeting:", err);
        setError("Failed to connect to the scenario builder");
      } finally {
        setIsLoading(false);
      }
    }
    loadGreeting();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when loading completes
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

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
    setError(null);

    try {
      const response = await fetch("/api/admin/scenarios/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.text,
          history: messages,
          scenarioData,
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

        // Update scenario data if AI extracted new information
        if (data.scenarioData) {
          setScenarioData(data.scenarioData);
        }
      } else {
        // Remove the optimistic message on error
        setMessages((prev) => prev.slice(0, -1));
        setError("Failed to send message");
      }
    } catch (err) {
      // Remove the optimistic message on error
      setMessages((prev) => prev.slice(0, -1));
      setError("Failed to send message");
      console.error("Failed to send message:", err);
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

  const saveScenario = async () => {
    if (isSaving) return;

    // Validate required fields
    const missing: string[] = [];
    if (!scenarioData.name) missing.push("name");
    if (!scenarioData.companyName) missing.push("company name");
    if (!scenarioData.companyDescription) missing.push("company description");
    if (!scenarioData.taskDescription) missing.push("task description");
    if (!scenarioData.repoUrl) missing.push("repository URL");
    if (!scenarioData.coworkers || scenarioData.coworkers.length === 0) {
      missing.push("at least one coworker");
    }

    if (missing.length > 0) {
      setError(`Missing required fields: ${missing.join(", ")}`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // First, create the scenario
      const scenarioResponse = await fetch("/api/admin/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: scenarioData.name,
          companyName: scenarioData.companyName,
          companyDescription: scenarioData.companyDescription,
          taskDescription: scenarioData.taskDescription,
          repoUrl: scenarioData.repoUrl,
          techStack: scenarioData.techStack || [],
          isPublished: false,
        }),
      });

      if (!scenarioResponse.ok) {
        const errData = await scenarioResponse.json();
        throw new Error(errData.error || "Failed to create scenario");
      }

      const { scenario } = await scenarioResponse.json();

      // Then, create each coworker
      if (scenarioData.coworkers) {
        for (const coworker of scenarioData.coworkers) {
          const coworkerResponse = await fetch(
            `/api/admin/scenarios/${scenario.id}/coworkers`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: coworker.name,
                role: coworker.role,
                personaStyle: coworker.personaStyle,
                knowledge: coworker.knowledge,
              }),
            }
          );

          if (!coworkerResponse.ok) {
            console.error("Failed to create coworker:", coworker.name);
          }
        }
      }

      // Navigate to the scenario detail/edit page
      router.push(`/admin/scenarios`);
    } catch (err) {
      console.error("Failed to save scenario:", err);
      setError(err instanceof Error ? err.message : "Failed to save scenario");
    } finally {
      setIsSaving(false);
    }
  };

  // Check if scenario is ready to save
  const isReadyToSave =
    scenarioData.name &&
    scenarioData.companyName &&
    scenarioData.companyDescription &&
    scenarioData.taskDescription &&
    scenarioData.repoUrl &&
    scenarioData.coworkers &&
    scenarioData.coworkers.length > 0 &&
    scenarioData.coworkers.some(
      (c) => c.name && c.role && c.personaStyle && c.knowledge.length > 0
    );

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Chat Panel */}
      <div className="flex-1 flex flex-col border-r-2 border-foreground">
        {/* Header */}
        <header className="border-b-2 border-foreground bg-background px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary border-2 border-foreground flex items-center justify-center">
            <span className="font-bold text-secondary-foreground text-sm font-mono">
              AI
            </span>
          </div>
          <div>
            <h1 className="font-bold text-lg">Scenario Builder</h1>
            <p className="text-sm text-muted-foreground">
              Chat with AI to create your scenario
            </p>
          </div>
          <Link
            href="/admin/scenarios"
            className="ml-auto font-mono text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Link>
        </header>

        {/* Messages area */}
        <main className="flex-1 overflow-auto px-4 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground font-mono">Loading...</div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
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
                      {message.role === "user" ? "You" : "AI"}
                    </span>
                  </div>

                  {/* Message content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-bold">
                        {message.role === "user" ? "You" : "Scenario Builder"}
                      </span>
                      <span className="text-sm text-muted-foreground font-mono">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <div className="text-foreground">
                      <Markdown>{message.text}</Markdown>
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator when sending */}
              {isSending && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-secondary border-2 border-foreground flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-secondary-foreground text-sm font-mono">
                      AI
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-bold">Scenario Builder</span>
                    </div>
                    <TypingIndicator />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Error message */}
        {error && (
          <div className="px-4 py-2 bg-red-100 border-t-2 border-red-500 text-red-700 font-mono text-sm">
            {error}
          </div>
        )}

        {/* Input area */}
        <footer className="border-t-2 border-foreground bg-background px-4 py-3">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your scenario..."
              disabled={isSending || isLoading}
              className="flex-1 px-4 py-3 border-2 border-foreground bg-background text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isSending || isLoading}
              className="px-6 py-3 bg-foreground text-background font-bold border-2 border-foreground hover:bg-secondary hover:text-secondary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </footer>
      </div>

      {/* Preview Panel */}
      <div className="w-96 flex flex-col bg-muted/20">
        <header className="border-b-2 border-foreground bg-background px-4 py-3">
          <h2 className="font-bold text-lg">Preview</h2>
          <p className="text-sm text-muted-foreground">
            Scenario data collected so far
          </p>
        </header>

        <div className="flex-1 overflow-auto p-4">
          <ScenarioPreview data={scenarioData} />
        </div>

        <footer className="border-t-2 border-foreground bg-background p-4">
          <button
            onClick={saveScenario}
            disabled={!isReadyToSave || isSaving}
            className={`w-full px-6 py-3 font-bold border-2 border-foreground ${
              isReadyToSave
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {isSaving ? "Saving..." : "Save Scenario"}
          </button>
          {!isReadyToSave && (
            <p className="text-xs text-muted-foreground mt-2 text-center font-mono">
              Complete all required fields to save
            </p>
          )}
        </footer>
      </div>
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
        thinking...
      </span>
    </div>
  );
}

// Preview component
function ScenarioPreview({ data }: { data: ScenarioBuilderData }) {
  const hasAnyData =
    data.name ||
    data.companyName ||
    data.companyDescription ||
    data.taskDescription ||
    data.repoUrl ||
    (data.techStack && data.techStack.length > 0) ||
    (data.coworkers && data.coworkers.length > 0);

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="w-16 h-16 bg-muted border-2 border-foreground flex items-center justify-center mb-4">
          <span className="text-2xl">?</span>
        </div>
        <p className="text-muted-foreground text-sm">
          Start chatting to build your scenario. Information will appear here as
          it's collected.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Basic Info Section */}
      <div className="space-y-2">
        <h3 className="font-bold text-sm font-mono text-muted-foreground uppercase tracking-wider">
          Basic Info
        </h3>
        <div className="space-y-2">
          <PreviewField label="Name" value={data.name} />
          <PreviewField label="Company" value={data.companyName} />
          <PreviewField
            label="Description"
            value={data.companyDescription}
            truncate
            markdown
          />
          <PreviewField
            label="Task"
            value={data.taskDescription}
            truncate
            markdown
          />
          <PreviewField label="Repo" value={data.repoUrl} />
          {data.techStack && data.techStack.length > 0 && (
            <div>
              <span className="text-sm font-mono text-muted-foreground">
                Tech Stack:
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {data.techStack.map((tech, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs font-mono border border-foreground bg-muted"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Coworkers Section */}
      {data.coworkers && data.coworkers.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm font-mono text-muted-foreground uppercase tracking-wider">
            Coworkers ({data.coworkers.length})
          </h3>
          <div className="space-y-3">
            {data.coworkers.map((coworker, i) => (
              <div
                key={i}
                className="border-2 border-foreground bg-background p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-secondary border-2 border-foreground flex items-center justify-center">
                    <span className="font-bold text-xs font-mono">
                      {coworker.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <div className="font-bold text-sm">{coworker.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {coworker.role}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {coworker.personaStyle}
                </div>
                <div className="text-xs font-mono">
                  {coworker.knowledge.length} knowledge item
                  {coworker.knowledge.length !== 1 ? "s" : ""}
                  {coworker.knowledge.filter((k) => k.isCritical).length > 0 && (
                    <span className="ml-1 text-secondary">
                      ({coworker.knowledge.filter((k) => k.isCritical).length}{" "}
                      critical)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewField({
  label,
  value,
  truncate,
  markdown,
}: {
  label: string;
  value?: string;
  truncate?: boolean;
  markdown?: boolean;
}) {
  if (!value) {
    return (
      <div className="opacity-50">
        <span className="text-sm font-mono text-muted-foreground">
          {label}:
        </span>
        <span className="text-sm text-muted-foreground ml-1 italic">
          Not set
        </span>
      </div>
    );
  }

  const displayValue = truncate && value.length > 100 ? value.slice(0, 100) + "..." : value;

  return (
    <div>
      <span className="text-sm font-mono text-muted-foreground">{label}:</span>
      {markdown ? (
        <div className="text-sm mt-1">
          <Markdown>{displayValue}</Markdown>
        </div>
      ) : (
        <span className="text-sm ml-1">{displayValue}</span>
      )}
    </div>
  );
}
