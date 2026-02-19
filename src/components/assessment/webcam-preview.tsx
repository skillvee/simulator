"use client";

import { useScreenRecordingContext } from "@/contexts/screen-recording-context";

export function WebcamPreview() {
  const { webcamState, isRecording } = useScreenRecordingContext();

  // Only show when recording is active and webcam is available
  if (!isRecording || webcamState !== "active") {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-1.5 shadow-sm backdrop-blur-sm"
      title="Screen and webcam are being recorded"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
      <span className="text-[11px] font-medium text-muted-foreground">REC</span>
    </div>
  );
}
