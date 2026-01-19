"use client";

import { useState, Suspense, createContext, useContext } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu, X, Headphones } from "lucide-react";
import { DECORATIVE_TEAM_MEMBERS, getInitials } from "@/lib/ai";
import { FloatingCallBar } from "./floating-call-bar";

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
  startCall: (
    coworkerId: string,
    callType: "coworker" | "kickoff" | "defense"
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
    <div className="flex min-h-screen bg-background">
      <aside className="hidden h-screen w-64 flex-col border-r-2 border-foreground bg-background md:flex">
        <div className="flex h-[74px] flex-shrink-0 items-center border-b-2 border-foreground bg-background px-4 py-3">
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
            Team
          </h2>
        </div>
        <div className="min-h-0 flex-1 animate-pulse overflow-auto">
          {/* Loading placeholders */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-b border-border p-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 border-2 border-muted-foreground bg-muted" />
                <div className="flex-1">
                  <div className="mb-2 h-4 w-24 bg-muted" />
                  <div className="h-3 w-32 bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
      <main className="flex min-h-screen flex-1 flex-col md:min-h-0">
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
  const selectedCoworkerId =
    overrideSelectedId ?? searchParams.get("coworkerId") ?? null;

  const startCall = (
    coworkerId: string,
    callType: "coworker" | "kickoff" | "defense"
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
      <div className="relative flex min-h-screen bg-background">
        {/* Mobile menu button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed left-4 top-4 z-50 border-2 border-foreground bg-background p-2 hover:bg-accent md:hidden"
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
          className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 transform flex-col border-r-2 border-foreground bg-background transition-transform duration-200 ease-in-out md:static ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} `}
        >
          {/* Header - matches chat header height (74px) */}
          <div className="flex h-[74px] flex-shrink-0 items-center border-b-2 border-foreground bg-background px-4 py-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
              Team
            </h2>
          </div>

          {/* Coworker List - scrollable, shrinks when call widget appears */}
          <div className="min-h-0 flex-1 overflow-y-auto">
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

          {/* Floating Call Bar - fixed at bottom when call is active */}
          <div
            className={`flex-shrink-0 transition-all duration-300 ease-in-out ${
              activeCall && callingCoworker
                ? "max-h-[100px] opacity-100"
                : "max-h-0 overflow-hidden opacity-0"
            }`}
          >
            {activeCall && callingCoworker && (
              <FloatingCallBar
                assessmentId={assessmentId}
                coworker={callingCoworker}
                callType={activeCall.callType}
                onCallEnd={endCall}
              />
            )}
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex min-h-screen flex-1 flex-col md:min-h-0">
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
      onClick={onChat}
      className={`cursor-pointer border-b border-border p-3 transition-colors ${
        isSelected
          ? "border-l-4 border-l-secondary bg-accent"
          : "hover:bg-accent/50"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar with online/in-call indicator */}
        <div className="relative flex-shrink-0">
          <div
            className={`flex h-10 w-10 items-center justify-center border-2 border-foreground bg-secondary ${
              isInCall ? "ring-2 ring-green-500 ring-offset-1" : ""
            }`}
          >
            <span className="font-mono text-sm font-bold text-secondary-foreground">
              {initials}
            </span>
          </div>
          {/* Status indicator - green dot (in call = pulsing) */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 border border-foreground bg-green-500 ${
              isInCall ? "animate-pulse" : ""
            }`}
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{coworker.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {coworker.role}
          </p>
          {isInCall && (
            <p className="mt-0.5 font-mono text-xs">
              <span className="text-green-600 dark:text-green-400">
                in call
              </span>
            </p>
          )}
        </div>

        {/* Call button - top right, headphones icon (Slack style) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCall();
          }}
          disabled={isInCall}
          className={`flex-shrink-0 border-2 border-foreground p-1.5 ${
            isInCall
              ? "cursor-not-allowed bg-muted text-muted-foreground"
              : "bg-background hover:bg-foreground hover:text-background"
          }`}
          aria-label={isInCall ? "In call" : `Call ${coworker.name}`}
        >
          <Headphones size={16} />
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
    <div
      className="cursor-default border-b border-border p-3 opacity-60"
      title="Unavailable"
    >
      <div className="flex items-start gap-3">
        {/* Avatar with offline indicator */}
        <div className="relative flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-muted-foreground bg-muted">
            <span className="font-mono text-sm font-bold text-muted-foreground">
              {initials}
            </span>
          </div>
          {/* Offline status indicator - red dot */}
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 border border-muted-foreground bg-red-500" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-muted-foreground">
            {name}
          </p>
          <p className="truncate text-xs text-muted-foreground">{role}</p>
        </div>
      </div>
    </div>
  );
}
