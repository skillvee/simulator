"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatTime, formatDimensionName } from "./helpers";

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string | null;
  initialTime: number;
  candidateName: string | null;
  dimensionName?: string;
}

export function VideoModal({
  isOpen,
  onClose,
  videoUrl,
  initialTime,
  candidateName,
  dimensionName,
}: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = initialTime;
      setDuration(videoRef.current.duration);
      videoRef.current.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setCurrentTime(0);
      setDuration(0);
      setPlaybackSpeed(1);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <span>{candidateName || "Candidate"}</span>
            {dimensionName && (
              <>
                <span className="text-stone-400">&middot;</span>
                <span className="text-stone-600 font-normal">
                  {formatDimensionName(dimensionName)}
                </span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-4">
          {!videoUrl ? (
            <div className="bg-stone-100 rounded-lg p-12 text-center">
              <p className="text-stone-600">No recording available</p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg bg-black">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  className="w-full"
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="font-mono text-stone-600">
                  <span>{formatTime(currentTime)}</span>
                  <span className="text-stone-400"> / </span>
                  <span>{formatTime(duration)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">Speed:</span>
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => handleSpeedChange(speed)}
                      className={cn(
                        "rounded px-2 py-1 text-xs transition-colors",
                        playbackSpeed === speed
                          ? "bg-blue-600 text-white"
                          : "border border-stone-300 hover:border-blue-600 hover:text-blue-600"
                      )}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
