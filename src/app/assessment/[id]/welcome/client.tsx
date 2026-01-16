"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface WelcomeClientProps {
  assessmentId: string;
  userName: string;
  managerName: string;
  managerRole: string;
  managerAvatar: string | null;
  companyName: string;
  repoUrl: string;
  taskDescription: string;
}

interface Message {
  id: string;
  content: string;
  timestamp: string;
  isTyping?: boolean;
}

export function WelcomeClient({
  assessmentId,
  userName,
  managerName,
  managerRole,
  companyName,
  repoUrl,
  taskDescription,
}: WelcomeClientProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showContinue, setShowContinue] = useState(false);

  // Manager's welcome messages
  const welcomeMessages: Omit<Message, "id" | "isTyping">[] = [
    {
      content: `Hey ${userName}! Welcome to ${companyName}! I'm so glad to have you on the team.`,
      timestamp: "10:01 AM",
    },
    {
      content: `I'm ${managerName}, your ${managerRole}. I'll be helping you get up to speed and supporting you throughout your work here.`,
      timestamp: "10:01 AM",
    },
    {
      content: `Let's schedule a quick kickoff call to go over your first task and answer any questions you might have. Sound good?`,
      timestamp: "10:02 AM",
    },
    {
      content: `In the meantime, you can check out the repo here: ${repoUrl}`,
      timestamp: "10:02 AM",
    },
    {
      content: `Here's a quick preview of what you'll be working on:\n\n"${taskDescription.slice(0, 200)}${taskDescription.length > 200 ? "..." : ""}"`,
      timestamp: "10:03 AM",
    },
    {
      content: `When you're ready, hop on the kickoff call and we'll dive into the details together!`,
      timestamp: "10:03 AM",
    },
  ];

  // Typewriter effect for messages
  useEffect(() => {
    if (currentMessageIndex >= welcomeMessages.length) {
      // All messages shown, enable continue button
      setTimeout(() => setShowContinue(true), 500);
      return;
    }

    // Add typing indicator
    const typingId = `typing-${currentMessageIndex}`;
    setMessages((prev) => [
      ...prev,
      { id: typingId, content: "", timestamp: "", isTyping: true },
    ]);

    // Simulate typing delay (varies by message length)
    const typingDelay = Math.min(
      800 + welcomeMessages[currentMessageIndex].content.length * 10,
      2000
    );

    const timer = setTimeout(() => {
      // Remove typing indicator and add actual message
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== typingId);
        return [
          ...filtered,
          {
            id: `msg-${currentMessageIndex}`,
            ...welcomeMessages[currentMessageIndex],
          },
        ];
      });
      setCurrentMessageIndex((prev) => prev + 1);
    }, typingDelay);

    return () => clearTimeout(timer);
  }, [currentMessageIndex, welcomeMessages.length]);

  const handleScheduleCall = () => {
    router.push(`/assessment/${assessmentId}/kickoff`);
  };

  // Get manager initials for avatar
  const managerInitials = managerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - Slack-like channel header */}
      <header className="border-b-2 border-foreground bg-background">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Manager avatar */}
          <div className="w-10 h-10 bg-secondary border-2 border-foreground flex items-center justify-center">
            <span className="font-bold text-secondary-foreground text-sm font-mono">
              {managerInitials}
            </span>
          </div>
          <div>
            <h1 className="font-bold text-lg">{managerName}</h1>
            <p className="text-sm text-muted-foreground">{managerRole}</p>
          </div>
          {/* Online indicator */}
          <div className="ml-auto flex items-center gap-2">
            <div className="w-3 h-3 bg-secondary border border-foreground" />
            <span className="text-sm text-muted-foreground font-mono">
              online
            </span>
          </div>
        </div>
      </header>

      {/* Chat area */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Date divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm font-mono text-muted-foreground px-2 border border-foreground bg-background">
              Today
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Messages */}
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 bg-secondary border-2 border-foreground flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-secondary-foreground text-sm font-mono">
                    {managerInitials}
                  </span>
                </div>

                {/* Message content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-bold">{managerName}</span>
                    {!message.isTyping && (
                      <span className="text-sm text-muted-foreground font-mono">
                        {message.timestamp}
                      </span>
                    )}
                  </div>

                  {message.isTyping ? (
                    <TypingIndicator />
                  ) : (
                    <div className="text-foreground whitespace-pre-wrap">
                      {formatMessageContent(message.content, repoUrl)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer - Action area */}
      <footer className="border-t-2 border-foreground bg-background">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div
            style={{
              opacity: showContinue ? 1 : 0,
              pointerEvents: showContinue ? "auto" : "none",
            }}
          >
            <button
              onClick={handleScheduleCall}
              className="w-full bg-foreground text-background px-6 py-4 font-bold text-lg border-4 border-foreground hover:bg-secondary hover:text-secondary-foreground"
            >
              Join Kickoff Call
            </button>
            <p className="mt-2 text-center text-sm text-muted-foreground font-mono">
              Your manager is waiting to brief you on your first task
            </p>
          </div>
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

// Format message content with links
function formatMessageContent(content: string, repoUrl: string) {
  // Check if content contains the repo URL
  if (content.includes(repoUrl)) {
    const parts = content.split(repoUrl);
    return (
      <>
        {parts[0]}
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-secondary bg-foreground px-1 hover:underline font-mono"
        >
          {repoUrl}
        </a>
        {parts[1]}
      </>
    );
  }
  return content;
}
