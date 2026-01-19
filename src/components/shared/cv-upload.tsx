"use client";

import { useState, useRef, useCallback } from "react";

interface CVUploadProps {
  onUploadComplete?: (data: {
    url: string;
    path: string;
    fileName: string;
  }) => void;
  onError?: (error: string) => void;
  currentFileName?: string;
  assessmentId?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "txt", "rtf"];

export function CVUpload({
  onUploadComplete,
  onError,
  currentFileName,
  assessmentId,
}: CVUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(
    currentFileName || null
  );
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return "File size exceeds 10MB limit";
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      return `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (assessmentId) {
        formData.append("assessmentId", assessmentId);
      }

      // Simulate progress for better UX (actual progress tracking would need XHR)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      const response = await fetch("/api/upload/cv", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();
      setProgress(100);
      setFileName(data.fileName);
      onUploadComplete?.(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      onError?.(errorMessage);
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      uploadFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.rtf"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`cursor-pointer border-2 border-dashed p-8 text-center transition-colors ${isDragOver ? "bg-secondary/10 border-secondary" : "border-border hover:border-foreground"} ${isUploading ? "pointer-events-none opacity-70" : ""} `}
      >
        {isUploading ? (
          <div className="space-y-4">
            <div className="font-mono text-sm">
              {progress < 90 ? "Uploading..." : "Analyzing CV..."}
            </div>
            <div className="h-2 w-full border border-border bg-muted">
              <div
                className="h-full bg-secondary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              {progress < 90
                ? `${progress}%`
                : "Extracting your experience and skills"}
            </div>
          </div>
        ) : fileName ? (
          <div className="space-y-2">
            <div className="font-mono text-sm text-secondary">{fileName}</div>
            <div className="font-mono text-xs text-muted-foreground">
              Click or drag to replace
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl">+</div>
            <div className="font-semibold">Upload your CV</div>
            <div className="font-mono text-xs text-muted-foreground">
              PDF, DOC, DOCX, TXT, RTF (max 10MB)
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              Click or drag and drop
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 border-2 border-red-500 p-2 font-mono text-sm text-red-500">
          {error}
        </div>
      )}
    </div>
  );
}
