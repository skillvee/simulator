"use client";

import { useRouter } from "next/navigation";
import { SlackLayout } from "@/components/slack-layout";
import { Chat } from "@/components/chat";

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

// Check if a coworker is a manager based on role
function isManager(coworker: Coworker): boolean {
  return coworker.role.toLowerCase().includes("manager");
}

export function ChatPageClient({
  assessmentId,
  coworkers,
  selectedCoworkerId,
}: ChatPageClientProps) {
  const router = useRouter();

  const selectedCoworker = coworkers.find((c) => c.id === selectedCoworkerId);

  // Check if chatting with manager for PR submission handling
  const isChattingWithManager = selectedCoworker ? isManager(selectedCoworker) : false;

  const handlePrSubmitted = () => {
    // Navigate to defense page after PR submission
    router.push(`/assessment/${assessmentId}/defense`);
  };

  return (
    <SlackLayout assessmentId={assessmentId} coworkers={coworkers}>
      {selectedCoworker ? (
        <Chat
          assessmentId={assessmentId}
          coworker={selectedCoworker}
          onPrSubmitted={isChattingWithManager ? handlePrSubmitted : undefined}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="mb-2 text-xl font-bold">No Coworkers Available</h2>
            <p className="text-muted-foreground">
              There are no coworkers configured for this scenario.
            </p>
          </div>
        </div>
      )}
    </SlackLayout>
  );
}
