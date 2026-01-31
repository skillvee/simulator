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
  const totalTeamSize = coworkers.length + DECORATIVE_TEAM_MEMBERS.length;

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-background shadow-sm">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
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
          <OfflineTeamMember
            key={member.name}
            name={member.name}
            role={member.role}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <p className="text-xs text-muted-foreground">
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
  return (
    <div
      onClick={onChat}
      className={`cursor-pointer border-b border-border p-3 transition-all duration-200 ease-in-out ${
        isSelected
          ? "border-l-4 border-l-primary bg-primary/10"
          : "mx-2 my-1 rounded-lg hover:bg-accent/80"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar with online indicator */}
        <div className="relative flex-shrink-0">
          <CoworkerAvatar name={coworker.name} avatarUrl={coworker.avatarUrl} size="md" />
          {/* Online status indicator - green dot */}
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{coworker.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {coworker.role}
          </p>
        </div>

        {/* Call button - top right, headphones icon (Slack style) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCall();
          }}
          className="flex-shrink-0 rounded-lg bg-background p-1.5 shadow-sm transition-all duration-200 ease-in-out hover:bg-primary hover:text-primary-foreground hover:shadow-md"
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
    <div
      className="mx-2 my-1 cursor-default rounded-lg border-b border-border p-3 opacity-60 transition-all duration-200 ease-in-out"
      title="Unavailable"
    >
      <div className="flex items-start gap-3">
        {/* Avatar with offline indicator */}
        <div className="relative flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <span className="text-sm font-semibold text-muted-foreground">
              {initials}
            </span>
          </div>
          {/* Offline status indicator - red dot */}
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-red-500" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-muted-foreground">
            {name}
          </p>
          <p className="truncate text-xs text-muted-foreground">{role}</p>
        </div>
      </div>
    </div>
  );
}
