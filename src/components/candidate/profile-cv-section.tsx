"use client";

import { useState } from "react";
import { CVUpload } from "@/components/shared";

interface ProfileCVSectionProps {
  initialCvUrl?: string | null;
  initialCvFileName?: string | null;
}

export function ProfileCVSection({
  initialCvUrl,
  initialCvFileName,
}: ProfileCVSectionProps) {
  const [cvUrl, setCvUrl] = useState<string | null>(initialCvUrl || null);
  const [cvFileName, setCvFileName] = useState<string | null>(
    initialCvFileName || null
  );
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleUploadComplete = (data: {
    url: string;
    path: string;
    fileName: string;
  }) => {
    setCvUrl(data.url);
    setCvFileName(data.fileName);
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 3000);
  };

  return (
    <section className="mb-12">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">CV / Resume</h2>
        {cvUrl && (
          <a
            href={cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border-b-2 border-secondary font-mono text-sm text-foreground hover:text-secondary"
          >
            View Current CV
          </a>
        )}
      </div>

      {uploadSuccess && (
        <div className="bg-secondary/10 mb-4 border-2 border-secondary p-3 font-mono text-sm">
          CV uploaded successfully!
        </div>
      )}

      <CVUpload
        onUploadComplete={handleUploadComplete}
        currentFileName={cvFileName || undefined}
      />

      <p className="mt-4 font-mono text-xs text-muted-foreground">
        Your CV will be used during the HR interview phase. The AI interviewer
        will reference it to ask relevant questions about your experience.
      </p>
    </section>
  );
}
