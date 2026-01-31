"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface CoworkerAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * CoworkerAvatar component that displays AI-generated avatars (RF-021).
 *
 * Priority:
 * 1. AI-generated avatar (avatarUrl from Imagen 3)
 * 2. DiceBear identicon fallback
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

  // Use AI-generated avatar if available, otherwise fall back to DiceBear identicon
  const imageUrl = avatarUrl ||
    `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}&backgroundColor=237CF1&rowColor=ffffff`;

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
