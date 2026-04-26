"use client";

import { useCallback, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SlackLayout, Chat, GeneralChannel } from "@/components/chat";
import { Agenda } from "@/components/assessment";
import { GENERAL_CHANNEL_MESSAGES } from "@/lib/ai/coworker-persona";
import { useScreenRecordingContext } from "@/contexts/screen-recording-context";
import { DECORATIVE_TEAM_MEMBERS } from "@/lib/ai";
import { DecorativeChat } from "@/components/chat";
import { useProactiveMessages } from "@/hooks/chat/use-proactive-messages";
import { useAmbientMessages } from "@/hooks/chat/use-ambient-messages";
import { usePacingNudges } from "@/hooks/chat/use-pacing-nudges";
import { useCandidateEvents } from "@/hooks/use-candidate-events";
import { playMessageSound } from "@/lib/sounds";
import { createLogger } from "@/lib/core";
import { ASSESSMENT_DURATION_MS } from "@/lib/core/assessment-timer";
import type { AssessmentPhase, PacingNudgeType } from "@/lib/core/assessment-phase";
import type { ChatMessage, ScenarioResource, SimulationDepth } from "@/types";
import type { ChannelMessage } from "@/lib/ai/coworker-persona";
import type { Gender, Ethnicity } from "@/lib/avatar/name-ethnicity";
import { isManager } from "@/lib/utils/coworker";
import { PostDefenseModal } from "@/components/chat/post-defense-modal";
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
  /** Candidate display name from the auth session, used to personalize the wrap-up screen. */
  candidateName: string | null;
  coworkers: Coworker[];
  selectedCoworkerId: string | null;
  /** ISO string deadline for auto-finalize */
  deadlineAt: string;
  /** Resources the candidate needs (repos, databases, dashboards, etc.) */
  resources: ScenarioResource[];
  /** Language of the assessment scenario */
  language?: string;
  /** Current phase derived from AssessmentStatus (review/kickoff/work/walkthrough). */
  initialPhase: AssessmentPhase;
  /** Session timing for the agenda's elapsed-time counter. ISO strings. */
  timing: {
    reviewStartedAt: string | null;
    workingStartedAt: string | null;
  };
  /** Simulation depth controls the "most candidates finish around X min" pacing hint. */
  simulationDepth: SimulationDepth;
  /** Pacing nudges already delivered server-side (so reloads don't refire). */
  pacingNudgesDelivered: PacingNudgeType[];
}

