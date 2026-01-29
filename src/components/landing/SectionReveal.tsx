"use client";

import { ReactNode } from "react";
import { useScrollReveal, getRevealClasses } from "@/hooks/useScrollReveal";

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  delay?: "delay-100" | "delay-200" | "delay-300" | "delay-400";
}

/**
 * Wrapper component that reveals children on scroll
 */
export function SectionReveal({ children, className = "", delay }: SectionRevealProps) {
  const [ref, isVisible] = useScrollReveal<HTMLDivElement>();

  return (
    <div ref={ref} className={`${getRevealClasses(isVisible, delay)} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Staggered children reveal - each child animates with increasing delay
 */
interface StaggerRevealProps {
  children: ReactNode[];
  className?: string;
  baseDelay?: number;
  staggerMs?: number;
}

export function StaggerReveal({
  children,
  className = "",
  baseDelay = 0,
  staggerMs = 100
}: StaggerRevealProps) {
  const [ref, isVisible] = useScrollReveal<HTMLDivElement>();

  return (
    <div ref={ref} className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className="transition-all duration-700 ease-out"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(24px)",
            transitionDelay: `${baseDelay + index * staggerMs}ms`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
