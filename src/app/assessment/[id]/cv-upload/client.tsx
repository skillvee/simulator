"use client";

import { useRouter } from "next/navigation";
import { CVUpload } from "@/components/shared";
import { Card, CardContent } from "@/components/ui";
import { ArrowRight } from "lucide-react";

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
      {/* Header */}
      <div className="mb-8">
        <div className="mb-6 inline-block rounded-full bg-primary/10 px-4 py-2">
          <span className="text-sm font-medium text-primary">
            Before the interview
          </span>
        </div>
        <h1 className="mb-4 text-4xl font-semibold">Upload Your CV</h1>
        <p className="text-lg text-muted-foreground">
          Before starting your{" "}
          <span className="font-semibold text-primary">{scenarioName}</span>{" "}
          interview at <span className="font-semibold">{companyName}</span>,
          please upload your CV or resume.
        </p>
      </div>

      {/* Why we need it */}
      <Card className="mb-8 shadow-sm">
        <CardContent className="p-6">
          <h3 className="mb-3 font-semibold">Why do we need your CV?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                The HR interviewer will reference your experience to ask
                relevant questions
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Your background helps us tailor the assessment to your skill
                level
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                It enables more accurate and personalized feedback after the
                assessment
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

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
