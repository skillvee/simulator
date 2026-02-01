"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { SlackLayout, Chat } from "@/components/chat";
import { useScreenRecordingContext } from "@/contexts/screen-recording-context";

interface Coworker {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

interface ChatPageClientProps {
  assessmentId: string;
  coworkers: Coworker[];
  selectedCoworkerId: string | null;
}

export function ChatPageClient({
  assessmentId,
  coworkers,
  selectedCoworkerId,
}: ChatPageClientProps) {
  const router = useRouter();
  const { stopRecording } = useScreenRecordingContext();
  const [isCompleting, setIsCompleting] = useState(false);

  const selectedCoworker = coworkers.find((c) => c.id === selectedCoworkerId);

  // Handle defense call completion
  // This is called when a candidate ends a call with the manager after submitting a PR
  const handleDefenseComplete = useCallback(async () => {
    if (isCompleting) return; // Prevent duplicate calls
    setIsCompleting(true);

    try {
      // Stop screen recording
      stopRecording();

      // Finalize the assessment (marks as COMPLETED, cleans up PR, etc.)
      const response = await fetch("/api/assessment/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });

      if (!response.ok) {
        console.error("Failed to finalize assessment:", await response.text());
      }

      // Navigate to results page
      router.push(`/assessment/${assessmentId}/results`);
    } catch (error) {
      console.error("Error completing defense:", error);
      // Still navigate to results even if finalization fails
      // The results page will handle generating the report if needed
      router.push(`/assessment/${assessmentId}/results`);
    }
  }, [assessmentId, isCompleting, router, stopRecording]);

  // Show loading overlay while completing
  if (isCompleting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <h2 className="text-lg font-semibold">Wrapping up...</h2>
          <p className="text-sm text-muted-foreground">
            Finalizing your assessment
          </p>
        </div>
      </div>
    );
  }

  return (
    <SlackLayout
      assessmentId={assessmentId}
      coworkers={coworkers}
      onDefenseComplete={handleDefenseComplete}
    >
      {selectedCoworker ? (
        <Chat
          assessmentId={assessmentId}
          coworker={selectedCoworker}
        />
      ) : (
        <div className="flex flex-col min-h-0 h-full">
          <div className="flex-1 min-h-0 bg-background rounded-2xl shadow-sm border border-border flex items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-xl font-semibold">No Coworkers Available</h2>
              <p className="text-muted-foreground">
                There are no coworkers configured for this scenario.
              </p>
            </div>
          </div>
        </div>
      )}
    </SlackLayout>
  );
}
