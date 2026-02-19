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
}

/**
 * Full-screen incoming call modal. Non-dismissable — candidate must accept.
 * Plays a ringing sound on mount and stops on accept or unmount.
 */
export function IncomingCallModal({ coworker, onAccept }: IncomingCallModalProps) {
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

        {/* Accept button */}
        <Button
          size="lg"
          className="mt-2 rounded-full bg-green-500 px-8 py-6 text-lg font-semibold text-white shadow-lg hover:bg-green-600 transition-colors"
          onClick={handleAccept}
        >
          <Phone className="h-5 w-5 mr-2" />
          Accept
        </Button>
      </div>
    </div>
  );
}
