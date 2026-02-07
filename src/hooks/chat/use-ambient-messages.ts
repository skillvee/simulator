import { useEffect, useRef } from "react";
import { AMBIENT_MESSAGES } from "@/lib/ai/coworker-persona";
import type { ChannelMessage } from "@/lib/ai/coworker-persona";

interface UseAmbientMessagesProps {
  assessmentId: string;
  assessmentStartTime: Date;
  onAmbientMessage: (message: ChannelMessage) => void;
  enabled?: boolean;
}

/**
 * Hook to schedule ambient messages in #general channel
 * These messages appear periodically during the assessment to make the team feel alive
 */
export function useAmbientMessages({
  assessmentId,
  assessmentStartTime,
  onAmbientMessage,
  enabled = true,
}: UseAmbientMessagesProps) {
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const sentMessagesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    // Clear any existing timeouts
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current = [];

    // Schedule ambient messages
    AMBIENT_MESSAGES.forEach((ambientMsg, index) => {
      const delayMs = ambientMsg.delayMinutes * 60 * 1000;
      const elapsedMs = Date.now() - assessmentStartTime.getTime();

      // Only schedule if the message hasn't been sent and delay hasn't passed
      if (!sentMessagesRef.current.has(index) && elapsedMs < delayMs) {
        const timeout = setTimeout(() => {
          // Generate timestamp for the message
          const timestamp = new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });

          const message: ChannelMessage = {
            ...ambientMsg,
            timestamp,
          };

          onAmbientMessage(message);
          sentMessagesRef.current.add(index);
        }, delayMs - elapsedMs);

        timeoutsRef.current.push(timeout);
      }
    });

    // Cleanup on unmount
    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, [assessmentId, assessmentStartTime, onAmbientMessage, enabled]);
}
