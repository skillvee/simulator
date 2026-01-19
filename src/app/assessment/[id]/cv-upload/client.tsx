"use client";

import { useRouter } from "next/navigation";
import { CVUpload } from "@/components/shared";

interface CVUploadClientProps {
  assessmentId: string;
  scenarioName: string;
  companyName: string;
}

export function CVUploadClient({
  assessmentId,
  scenarioName,
  companyName,
}: CVUploadClientProps) {
  const router = useRouter();

  const handleUploadComplete = () => {
    // Redirect to HR interview after successful upload
    router.push(`/assessment/${assessmentId}/hr-interview`);
  };

  return (
    <div className="w-full max-w-2xl">
      {/* Decorative triangles */}
      <div className="relative">
        <div
          className="absolute -right-16 -top-16 h-32 w-32 bg-secondary opacity-20"
          style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
        />
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="mb-6 inline-block border-2 border-border px-4 py-2">
          <span className="font-mono text-sm">BEFORE THE INTERVIEW</span>
        </div>
        <h1 className="mb-4 text-4xl font-bold">Upload Your CV</h1>
        <p className="text-lg text-muted-foreground">
          Before starting your{" "}
          <span className="font-semibold text-secondary">{scenarioName}</span>{" "}
          interview at <span className="font-semibold">{companyName}</span>,
          please upload your CV or resume.
        </p>
      </div>

      {/* Why we need it */}
      <div className="bg-accent/10 mb-8 border-2 border-border p-6">
        <h3 className="mb-3 font-bold">Why do we need your CV?</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-secondary">→</span>
            <span>
              The HR interviewer will reference your experience to ask relevant
              questions
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-secondary">→</span>
            <span>
              Your background helps us tailor the assessment to your skill level
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-secondary">→</span>
            <span>
              It enables more accurate and personalized feedback after the
              assessment
            </span>
          </li>
        </ul>
      </div>

      {/* Upload component */}
      <div className="mb-8">
        <CVUpload
          assessmentId={assessmentId}
          onUploadComplete={handleUploadComplete}
        />
      </div>

      {/* Help text */}
      <p className="text-center text-sm text-muted-foreground">
        Your CV is stored securely and only used for this assessment. You can
        update it anytime from your profile.
      </p>
    </div>
  );
}
