/**
 * Hook for handling manager auto-start messages
 *
 * RF-015: When a candidate enters the Slack chat view, the manager should
 * immediately send a welcome message, then deliver the task briefing shortly after.
 *
 * This hook:
 * 1. Checks if manager messages have already been started
 * 2. If not, delivers an instant welcome message using the manager's name
 * 3. Calls the API in the background to generate task briefing via Gemini
 * 4. Delivers the briefing messages with quick staggered timing
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
  userHasSentMessage?: boolean;
}

interface UseManagerAutoStartReturn {
  isLoading: boolean;
  isTyping: boolean;
  managerId: string | null;
  error: Error | null;
}

// Brief delay before the instant welcome message (feels natural)
const INSTANT_MESSAGE_DELAY = 400;

// Delay between follow-up messages (quick but readable)
const MESSAGE_GAP_MIN = 200;
const MESSAGE_GAP_MAX = 400;

// Typing speed for follow-up messages
const MS_PER_WORD_MIN = 30;
const MS_PER_WORD_MAX = 60;
const TYPING_DURATION_FLOOR = 300;
const TYPING_DURATION_CAP = 1000;

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function typingDurationForMessage(text: string): number {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const msPerWord = randomDelay(MS_PER_WORD_MIN, MS_PER_WORD_MAX);
  const duration = wordCount * msPerWord;
  return Math.min(TYPING_DURATION_CAP, Math.max(TYPING_DURATION_FLOOR, duration));
}

export function useManagerAutoStart({
  assessmentId,
  currentCoworkerId,
  onMessagesReceived,
  onTypingStart,
  onTypingEnd,
  userHasSentMessage = false,
}: UseManagerAutoStartOptions): UseManagerAutoStartReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [managerId, setManagerId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const hasTriggeredRef = useRef(false);
  const isMountedRef = useRef(true);
  const cancelledRef = useRef(false);

  const deliverMessagesWithStagger = useCallback(
    async (messages: ChatMessage[]) => {
      for (let i = 0; i < messages.length; i++) {
        if (!isMountedRef.current || cancelledRef.current) return;

        // Brief pause before starting to "type"
        if (i > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, randomDelay(MESSAGE_GAP_MIN, MESSAGE_GAP_MAX))
          );
          if (!isMountedRef.current || cancelledRef.current) return;
        }

        // Show typing indicator
        setIsTyping(true);
        onTypingStart();

        const typingDuration = typingDurationForMessage(messages[i].text);
        await new Promise((resolve) =>
          setTimeout(resolve, typingDuration)
        );

        if (!isMountedRef.current || cancelledRef.current) {
          setIsTyping(false);
          onTypingEnd();
          return;
        }

        setIsTyping(false);
        onTypingEnd();

        const messageWithCurrentTimestamp: ChatMessage = {
          ...messages[i],
          timestamp: new Date().toISOString(),
        };

        onMessagesReceived([messageWithCurrentTimestamp]);
      }
    },
    [onMessagesReceived, onTypingStart, onTypingEnd]
  );

  // Cancel message delivery when user sends their first message
  useEffect(() => {
    if (userHasSentMessage) {
      cancelledRef.current = true;
    }
  }, [userHasSentMessage]);

  useEffect(() => {
    isMountedRef.current = true;

    const checkAndTriggerMessages = async () => {
      if (hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;

      try {
        // Step 1: Check if messages have already been started
        const status = await api<ManagerStartStatus>(
          `/api/chat/manager-start?assessmentId=${assessmentId}`
        );

        if (!isMountedRef.current) return;

        setManagerId(status.managerId);

        if (status.managerMessagesStarted) {
          setIsLoading(false);
          return;
        }

        // Step 2: Deliver an instant welcome message using the manager's name
        // This gives the candidate immediate feedback while Gemini generates the rest
        if (status.managerId === currentCoworkerId && status.managerName) {
          const firstName = status.managerName.split(" ")[0];

          await new Promise((resolve) => setTimeout(resolve, INSTANT_MESSAGE_DELAY));
          if (!isMountedRef.current || cancelledRef.current) return;

          // Show brief typing indicator for the welcome
          setIsTyping(true);
          onTypingStart();
          await new Promise((resolve) => setTimeout(resolve, 500));
          if (!isMountedRef.current || cancelledRef.current) {
            setIsTyping(false);
            onTypingEnd();
            return;
          }
          setIsTyping(false);
          onTypingEnd();

          const welcomeMessage: ChatMessage = {
            role: "model",
            text: `Hey! Welcome to the team! I'm ${firstName} — give me one sec, pulling up what I have for you.`,
            timestamp: new Date().toISOString(),
          };

          onMessagesReceived([welcomeMessage]);
          setIsLoading(false);

          // Show typing while Gemini generates the rest
          setIsTyping(true);
          onTypingStart();
        }

        // Step 3: Call API to generate the full greeting (Gemini)
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

        // Hide the "generating" typing indicator
        setIsTyping(false);
        onTypingEnd();

        setManagerId(response.managerId || null);
        setIsLoading(false);

        // Step 4: Deliver the Gemini-generated messages (task briefing + guidance)
        // The greeting prompt already tells Gemini that a welcome was sent, so
        // Message 1 is the task briefing (not a duplicate welcome) — deliver all.
        if (!response.alreadyStarted && response.messages.length > 0) {
          if (response.managerId === currentCoworkerId) {
            await deliverMessagesWithStagger(response.messages);
          }
        }
      } catch (err) {
        if (!isMountedRef.current) return;

        // Hide typing indicator on error
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
  }, [assessmentId, currentCoworkerId, deliverMessagesWithStagger, onMessagesReceived, onTypingStart, onTypingEnd]);

  return {
    isLoading,
    isTyping,
    managerId,
    error,
  };
}
