import { useEffect, useRef } from "react";

interface UseAssessmentDeadlineOptions {
  deadlineAt: string; // ISO string
  onTimeExpired: () => void;
}

/**
 * Sets a single setTimeout for the assessment deadline.
 * When the deadline is reached, calls onTimeExpired.
 * If the deadline has already passed, fires immediately.
 */
export function useAssessmentDeadline({
  deadlineAt,
  onTimeExpired,
}: UseAssessmentDeadlineOptions) {
  const onTimeExpiredRef = useRef(onTimeExpired);
  onTimeExpiredRef.current = onTimeExpired;

  useEffect(() => {
    const remainingMs = new Date(deadlineAt).getTime() - Date.now();

    if (remainingMs <= 0) {
      onTimeExpiredRef.current();
      return;
    }

    const timer = setTimeout(() => {
      onTimeExpiredRef.current();
    }, remainingMs);

    return () => clearTimeout(timer);
  }, [deadlineAt]);
}
