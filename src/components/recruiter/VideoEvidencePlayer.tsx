"use client";

import {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSecondsToTimestamp } from "@/lib/utils/timestamp";

// Re-export timestamp utilities for convenience
export {
  parseTimestampToSeconds,
  formatSecondsToTimestamp,
} from "@/lib/utils/timestamp";

/**
 * VideoEvidencePlayer ref handle for external control
 */
export interface VideoEvidencePlayerHandle {
  seekTo: (seconds: number) => void;
}

/**
 * Props for VideoEvidencePlayer component
 */
export interface VideoEvidencePlayerProps {
  /** URL of the video to play */
  videoUrl: string | null;
  /** Current playback time in seconds */
  currentTime?: number;
  /** Callback when video time updates */
  onTimeUpdate?: (seconds: number) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * VideoEvidencePlayer displays a video with timestamp overlay and sticky positioning.
 * Provides a seekTo method via ref for external timestamp navigation.
 */
export const VideoEvidencePlayer = forwardRef<
  VideoEvidencePlayerHandle,
  VideoEvidencePlayerProps
>(function VideoEvidencePlayer(
  { videoUrl, currentTime: externalCurrentTime, onTimeUpdate, className },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Expose seekTo method via ref
  useImperativeHandle(
    ref,
    () => ({
      seekTo: (seconds: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = seconds;
          setCurrentTime(seconds);
        }
      },
    }),
    []
  );

  // Seek to external currentTime when provided
  useEffect(() => {
    if (
      externalCurrentTime !== undefined &&
      videoRef.current &&
      isReady &&
      Math.abs(videoRef.current.currentTime - externalCurrentTime) > 0.5
    ) {
      videoRef.current.currentTime = externalCurrentTime;
      setCurrentTime(externalCurrentTime);
    }
  }, [externalCurrentTime, isReady]);

  // Handle video time updates
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  }, [onTimeUpdate]);

  // Mark video as ready when metadata loads
  const handleLoadedMetadata = useCallback(() => {
    setIsReady(true);
  }, []);

  // No video URL fallback
  if (!videoUrl) {
    return (
      <div
        className={cn(
          "sticky top-0 z-10 overflow-hidden rounded-lg bg-stone-100",
          "w-full md:w-[400px]",
          className
        )}
      >
        <div className="flex aspect-video flex-col items-center justify-center gap-3 text-stone-500">
          <Video className="h-12 w-12 text-stone-400" />
          <p className="text-sm font-medium">No video recording available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "sticky top-0 z-10 overflow-hidden rounded-lg bg-black shadow-lg",
        "w-full md:w-[400px]",
        className
      )}
    >
      {/* Video element */}
      <div className="relative aspect-video">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          className="h-full w-full object-contain"
        >
          Your browser does not support the video tag.
        </video>

        {/* Timestamp overlay */}
        <div className="pointer-events-none absolute bottom-12 right-2 rounded bg-black/70 px-2 py-1 font-mono text-sm text-white">
          {formatSecondsToTimestamp(currentTime)}
        </div>
      </div>
    </div>
  );
});
