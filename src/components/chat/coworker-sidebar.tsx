"use client";

import { Headphones } from "lucide-react";
import { DECORATIVE_TEAM_MEMBERS, getInitials } from "@/lib/ai";
import { CoworkerAvatar } from "./coworker-avatar";

interface Coworker {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

interface CoworkerSidebarProps {
  coworkers: Coworker[];
  onSelectCoworker: (coworkerId: string, action: "chat" | "call") => void;
  selectedCoworkerId?: string | null;
}

export function CoworkerSidebar({
  coworkers,
  onSelectCoworker,
  selectedCoworkerId,
}: CoworkerSidebarProps) {
  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-border bg-background">
      {/* Header with Skillvee logo */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
          S
        </div>
        <span className="text-lg font-bold tracking-tight">Skillvee</span>
      </div>

      {/* Coworker List */}
      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <div>
          <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Team
          </h3>
          <div className="space-y-1">
            {/* Online/Interactive coworkers */}
            {coworkers.map((coworker) => (
              <CoworkerItem
                key={coworker.id}
                coworker={coworker}
                isSelected={selectedCoworkerId === coworker.id}
                onChat={() => onSelectCoworker(coworker.id, "chat")}
                onCall={() => onSelectCoworker(coworker.id, "call")}
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
    </aside>
  );
}

interface CoworkerItemProps {
  coworker: Coworker;
  isSelected: boolean;
  onChat: () => void;
  onCall: () => void;
}

function CoworkerItem({
  coworker,
  isSelected,
  onChat,
  onCall,
}: CoworkerItemProps) {
  return (
    <div
      onClick={onChat}
      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-all ${
        isSelected
          ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
          : "text-foreground hover:bg-muted"
      }`}
    >
      <div className="relative">
        <CoworkerAvatar
          name={coworker.name}
          avatarUrl={coworker.avatarUrl}
          size="sm"
          className="border-2 border-background shadow-sm"
        />
        {/* Online status indicator - green dot */}
        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{coworker.name}</div>
        <div className="truncate text-[10px] text-muted-foreground">
          {coworker.role}
        </div>
      </div>
      {/* Call button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCall();
        }}
        className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground"
        aria-label={`Call ${coworker.name}`}
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
      className="flex cursor-default items-center gap-3 rounded-xl px-3 py-2 opacity-50"
      title="Unavailable"
    >
      <div className="relative">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">
            {initials}
          </span>
        </div>
        {/* Offline status indicator - gray dot */}
        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-muted-foreground/40" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-muted-foreground">
          {name}
        </div>
        <div className="truncate text-[10px] text-muted-foreground/70">
          {role}
        </div>
      </div>
    </div>
  );
}
