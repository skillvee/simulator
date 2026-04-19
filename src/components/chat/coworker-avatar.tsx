"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getPoolAvatarPath, type Gender, type Ethnicity } from "@/lib/avatar/name-ethnicity";

interface CoworkerAvatarProps {
  name: string;
  avatarUrl?: string | null;
  /** Explicit gender from the coworker record — overrides name-based inference. */
  gender?: Gender | null;
  /** Explicit ethnicity from the coworker record — overrides name-based inference. */
  ethnicity?: Ethnicity | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * CoworkerAvatar component that displays coworker avatars.
 *
 * Priority:
 * 1. Explicit avatarUrl (from DB, e.g. Supabase signed URL)
 * 2. Static pool photo — uses explicit gender/ethnicity when available, else infers from name
 * 3. Initials fallback
 */
export function CoworkerAvatar({
  name,
  avatarUrl,
  gender,
  ethnicity,
  size = "md",
  className = "",
}: CoworkerAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
    xl: "h-32 w-32",
  };

  const imageUrl = avatarUrl || getPoolAvatarPath(name, { gender, ethnicity });

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
