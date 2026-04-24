"use client";

import { useCallback, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SlackLayout, Chat, GeneralChannel } from "@/components/chat";
import { GENERAL_CHANNEL_MESSAGES } from "@/lib/ai/coworker-persona";
import { useScreenRecordingContext } from "@/contexts/screen-recording-context";
import { DECORATIVE_TEAM_MEMBERS } from "@/lib/ai";
import { DecorativeChat } from "@/components/chat";
import { useProactiveMessages } from "@/hooks/chat/use-proactive-messages";
import { useAmbientMessages } from "@/hooks/chat/use-ambient-messages";
import { useCandidateEvents } from "@/hooks/use-candidate-events";
import { useAssessmentDeadline } from "@/hooks/use-assessment-deadline";
import { playMessageSound } from "@/lib/sounds";
import { createLogger } from "@/lib/core";
import { ASSESSMENT_DURATION_MS } from "@/lib/core/assessment-timer";
import type { ChatMessage, ScenarioResource } from "@/types";
import type { ChannelMessage } from "@/lib/ai/coworker-persona";
import type { Gender, Ethnicity } from "@/lib/avatar/name-ethnicity";
import { isManager } from "@/lib/utils/coworker";
import { SubmitWorkModal } from "@/components/chat/submit-work-modal";
import { PostDefenseModal } from "@/components/chat/post-defense-modal";
import { uploadDeliverable } from "@/lib/external/storage";
import { requestMicrophoneAccess } from "@/lib/media";

const logger = createLogger("client:app:work-page");

interface Coworker {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  gender?: Gender | null;
  ethnicity?: Ethnicity | null;
}

interface WorkPageClientProps {
  assessmentId: string;
  coworkers: Coworker[];
  selectedCoworkerId: string | null;
  /** ISO string deadline for auto-finalize */
  deadlineAt: string;
  /** Resources the candidate needs (repos, databases, dashboards, etc.) */
  resources: ScenarioResource[];
  /** Language of the assessment scenario */
  language?: string;
}

