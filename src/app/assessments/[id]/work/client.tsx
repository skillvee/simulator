"use client";

import { useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { SlackLayout, Chat } from "@/components/chat";
import { useScreenRecordingContext } from "@/contexts/screen-recording-context";
import { DECORATIVE_TEAM_MEMBERS } from "@/lib/ai";
import { DecorativeChat } from "@/components/chat/decorative-chat";
import { useProactiveMessages } from "@/hooks/chat/use-proactive-messages";
import { playMessageSound } from "@/lib/sounds";
import type { ChatMessage } from "@/types";

interface Coworker {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

interface WorkPageClientProps {
  assessmentId: string;
  coworkers: Coworker[];
  selectedCoworkerId: string | null;
  assessmentStartTime: Date;
}

export function WorkPageClient({
  assessmentId,
  coworkers,
  selectedCoworkerId,
  assessmentStartTime,
}: WorkPageClientProps) {
  const router = useRouter();
  const { stopRecording } = useScreenRecordingContext();
  const [isCompleting, setIsCompleting] = useState(false);

  // Ref to store the incrementUnread function from SlackLayout
  const incrementUnreadRef = useRef<((coworkerId: string) => void) | null>(null);

  // Handle proactive messages from coworkers
  const handleProactiveMessage = useCallback((coworkerId: string, message: ChatMessage) => {
    // Increment unread count for this coworker
    if (incrementUnreadRef.current) {
      incrementUnreadRef.current(coworkerId);
    }

    // Play notification sound
    playMessageSound();

    console.log(`[WorkPage] Proactive message from ${coworkerId}: ${message.text.slice(0, 50)}...`);
  }, []);

  // Initialize proactive messages hook
  useProactiveMessages({
    assessmentId,
    coworkers,
    selectedCoworkerId,
    assessmentStartTime,
    onProactiveMessage: handleProactiveMessage,
  });

  // Check if selected coworker is a decorative member
  const isDecorativeCoworker = selectedCoworkerId?.startsWith("decorative-");
  const decorativeMember = isDecorativeCoworker
    ? DECORATIVE_TEAM_MEMBERS.find(
        (m) => `decorative-${m.name.toLowerCase().replace(/\s+/g, '-')}` === selectedCoworkerId
      )
    : null;

  const selectedCoworker = coworkers.find((c) => c.id === selectedCoworkerId);

  // Get the manager name for canned response substitution
  const managerName = coworkers.find((c) => c.role.toLowerCase().includes("manager"))?.name || "your manager";

  // Handle defense call completion
  // This is called when a candidate ends a call with the manager after submitting a PR
  const handleDefenseComplete = useCallback(async () => {
    if (isCompleting) return; // Prevent duplicate calls
    setIsCompleting(true);

    try {
      // Stop screen recording
      stopRecording();

      // Finalize the assessment (marks as COMPLETED, cleans up PR, etc.)
      const response = await fetch("/api/assessment/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });

      if (!response.ok) {
        console.error("Failed to finalize assessment:", await response.text());
      }

      // Navigate to results page
      router.push(`/assessments/${assessmentId}/results`);
    } catch (error) {
      console.error("Error completing defense:", error);
      // Still navigate to results even if finalization fails
      // The results page will handle generating the report if needed
      router.push(`/assessments/${assessmentId}/results`);
    }
  }, [assessmentId, isCompleting, router, stopRecording]);

  // Show loading overlay while completing
  if (isCompleting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <h2 className="text-lg font-semibold">Wrapping up...</h2>
          <p className="text-sm text-muted-foreground">
            Finalizing your assessment
          </p>
        </div>
      </div>
    );
  }

  return (
    <SlackLayout
      assessmentId={assessmentId}
      coworkers={coworkers}
      onDefenseComplete={handleDefenseComplete}
      onIncrementUnreadRef={(fn) => {
        incrementUnreadRef.current = fn;
      }}
    >
      {decorativeMember ? (
        <DecorativeChat
          member={decorativeMember}
          managerName={managerName}
        />
      ) : selectedCoworker ? (
        <Chat
          assessmentId={assessmentId}
          coworker={selectedCoworker}
        />
      ) : (
        <div className="flex flex-col min-h-0 h-full">
          <div className="flex-1 min-h-0 bg-background rounded-2xl shadow-sm border border-border flex items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-xl font-semibold">No Coworkers Available</h2>
              <p className="text-muted-foreground">
                There are no coworkers configured for this scenario.
              </p>
            </div>
          </div>
        </div>
      )}
    </SlackLayout>
  );
}
