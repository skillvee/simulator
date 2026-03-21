"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Video, AlertCircle, MessageSquare, Server } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type {
  SerializedAssessment,
  SerializedClientError,
  SerializedCandidateEvent,
} from "./types";
import { formatDuration } from "./utils";

interface TimelineMarker {
  id: string;
  type: "error" | "conversation" | "apiCall";
  timestamp: string;
  label: string;
  offsetSeconds: number;
}

interface RecordingTabProps {
  assessment: SerializedAssessment;
  clientErrors: SerializedClientError[];
  candidateEvents: SerializedCandidateEvent[];
}

function buildMarkers(
  assessment: SerializedAssessment,
  clientErrors: SerializedClientError[],
  assessmentStartMs: number
): TimelineMarker[] {
  const markers: TimelineMarker[] = [];

  // Error markers (red) — client errors + API errors
  clientErrors.forEach((err) => {
    markers.push({
      id: `err-${err.id}`,
      type: "error",
      timestamp: err.timestamp,
      label: err.message,
      offsetSeconds: Math.max(
        0,
        (new Date(err.timestamp).getTime() - assessmentStartMs) / 1000
      ),
    });
  });

  assessment.apiCalls
    .filter((c) => c.errorMessage !== null)
    .forEach((call) => {
      markers.push({
        id: `api-err-${call.id}`,
        type: "error",
        timestamp: call.requestTimestamp,
        label: call.errorMessage ?? "API Error",
        offsetSeconds: Math.max(
          0,
          (new Date(call.requestTimestamp).getTime() - assessmentStartMs) / 1000
        ),
      });
    });

  // Conversation markers (blue)
  assessment.conversations.forEach((conv) => {
    const ts = conv.createdAt;
    markers.push({
      id: `conv-${conv.id}`,
      type: "conversation",
      timestamp: ts,
      label: conv.coworker
        ? `${conv.coworker.name} (${conv.coworker.role})`
        : "Conversation",
      offsetSeconds: Math.max(
        0,
        (new Date(ts).getTime() - assessmentStartMs) / 1000
      ),
    });
  });

  assessment.voiceSessions.forEach((vs) => {
    markers.push({
      id: `voice-${vs.id}`,
      type: "conversation",
      timestamp: vs.startTime,
      label: `Voice: ${vs.coworker.name}`,
      offsetSeconds: Math.max(
        0,
        (new Date(vs.startTime).getTime() - assessmentStartMs) / 1000
      ),
    });
  });

  // API call markers (orange) — non-error calls
  assessment.apiCalls
    .filter((c) => c.errorMessage === null)
    .forEach((call) => {
      markers.push({
        id: `api-${call.id}`,
        type: "apiCall",
        timestamp: call.requestTimestamp,
        label: `${call.modelVersion} (${call.durationMs ? formatDuration(call.durationMs) : "pending"})`,
        offsetSeconds: Math.max(
          0,
          (new Date(call.requestTimestamp).getTime() - assessmentStartMs) / 1000
        ),
      });
    });

  return markers;
}

const MARKER_COLORS: Record<TimelineMarker["type"], string> = {
  error: "bg-red-500",
  conversation: "bg-blue-500",
  apiCall: "bg-orange-500",
};

const MARKER_HOVER_COLORS: Record<TimelineMarker["type"], string> = {
  error: "bg-red-400",
  conversation: "bg-blue-400",
  apiCall: "bg-orange-400",
};

const MARKER_ICONS: Record<
  TimelineMarker["type"],
  typeof AlertCircle
> = {
  error: AlertCircle,
  conversation: MessageSquare,
  apiCall: Server,
};

