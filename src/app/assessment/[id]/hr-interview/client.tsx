"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VoiceConversation } from "@/components/voice-conversation";
import type { TranscriptMessage } from "@/lib/gemini";

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
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  const handleInterviewEnd = (finalTranscript: TranscriptMessage[]) => {
    setTranscript(finalTranscript);
    setIsCompleted(true);
  };

  if (isCompleted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="w-20 h-20 bg-secondary border-2 border-foreground flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">&#10003;</span>
          </div>
          <h2 className="text-2xl font-bold mb-4">Interview Completed!</h2>
          <p className="text-muted-foreground mb-2">
            Great job completing the HR interview with {companyName}.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            {transcript.length} messages recorded in your transcript.
          </p>
          <div className="space-y-4">
            <button
              onClick={() => router.push(`/assessment/${assessmentId}/onboarding`)}
              className="w-full bg-foreground text-background px-6 py-3 font-semibold border-2 border-foreground hover:bg-secondary hover:text-secondary-foreground hover:border-secondary"
            >
              Continue to Onboarding
            </button>
            <button
              onClick={() => router.push("/profile")}
              className="w-full bg-background text-foreground px-6 py-3 font-semibold border-2 border-border hover:border-foreground"
            >
              Back to Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Intro section */}
      <div className="bg-muted border-b-2 border-border p-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold mb-2">Welcome to your HR Interview</h2>
          <p className="text-muted-foreground mb-4">
            You&apos;re about to start a voice conversation with Sarah Mitchell, Senior
            Technical Recruiter at {companyName}. This is a phone screening to verify your
            experience and assess your fit for the {scenarioName} role.
          </p>
          <div className="grid grid-cols-3 gap-4 font-mono text-sm">
            <div className="bg-background border-2 border-border p-3">
              <div className="text-muted-foreground mb-1">Duration</div>
              <div className="font-bold">~20 minutes</div>
            </div>
            <div className="bg-background border-2 border-border p-3">
              <div className="text-muted-foreground mb-1">Format</div>
              <div className="font-bold">Voice Call</div>
            </div>
            <div className="bg-background border-2 border-border p-3">
              <div className="text-muted-foreground mb-1">Focus</div>
              <div className="font-bold">CV Verification</div>
            </div>
          </div>
        </div>
      </div>

      {/* Voice conversation */}
      <div className="flex-1">
        <VoiceConversation assessmentId={assessmentId} onEnd={handleInterviewEnd} />
      </div>
    </div>
  );
}
