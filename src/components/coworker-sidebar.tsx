"use client";

import { Headphones } from "lucide-react";
import {
  DECORATIVE_TEAM_MEMBERS,
  getInitials,
} from "@/lib/coworker-persona";

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
  const totalTeamSize = coworkers.length + DECORATIVE_TEAM_MEMBERS.length;

  return (
    <aside className="w-64 border-r-2 border-foreground bg-background flex flex-col h-full">
      {/* Header */}
      <div className="border-b-2 border-foreground p-4">
        <h2 className="font-bold text-sm font-mono uppercase tracking-wider">
          Team Directory
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
            onChat={() => onSelectCoworker(coworker.id, "chat")}
            onCall={() => onSelectCoworker(coworker.id, "call")}
          />
        ))}

        {/* Offline/Decorative team members */}
        {DECORATIVE_TEAM_MEMBERS.map((member) => (
          <OfflineTeamMember key={member.name} name={member.name} role={member.role} />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t-2 border-foreground p-3">
        <p className="text-xs text-muted-foreground font-mono">
          {coworkers.length} online · {totalTeamSize} total
        </p>
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
  // Get initials for avatar
  const initials = coworker.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      onClick={onChat}
      className={`border-b border-border p-3 cursor-pointer transition-colors ${
        isSelected ? "bg-accent" : "hover:bg-accent/50"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar with online indicator */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 bg-secondary border-2 border-foreground flex items-center justify-center">
            <span className="font-bold text-secondary-foreground text-sm font-mono">
              {initials}
            </span>
          </div>
          {/* Online status indicator - green dot */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border border-foreground" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{coworker.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {coworker.role}
          </p>
        </div>

        {/* Call button - top right, headphones icon (Slack style) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCall();
          }}
          className="flex-shrink-0 p-1.5 border-2 border-foreground bg-background hover:bg-foreground hover:text-background"
          aria-label={`Call ${coworker.name}`}
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
        </div>
      </div>
    </div>
  );
}
