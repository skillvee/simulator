"use client";

import { useState } from "react";
import { ExternalLink, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
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
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">CV / Resume</CardTitle>
          {cvUrl && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-2"
            >
              <a
                href={cvUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={14} />
                View Current CV
              </a>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {uploadSuccess && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
            CV uploaded successfully!
          </div>
        )}

        <div className="rounded-lg">
          <CVUpload
            onUploadComplete={handleUploadComplete}
            currentFileName={cvFileName || undefined}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Your CV will be used during the HR interview phase. The AI interviewer
          will reference it to ask relevant questions about your experience.
        </p>
      </CardContent>
    </Card>
  );
}
