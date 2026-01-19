"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VoiceConversation } from "@/components/assessment";
import type { TranscriptMessage } from "@/lib/ai";

interface HRInterviewClientProps {
  assessmentId: string;
  scenarioName: string;
  companyName: string;
}

export function HRInterviewClient({
  assessmentId,
  scenarioName,
  companyName,
}: HRInterviewClientProps) {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(false);
  const [_transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  const handleInterviewEnd = (finalTranscript: TranscriptMessage[]) => {
    setTranscript(finalTranscript);
    setIsCompleted(true);
    // Redirect to congratulations screen
    router.push(`/assessment/${assessmentId}/congratulations`);
  };

  if (isCompleted) {
    // Show brief loading state while redirecting
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="max-w-md p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center border-2 border-foreground bg-secondary">
            <span className="text-3xl">&#10003;</span>
          </div>
          <h2 className="mb-4 text-2xl font-bold">Interview Completed!</h2>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Intro section */}
      <div className="border-b-2 border-border bg-muted p-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-xl font-bold">
            Welcome to your HR Interview
          </h2>
          <p className="mb-4 text-muted-foreground">
            You&apos;re about to start a voice conversation with Sarah Mitchell,
            Senior Technical Recruiter at {companyName}. This is a phone
            screening to verify your experience and assess your fit for the{" "}
            {scenarioName} role.
          </p>
          <div className="grid grid-cols-3 gap-4 font-mono text-sm">
            <div className="border-2 border-border bg-background p-3">
              <div className="mb-1 text-muted-foreground">Duration</div>
              <div className="font-bold">~20 minutes</div>
            </div>
            <div className="border-2 border-border bg-background p-3">
              <div className="mb-1 text-muted-foreground">Format</div>
              <div className="font-bold">Voice Call</div>
            </div>
            <div className="border-2 border-border bg-background p-3">
              <div className="mb-1 text-muted-foreground">Focus</div>
              <div className="font-bold">CV Verification</div>
            </div>
          </div>
        </div>
      </div>

      {/* Voice conversation */}
      <div className="flex-1">
        <VoiceConversation
          assessmentId={assessmentId}
          onEnd={handleInterviewEnd}
        />
      </div>
    </div>
  );
}
