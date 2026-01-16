"use client";

import { useRouter } from "next/navigation";
import { CoworkerSidebar } from "@/components/coworker-sidebar";
import { CoworkerVoiceCall } from "@/components/coworker-voice-call";

interface Coworker {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

interface CallPageClientProps {
  assessmentId: string;
  coworkers: Coworker[];
  selectedCoworkerId: string | null;
}

export function CallPageClient({
  assessmentId,
  coworkers,
  selectedCoworkerId,
}: CallPageClientProps) {
  const router = useRouter();

  const selectedCoworker = coworkers.find((c) => c.id === selectedCoworkerId);

  const handleSelectCoworker = (coworkerId: string, action: "chat" | "call") => {
    if (action === "chat") {
      router.push(`/assessment/${assessmentId}/chat?coworkerId=${coworkerId}`);
    } else {
      router.push(`/assessment/${assessmentId}/call?coworkerId=${coworkerId}`);
    }
  };

  const handleCallEnd = () => {
    // Navigate back to chat after call ends
    if (selectedCoworkerId) {
      router.push(`/assessment/${assessmentId}/chat?coworkerId=${selectedCoworkerId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <CoworkerSidebar
        coworkers={coworkers}
        onSelectCoworker={handleSelectCoworker}
        selectedCoworkerId={selectedCoworkerId}
      />

      {/* Main call area */}
      <div className="flex-1 flex flex-col">
        {selectedCoworker ? (
          <CoworkerVoiceCall
            assessmentId={assessmentId}
            coworker={selectedCoworker}
            onEnd={handleCallEnd}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="font-bold text-xl mb-2">Select a Coworker</h2>
              <p className="text-muted-foreground">
                Choose a coworker from the sidebar to start a voice call.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
