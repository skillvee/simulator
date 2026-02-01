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
    <aside className="flex h-full w-[280px] flex-col border-r border-border bg-background shrink-0">
      {/* Header with Skillvee logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg mr-3">
          S
        </div>
        <span className="font-bold text-lg tracking-tight">Skillvee</span>
      </div>

      {/* Coworker List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        <div>
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
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
      className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all ${
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
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{coworker.name}</div>
        <div className="text-[10px] text-muted-foreground truncate">{coworker.role}</div>
      </div>
      {/* Call button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCall();
        }}
        className="flex-shrink-0 rounded-lg p-1.5 transition-all text-muted-foreground hover:bg-primary hover:text-primary-foreground"
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
      className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-default opacity-50"
      title="Unavailable"
    >
      <div className="relative">
        <div className="h-8 w-8 rounded-full bg-muted border-2 border-background shadow-sm flex items-center justify-center">
          <span className="text-xs font-medium text-muted-foreground">
            {initials}
          </span>
        </div>
        {/* Offline status indicator - gray dot */}
        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-muted-foreground/40" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-muted-foreground truncate">{name}</div>
        <div className="text-[10px] text-muted-foreground/70 truncate">{role}</div>
      </div>
    </div>
  );
}
