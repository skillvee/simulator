/**
 * Hook for handling manager auto-start messages
 *
 * RF-015: When a candidate enters the Slack chat view, the manager should
 * automatically send initial messages after a short delay (5-10 seconds).
 *
 * This hook:
 * 1. Checks if manager messages have already been started
 * 2. If not, waits 5-10 seconds then triggers the messages
 * 3. Returns messages one at a time with staggered timing for realistic feel
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { api, ApiClientError } from "@/lib/api";
import type { ChatMessage } from "@/types";

interface ManagerStartStatus {
  managerMessagesStarted: boolean;
  managerId: string | null;
  managerName: string | null;
  status: string;
}

interface ManagerStartResponse {
  alreadyStarted: boolean;
  messages: ChatMessage[];
  managerId?: string;
  managerName?: string;
}

interface UseManagerAutoStartOptions {
  assessmentId: string;
  currentCoworkerId: string;
  onMessagesReceived: (messages: ChatMessage[]) => void;
  onTypingStart: () => void;
  onTypingEnd: () => void;
}

interface UseManagerAutoStartReturn {
  isLoading: boolean;
  isTyping: boolean;
  managerId: string | null;
  error: Error | null;
}

// Delay before starting manager messages (5-10 seconds)
const AUTO_START_DELAY_MIN = 5000;
const AUTO_START_DELAY_MAX = 10000;

// Delay between messages (1.5-3 seconds for typing simulation)
const MESSAGE_DELAY_MIN = 1500;
const MESSAGE_DELAY_MAX = 3000;

// Typing indicator duration before each message
const TYPING_DURATION_MIN = 800;
const TYPING_DURATION_MAX = 1500;

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function useManagerAutoStart({
  assessmentId,
  currentCoworkerId,
  onMessagesReceived,
  onTypingStart,
  onTypingEnd,
}: UseManagerAutoStartOptions): UseManagerAutoStartReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [managerId, setManagerId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Track if we've already triggered the auto-start to prevent double execution
  const hasTriggeredRef = useRef(false);
  // Track if component is mounted
  const isMountedRef = useRef(true);

  const deliverMessagesWithStagger = useCallback(
    async (messages: ChatMessage[]) => {
      for (let i = 0; i < messages.length; i++) {
        if (!isMountedRef.current) return;

        // Show typing indicator
        setIsTyping(true);
        onTypingStart();

        // Wait for typing duration
        await new Promise((resolve) =>
          setTimeout(resolve, randomDelay(TYPING_DURATION_MIN, TYPING_DURATION_MAX))
        );

        if (!isMountedRef.current) return;

        // Hide typing, deliver message
        setIsTyping(false);
        onTypingEnd();

        // Deliver this message
        onMessagesReceived([messages[i]]);

        // Wait before next message (except for last one)
        if (i < messages.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, randomDelay(MESSAGE_DELAY_MIN, MESSAGE_DELAY_MAX))
          );
        }
      }
    },
    [onMessagesReceived, onTypingStart, onTypingEnd]
  );

  useEffect(() => {
    isMountedRef.current = true;

    const checkAndTriggerMessages = async () => {
      // Prevent double execution
      if (hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;

      try {
        // First, check if messages have already been started
        const status = await api<ManagerStartStatus>(
          `/api/chat/manager-start?assessmentId=${assessmentId}`
        );

        if (!isMountedRef.current) return;

        setManagerId(status.managerId);

        // If messages already started, we're done
        if (status.managerMessagesStarted) {
          setIsLoading(false);
          return;
        }

        // Wait 5-10 seconds before triggering messages
        const delay = randomDelay(AUTO_START_DELAY_MIN, AUTO_START_DELAY_MAX);
        await new Promise((resolve) => setTimeout(resolve, delay));

        if (!isMountedRef.current) return;

        // Trigger the manager messages
        const response = await api<ManagerStartResponse>(
          "/api/chat/manager-start",
          {
            method: "POST",
            body: { assessmentId },
          }
        );

        if (!isMountedRef.current) return;

        setManagerId(response.managerId || null);
        setIsLoading(false);

        // If messages weren't already started, deliver them with stagger
        if (!response.alreadyStarted && response.messages.length > 0) {
          // Only deliver if we're viewing the manager's chat
          if (response.managerId === currentCoworkerId) {
            await deliverMessagesWithStagger(response.messages);
          }
        }
      } catch (err) {
        if (!isMountedRef.current) return;

        if (err instanceof ApiClientError) {
          setError(new Error(err.message));
        } else if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error("Failed to check manager start status"));
        }
        setIsLoading(false);
      }
    };

    checkAndTriggerMessages();

    return () => {
      isMountedRef.current = false;
    };
  }, [assessmentId, currentCoworkerId, deliverMessagesWithStagger]);

  return {
    isLoading,
    isTyping,
    managerId,
    error,
  };
}
