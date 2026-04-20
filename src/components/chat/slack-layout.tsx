"use client";

import { useState, Suspense, createContext, useContext, cloneElement, isValidElement, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Menu, X, Headphones, Hash, GitBranch, Database, FileSpreadsheet, Globe, LayoutDashboard, FileText, Box, ExternalLink, ArrowLeft, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DECORATIVE_TEAM_MEMBERS } from "@/lib/ai";
import { markUserInteraction, playMessageSound } from "@/lib/sounds";
import { FloatingCallBar } from "./floating-call-bar";
import { CoworkerAvatar } from "./coworker-avatar";
import { Markdown } from "@/components/shared/markdown";
import type { DecorativeTeamMember, ScenarioResource } from "@/types";

/**
 * Resolve the active schedule entry for a decorative member based on elapsed time.
 * Returns the current status and the index of the schedule entry (or -1 for initial).
 */
function getCurrentStatus(
  member: DecorativeTeamMember,
  elapsedMinutes: number
): { status: "online" | "away" | "in-meeting" | "offline"; scheduleIndex: number } {
  if (!member.statusSchedule || member.statusSchedule.length === 0) {
    return { status: member.availability || "online", scheduleIndex: -1 };
  }

  let activeIndex = -1;
  let latestStart = -1;
  member.statusSchedule.forEach((entry, idx) => {
    if (entry.startMinutes <= elapsedMinutes && entry.startMinutes > latestStart) {
      activeIndex = idx;
      latestStart = entry.startMinutes;
    }
  });

  if (activeIndex === -1) {
    return { status: member.availability || "online", scheduleIndex: -1 };
  }

  return {
    status: member.statusSchedule[activeIndex].status,
    scheduleIndex: activeIndex,
  };
}

import type { Gender, Ethnicity } from "@/lib/avatar/name-ethnicity";

interface Coworker {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  gender?: Gender | null;
  ethnicity?: Ethnicity | null;
}

// Context for managing call state across the layout
// Note: "defense" call type was removed in RF-006. Defense calls will be
// reintegrated in RF-012 using a different Slack-based flow.
interface CallContextValue {
  activeCall: {
    coworkerId: string;
    callType: "coworker";
  } | null;
  startCall: (
    coworkerId: string,
    callType: "coworker"
  ) => void;
  endCall: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCallContext() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCallContext must be used within a SlackLayout");
  }
  return context;
}

interface SlackLayoutProps {
  assessmentId: string;
  coworkers: Coworker[];
  /** Resources the candidate needs (repos, databases, dashboards, etc.) */
  resources?: ScenarioResource[];
  /** ISO string deadline — when provided, a subtle time-remaining indicator is shown */
  deadlineAt?: string;
  children: React.ReactNode;
  /** Override the selected coworker (instead of getting from URL) */
  selectedCoworkerId?: string;
  /** Callback when a coworker or channel is selected — keeps navigation client-side */
  onSelectCoworker?: (coworkerId: string) => void;
  /** Callback when a defense call is completed (work was submitted, call with manager ended) */
  onDefenseComplete?: () => void;
  /** When true, the next call will be flagged as post-submission (defense call) */
  isPostSubmission?: boolean;
  /** Callback when candidate clicks "Submit Work" button */
  onSubmitWork?: () => void;
  /** Callback when any call ends — receives the coworkerId of the ended call */
  onCallEnd?: (coworkerId: string) => void;
  /** Callback to expose startCall function to parent (for programmatic call initiation) */
  onStartCallRef?: (startCall: (coworkerId: string, callType: "coworker") => void) => void;
  /** Callback to expose incrementUnread function to parent */
  onIncrementUnreadRef?: (incrementUnread: (coworkerId: string) => void) => void;
  /** Callback to expose incrementGeneralUnread function to parent */
  onIncrementGeneralUnreadRef?: (incrementGeneralUnread: () => void) => void;
  /** Index of the currently selected resource (null = show chat) */
  selectedResourceIndex?: number | null;
  /** Callback when a resource is selected or deselected */
  onSelectResource?: (index: number | null) => void;
  /** Language of the assessment scenario */
  language?: string;
}

