/**
 * Hook for handling manager auto-start greeting
 *
 * RF-015: When a candidate enters the Slack chat view, the manager sends
 * an LLM-generated welcome message. The task briefing happens naturally
 * through the regular chat flow when the candidate replies.
 */

import { useState, useEffect, useRef } from "react";
import { api, ApiClientError } from "@/lib/api";
import type { ChatMessage } from "@/types";

interface ManagerStartStatus {
  hasConversation: boolean;
  managerId: string | null;
  managerName: string | null;
  status: string;
}

interface ManagerStartResponse {
  alreadyStarted: boolean;
  greeting?: string;
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

// Module-level tracking: once we've triggered the auto-start check for an
// assessment we never re-trigger it, even if the Chat component remounts
// (e.g. when the user switches coworkers and comes back).
const triggeredAssessments = new Set<string>();

export function useManagerAutoStart({
  assessmentId,
  currentCoworkerId,
  onMessagesReceived,
  onTypingStart,
  onTypingEnd,
}: UseManagerAutoStartOptions): UseManagerAutoStartReturn {
  const [isLoading, setIsLoading] = useState(() => !triggeredAssessments.has(assessmentId));
  const [isTyping, setIsTyping] = useState(false);
  const [managerId, setManagerId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const hasTriggeredRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const checkAndTriggerMessages = async () => {
      // Skip if already triggered for this assessment (module-level) or instance
      if (hasTriggeredRef.current || triggeredAssessments.has(assessmentId)) {
        setIsLoading(false);
        return;
      }
      hasTriggeredRef.current = true;
      triggeredAssessments.add(assessmentId);

      try {
        // Step 1: Check if conversation already exists
        const status = await api<ManagerStartStatus>(
          `/api/chat/manager-start?assessmentId=${assessmentId}`
        );

        if (!isMountedRef.current) return;

        setManagerId(status.managerId);

        if (status.hasConversation) {
          setIsLoading(false);
          return;
        }

        // Step 2: Show typing while LLM generates the greeting
        if (status.managerId === currentCoworkerId && status.managerName) {
          setIsTyping(true);
          onTypingStart();

          const response = await api<ManagerStartResponse>(
            "/api/chat/manager-start",
            {
              method: "POST",
              body: { assessmentId },
            }
          );

          if (!isMountedRef.current) {
            setIsTyping(false);
            onTypingEnd();
            return;
          }

          setIsTyping(false);
          onTypingEnd();

          setManagerId(response.managerId || null);

          if (!response.alreadyStarted && response.greeting) {
            const greetingMessage: ChatMessage = {
              role: "model",
              text: response.greeting,
              timestamp: new Date().toISOString(),
            };
            onMessagesReceived([greetingMessage]);
          }
        }

        setIsLoading(false);
      } catch (err) {
        if (!isMountedRef.current) return;

        setIsTyping(false);
        onTypingEnd();

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
  }, [assessmentId, currentCoworkerId, onMessagesReceived, onTypingStart, onTypingEnd]);

  return {
    isLoading,
    isTyping,
    managerId,
    error,
  };
}
