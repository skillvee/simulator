"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ScenarioBuilderData } from "@/lib/scenarios";
import { Markdown } from "@/components/shared";
import type { ChatMessage } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, FileQuestion } from "lucide-react";

export function RecruiterScenarioBuilderClient() {
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

  // Load initial greeting from recruiter API
  useEffect(() => {
    async function loadGreeting() {
      try {
        const response = await fetch("/api/recruiter/simulations/builder");
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
          setError("Failed to start the simulation builder");
        }
      } catch (err) {
        console.error("Failed to load greeting:", err);
        setError("Failed to connect to the simulation builder");
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
      const response = await fetch("/api/recruiter/simulations/builder", {
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
      // Create the simulation using recruiter API (auto-sets createdById and isPublished)
      const scenarioResponse = await fetch("/api/recruiter/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: scenarioData.name,
          companyName: scenarioData.companyName,
          companyDescription: scenarioData.companyDescription,
          taskDescription: scenarioData.taskDescription,
          techStack: scenarioData.techStack || [],
          // Note: isPublished is auto-set to true by the recruiter API
          // Note: repoUrl is omitted - it will be provisioned by the system
        }),
      });

      if (!scenarioResponse.ok) {
        const errData = await scenarioResponse.json();
        throw new Error(errData.error || "Failed to create simulation");
      }

      const { data } = await scenarioResponse.json();
      const { scenario } = data;

      // Create each coworker using recruiter API
      if (scenarioData.coworkers) {
        for (const coworker of scenarioData.coworkers) {
          const coworkerResponse = await fetch(
            `/api/recruiter/simulations/${scenario.id}/coworkers`,
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

      // Trigger avatar generation in the background (RF-021)
      // Don't await - let it run asynchronously
      fetch("/api/avatar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id }),
      }).catch((err) => {
        // Log but don't block navigation
        console.error("Avatar generation trigger failed:", err);
      });

      // Navigate to the recruiter simulations list
      router.push(`/recruiter/simulations`);
    } catch (err) {
      console.error("Failed to save simulation:", err);
      setError(err instanceof Error ? err.message : "Failed to save simulation");
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
    scenarioData.coworkers &&
    scenarioData.coworkers.length > 0 &&
    scenarioData.coworkers.some(
      (c) => c.name && c.role && c.personaStyle && c.knowledge.length > 0
    );

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Chat Panel */}
      <div className="flex flex-1 flex-col border-r border-border">
        {/* Header */}
        <header className="flex h-[72px] items-center gap-3 border-b border-border bg-background px-4">
          <Avatar>
            <AvatarFallback className="bg-primary text-primary-foreground">
              AI
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg font-semibold">Simulation Builder</h1>
            <p className="text-sm text-muted-foreground">
              Chat with AI to create your simulation
            </p>
          </div>
          <Button variant="ghost" asChild className="ml-auto text-muted-foreground">
            <Link href="/recruiter/simulations">Cancel</Link>
          </Button>
        </header>

        {/* Messages area */}
        <main className="flex-1 overflow-auto px-4 py-6">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((message, index) => (
                <div key={index} className="flex gap-3">
                  {/* Avatar */}
                  <Avatar className="flex-shrink-0">
                    <AvatarFallback
                      className={
                        message.role === "user"
                          ? "bg-foreground text-background"
                          : "bg-primary text-primary-foreground"
                      }
                    >
                      {message.role === "user" ? "You" : "AI"}
                    </AvatarFallback>
                  </Avatar>

                  {/* Message content */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-baseline gap-2">
                      <span className="font-semibold">
                        {message.role === "user" ? "You" : "Simulation Builder"}
                      </span>
                      <span className="text-sm text-muted-foreground">
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
                  <Avatar className="flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      AI
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="mb-1 flex items-baseline gap-2">
                      <span className="font-semibold">Simulation Builder</span>
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
          <div className="border-t border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Input area */}
        <footer className="flex h-[72px] items-center border-t border-border bg-background px-4">
          <div className="mx-auto flex w-full max-w-3xl gap-2">
            <Input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your simulation..."
              disabled={isSending || isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isSending || isLoading}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </footer>
      </div>

      {/* Preview Panel */}
      <div className="flex w-96 flex-col bg-muted/20">
        <header className="flex h-[72px] flex-col justify-center border-b border-border bg-background px-4">
          <h2 className="text-lg font-semibold">Preview</h2>
          <p className="text-sm text-muted-foreground">
            Simulation data collected so far
          </p>
        </header>

        <div className="flex-1 overflow-auto p-4">
          <ScenarioPreview data={scenarioData} />
        </div>

        <footer className="flex h-[72px] flex-col justify-center border-t border-border bg-background px-4">
          <Button
            onClick={saveScenario}
            disabled={!isReadyToSave || isSaving}
            className="w-full"
          >
            {isSaving ? "Saving..." : "Save Simulation"}
          </Button>
          {!isReadyToSave && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Complete all required fields to save
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}

// Typing indicator component - modern style
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <div className="flex gap-1">
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-primary"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-primary"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-primary"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <span className="ml-2 text-sm text-muted-foreground">
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
    (data.techStack && data.techStack.length > 0) ||
    (data.coworkers && data.coworkers.length > 0);

  if (!hasAnyData) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <FileQuestion className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          Start chatting to build your simulation. Information will appear here as
          it&apos;s collected.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Basic Info Section */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
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
          {data.techStack && data.techStack.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">
                Tech Stack:
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {data.techStack.map((tech, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Coworkers Section */}
      {data.coworkers && data.coworkers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Coworkers ({data.coworkers.length})
          </h3>
          <div className="space-y-3">
            {data.coworkers.map((coworker, i) => (
              <Card key={i} className="p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {coworker.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-semibold">{coworker.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {coworker.role}
                    </div>
                  </div>
                </div>
                <div className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                  {coworker.personaStyle}
                </div>
                <div className="text-xs">
                  {coworker.knowledge.length} knowledge item
                  {coworker.knowledge.length !== 1 ? "s" : ""}
                  {coworker.knowledge.filter((k) => k.isCritical).length >
                    0 && (
                    <span className="ml-1 text-primary">
                      ({coworker.knowledge.filter((k) => k.isCritical).length}{" "}
                      critical)
                    </span>
                  )}
                </div>
              </Card>
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
        <span className="text-sm text-muted-foreground">
          {label}:
        </span>
        <span className="ml-1 text-sm italic text-muted-foreground">
          Not set
        </span>
      </div>
    );
  }

  const displayValue =
    truncate && value.length > 100 ? value.slice(0, 100) + "..." : value;

  return (
    <div>
      <span className="text-sm text-muted-foreground">{label}:</span>
      {markdown ? (
        <div className="mt-1 text-sm">
          <Markdown>{displayValue}</Markdown>
        </div>
      ) : (
        <span className="ml-1 text-sm">{displayValue}</span>
      )}
    </div>
  );
}
