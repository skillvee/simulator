"use client";

import { ScreenRecordingProvider } from "@/contexts/screen-recording-context";
import { ScreenRecordingGuard } from "./screen-recording-guard";
import { WebcamPreview } from "./webcam-preview";

interface AssessmentScreenWrapperProps {
  children: React.ReactNode;
  assessmentId: string;
  companyName?: string;
}

export function AssessmentScreenWrapper({
  children,
  assessmentId,
  companyName,
}: AssessmentScreenWrapperProps) {
  return (
    <ScreenRecordingProvider assessmentId={assessmentId}>
      <ScreenRecordingGuard
        assessmentId={assessmentId}
        companyName={companyName}
      >
        <WebcamPreview />
        {children}
      </ScreenRecordingGuard>
    </ScreenRecordingProvider>
  );
}
