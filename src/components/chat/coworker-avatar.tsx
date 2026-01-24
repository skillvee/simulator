"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface CoworkerAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * CoworkerAvatar component using DiceBear identicons.
 * Generates deterministic geometric patterns based on name.
 * Uses Avatar component from shadcn/ui with proper sizing variants.
 */
export function CoworkerAvatar({
  name,
  size = "md",
  className = "",
}: CoworkerAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
    xl: "h-32 w-32",
  };

  // DiceBear identicon API with primary blue background
  const avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}&backgroundColor=237CF1&rowColor=ffffff`;

  // Get initials for fallback
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={avatarUrl} alt={`${name}'s avatar`} />
      <AvatarFallback className="bg-primary text-primary-foreground font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
