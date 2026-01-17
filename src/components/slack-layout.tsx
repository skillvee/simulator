"use client";

import { useState, Suspense, createContext, useContext } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu, X } from "lucide-react";
import {
  DECORATIVE_TEAM_MEMBERS,
  getInitials,
} from "@/lib/coworker-persona";
import { FloatingCallBar, type CallState } from "@/components/floating-call-bar";

interface Coworker {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

// Context for managing call state across the layout
interface CallContextValue {
  activeCall: {
    coworkerId: string;
    callType: "coworker" | "kickoff" | "defense";
  } | null;
  startCall: (coworkerId: string, callType: "coworker" | "kickoff" | "defense") => void;
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
}

/**
 * Unified Slack-like layout component with sidebar (team directory) + main content.
 * Used across welcome, chat, and call pages for consistent experience.
 */
export function SlackLayout(props: SlackLayoutProps) {
  return (
    <Suspense fallback={<SlackLayoutSkeleton>{props.children}</SlackLayoutSkeleton>}>
      <SlackLayoutInner {...props} />
    </Suspense>
  );
}

function SlackLayoutSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-64 border-r-2 border-foreground bg-background flex-col h-screen">
        <div className="border-b-2 border-foreground p-4">
          <h2 className="font-bold text-sm font-mono uppercase tracking-wider">
            Team
          </h2>
        </div>
        <div className="flex-1 overflow-auto animate-pulse">
          {/* Loading placeholders */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-b border-border p-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-muted border-2 border-muted-foreground" />
                <div className="flex-1">
                  <div className="h-4 bg-muted w-24 mb-2" />
                  <div className="h-3 bg-muted w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-h-screen md:min-h-0">
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
}: SlackLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<{
    coworkerId: string;
    callType: "coworker" | "kickoff" | "defense";
  } | null>(null);

  // Determine selected coworker from prop override or URL
  const selectedCoworkerId = overrideSelectedId ?? searchParams.get("coworkerId") ?? null;
  const totalTeamSize = coworkers.length + DECORATIVE_TEAM_MEMBERS.length;

  const startCall = (coworkerId: string, callType: "coworker" | "kickoff" | "defense") => {
    setActiveCall({ coworkerId, callType });
  };

  const endCall = () => {
    setActiveCall(null);
  };

  const handleSelectCoworker = (coworkerId: string, action: "chat" | "call") => {
    // Close sidebar on mobile after selection
    setIsSidebarOpen(false);

    if (action === "chat") {
      router.push(`/assessment/${assessmentId}/chat?coworkerId=${coworkerId}`);
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
      <div className="min-h-screen bg-background flex relative">
        {/* Mobile menu button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed top-4 left-4 z-50 md:hidden p-2 border-2 border-foreground bg-background hover:bg-accent"
          aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Sidebar overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-40
            w-64 border-r-2 border-foreground bg-background flex flex-col h-screen md:h-auto
            transform transition-transform duration-200 ease-in-out
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
        >
          {/* Header */}
          <div className="border-b-2 border-foreground p-4">
            <h2 className="font-bold text-sm font-mono uppercase tracking-wider">
              Team
            </h2>
          </div>

          {/* Coworker List */}
          <div className="flex-1 overflow-auto">
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
              <OfflineTeamMember key={member.name} name={member.name} role={member.role} />
            ))}
          </div>

          {/* Floating Call Bar - appears above footer when call is active */}
          {activeCall && callingCoworker && (
            <FloatingCallBar
              assessmentId={assessmentId}
              coworker={callingCoworker}
              callType={activeCall.callType}
              onCallEnd={endCall}
            />
          )}

          {/* Footer */}
          <div className="border-t-2 border-foreground p-3">
            <p className="text-xs text-muted-foreground font-mono">
              {coworkers.length} online · {totalTeamSize} total
            </p>
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 flex flex-col min-h-screen md:min-h-0">
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
  const initials = getInitials(coworker.name);

  return (
    <div
      className={`border-b border-border p-3 ${
        isSelected ? "bg-accent border-l-4 border-l-secondary" : "hover:bg-accent/50"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar with online/in-call indicator */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-10 h-10 bg-secondary border-2 border-foreground flex items-center justify-center ${
              isInCall ? "ring-2 ring-green-500 ring-offset-1" : ""
            }`}
          >
            <span className="font-bold text-secondary-foreground text-sm font-mono">
              {initials}
            </span>
          </div>
          {/* Status indicator - green dot (in call = pulsing) */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border border-foreground ${
              isInCall ? "animate-pulse" : ""
            }`}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{coworker.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {coworker.role}
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {isInCall ? (
              <span className="text-green-600 dark:text-green-400">in call</span>
            ) : (
              "online"
            )}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={onChat}
          className="flex-1 px-3 py-1.5 text-xs font-bold border-2 border-foreground bg-background hover:bg-foreground hover:text-background"
        >
          Chat
        </button>
        <button
          onClick={onCall}
          disabled={isInCall}
          className={`flex-1 px-3 py-1.5 text-xs font-bold border-2 border-foreground ${
            isInCall
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-secondary text-secondary-foreground hover:bg-foreground hover:text-background"
          }`}
        >
          {isInCall ? "In Call" : "Call"}
        </button>
      </div>
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
    <div className="border-b border-border p-3 opacity-60 cursor-default" title="Unavailable">
      <div className="flex items-start gap-3">
        {/* Avatar with offline indicator */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 bg-muted border-2 border-muted-foreground flex items-center justify-center">
            <span className="font-bold text-muted-foreground text-sm font-mono">
              {initials}
            </span>
          </div>
          {/* Offline status indicator - red dot */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-500 border border-muted-foreground" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate text-muted-foreground">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{role}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">offline</p>
        </div>
      </div>
    </div>
  );
}