/**
 * Unified Slack-like layout component with sidebar (team directory) + main content.
 * Used across welcome, chat, and call pages for consistent experience.
 */
// Default no-op context value for Suspense fallback — prevents crashes when
// children (e.g. Chat) call useCallContext() before SlackLayoutInner mounts.
const defaultCallContextValue: CallContextValue = {
  activeCall: null,
  startCall: () => {},
  endCall: () => {},
};

export function SlackLayout(props: SlackLayoutProps) {
  return (
    <CallContext.Provider value={defaultCallContextValue}>
      <Suspense
        fallback={<SlackLayoutSkeleton>{props.children}</SlackLayoutSkeleton>}
      >
        <SlackLayoutInner {...props} />
      </Suspense>
    </CallContext.Provider>
  );
}

function SlackLayoutSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="slack-theme flex h-screen overflow-hidden">
      <aside className="hidden h-screen w-[280px] flex-col md:flex shrink-0" style={{background: "hsl(var(--slack-bg-sidebar))", borderRight: "1px solid hsl(var(--slack-border))"}}>
        {/* Header skeleton */}
        <div className="h-16 flex items-center px-6" style={{borderBottom: "1px solid hsl(var(--slack-border))"}}>
          <div className="h-8 w-8 bg-primary rounded-lg mr-3" />
          <div className="h-5 w-20 rounded" style={{background: "hsl(var(--slack-bg-surface))"}} />
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3">
          <div className="px-3 mb-3">
            <div className="h-3 w-12 rounded" style={{background: "hsl(var(--slack-bg-surface))"}} />
          </div>
          <div className="space-y-1 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <div className="h-9 w-9 rounded-full" style={{background: "hsl(var(--slack-bg-surface))"}} />
                <div className="flex-1">
                  <div className="h-4 w-24 rounded mb-1" style={{background: "hsl(var(--slack-bg-surface))"}} />
                  <div className="h-2.5 w-16 rounded" style={{background: "hsl(var(--slack-bg-surface))"}} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
      <main className="flex flex-1 flex-col p-4 min-h-0 overflow-hidden" style={{background: "hsl(var(--slack-bg-main))"}}>
        {children}
      </main>
    </div>
  );
}

