"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, Button } from "@/components/ui";
import { Check, Sparkles } from "lucide-react";

interface CongratulationsClientProps {
  assessmentId: string;
  userName: string;
  companyName: string;
  scenarioName: string;
  managerId: string | null;
}

export function CongratulationsClient({
  assessmentId,
  userName,
  companyName,
  scenarioName,
  managerId,
}: CongratulationsClientProps) {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(10);

  // Smooth animation sequence
  useEffect(() => {
    const timers = [
      setTimeout(() => setShowContent(true), 100),
      setTimeout(() => setShowBadge(true), 300),
      setTimeout(() => setShowMessage(true), 600),
      setTimeout(() => setShowDetails(true), 900),
      setTimeout(() => setShowButton(true), 1200),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  // Auto-advance countdown
  useEffect(() => {
    if (!showButton) return;

    const interval = setInterval(() => {
      setAutoAdvanceTimer((prev) => {
        if (prev <= 1) {
          const chatUrl = managerId
            ? `/assessment/${assessmentId}/chat?coworkerId=${managerId}`
            : `/assessment/${assessmentId}/welcome`;
          router.push(chatUrl);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showButton, assessmentId, managerId, router]);

  const handleContinue = () => {
    const chatUrl = managerId
      ? `/assessment/${assessmentId}/chat?coworkerId=${managerId}`
      : `/assessment/${assessmentId}/welcome`;
    router.push(chatUrl);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Decorative gradient circles */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-500/5 blur-3xl transition-opacity duration-500"
        style={{ opacity: showContent ? 1 : 0 }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-green-500/10 blur-3xl transition-opacity duration-500"
        style={{ opacity: showContent ? 1 : 0 }}
      />

      {/* Main content */}
      <div className="relative z-10 max-w-xl text-center">
        {/* Celebratory badge */}
        <div
          className="mb-8 transition-all duration-300"
          style={{
            opacity: showBadge ? 1 : 0,
            transform: showBadge ? "scale(1)" : "scale(0.8)",
          }}
        >
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10">
            <Check className="h-12 w-12 text-green-500" />
          </div>
        </div>

        {/* Main message */}
        <div
          className="transition-all duration-300"
          style={{
            opacity: showMessage ? 1 : 0,
            transform: showMessage ? "translateY(0)" : "translateY(-20px)",
          }}
        >
          <h1 className="mb-4 text-4xl font-semibold md:text-5xl">
            Congratulations, {userName}!
          </h1>
          <p className="mb-2 text-2xl md:text-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-white">
              <Sparkles className="h-5 w-5" />
              You got the job!
            </span>
          </p>
        </div>

        {/* Job details */}
        <div
          className="mb-8 mt-8 transition-opacity duration-300"
          style={{
            opacity: showDetails ? 1 : 0,
          }}
        >
          <Card className="inline-block shadow-md">
            <CardContent className="p-6">
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Your new role
              </p>
              <p className="mb-1 text-xl font-semibold">{scenarioName}</p>
              <p className="text-muted-foreground">at {companyName}</p>
            </CardContent>
          </Card>
        </div>

        {/* Continue button with auto-advance */}
        <div
          className="transition-opacity duration-300"
          style={{
            opacity: showButton ? 1 : 0,
          }}
        >
          <Button
            onClick={handleContinue}
            size="lg"
            className="bg-green-500 px-8 text-lg hover:bg-green-600"
          >
            Start Your First Day
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Auto-advancing in {autoAdvanceTimer}s...
          </p>
        </div>
      </div>
    </div>
  );
}
