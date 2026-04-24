"use client";

import { ScreenRecordingProvider } from "@/contexts/screen-recording-context";
import { ScreenRecordingGuard } from "./screen-recording-guard";
import { WebcamPreview } from "./webcam-preview";

interface AssessmentScreenWrapperProps {
  children: React.ReactNode;
  assessmentId: string;
  companyName?: string;
  /** Skip screen/webcam/mic capture entirely — used for live product demos
   *  where the recorder competes with screen sharing (e.g. Google Meet). */
  bypassRecording?: boolean;
}

export function AssessmentScreenWrapper({
  children,
  assessmentId,
  companyName,
  bypassRecording,
}: AssessmentScreenWrapperProps) {
  return (
    <ScreenRecordingProvider
      key={assessmentId}
      assessmentId={assessmentId}
      bypassRecording={bypassRecording}
    >
      <ScreenRecordingGuard
        assessmentId={assessmentId}
        companyName={companyName}
        bypassRecording={bypassRecording}
      >
        {!bypassRecording && <WebcamPreview />}
        {children}
      </ScreenRecordingGuard>
    </ScreenRecordingProvider>
  );
}
