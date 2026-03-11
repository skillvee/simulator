"use client";

import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component that applies a subtle fade-in + slide-up animation
 * to page content. Use this at the top level of page components.
 *
 * Animation: 150ms ease-out, 4px vertical slide
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return <div className={cn("animate-page-enter", className)}>{children}</div>;
}
