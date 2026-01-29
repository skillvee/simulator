"use client";

import { useEffect, useRef, useState, RefObject } from "react";

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * Hook for scroll-triggered reveal animations
 * Returns a ref to attach to elements and visibility state
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
): [RefObject<T | null>, boolean] {
  const { threshold = 0.1, rootMargin = "0px 0px -50px 0px", triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, isVisible];
}

/**
 * CSS classes for reveal animations
 * Use with useScrollReveal hook
 */
export const revealClasses = {
  // Base hidden state
  hidden: "opacity-0 translate-y-6",
  // Visible state
  visible: "opacity-100 translate-y-0",
  // Transition
  transition: "transition-all duration-700 ease-out",
  // Stagger delays for children
  delay100: "delay-100",
  delay200: "delay-200",
  delay300: "delay-300",
  delay400: "delay-400",
};

/**
 * Helper to combine reveal classes based on visibility
 */
export function getRevealClasses(isVisible: boolean, delay?: string): string {
  const base = revealClasses.transition;
  const state = isVisible ? revealClasses.visible : revealClasses.hidden;
  return delay ? `${base} ${state} ${delay}` : `${base} ${state}`;
}
