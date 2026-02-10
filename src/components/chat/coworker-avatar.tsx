"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getPoolAvatarPath } from "@/lib/avatar/name-ethnicity";

interface CoworkerAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * CoworkerAvatar component that displays coworker avatars.
 *
 * Priority:
 * 1. Explicit avatarUrl (from DB, e.g. Supabase signed URL)
 * 2. Static pool photo matched by name demographics (public/avatars/pool/)
 * 3. Initials fallback
 */
export function CoworkerAvatar({
  name,
  avatarUrl,
  size = "md",
  className = "",
}: CoworkerAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
    xl: "h-32 w-32",
  };

  // Use explicit avatar URL if set, otherwise pick from the static pool by name
  const imageUrl = avatarUrl || getPoolAvatarPath(name);

  // Get initials for fallback
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={imageUrl} alt={`${name}'s avatar`} />
      <AvatarFallback className="bg-primary text-primary-foreground font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
