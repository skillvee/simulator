"use client";

interface CoworkerAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * CoworkerAvatar component using DiceBear identicons.
 * Generates deterministic geometric patterns based on name.
 * Uses yellow (#D4AF37) background and black (#000000) foreground
 * to match the neo-brutalist design system.
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

  // DiceBear identicon API with yellow background and black pattern
  // Colors are without # prefix for URL encoding
  const avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}&backgroundColor=D4AF37&rowColor=000000`;

  return (
    <div
      className={`flex items-center justify-center border-2 border-foreground ${sizeClasses[size]} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarUrl}
        alt={`${name}'s avatar`}
        className="h-full w-full"
        loading="lazy"
      />
    </div>
  );
}
