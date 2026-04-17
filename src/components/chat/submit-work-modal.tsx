"use client";

import { useState, useRef } from "react";
import { Send, X, Upload, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface SubmitWorkModalProps {
  managerName: string;
  onConfirm: (file: File | null) => void;
  onCancel: () => void;
}

export function SubmitWorkModal({
  managerName,
  onConfirm,
  onCancel,
}: SubmitWorkModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setError(null);

    if (selected && selected.size > MAX_FILE_SIZE_BYTES) {
      setError(`File must be under ${MAX_FILE_SIZE_MB}MB`);
      setFile(null);
      return;
    }

    setFile(selected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl p-6 animate-in zoom-in-95 duration-200"
        style={{
          background: "#f8f9fb",
          border: "2px solid #c4c8d0",
          boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 rounded-lg p-1 transition-colors"
          style={{ color: "hsl(var(--slack-text-muted))" }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-5">
          <h2
            className="text-xl font-bold"
            style={{ color: "hsl(var(--slack-text))" }}
          >
            Ready to submit?
          </h2>
          <p
            className="text-sm mt-1.5"
            style={{ color: "hsl(var(--slack-text-muted))" }}
          >
            {managerName} will hop on a call with you to discuss your work.
          </p>
        </div>

        {/* File upload */}
        <div className="mb-5">
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "hsl(var(--slack-text))" }}
          >
            Upload deliverable{" "}
            <span style={{ color: "hsl(var(--slack-text-muted))" }}>
              (optional)
            </span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all"
              style={{
                background: "hsl(var(--slack-bg-input))",
                border: "1px solid hsl(var(--slack-border))",
                color: "hsl(var(--slack-text))",
              }}
            >
              <FileCheck size={16} className="text-green-600 shrink-0" />
              <span className="truncate flex-1 text-left">{file.name}</span>
              <span
                className="text-xs shrink-0"
                style={{ color: "hsl(var(--slack-text-muted))" }}
              >
                {(file.size / 1024 / 1024).toFixed(1)}MB
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm transition-all border-dashed"
              style={{
                background: "hsl(var(--slack-bg-input))",
                border: "2px dashed hsl(var(--slack-border))",
                color: "hsl(var(--slack-text-muted))",
              }}
            >
              <Upload size={16} />
              Choose file
            </button>
          )}

          {error && (
            <p className="text-xs mt-1 text-red-600">{error}</p>
          )}
          <p
            className="text-xs mt-1"
            style={{ color: "hsl(var(--slack-text-muted))" }}
          >
            Upload your work (model, database, image, etc.) — max {MAX_FILE_SIZE_MB}MB.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onConfirm(file)}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit & Start Review
          </Button>
        </div>
      </div>
    </div>
  );
}
