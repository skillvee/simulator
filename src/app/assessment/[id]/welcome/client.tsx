"use client";

import { useState, useEffect } from "react";
import { Phone } from "lucide-react";
import { SlackLayout, useCallContext } from "@/components/chat";

interface Coworker {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

interface WelcomeClientProps {
  assessmentId: string;
  userName: string;
  managerId: string;
  managerName: string;
  managerRole: string;
  managerAvatar: string | null;
  companyName: string;
  repoUrl: string;
  taskDescription: string;
  coworkers: Coworker[];
}

interface Message {
  id: string;
  content: string;
  timestamp: string;
}

export function WelcomeClient({
  assessmentId,
  userName,
  managerId,
  managerName,
  managerRole,
  companyName,
  repoUrl,
  taskDescription,
  coworkers,
}: WelcomeClientProps) {
  return (
    <SlackLayout
      assessmentId={assessmentId}
      coworkers={coworkers}
      selectedCoworkerId={managerId}
    >
      <WelcomeContent
        userName={userName}
        managerId={managerId}
        managerName={managerName}
        managerRole={managerRole}
        companyName={companyName}
        repoUrl={repoUrl}
        taskDescription={taskDescription}
      />
    </SlackLayout>
  );
}

interface WelcomeContentProps {
  userName: string;
  managerId: string;
  managerName: string;
  managerRole: string;
  companyName: string;
  repoUrl: string;
  taskDescription: string;
}

function WelcomeContent({
  userName,
  managerId,
  managerName,
  managerRole,
  companyName,
  repoUrl,
  taskDescription,
}: WelcomeContentProps) {
  const { startCall, activeCall } = useCallContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isShowingTypingIndicator, setIsShowingTypingIndicator] =
    useState(false);

  // Manager's welcome messages
  const welcomeMessages: Omit<Message, "id">[] = [
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
      // All messages shown - hide typing indicator
      setIsShowingTypingIndicator(false);
      return;
    }

    // Show typing indicator
    setIsShowingTypingIndicator(true);

    // Simulate typing delay (varies by message length)
    const typingDelay = Math.min(
      800 + welcomeMessages[currentMessageIndex].content.length * 10,
      2000
    );

    const timer = setTimeout(() => {
      // Hide typing indicator and add actual message
      setIsShowingTypingIndicator(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${currentMessageIndex}`,
          ...welcomeMessages[currentMessageIndex],
        },
      ]);
      setCurrentMessageIndex((prev) => prev + 1);
    }, typingDelay);

    return () => clearTimeout(timer);
  }, [currentMessageIndex, welcomeMessages.length]);

  const handleScheduleCall = () => {
    // Start kickoff call using the floating call bar
    startCall(managerId, "kickoff");
  };

  // Get manager initials for avatar
  const managerInitials = managerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);


  // Check if currently in a call with the manager
  const isInCall = activeCall?.coworkerId === managerId;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header - Slack-like channel header */}
      <header className="border-b-2 border-foreground bg-background">
        <div className="flex items-center gap-3 px-4 py-3 md:px-6">
          {/* Spacer for mobile menu button */}
          <div className="w-10 md:hidden" />
          {/* Manager avatar */}
          <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-secondary">
            <span className="font-mono text-sm font-bold text-secondary-foreground">
              {managerInitials}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{managerName}</h1>
            <p className="text-sm text-muted-foreground">{managerRole}</p>
          </div>
          {/* Call button */}
          <button
            onClick={handleScheduleCall}
            disabled={isInCall}
            className={`border-2 border-foreground p-2 ${
              isInCall
                ? "cursor-not-allowed bg-muted text-muted-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-foreground hover:text-background"
            }`}
            aria-label={isInCall ? "In call" : `Call ${managerName}`}
          >
            <Phone size={20} />
          </button>
        </div>
      </header>

      {/* Chat area */}
      <main className="flex-1 overflow-auto">
        <div className="px-4 py-6 md:px-6">
          {/* Date divider */}
          <div className="mb-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="border border-foreground bg-background px-2 font-mono text-sm text-muted-foreground">
              Today
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Messages */}
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                {/* Avatar */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-2 border-foreground bg-secondary">
                  <span className="font-mono text-sm font-bold text-secondary-foreground">
                    {managerInitials}
                  </span>
                </div>

                {/* Message content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="font-bold">{managerName}</span>
                    <span className="font-mono text-sm text-muted-foreground">
                      {message.timestamp}
                    </span>
                  </div>

                  <div className="whitespace-pre-wrap text-foreground">
                    {formatMessageContent(message.content, repoUrl)}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator - shown at end of messages while AI is "typing" */}
            {isShowingTypingIndicator && (
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-2 border-foreground bg-secondary">
                  <span className="font-mono text-sm font-bold text-secondary-foreground">
                    {managerInitials}
                  </span>
                </div>

                {/* Typing content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="font-bold">{managerName}</span>
                  </div>
                  <TypingIndicator />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
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
          className="bg-foreground px-1 font-mono text-secondary hover:underline"
        >
          {repoUrl}
        </a>
        {parts[1]}
      </>
    );
  }
  return content;
}
