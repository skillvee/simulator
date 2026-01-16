"use client";

import { ScreenRecordingProvider } from "@/contexts/screen-recording-context";
import { ScreenRecordingGuard } from "@/components/screen-recording-guard";

interface AssessmentScreenWrapperProps {
  children: React.ReactNode;
  assessmentId: string;
}

export function AssessmentScreenWrapper({
  children,
  assessmentId,
}: AssessmentScreenWrapperProps) {
  return (
    <ScreenRecordingProvider assessmentId={assessmentId}>
      <ScreenRecordingGuard assessmentId={assessmentId}>
        {children}
      </ScreenRecordingGuard>
    </ScreenRecordingProvider>
  );
}
