"use client";

import { useState, Suspense, createContext, useContext } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu, X, Headphones } from "lucide-react";
import { DECORATIVE_TEAM_MEMBERS, getInitials } from "@/lib/ai";
import { FloatingCallBar } from "./floating-call-bar";
import { CoworkerAvatar } from "./coworker-avatar";

interface Coworker {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
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
  children: React.ReactNode;
  /** Override the selected coworker (instead of getting from URL) */
  selectedCoworkerId?: string;
  /** Callback when a defense call is completed (PR was submitted, call with manager ended) */
  onDefenseComplete?: () => void;
}

/**
 * Unified Slack-like layout component with sidebar (team directory) + main content.
 * Used across welcome, chat, and call pages for consistent experience.
 */
export function SlackLayout(props: SlackLayoutProps) {
  return (
    <Suspense
      fallback={<SlackLayoutSkeleton>{props.children}</SlackLayoutSkeleton>}
    >
      <SlackLayoutInner {...props} />
    </Suspense>
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
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl">
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
  children,
  selectedCoworkerId: overrideSelectedId,
  onDefenseComplete,
}: SlackLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<{
    coworkerId: string;
    callType: "coworker";
  } | null>(null);

  // Determine selected coworker from prop override or URL
  const selectedCoworkerId =
    overrideSelectedId ?? searchParams.get("coworkerId") ?? null;

  const startCall = (
    coworkerId: string,
    callType: "coworker"
  ) => {
    setActiveCall({ coworkerId, callType });
  };

  const endCall = () => {
    setActiveCall(null);
  };

  const handleSelectCoworker = (
    coworkerId: string,
    action: "chat" | "call"
  ) => {
    // Close sidebar on mobile after selection
    setIsSidebarOpen(false);

    if (action === "chat") {
      router.push(`/assessments/${assessmentId}/work?coworkerId=${coworkerId}`);
    } else {
      // Start call in-place instead of navigating to a separate page
      startCall(coworkerId, "coworker");
    }
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
      <div className="slack-theme relative flex h-screen overflow-hidden" style={{background: "hsl(var(--slack-bg-main))"}}>
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
          aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
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
          {/* Header with Skillvee logo */}
          <div className="h-16 flex items-center px-6" style={{borderBottom: "1px solid hsl(var(--slack-border))"}}>
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg mr-3">
              S
            </div>
            <span className="font-bold text-lg tracking-tight" style={{color: "hsl(var(--slack-text))"}}>Skillvee</span>
          </div>

          {/* Coworker List - scrollable, shrinks when call widget appears */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
            <div>
              <h3 className="px-3 text-xs font-semibold uppercase tracking-wider mb-2" style={{color: "hsl(var(--slack-text-muted))"}}>
                Team
              </h3>
              <div className="space-y-1">
                {/* Online/Interactive coworkers */}
                {coworkers.map((coworker) => (
                  <CoworkerItem
                    key={coworker.id}
                    coworker={coworker}
                    isSelected={selectedCoworkerId === coworker.id}
                    isInCall={activeCall?.coworkerId === coworker.id}
                    onChat={() => handleSelectCoworker(coworker.id, "chat")}
                    onCall={() => handleSelectCoworker(coworker.id, "call")}
                  />
                ))}

                {/* Offline/Decorative team members */}
                {DECORATIVE_TEAM_MEMBERS.map((member) => (
                  <OfflineTeamMember
                    key={member.name}
                    name={member.name}
                    role={member.role}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Floating Call Bar - fixed at bottom when call is active */}
          {activeCall && callingCoworker && (
            <div className="p-4 relative animate-in slide-in-from-bottom-5 duration-300 fade-in">
              <FloatingCallBar
                assessmentId={assessmentId}
                coworker={callingCoworker}
                callType={activeCall.callType}
                onCallEnd={endCall}
                onDefenseComplete={onDefenseComplete}
              />
            </div>
          )}
        </aside>

        {/* Main content area */}
        <main className="flex flex-1 flex-col p-4 min-h-0 overflow-hidden" style={{background: "hsl(var(--slack-bg-main))"}}>
          {children}
        </main>
      </div>
    </CallContext.Provider>
  );
}

interface CoworkerItemProps {
  coworker: Coworker;
  isSelected: boolean;
  isInCall?: boolean;
  onChat: () => void;
  onCall: () => void;
}

function CoworkerItem({
  coworker,
  isSelected,
  isInCall,
  onChat,
  onCall,
}: CoworkerItemProps) {
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
        <div className="text-sm font-semibold truncate" style={{color: "hsl(var(--slack-text))"}}>{coworker.name}</div>
        <div className="text-[10px] truncate" style={{color: "hsl(var(--slack-text-muted))"}}>
          {isInCall ? (
            <span className="text-green-600 dark:text-green-400 font-medium">In call</span>
          ) : (
            coworker.role
          )}
        </div>
      </div>
      {/* Call button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCall();
        }}
        disabled={isInCall}
        className={`flex-shrink-0 rounded-lg p-1.5 transition-all ${
          isInCall
            ? "cursor-not-allowed"
            : "hover:bg-primary hover:text-primary-foreground"
        }`}
        style={{color: isInCall ? "hsl(var(--slack-text-muted))" : "hsl(var(--slack-text-muted))"}}
        aria-label={isInCall ? "In call" : `Call ${coworker.name}`}
      >
        <Headphones size={14} />
      </button>
    </div>
  );
}

interface OfflineTeamMemberProps {
  name: string;
  role: string;
}

function OfflineTeamMember({ name, role }: OfflineTeamMemberProps) {
  const initials = getInitials(name);

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 cursor-default opacity-50 border-l-2 border-transparent"
      title="Unavailable"
    >
      <div className="relative">
        <div className="h-8 w-8 rounded-full shadow-sm flex items-center justify-center" style={{background: "hsl(var(--slack-bg-surface))", border: "2px solid hsl(var(--slack-border))"}}>
          <span className="text-xs font-medium" style={{color: "hsl(var(--slack-text-muted))"}}>
            {initials}
          </span>
        </div>
        {/* Offline status indicator - gray dot */}
        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" style={{background: "hsl(var(--slack-text-muted))", border: "2px solid hsl(var(--slack-bg-sidebar))"}} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{color: "hsl(var(--slack-text-muted))"}}>{name}</div>
        <div className="text-[10px] truncate" style={{color: "hsl(var(--slack-text-muted))"}}>{role}</div>
      </div>
    </div>
  );
}
