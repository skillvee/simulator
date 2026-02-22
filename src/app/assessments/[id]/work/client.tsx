"use client";

import { useCallback, useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SlackLayout, Chat } from "@/components/chat";
import { GeneralChannel } from "@/components/chat/general-channel";
import { GENERAL_CHANNEL_MESSAGES } from "@/lib/ai/coworker-persona";
import { useScreenRecordingContext } from "@/contexts/screen-recording-context";
import { DECORATIVE_TEAM_MEMBERS } from "@/lib/ai";
import { DecorativeChat } from "@/components/chat/decorative-chat";
import { useProactiveMessages } from "@/hooks/chat/use-proactive-messages";
import { useAmbientMessages } from "@/hooks/chat/use-ambient-messages";
import { playMessageSound } from "@/lib/sounds";
import { IncomingCallModal } from "@/components/chat/incoming-call-modal";
import type { ChatMessage } from "@/types";
import type { ChannelMessage } from "@/lib/ai/coworker-persona";

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
  /** Whether the manager has already sent initial messages */
  managerMessagesStarted: boolean;
  /** PR URL if already submitted */
  prUrl: string | null;
}

export function WorkPageClient({
  assessmentId,
  coworkers,
  selectedCoworkerId: initialSelectedCoworkerId,
  assessmentStartTime,
  managerMessagesStarted,
  prUrl,
}: WorkPageClientProps) {
  const router = useRouter();
  const { stopRecording } = useScreenRecordingContext();
  const [isCompleting, setIsCompleting] = useState(false);

  // Voice kickoff state management
  const manager = useMemo(
    () => coworkers.find((c) => c.role.toLowerCase().includes("manager")),
    [coworkers]
  );
  const [kickoffCallState, setKickoffCallState] = useState<
    "ringing" | "in-call" | "completed" | null
  >(() => (!managerMessagesStarted && manager ? "ringing" : null));

  // Handle accepting the incoming kickoff call
  const handleAcceptKickoff = useCallback(() => {
    setKickoffCallState("in-call");
    // startCall will be called via ref after SlackLayout mounts
  }, []);

  // Handle declining the incoming kickoff call (use text chat instead)
  const handleDeclineKickoff = useCallback(() => {
    setKickoffCallState(null);
    // This will allow the text-based manager greeting to trigger
  }, []);

  // Ref to call startCall from CallContext (available after SlackLayout mounts)
  const startCallRef = useRef<((coworkerId: string, callType: "coworker") => void) | null>(null);

  // Start the call after accepting (needs the CallContext from SlackLayout)
  useEffect(() => {
    if (kickoffCallState === "in-call" && manager && startCallRef.current) {
      startCallRef.current(manager.id, "coworker");
    }
  }, [kickoffCallState, manager]);

  // Handle kickoff call ending
  const handleCallEnd = useCallback(
    async (coworkerId: string) => {
      if (kickoffCallState === "in-call" && coworkerId === manager?.id) {
        setKickoffCallState("completed");
        // Generate text greeting messages for written reference
        try {
          await fetch("/api/chat/manager-start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assessmentId }),
          });
        } catch (err) {
          console.error("Failed to generate kickoff text messages:", err);
        }
      }
    },
    [assessmentId, kickoffCallState, manager?.id]
  );

  // Client-side selection state — no server round-trip on coworker switch
  const [selectedCoworkerId, setSelectedCoworkerId] = useState(initialSelectedCoworkerId);

  const handleSelectCoworker = useCallback((coworkerId: string) => {
    setSelectedCoworkerId(coworkerId);
    // Sync URL without triggering server navigation
    window.history.replaceState(null, "", `/assessments/${assessmentId}/work?coworkerId=${coworkerId}`);
  }, [assessmentId]);

  // Refs to store the increment functions from SlackLayout
  const incrementUnreadRef = useRef<((coworkerId: string) => void) | null>(null);
  const incrementGeneralUnreadRef = useRef<(() => void) | null>(null);

  // State to store ambient messages that arrive while user is viewing the channel
  const [ambientMessages, setAmbientMessages] = useState<ChannelMessage[]>([]);

  // Per-coworker message cache so switching is instant (like Slack)
  const messageCacheRef = useRef<Record<string, ChatMessage[]>>({});

  const handleMessagesChange = useCallback((coworkerId: string, messages: ChatMessage[]) => {
    messageCacheRef.current[coworkerId] = messages;
  }, []);

  // Memoize cached messages for the selected coworker to avoid unnecessary re-renders
  const cachedMessagesForSelected = useMemo(
    () => (selectedCoworkerId ? messageCacheRef.current[selectedCoworkerId] : undefined),
    // Re-compute when we switch coworkers
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCoworkerId]
  );

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

  // Handle ambient messages in #general channel
  const handleAmbientMessage = useCallback((message: ChannelMessage) => {
    console.log(`[WorkPage] Ambient message in #general: ${message.text.slice(0, 50)}...`);

    // Add to ambient messages state
    setAmbientMessages((prev) => [...prev, message]);

    // Increment unread count if not viewing #general
    if (incrementGeneralUnreadRef.current) {
      incrementGeneralUnreadRef.current();
    }

    // Play notification sound
    playMessageSound();
  }, []);

  // Initialize proactive messages hook
  useProactiveMessages({
    assessmentId,
    coworkers,
    selectedCoworkerId,
    assessmentStartTime,
    onProactiveMessage: handleProactiveMessage,
  });

  // Initialize ambient messages hook for #general channel
  useAmbientMessages({
    assessmentId,
    assessmentStartTime,
    onAmbientMessage: handleAmbientMessage,
    enabled: true,
  });

  // Check if viewing the #general channel
  const isGeneralChannel = selectedCoworkerId === "general";

  // Check if selected coworker is a decorative member
  const isDecorativeCoworker = selectedCoworkerId?.startsWith("decorative-");
  const decorativeMember = isDecorativeCoworker
    ? DECORATIVE_TEAM_MEMBERS.find(
        (m) => `decorative-${m.name.toLowerCase().replace(/\s+/g, '-')}` === selectedCoworkerId
      )
    : null;

  const selectedCoworker = coworkers.find((c) => c.id === selectedCoworkerId);

  // Get the manager name for canned response substitution
  const managerName = manager?.name || "your manager";

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

  // Determine if text input should be disabled for the manager chat
  const isManagerSelected = selectedCoworker?.id === manager?.id;
  const shouldDisableManagerInput =
    kickoffCallState === "ringing" || kickoffCallState === "in-call";
  const managerDisableReason =
    kickoffCallState === "ringing"
      ? "Accept the incoming call to get started"
      : kickoffCallState === "in-call"
      ? "Manager kickoff call in progress..."
      : undefined;

  return (
    <>
      {/* Incoming call modal for mandatory voice kickoff */}
      {kickoffCallState === "ringing" && manager && (
        <IncomingCallModal coworker={manager} onAccept={handleAcceptKickoff} onDecline={handleDeclineKickoff} />
      )}

      <SlackLayout
        assessmentId={assessmentId}
        coworkers={coworkers}
        selectedCoworkerId={selectedCoworkerId ?? undefined}
        onSelectCoworker={handleSelectCoworker}
        onDefenseComplete={handleDefenseComplete}
        onCallEnd={handleCallEnd}
        onStartCallRef={(fn) => {
          startCallRef.current = fn;
        }}
        onIncrementUnreadRef={(fn) => {
          incrementUnreadRef.current = fn;
        }}
        onIncrementGeneralUnreadRef={(fn) => {
          incrementGeneralUnreadRef.current = fn;
        }}
      >
        {isGeneralChannel ? (
          <GeneralChannel
            assessmentId={assessmentId}
            initialMessages={[...GENERAL_CHANNEL_MESSAGES, ...ambientMessages]}
          />
        ) : decorativeMember ? (
          <DecorativeChat
            member={decorativeMember}
            managerName={managerName}
          />
        ) : selectedCoworker ? (
          <Chat
            key={selectedCoworker.id}
            assessmentId={assessmentId}
            coworker={selectedCoworker}
            cachedMessages={cachedMessagesForSelected}
            onMessagesChange={handleMessagesChange}
            disableInput={isManagerSelected && shouldDisableManagerInput ? true : undefined}
            disableReason={isManagerSelected ? managerDisableReason : undefined}
            initialPrUrl={prUrl}
            skipManagerAutoStart={kickoffCallState !== null && kickoffCallState !== "completed"}
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
    </>
  );
}
