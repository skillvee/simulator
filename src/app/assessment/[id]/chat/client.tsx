"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CoworkerSidebar } from "@/components/coworker-sidebar";
import { Chat } from "@/components/chat";
import { PrLinkModal } from "@/components/pr-link-modal";

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
  const [showPrModal, setShowPrModal] = useState(false);

  const selectedCoworker = coworkers.find((c) => c.id === selectedCoworkerId);

  // Find the manager for the modal
  const manager = coworkers.find(isManager) || selectedCoworker;

  const handleSelectCoworker = (coworkerId: string, action: "chat" | "call") => {
    if (action === "chat") {
      router.push(`/assessment/${assessmentId}/chat?coworkerId=${coworkerId}`);
    } else {
      router.push(`/assessment/${assessmentId}/call?coworkerId=${coworkerId}`);
    }
  };

  const handleDoneClick = () => {
    setShowPrModal(true);
  };

  const handlePrSubmit = async (prUrl: string) => {
    const response = await fetch("/api/assessment/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assessmentId,
        prUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to submit PR");
    }

    // Close modal and navigate to final defense
    setShowPrModal(false);
    router.push(`/assessment/${assessmentId}/defense`);
  };

  // Show "I'm Done" button when chatting with manager
  const showDoneButton = selectedCoworker ? isManager(selectedCoworker) : false;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <CoworkerSidebar
        coworkers={coworkers}
        onSelectCoworker={handleSelectCoworker}
        selectedCoworkerId={selectedCoworkerId}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {selectedCoworker ? (
          <Chat
            assessmentId={assessmentId}
            coworker={selectedCoworker}
            showDoneButton={showDoneButton}
            onDoneClick={handleDoneClick}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="font-bold text-xl mb-2">No Coworkers Available</h2>
              <p className="text-muted-foreground">
                There are no coworkers configured for this scenario.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* PR Link Modal */}
      <PrLinkModal
        isOpen={showPrModal}
        onClose={() => setShowPrModal(false)}
        onSubmit={handlePrSubmit}
        managerName={manager?.name || "your manager"}
      />
    </div>
  );
}
