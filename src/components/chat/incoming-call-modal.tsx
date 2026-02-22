"use client";

import { useEffect, useRef } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CoworkerAvatar } from "./coworker-avatar";
import { playCallRingSound } from "@/lib/sounds";

interface Coworker {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

interface IncomingCallModalProps {
  coworker: Coworker;
  onAccept: () => void;
  onDecline?: () => void;
}

/**
 * Full-screen incoming call modal for manager kickoff.
 * Plays a ringing sound on mount and stops on accept/decline or unmount.
 * If voice calls are not supported, candidate can decline to use text chat.
 */
export function IncomingCallModal({ coworker, onAccept, onDecline }: IncomingCallModalProps) {
  const ringRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    ringRef.current = playCallRingSound();
    return () => {
      ringRef.current?.stop();
    };
  }, []);

  const handleAccept = () => {
    ringRef.current?.stop();
    onAccept();
  };

  const handleDecline = () => {
    ringRef.current?.stop();
    onDecline?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Pulsing rings */}
        <div className="relative">
          <div className="absolute inset-0 -m-4 animate-ping rounded-full bg-primary/20" style={{ animationDuration: "1.5s" }} />
          <div className="absolute inset-0 -m-8 animate-ping rounded-full bg-primary/10" style={{ animationDuration: "2s" }} />
          <CoworkerAvatar
            name={coworker.name}
            avatarUrl={coworker.avatarUrl}
            size="lg"
            className="relative h-20 w-20 shadow-lg ring-4 ring-primary/30"
          />
        </div>

        {/* Info */}
        <div className="mt-2">
          <h2 className="text-xl font-bold text-white">{coworker.name}</h2>
          <p className="text-sm text-white/60">{coworker.role}</p>
          <p className="mt-3 text-sm text-white/80 animate-pulse">Incoming call...</p>
        </div>

        {/* Call action buttons */}
        <div className="flex gap-4 mt-2">
          <Button
            size="lg"
            className="rounded-full bg-green-500 px-8 py-6 text-lg font-semibold text-white shadow-lg hover:bg-green-600 transition-colors"
            onClick={handleAccept}
          >
            <Phone className="h-5 w-5 mr-2" />
            Accept
          </Button>
          {onDecline && (
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-white/20 bg-white/10 px-8 py-6 text-lg font-semibold text-white shadow-lg hover:bg-white/20 transition-colors"
              onClick={handleDecline}
            >
              Use Text Chat
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