export function RecordingTab({
  assessment,
  clientErrors,
}: RecordingTabProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);

  const screenRecording = assessment.recordings.find(
    (r) => r.type === "screen"
  );

  const assessmentStartMs = new Date(assessment.startedAt).getTime();

  const markers = screenRecording
    ? buildMarkers(assessment, clientErrors, assessmentStartMs)
    : [];

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const seekToTime = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, []);

  // Keyboard shortcut for seeking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekToTime(Math.max(0, videoRef.current.currentTime - 5));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seekToTime(Math.min(duration, videoRef.current.currentTime + 5));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duration, seekToTime]);

  // No recording empty state
  if (!screenRecording) {
    return (
      <Card data-testid="no-recording-state">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Video className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">
            No recording available
          </h3>
          <p className="text-sm text-muted-foreground">
            This assessment does not have a screen recording.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentTimePercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-4" data-testid="recording-tab">
      {/* Video Player */}
      <Card>
        <CardContent className="p-4">
          <video
            ref={videoRef}
            src={screenRecording.storageUrl}
            controls
            className="w-full rounded-lg bg-black"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            data-testid="recording-video"
          >
            Your browser does not support the video tag.
          </video>
        </CardContent>
      </Card>

      {/* Mini Timeline */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Event Timeline</h3>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                Errors
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                Conversations
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
                API Calls
              </span>
            </div>
          </div>

          {/* Timeline Bar */}
          <div
            className="relative h-10 cursor-pointer rounded-lg bg-muted/50"
            onClick={(e) => {
              if (duration <= 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percent = x / rect.width;
              seekToTime(percent * duration);
            }}
            data-testid="timeline-bar"
          >
            {/* Progress fill */}
            <div
              className="absolute inset-y-0 left-0 rounded-l-lg bg-primary/10"
              style={{ width: `${currentTimePercent}%` }}
            />

            {/* Current time indicator */}
            <div
              className="absolute top-0 h-full w-0.5 bg-primary"
              style={{ left: `${currentTimePercent}%` }}
              data-testid="time-indicator"
            />

            {/* Markers */}
            {duration > 0 &&
              markers.map((marker) => {
                const percent = Math.min(
                  100,
                  (marker.offsetSeconds / duration) * 100
                );
                const isHovered = hoveredMarker === marker.id;
                const Icon = MARKER_ICONS[marker.type];

                return (
                  <div
                    key={marker.id}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${percent}%` }}
                  >
                    <button
                      className={`flex h-4 w-4 items-center justify-center rounded-full transition-transform ${
                        isHovered
                          ? `${MARKER_HOVER_COLORS[marker.type]} scale-150`
                          : MARKER_COLORS[marker.type]
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        seekToTime(marker.offsetSeconds);
                      }}
                      onMouseEnter={() => setHoveredMarker(marker.id)}
                      onMouseLeave={() => setHoveredMarker(null)}
                      title={marker.label}
                      data-testid={`marker-${marker.type}`}
                    >
                      <Icon className="h-2.5 w-2.5 text-white" />
                    </button>

                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs shadow-md">
                        <p className="font-medium">{marker.label}</p>
                        <p className="text-muted-foreground">
                          {formatDuration(marker.offsetSeconds * 1000)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Time labels */}
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span data-testid="current-time">
              {formatDuration(currentTime * 1000)}
            </span>
            <span data-testid="total-duration">
              {duration > 0 ? formatDuration(duration * 1000) : "--:--"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Marker Summary */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium">Event Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-red-500/10 p-3">
              <p className="text-2xl font-semibold text-red-600">
                {markers.filter((m) => m.type === "error").length}
              </p>
              <p className="text-xs text-muted-foreground">Errors</p>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-3">
              <p className="text-2xl font-semibold text-blue-600">
                {markers.filter((m) => m.type === "conversation").length}
              </p>
              <p className="text-xs text-muted-foreground">Conversations</p>
            </div>
            <div className="rounded-lg bg-orange-500/10 p-3">
              <p className="text-2xl font-semibold text-orange-600">
                {markers.filter((m) => m.type === "apiCall").length}
              </p>
              <p className="text-xs text-muted-foreground">API Calls</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