export function WorkPageClient({
  assessmentId,
  coworkers,
  selectedCoworkerId: initialSelectedCoworkerId,
  deadlineAt,
  resources,
  language,
}: WorkPageClientProps) {
  const router = useRouter();
  const t = useTranslations("work");
  const { stopRecording, flushFinalChunk } = useScreenRecordingContext();
  const [isCompleting, setIsCompleting] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showPostDefenseModal, setShowPostDefenseModal] = useState(false);
  const [isPostSubmission, setIsPostSubmission] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute assessmentStartTime from deadline for hooks that need it
  const assessmentStartTime = useMemo(
    () => new Date(new Date(deadlineAt).getTime() - ASSESSMENT_DURATION_MS),
    [deadlineAt]
  );

  // Manager reference for name substitution
  const manager = useMemo(
    () => coworkers.find((c) => isManager(c.role)),
    [coworkers]
  );

  // Client-side selection state — no server round-trip on coworker switch
  const [selectedCoworkerId, setSelectedCoworkerId] = useState(initialSelectedCoworkerId);
  // Resource viewer state — index of selected resource, null = show chat
  const [selectedResourceIndex, setSelectedResourceIndex] = useState<number | null>(null);

  const handleSelectCoworker = useCallback((coworkerId: string) => {
    setSelectedCoworkerId(coworkerId);
    setSelectedResourceIndex(null); // Deselect resource when switching to chat
    // Sync URL without triggering server navigation. Preserve the current
    // path prefix (including the locale segment) — stripping it sends the
    // next server fetch through middleware's default-locale redirect.
    const { pathname } = window.location;
    const basePath = pathname.replace(/\?.*$/, "");
    window.history.replaceState(null, "", `${basePath}?coworkerId=${coworkerId}`);
  }, []);

  // Refs to store functions exposed from SlackLayout
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

    logger.info("Proactive message received", { coworkerId, preview: message.text.slice(0, 50) });
  }, []);

  // Handle ambient messages in #general channel
  const handleAmbientMessage = useCallback((message: ChannelMessage) => {
    logger.info("Ambient message in #general", { preview: message.text.slice(0, 50) });

    // Add to ambient messages state
    setAmbientMessages((prev) => [...prev, message]);

    // Increment unread count if not viewing #general
    if (incrementGeneralUnreadRef.current) {
      incrementGeneralUnreadRef.current();
    }

    // Play notification sound
    playMessageSound();
  }, []);

  // Track candidate interactions (tab switches, paste, copy, idle)
  useCandidateEvents(assessmentId);

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
        (m) => `decorative-${m.id}` === selectedCoworkerId
      )
    : null;

  const selectedCoworker = coworkers.find((c) => c.id === selectedCoworkerId);

  // Get the manager name for canned response substitution
  const managerName = manager?.name || "your manager";

  // Handle "Submit Work" button click — opens the confirmation modal
  const handleSubmitWork = useCallback(() => {
    setShowSubmitModal(true);
  }, []);

  // Handle submit modal confirmation — upload deliverable, switch to manager, trigger defense call
  const handleSubmitConfirm = useCallback(async (file: File | null) => {
    setShowSubmitModal(false);
    setIsSubmitting(true);

    // Pre-warm the mic permission inside the user's click so the defense
    // call's getUserMedia (which fires several async ticks later from
    // FloatingCallBar) isn't rejected by browsers that scope the permission
    // prompt to a direct user gesture (incognito, Safari, Firefox strict).
    // The stream is closed immediately — we only needed the grant to persist.
    try {
      const stream = await requestMicrophoneAccess();
      stream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      logger.warn("Mic permission unavailable at submit", { error: String(err) });
      // Don't block — FloatingCallBar will surface the same error itself.
    }

    // Upload deliverable file if provided. The server parses it synchronously
    // so the manager has context when the defense call starts — this can take
    // several seconds, so the loading overlay stays up throughout.
    if (file) {
      try {
        await uploadDeliverable(file, assessmentId);
      } catch (err) {
        logger.error("Error uploading deliverable", { error: String(err) });
      }
    }

    // Switch to manager chat and flip isPostSubmission. SlackLayout's internal
    // effect detects the flag transition and auto-starts the defense call, so
    // the ringing/connecting UI takes over once the overlay drops.
    if (manager) {
      handleSelectCoworker(manager.id);
    }
    setIsPostSubmission(true);
    setIsSubmitting(false);
  }, [assessmentId, manager, handleSelectCoworker]);

  // Handle defense call completion — show post-defense confirmation instead of immediate finalize
  const handleDefenseComplete = useCallback(() => {
    if (isCompleting) return;
    setShowPostDefenseModal(true);
  }, [isCompleting]);

  // Handle post-defense "Finalize" confirmation
  const handleFinalize = useCallback(async () => {
    if (isCompleting) return;
    setIsCompleting(true);
    setShowPostDefenseModal(false);

    try {
      // Flush the final in-flight chunk BEFORE finalizing. Once the assessment
      // flips to COMPLETED, /api/recording rejects uploads with a 400, so the
      // last seconds of the recording (including the end of the defense call)
      // would be lost. Streams stay alive — tear down only on finalize success
      // so a transient failure leaves the user able to retry without being
      // bounced to /results with a dead recording.
      await flushFinalChunk();

      const response = await fetch("/api/assessment/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });

      if (!response.ok) {
        logger.error("Failed to finalize assessment", { response: await response.text() });
        setIsCompleting(false);
        return;
      }

      stopRecording();
      router.push(`/assessments/${assessmentId}/results`);
    } catch (err) {
      logger.error("Error completing defense", { error: String(err) });
      setIsCompleting(false);
    }
  }, [assessmentId, isCompleting, router, stopRecording, flushFinalChunk]);

  // Handle post-defense "Continue Working" — dismiss modal and go back to work
  const handleContinueWorking = useCallback(() => {
    setShowPostDefenseModal(false);
  }, []);

  // Handle assessment time expiration
  const handleTimeExpired = useCallback(async () => {
    if (isCompleting) return;
    setIsCompleting(true);
    setShowTimeUpModal(true);

    try {
      // Flush before finalize so the tail of the recording survives the
      // COMPLETED status flip (see handleFinalize for the full reasoning).
      await flushFinalChunk();

      await fetch("/api/assessment/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });

      stopRecording();
    } catch (err) {
      logger.error("Error finalizing on timeout", { error: String(err) });
    }

    // Navigate to results after a brief delay so candidate sees the message
    setTimeout(() => {
      router.push(`/assessments/${assessmentId}/results`);
    }, 4000);
  }, [assessmentId, isCompleting, router, stopRecording, flushFinalChunk]);

  // Set up the deadline timer
  useAssessmentDeadline({
    deadlineAt,
    onTimeExpired: handleTimeExpired,
  });

  // Show "time's up" modal
  if (showTimeUpModal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md px-6">
          <div className="mx-auto mb-6 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t("sessionComplete.title")}</h2>
          <p className="text-muted-foreground">
            {t("sessionComplete.description")}
          </p>
        </div>
      </div>
    );
  }

  // Show loading overlay while completing
  if (isCompleting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <h2 className="text-lg font-semibold">{t("wrappingUp.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("wrappingUp.description")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Submitting overlay — rendered on top of SlackLayout so the layout
          stays mounted and its isPostSubmission effect can start the defense call */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background">
          <div className="text-center max-w-md px-4">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <h2 className="text-lg font-semibold">{t("submittingWork.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("submittingWork.description", { manager: managerName })}
            </p>
          </div>
        </div>
      )}
      <SlackLayout
        assessmentId={assessmentId}
        coworkers={coworkers}
        resources={resources}
        deadlineAt={deadlineAt}
        selectedCoworkerId={selectedCoworkerId ?? undefined}
        onSelectCoworker={handleSelectCoworker}
        onDefenseComplete={handleDefenseComplete}
        isPostSubmission={isPostSubmission}
        onSubmitWork={handleSubmitWork}
        onIncrementUnreadRef={(fn) => {
          incrementUnreadRef.current = fn;
        }}
        onIncrementGeneralUnreadRef={(fn) => {
          incrementGeneralUnreadRef.current = fn;
        }}
        selectedResourceIndex={selectedResourceIndex}
        onSelectResource={setSelectedResourceIndex}
        language={language}
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
          />
        ) : (
          <div className="flex flex-col min-h-0 h-full">
            <div className="flex-1 min-h-0 bg-background rounded-2xl shadow-sm border border-border flex items-center justify-center">
              <div className="text-center">
                <h2 className="mb-2 text-xl font-semibold">{t("noCoworkers.title")}</h2>
                <p className="text-muted-foreground">
                  {t("noCoworkers.description")}
                </p>
              </div>
            </div>
          </div>
        )}
      </SlackLayout>

      {/* Submit Work confirmation modal */}
      {showSubmitModal && (
        <SubmitWorkModal
          managerName={managerName}
          onConfirm={handleSubmitConfirm}
          onCancel={() => setShowSubmitModal(false)}
        />
      )}

      {/* Post-defense confirmation modal */}
      {showPostDefenseModal && (
        <PostDefenseModal
          onFinalize={handleFinalize}
          onContinueWorking={handleContinueWorking}
        />
      )}
    </>
  );
}
