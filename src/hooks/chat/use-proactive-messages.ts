/**
 * Hook for scheduling and delivering proactive coworker messages
 *
 * US-309: Coworkers send unsolicited messages at various points during the
 * simulation to make the team feel alive and realistic.
 *
 * This hook:
 * 1. On mount, fetches proactive messages for each coworker based on their role
 * 2. Calculates scheduled delivery times with ±2 minute randomization
 * 3. Sets up timeouts for each message
 * 4. When timeout fires, saves message to DB and triggers UI update
 * 5. Skips messages if user is already chatting with that coworker
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { getProactiveMessages, type ProactiveMessage } from "@/lib/ai/coworker-persona";
import type { ChatMessage } from "@/types";

interface Coworker {
  id: string;
  name: string;
  role: string;
}

interface UseProactiveMessagesProps {
  assessmentId: string;
  coworkers: Coworker[];
  selectedCoworkerId: string | null;
  assessmentStartTime: Date;
  onProactiveMessage: (coworkerId: string, message: ChatMessage) => void;
}

interface ScheduledMessage {
  coworkerId: string;
  coworkerName: string;
  message: string;
  deliveryTime: number; // Unix timestamp
  timeoutId?: NodeJS.Timeout;
  delivered: boolean;
}

/**
 * Hook to manage proactive messages from coworkers
 */
export function useProactiveMessages({
  assessmentId,
  coworkers,
  selectedCoworkerId,
  assessmentStartTime,
  onProactiveMessage,
}: UseProactiveMessagesProps) {
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const isMountedRef = useRef(true);
  const hasInitializedRef = useRef(false);

  // Calculate delivery time with randomization (±2 minutes)
  const calculateDeliveryTime = useCallback((baseDelayMinutes: number): number => {
    const randomOffsetMs = (Math.random() - 0.5) * 2 * 2 * 60 * 1000; // ±2 minutes
    const baseDelayMs = baseDelayMinutes * 60 * 1000;
    const assessmentStartMs = assessmentStartTime.getTime();
    return assessmentStartMs + baseDelayMs + randomOffsetMs;
  }, [assessmentStartTime]);

  // Deliver a proactive message
  const deliverMessage = useCallback(async (
    coworkerId: string,
    coworkerName: string,
    messageText: string
  ) => {
    if (!isMountedRef.current) return;

    // Skip if user is currently chatting with this coworker
    if (selectedCoworkerId === coworkerId) {
      console.log(`[Proactive] Skipping message from ${coworkerName} - user is already chatting with them`);
      return;
    }

    try {
      // Save message to conversation history
      const response = await api<{ success: boolean; timestamp: string }>(
        "/api/chat/proactive",
        {
          method: "POST",
          body: {
            assessmentId,
            coworkerId,
            message: messageText,
          },
        }
      );

      if (!isMountedRef.current) return;

      // Create ChatMessage object
      const chatMessage: ChatMessage = {
        role: "model",
        text: messageText,
        timestamp: response.timestamp,
      };

      // Notify parent to update unread count and play sound
      onProactiveMessage(coworkerId, chatMessage);

      console.log(`[Proactive] Delivered message from ${coworkerName}: "${messageText.slice(0, 50)}..."`);
    } catch (error) {
      console.error(`[Proactive] Failed to deliver message from ${coworkerName}:`, error);
    }
  }, [assessmentId, selectedCoworkerId, onProactiveMessage]);

  // Initialize scheduled messages on mount
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    isMountedRef.current = true;

    const scheduled: ScheduledMessage[] = [];
    const now = Date.now();

    // Generate scheduled messages for each coworker
    for (const coworker of coworkers) {
      const proactiveMessages = getProactiveMessages(coworker.name, coworker.role);

      for (const pm of proactiveMessages) {
        // Check condition
        if (pm.condition === "after-first-manager-message") {
          // TODO: Implement condition checking if needed
          // For now, just treat as "always"
        }

        const deliveryTime = calculateDeliveryTime(pm.delayMinutes);

        // Only schedule if delivery time is in the future
        if (deliveryTime > now) {
          scheduled.push({
            coworkerId: coworker.id,
            coworkerName: coworker.name,
            message: pm.message,
            deliveryTime,
            delivered: false,
          });
        }
      }
    }

    setScheduledMessages(scheduled);

    console.log(`[Proactive] Scheduled ${scheduled.length} messages for delivery`);

    return () => {
      isMountedRef.current = false;
    };
  }, [coworkers, calculateDeliveryTime]);

  // Set up timeouts for scheduled messages
  useEffect(() => {
    const now = Date.now();

    scheduledMessages.forEach((msg, index) => {
      if (msg.delivered || msg.timeoutId) return;

      const delay = msg.deliveryTime - now;

      if (delay <= 0) {
        // Message should have already been delivered - deliver immediately
        deliverMessage(msg.coworkerId, msg.coworkerName, msg.message);
        setScheduledMessages((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], delivered: true };
          return updated;
        });
      } else {
        // Schedule delivery
        const timeoutId = setTimeout(() => {
          deliverMessage(msg.coworkerId, msg.coworkerName, msg.message);
          setScheduledMessages((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], delivered: true };
            return updated;
          });
        }, delay);

        setScheduledMessages((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], timeoutId };
          return updated;
        });
      }
    });

    // Cleanup timeouts on unmount
    return () => {
      scheduledMessages.forEach((msg) => {
        if (msg.timeoutId) {
          clearTimeout(msg.timeoutId);
        }
      });
    };
  }, [scheduledMessages, deliverMessage]);

  return {
    scheduledCount: scheduledMessages.length,
    deliveredCount: scheduledMessages.filter((m) => m.delivered).length,
  };
}