function SlackLayoutInner({
  assessmentId,
  coworkers,
  resources,
  deadlineAt,
  children,
  selectedCoworkerId: overrideSelectedId,
  onSelectCoworker,
  onDefenseComplete,
  isPostSubmission,
  onSubmitWork,
  onCallEnd: onCallEndCallback,
  onStartCallRef,
  onIncrementUnreadRef,
  onIncrementGeneralUnreadRef,
  selectedResourceIndex,
  onSelectResource,
  language,
}: SlackLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("work.sidebar");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<{
    coworkerId: string;
    callType: "coworker";
  } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [generalUnread, setGeneralUnread] = useState<number>(0);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Track elapsed time for dynamic status changes
  useEffect(() => {
    const startTime = Date.now();

    // Update immediately
    setElapsedMinutes(0);

    // Check every 30 seconds for status updates
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 60000);
      setElapsedMinutes(elapsed);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Time remaining display — updates every minute, subtle and non-pressuring
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isLowTime, setIsLowTime] = useState(false);

  const deadlineMs = useMemo(
    () => (deadlineAt ? new Date(deadlineAt).getTime() : null),
    [deadlineAt]
  );

  useEffect(() => {
    if (!deadlineMs) return;

    function update() {
      const remaining = deadlineMs! - Date.now();
      if (remaining <= 0) {
        setTimeRemaining("0:00");
        setIsLowTime(true);
        return;
      }
      const totalMinutes = Math.floor(remaining / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      setTimeRemaining(
        hours > 0
          ? `${hours}h ${minutes}m`
          : `${minutes}m`
      );
      // Only flag low time under 10 minutes
      setIsLowTime(totalMinutes < 10);
    }

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [deadlineMs]);

  // Determine selected view from URL - can be coworkerId or "general" for channel
  const selectedCoworkerId =
    overrideSelectedId ?? searchParams.get("coworkerId") ?? null;
  const selectedView = selectedCoworkerId === "general" ? "general" : selectedCoworkerId;

  const startCall = (
    coworkerId: string,
    callType: "coworker"
  ) => {
    setActiveCall({ coworkerId, callType });
  };

  const endCall = () => {
    const endedCoworkerId = activeCall?.coworkerId;
    setActiveCall(null);
    if (endedCoworkerId && onCallEndCallback) {
      onCallEndCallback(endedCoworkerId);
    }
  };

  // Increment unread count for a coworker
  const incrementUnread = useCallback((coworkerId: string) => {
    // Don't increment if the coworker is currently selected
    if (coworkerId === selectedCoworkerId) return;

    setUnreadCounts((prev) => ({
      ...prev,
      [coworkerId]: (prev[coworkerId] || 0) + 1,
    }));

    // Play notification sound for messages in non-selected chats
    playMessageSound();
  }, [selectedCoworkerId]);

  // Increment unread count for #general channel
  const incrementGeneralUnread = useCallback(() => {
    // Don't increment if #general is currently selected
    if (selectedView === "general") return;

    setGeneralUnread((prev) => prev + 1);

    // Play notification sound
    playMessageSound();
  }, [selectedView]);

  // Expose startCall to parent via callback ref (for programmatic call initiation)
  useEffect(() => {
    if (onStartCallRef) {
      onStartCallRef(startCall);
    }
  }, [onStartCallRef]);

  // Auto-start the defense call when the parent signals post-submission.
  // Guarded by a ref so a hung-up defense call isn't restarted.
  const defenseCallStartedRef = useRef(false);
  useEffect(() => {
    if (!isPostSubmission || defenseCallStartedRef.current || activeCall) {
      return;
    }
    const manager = coworkers.find((c) =>
      c.role.toLowerCase().includes("manager")
    );
    if (manager) {
      defenseCallStartedRef.current = true;
      startCall(manager.id, "coworker");
    }
  }, [isPostSubmission, activeCall, coworkers]);

  // Expose incrementUnread to parent via callback ref
  useEffect(() => {
    if (onIncrementUnreadRef) {
      onIncrementUnreadRef(incrementUnread);
    }
  }, [onIncrementUnreadRef, incrementUnread]);

  // Expose incrementGeneralUnread to parent via callback ref
  useEffect(() => {
    if (onIncrementGeneralUnreadRef) {
      onIncrementGeneralUnreadRef(incrementGeneralUnread);
    }
  }, [onIncrementGeneralUnreadRef, incrementGeneralUnread]);

  // Clear unread count for a coworker
  const clearUnread = (coworkerId: string) => {
    setUnreadCounts((prev) => {
      const newCounts = { ...prev };
      delete newCounts[coworkerId];
      return newCounts;
    });
  };

  const selectCoworker = useCallback((coworkerId: string) => {
    if (onSelectCoworker) {
      onSelectCoworker(coworkerId);
    } else {
      router.push(`/assessments/${assessmentId}/work?coworkerId=${coworkerId}`);
    }
  }, [onSelectCoworker, router, assessmentId]);

  const handleSelectCoworker = (
    coworkerId: string,
    action: "chat" | "call"
  ) => {
    // Close sidebar on mobile after selection
    setIsSidebarOpen(false);

    if (action === "chat") {
      // Clear unread count when selecting a coworker
      clearUnread(coworkerId);
      selectCoworker(coworkerId);
    } else {
      // Start call in-place instead of navigating to a separate page
      startCall(coworkerId, "coworker");
    }
  };

  const handleSelectChannel = (_channel: "general") => {
    // Close sidebar on mobile after selection
    setIsSidebarOpen(false);

    // Clear unread count when selecting #general
    setGeneralUnread(0);
    selectCoworker("general");
  };

  // Find the coworker being called
  const callingCoworker = activeCall
    ? coworkers.find((c) => c.id === activeCall.coworkerId)
    : null;

  const callContextValue: CallContextValue = {
    activeCall,
    startCall,
    endCall,
  };

  return (
    <CallContext.Provider value={callContextValue}>
      <div
        className="slack-theme relative flex h-screen overflow-hidden"
        style={{background: "hsl(var(--slack-bg-main))"}}
        onClick={() => markUserInteraction()}
      >
        {/* Mobile menu button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed left-4 top-4 z-50 rounded-xl p-2 shadow-sm transition-colors md:hidden"
          style={{
            background: "hsl(var(--slack-bg-surface))",
            border: "1px solid hsl(var(--slack-border))",
            color: "hsl(var(--slack-text))"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "hsl(var(--slack-bg-hover))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "hsl(var(--slack-bg-surface))";
          }}
          aria-label={isSidebarOpen ? t("closeMenu") : t("openMenu")}
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Sidebar overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[280px] transform flex-col transition-transform duration-200 ease-in-out md:static shrink-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          style={{background: "hsl(var(--slack-bg-sidebar))", borderRight: "1px solid hsl(var(--slack-border))"}}
        >
          {/* Header with Skillvee logo and time remaining */}
          <div className="h-16 flex items-center justify-between px-6" style={{borderBottom: "1px solid hsl(var(--slack-border))"}}>
            <Image
              src="/skillvee-logo.png"
              alt="Skillvee"
              width={120}
              height={32}
              className="object-contain brightness-0 invert"
              style={{ width: "auto", height: "auto" }}
              priority
            />
            {timeRemaining !== null && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="flex items-center gap-1.5 text-xs font-medium cursor-default"
                      style={{ color: isLowTime ? "hsl(var(--destructive, 0 84% 60%))" : "hsl(var(--slack-text-muted))" }}
                    >
                      <Clock size={12} />
                      <span>{timeRemaining}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{t("remainingTime", { time: timeRemaining })}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Resources bookmarks bar */}
          {resources && resources.length > 0 && (
            <ResourcesBookmarkBar
              resources={resources}
              selectedIndex={selectedResourceIndex ?? null}
              onSelect={(index) => onSelectResource?.(index)}
            />
          )}

          {/* Coworker List - scrollable, shrinks when call widget appears */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
            {/* Channels Section */}
            <div>
              <h3 className="px-3 text-xs font-semibold uppercase tracking-wider mb-2" style={{color: "hsl(var(--slack-text-muted))"}}>
                {t("channels")}
              </h3>
              <div className="space-y-0.5">
                <button
                  onClick={() => handleSelectChannel("general")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md w-full text-left transition-all border-l-2 ${
                    selectedView === "general"
                      ? "border-primary"
                      : "border-transparent hover:opacity-100"
                  }`}
                  style={{
                    background: selectedView === "general" ? "hsl(var(--slack-bg-hover))" : "transparent",
                    color: "hsl(var(--slack-text))"
                  }}
                  onMouseEnter={(e) => {
                    if (selectedView !== "general") {
                      e.currentTarget.style.background = "hsl(var(--slack-bg-hover))";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedView !== "general") {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <Hash size={14} style={{color: "hsl(var(--slack-text-muted))"}} />
                  <span className={`text-sm flex-1 ${generalUnread > 0 ? "font-bold" : "font-medium"}`}>{t("general")}</span>
                  {generalUnread > 0 && (
                    <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {generalUnread > 9 ? "9+" : generalUnread}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Your Team Section - interactive coworkers */}
            <div>
              <h3 className="px-3 text-xs font-semibold uppercase tracking-wider mb-2" style={{color: "hsl(var(--slack-text-muted))"}}>
                {t("yourTeam")}
              </h3>
              <div className="space-y-1">
                {coworkers.map((coworker) => (
                  <CoworkerItem
                    key={coworker.id}
                    coworker={coworker}
                    isSelected={selectedCoworkerId === coworker.id}
                    isInCall={activeCall?.coworkerId === coworker.id}
                    unreadCount={unreadCounts[coworker.id] || 0}
                    onChat={() => handleSelectCoworker(coworker.id, "chat")}
                    onCall={() => handleSelectCoworker(coworker.id, "call")}
                  />
                ))}
              </div>
            </div>

            {/* Others Section - decorative team members */}
            <div>
              <h3 className="px-3 text-xs font-semibold uppercase tracking-wider mb-2" style={{color: "hsl(var(--slack-text-muted))"}}>
                {t("others")}
              </h3>
              <div className="space-y-1">
                {DECORATIVE_TEAM_MEMBERS.map((member) => (
                  <AwayTeamMember
                    key={member.id}
                    member={member}
                    isSelected={selectedCoworkerId === `decorative-${member.id}`}
                    elapsedMinutes={elapsedMinutes}
                    onSelect={selectCoworker}
                  />
                ))}
              </div>
            </div>

          </div>

          {/* Submit Work button */}
          {onSubmitWork && !activeCall && (
            <div className="shrink-0 px-4 py-3" style={{ borderTop: "1px solid hsl(var(--slack-border))" }}>
              <Button
                onClick={onSubmitWork}
                className="w-full rounded-lg shadow-sm"
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                {t("submitWork")}
              </Button>
            </div>
          )}

          {/* Floating Call Bar — sidebar placement for regular calls.
              Defense calls (isPostSubmission) are rendered prominently in the
              main content area instead, so a failed auto-connect can't be
              missed by the candidate. */}
          {activeCall && callingCoworker && !isPostSubmission && (
            <div className="p-4 relative animate-in slide-in-from-bottom-5 duration-300 fade-in">
              <FloatingCallBar
                assessmentId={assessmentId}
                coworker={callingCoworker}
                callType={activeCall.callType}
                onCallEnd={endCall}
                onDefenseComplete={onDefenseComplete}
                isPostSubmission={isPostSubmission}
                language={language}
              />
            </div>
          )}
        </aside>

        {/* Main content area */}
        <main className="flex flex-1 flex-col p-4 min-h-0 overflow-hidden" style={{background: "hsl(var(--slack-bg-main))"}}>
          {activeCall && callingCoworker && isPostSubmission ? (
            <div className="mb-4 animate-in slide-in-from-top-5 duration-300 fade-in">
              <FloatingCallBar
                assessmentId={assessmentId}
                coworker={callingCoworker}
                callType={activeCall.callType}
                onCallEnd={endCall}
                onDefenseComplete={onDefenseComplete}
                isPostSubmission={isPostSubmission}
                language={language}
              />
            </div>
          ) : null}
          {selectedResourceIndex != null && resources?.[selectedResourceIndex] ? (
            <ResourceViewer
              resource={resources[selectedResourceIndex]}
              onBack={() => onSelectResource?.(null)}
            />
          ) : (
            <>
              {/* Pass incrementUnread function to children if they're Chat components */}
              {/* eslint-disable @typescript-eslint/no-explicit-any */}
              {isValidElement(children) && children.type && (children.type as any).name === 'Chat'
                ? cloneElement(children as React.ReactElement<any>, {
                    onNewMessage: incrementUnread
                  })
                : children
              }
              {/* eslint-enable @typescript-eslint/no-explicit-any */}
            </>
          )}
        </main>
      </div>
    </CallContext.Provider>
  );
}

interface CoworkerItemProps {
  coworker: Coworker;
  isSelected: boolean;
  isInCall?: boolean;
  unreadCount: number;
  onChat: () => void;
  onCall: () => void;
}

function CoworkerItem({
  coworker,
  isSelected,
  isInCall,
  unreadCount,
  onChat,
  onCall,
}: CoworkerItemProps) {
  const t = useTranslations("work.chat");
  return (
    <div
      onClick={onChat}
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-all ${
        isSelected
          ? "border-l-2 border-primary"
          : "hover:opacity-100 border-l-2 border-transparent"
      }`}
      style={{
        background: isSelected ? "hsl(var(--slack-bg-hover))" : "transparent",
        color: "hsl(var(--slack-text))"
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = "hsl(var(--slack-bg-hover))";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      <div className="relative">
        <div className={`inline-block rounded-full ${isInCall ? "ring-2 ring-green-500 ring-offset-2" : ""}`} style={{border: "2px solid hsl(var(--slack-bg-sidebar))"}}>
          <CoworkerAvatar
            name={coworker.name}
            avatarUrl={coworker.avatarUrl}
            gender={coworker.gender}
            ethnicity={coworker.ethnicity}
            size="sm"
            className="shadow-sm"
          />
        </div>
        {/* Status indicator - green dot (in call = pulsing) */}
        <div
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ${
            isInCall ? "animate-pulse" : ""
          }`}
          style={{border: "2px solid hsl(var(--slack-bg-sidebar))"}}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate ${unreadCount > 0 ? "font-bold" : "font-semibold"}`} style={{color: "hsl(var(--slack-text))"}}>{coworker.name}</div>
        <div className="text-[10px] truncate" style={{color: "hsl(var(--slack-text-muted))"}}>
          {isInCall ? (
            <span className="text-green-600 dark:text-green-400 font-medium">{t("inCallStatus")}</span>
          ) : (
            coworker.role
          )}
        </div>
      </div>
      {/* Unread badge */}
      {unreadCount > 0 && (
        <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
      {/* Call button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCall();
        }}
        disabled={isInCall}
        className={`flex-shrink-0 rounded-lg p-1.5 transition-all ${
          isInCall
            ? "cursor-not-allowed opacity-50"
            : "hover:bg-primary hover:text-primary-foreground"
        }`}
        style={{color: "hsl(var(--slack-text-muted))"}}
        aria-label={isInCall ? t("inCallStatus") : `Call ${coworker.name}`}
      >
        <Headphones size={14} />
      </button>
    </div>
  );
}

interface AwayTeamMemberProps {
  member: DecorativeTeamMember;
  isSelected: boolean;
  elapsedMinutes: number;
  onSelect: (decorativeId: string) => void;
}

// ─── Resources Components ──────────────────────────────────────────────────

const RESOURCE_TYPE_ICONS: Record<ScenarioResource["type"], React.ReactNode> = {
  repository: <GitBranch size={14} />,
  database: <Database size={14} />,
  spreadsheet: <FileSpreadsheet size={14} />,
  api: <Globe size={14} />,
  dashboard: <LayoutDashboard size={14} />,
  document: <FileText size={14} />,
  custom: <Box size={14} />,
};

/**
 * Compact bookmarks bar in the sidebar — shows resource icons/labels.
 * Clicking a resource switches the main content to the document viewer.
 */
function ResourcesBookmarkBar({
  resources,
  selectedIndex,
  onSelect,
}: {
  resources: ScenarioResource[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
}) {
  return (
    <div
      className="px-3 py-2 space-y-0.5"
      style={{ borderBottom: "1px solid hsl(var(--slack-border))" }}
    >
      <h3
        className="px-3 text-xs font-semibold uppercase tracking-wider mb-1.5"
        style={{ color: "hsl(var(--slack-text-muted))" }}
      >
        Resources
      </h3>
      {resources.map((resource, index) => (
        <button
          key={index}
          onClick={() => onSelect(selectedIndex === index ? null : index)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md w-full text-left transition-all border-l-2 ${
            selectedIndex === index
              ? "border-primary"
              : "border-transparent"
          }`}
          style={{
            background: selectedIndex === index ? "hsl(var(--slack-bg-hover))" : "transparent",
            color: "hsl(var(--slack-text))",
          }}
          onMouseEnter={(e) => {
            if (selectedIndex !== index) {
              e.currentTarget.style.background = "hsl(var(--slack-bg-hover))";
            }
          }}
          onMouseLeave={(e) => {
            if (selectedIndex !== index) {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <span style={{ color: "hsl(var(--slack-text-muted))" }}>
            {RESOURCE_TYPE_ICONS[resource.type]}
          </span>
          <span className="text-sm font-medium truncate">{resource.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Inline document viewer — replaces the chat area when a resource is selected.
 * Renders the resource's markdown content, or falls back to metadata display.
 */
function ResourceViewer({
  resource,
  onBack,
}: {
  resource: ScenarioResource;
  onBack: () => void;
}) {
  const icon = RESOURCE_TYPE_ICONS[resource.type];

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div
        className="flex-1 min-h-0 shadow-sm flex flex-col"
        style={{
          background: "hsl(var(--slack-bg-main))",
          border: "1px solid hsl(var(--slack-border))",
        }}
      >
        {/* Header */}
        <header
          className="shrink-0 h-16 flex items-center gap-4 px-6"
          style={{ borderBottom: "1px solid hsl(var(--slack-border))" }}
        >
          <button
            onClick={onBack}
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: "hsl(var(--slack-text-muted))" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "hsl(var(--slack-bg-hover))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            aria-label="Back to chat"
          >
            <ArrowLeft size={18} />
          </button>
          <div
            className="rounded-md p-1.5"
            style={{
              background: "hsl(var(--slack-bg-surface))",
              color: "hsl(var(--slack-text-muted))",
            }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="text-lg font-bold truncate"
              style={{ color: "hsl(var(--slack-text))" }}
            >
              {resource.label}
            </h2>
            {resource.url && (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs hover:underline"
                style={{ color: "hsl(var(--slack-text-muted))" }}
              >
                {resource.url}
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        </header>

        {/* Document content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-6">
            {resource.content ? (
              <Markdown>{resource.content}</Markdown>
            ) : (
              /* Fallback for resources without content (legacy data) */
              <div className="space-y-4">
                {resource.instructions && (
                  <div
                    className="rounded-lg p-4"
                    style={{
                      background: "hsl(var(--slack-bg-surface))",
                      border: "1px solid hsl(var(--slack-border))",
                    }}
                  >
                    <h3
                      className="text-sm font-semibold mb-2"
                      style={{ color: "hsl(var(--slack-text))" }}
                    >
                      Instructions
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "hsl(var(--slack-text-muted))" }}
                    >
                      {resource.instructions}
                    </p>
                  </div>
                )}
                {resource.credentials && (
                  <div
                    className="rounded-lg p-4"
                    style={{
                      background: "hsl(var(--slack-bg-surface))",
                      border: "1px solid hsl(var(--slack-border))",
                    }}
                  >
                    <h3
                      className="text-sm font-semibold mb-2"
                      style={{ color: "hsl(var(--slack-text))" }}
                    >
                      Access
                    </h3>
                    <p
                      className="text-sm leading-relaxed italic"
                      style={{ color: "hsl(var(--slack-text-muted))" }}
                    >
                      {resource.credentials}
                    </p>
                  </div>
                )}
                {!resource.instructions && !resource.credentials && (
                  <p
                    className="text-sm text-center py-8"
                    style={{ color: "hsl(var(--slack-text-muted))" }}
                  >
                    No document content available for this resource.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AwayTeamMember({ member, isSelected, elapsedMinutes, onSelect }: AwayTeamMemberProps) {
  const t = useTranslations("work.decorativeTeam");
  const decorativeId = `decorative-${member.id}`;

  const currentStatus = getCurrentStatus(member, elapsedMinutes);

  const role = t(`${member.id}.role`);
  const scheduleMessage =
    currentStatus.scheduleIndex >= 0
      ? t(`${member.id}.scheduleMessages.${currentStatus.scheduleIndex}`)
      : t(`${member.id}.initialStatusMessage`);

  const statusDotColor = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    "in-meeting": "bg-red-400",
    offline: "bg-gray-400",
  }[currentStatus.status];

  return (
    <div
      onClick={() => onSelect(decorativeId)}
      className={`flex items-center gap-3 px-3 py-1.5 cursor-pointer transition-all opacity-50 hover:opacity-70 border-l-2 ${
        isSelected
          ? "border-primary !opacity-70"
          : "border-transparent"
      }`}
      style={{
        background: isSelected ? "hsl(var(--slack-bg-hover))" : "transparent",
        color: "hsl(var(--slack-text))"
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = "hsl(var(--slack-bg-hover))";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = "transparent";
        }
      }}
      title={scheduleMessage || currentStatus.status}
    >
      <div className="relative">
        <div className="inline-block rounded-full grayscale-[30%]" style={{border: "2px solid hsl(var(--slack-bg-sidebar))"}}>
          <CoworkerAvatar
            name={member.name}
            avatarUrl={member.avatarUrl}
            size="sm"
            className="shadow-sm"
          />
        </div>
        {/* Status indicator dot - hollow ring style to distinguish from interactive coworkers */}
        <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${statusDotColor}`} style={{border: "2px solid hsl(var(--slack-bg-sidebar))"}} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{color: "hsl(var(--slack-text))"}}>{member.name}</div>
        <div className="text-[10px] truncate italic" style={{color: "hsl(var(--slack-text-muted))"}}>
          {scheduleMessage || role}
        </div>
      </div>
    </div>
  );
}