export function WorkPageClient({
  assessmentId,
  candidateName,
  coworkers,
  selectedCoworkerId: initialSelectedCoworkerId,
  deadlineAt,
  resources,
  language,
  initialPhase,
  timing: timingProp,
  simulationDepth,
  pacingNudgesDelivered,
}: WorkPageClientProps) {
  const router = useRouter();
  const t = useTranslations("work");
  const { stopRecording, flushFinalChunk } = useScreenRecordingContext();
  const [isCompleting, setIsCompleting] = useState(false);
  const [showPostDefenseModal, setShowPostDefenseModal] = useState(false);
  const [showCapPrompt, setShowCapPrompt] = useState(false);
  const [isPostSubmission, setIsPostSubmission] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phase, setPhase] = useState<AssessmentPhase>(initialPhase);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Memoize the timing object that drives the agenda's elapsed counter.
  // ISO strings come in from the server; Agenda needs Date objects.
  const agendaTiming = useMemo(
    () => ({
      reviewStartedAt: timingProp.reviewStartedAt
        ? new Date(timingProp.reviewStartedAt)
        : null,
      workingStartedAt: timingProp.workingStartedAt
        ? new Date(timingProp.workingStartedAt)
        : null,
    }),
    [timingProp.reviewStartedAt, timingProp.workingStartedAt]
  );

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
  const managerFirstName = managerName.split(" ")[0];

  // Ref to the SlackLayout's programmatic call-start function. Set via
  // onStartCallRef on mount, used to dial the manager when the candidate
  // clicks "Start kickoff with Sarah" from the review-materials view.
  const startCallRef = useRef<
    ((coworkerId: string, callType: "coworker") => Promise<void>) | null
  >(null);

  // Pre-warm the mic permission inside the user's click before the call
  // bar's getUserMedia (several async ticks later) runs, so stricter
  // browsers (Safari, Firefox strict, incognito) don't reject the grant.
  const prewarmMic = useCallback(async () => {
    try {
      const stream = await requestMicrophoneAccess();
      stream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      logger.warn("Mic permission unavailable", { error: String(err) });
    }
  }, []);

  const postTransition = useCallback(
    async (
      action:
        | "start_kickoff"
        | "end_kickoff"
        | "start_walkthrough"
        | "end_walkthrough"
    ) => {
      const response = await fetch("/api/assessment/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, action }),
      });
      if (!response.ok) {
        logger.error("Transition failed", {
          action,
          body: await response.text(),
        });
        return false;
      }
      return true;
    },
    [assessmentId]
  );

  // Start kickoff: flip phase, then dial the manager.
  const handleStartKickoff = useCallback(async () => {
    if (isTransitioning || !manager) return;
    setIsTransitioning(true);
    await prewarmMic();
    const ok = await postTransition("start_kickoff");
    if (!ok) {
      setIsTransitioning(false);
      return;
    }
    setPhase("kickoff_call");
    handleSelectCoworker(manager.id);
    startCallRef.current?.(manager.id, "coworker");
    setIsTransitioning(false);
  }, [isTransitioning, manager, prewarmMic, postTransition, handleSelectCoworker]);

  // Start walkthrough: flip phase, then trigger the existing post-submission
  // flow (SlackLayout auto-starts the defense call when isPostSubmission flips).
  const handleStartWalkthrough = useCallback(async () => {
    if (isTransitioning || !manager) return;
    setIsTransitioning(true);
    setIsSubmitting(true);
    await prewarmMic();
    const ok = await postTransition("start_walkthrough");
    if (!ok) {
      setIsTransitioning(false);
      setIsSubmitting(false);
      return;
    }
    setPhase("walkthrough_call");
    handleSelectCoworker(manager.id);
    setIsPostSubmission(true);
    setIsSubmitting(false);
    setIsTransitioning(false);
  }, [isTransitioning, manager, prewarmMic, postTransition, handleSelectCoworker]);

  // Pre-call hook: SlackLayout awaits this before mounting the call bar (and
  // therefore before /api/call/token runs). When the candidate starts the
  // first manager call from the sidebar while still in REVIEW_MATERIALS, we
  // need to flip status to KICKOFF_CALL *here* so the token endpoint serves
  // the kickoff prompt context (it switches on `status === KICKOFF_CALL`).
  // Returning false aborts the call, so a transition failure doesn't leave
  // the manager dialed with the wrong prompt.
  const handleBeforeStartCall = useCallback(
    async (coworkerId: string) => {
      if (coworkerId !== manager?.id) return true;
      if (phase !== "review_materials") return true;
      const ok = await postTransition("start_kickoff");
      if (!ok) return false;
      setPhase("kickoff_call");
      return true;
    },
    [phase, manager, postTransition]
  );

  // Any call ending flows through here. Kickoff calls move us to heads-down
  // work; walkthrough calls are handled by onDefenseComplete below (which
  // owns the post-defense confirmation modal). Sidebar-initiated kickoff
  // calls go through `handleBeforeStartCall` above, so by the time the call
  // ends `phase` is already `kickoff_call` — there's no separate
  // review_materials branch to handle here.
  const handleCallEnd = useCallback(
    async (endedCoworkerId: string) => {
      if (endedCoworkerId !== manager?.id) return;

      if (phase === "kickoff_call") {
        const ok = await postTransition("end_kickoff");
        if (ok) setPhase("heads_down_work");
      }
    },
    [phase, manager, postTransition]
  );

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

      // Move WALKTHROUGH_CALL → COMPLETED via the transition route so the
      // walkthroughEndedAt timestamp is stamped. Safe to no-op on legacy
      // WORKING rows (transition returns 400, finalize handles them directly).
      if (phase === "walkthrough_call") {
        await postTransition("end_walkthrough");
      }

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
  }, [assessmentId, isCompleting, router, stopRecording, flushFinalChunk, phase, postTransition]);

  // Handle post-defense "Continue Working" — dismiss modal and go back to work
  const handleContinueWorking = useCallback(() => {
    setShowPostDefenseModal(false);
  }, []);

  const handleCapReached = useCallback(() => setShowCapPrompt(true), []);

  // Pacing nudges: manager fires check-in / wrap-up / cap during heads-down
  // work. The cap nudge replaces the legacy auto-finalize-at-cap behavior —
  // when it fires, we surface a soft prompt nudging the candidate toward the
  // walkthrough call instead of force-ending the session. The hard safety-net
  // auto-finalize lives server-side in work/page.tsx (cap + 30 min).
  usePacingNudges({
    assessmentId,
    managerId: manager?.id ?? null,
    sessionStartedAt: agendaTiming.reviewStartedAt ?? agendaTiming.workingStartedAt,
    simulationDepth,
    phase,
    alreadyDelivered: pacingNudgesDelivered,
    onNudgeReceived: handleProactiveMessage,
    onCapReached: handleCapReached,
  });

  // Show loading overlay while completing. The wrap-up moment is the bridge
  // between the assessment and the results — keep it warm and personal so it
  // feels like an exhale, not a loading screen.
  if (isCompleting) {
    const firstName = candidateName?.trim().split(/\s+/)[0] ?? null;
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50/60 via-white to-white">
        <div className="relative max-w-md px-6 text-center animate-fade-in">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-[-80px] mx-auto h-[220px] w-[420px] rounded-full bg-primary/15 blur-3xl"
          />
          <div className="relative mx-auto mb-6 flex h-14 w-14 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative h-3 w-3 rounded-full bg-primary" />
          </div>
          <h2 className="relative text-2xl font-semibold tracking-tight text-foreground">
            {firstName
              ? t("wrappingUp.titleWithName", { name: firstName })
              : t("wrappingUp.title")}
          </h2>
          <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
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
        onSubmitWork={
          phase === "review_materials"
            ? handleStartKickoff
            : phase === "heads_down_work"
              ? handleStartWalkthrough
              : undefined
        }
        submitWorkLabel={
          phase === "review_materials"
            ? t("reviewMaterials.startKickoffCta", { manager: managerFirstName })
            : phase === "heads_down_work"
              ? t("walkthrough.startCta", { manager: managerFirstName })
              : undefined
        }
        onStartCallRef={(fn) => {
          startCallRef.current = fn;
        }}
        onBeforeStartCall={handleBeforeStartCall}
        onCallEnd={handleCallEnd}
        onIncrementUnreadRef={(fn) => {
          incrementUnreadRef.current = fn;
        }}
        onIncrementGeneralUnreadRef={(fn) => {
          incrementGeneralUnreadRef.current = fn;
        }}
        selectedResourceIndex={selectedResourceIndex}
        onSelectResource={setSelectedResourceIndex}
        language={language}
        agendaSlot={
          <Agenda
            phase={phase}
            managerName={managerFirstName}
            timing={agendaTiming}
            simulationDepth={simulationDepth}
          />
        }
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

      {/* Post-defense confirmation modal */}
      {showPostDefenseModal && (
        <PostDefenseModal
          onFinalize={handleFinalize}
          onContinueWorking={handleContinueWorking}
        />
      )}

      {/* Cap-reached prompt: fires when the pacing-cap nudge runs, asking
          the candidate to start the walkthrough now. Soft — they can dismiss
          and keep working until the server-side hard expiry (cap + 30 min). */}
      {showCapPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-background shadow-xl border border-border p-6 space-y-4">
            <h2 className="text-xl font-bold">{t("capPrompt.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("capPrompt.description", { manager: managerFirstName })}
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCapPrompt(false)}
                className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:bg-accent"
              >
                {t("capPrompt.snooze")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCapPrompt(false);
                  handleStartWalkthrough();
                }}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90"
              >
                {t("capPrompt.startCta", { manager: managerFirstName })}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
