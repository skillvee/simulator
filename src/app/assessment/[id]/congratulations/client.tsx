"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CongratulationsClientProps {
  assessmentId: string;
  userName: string;
  companyName: string;
  scenarioName: string;
}

export function CongratulationsClient({
  assessmentId,
  userName,
  companyName,
  scenarioName,
}: CongratulationsClientProps) {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(10);

  // Sharp, stepped animation sequence (no smooth transitions)
  useEffect(() => {
    // Each step appears instantly after a delay
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
          router.push(`/assessment/${assessmentId}/welcome`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showButton, assessmentId, router]);

  const handleContinue = () => {
    router.push(`/assessment/${assessmentId}/welcome`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Decorative geometric shapes - neo-brutalist style */}
      <div
        className="absolute top-0 left-0 w-32 h-32 bg-secondary border-2 border-foreground"
        style={{
          clipPath: "polygon(0 0, 100% 0, 0 100%)",
          opacity: showContent ? 1 : 0,
        }}
      />
      <div
        className="absolute top-0 right-0 w-24 h-24 bg-foreground"
        style={{
          clipPath: "polygon(100% 0, 100% 100%, 0 0)",
          opacity: showContent ? 1 : 0,
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-40 h-40 bg-secondary border-2 border-foreground"
        style={{
          clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
          opacity: showContent ? 1 : 0,
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-20 h-20 bg-foreground"
        style={{
          clipPath: "polygon(0 0, 100% 100%, 0 100%)",
          opacity: showContent ? 1 : 0,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 text-center max-w-xl">
        {/* Celebratory badge */}
        <div
          className="mb-8"
          style={{
            opacity: showBadge ? 1 : 0,
            transform: showBadge ? "scale(1)" : "scale(0)",
          }}
        >
          <div className="inline-block bg-secondary border-4 border-foreground p-6">
            <div className="text-6xl font-bold text-secondary-foreground">
              &#10003;
            </div>
          </div>
        </div>

        {/* Main message */}
        <div
          style={{
            opacity: showMessage ? 1 : 0,
            transform: showMessage ? "translateY(0)" : "translateY(-20px)",
          }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Congratulations, {userName}!
          </h1>
          <p className="text-2xl md:text-3xl mb-2">
            <span className="text-secondary bg-foreground px-3 py-1 inline-block">
              You got the job!
            </span>
          </p>
        </div>

        {/* Job details */}
        <div
          className="mt-8 mb-8"
          style={{
            opacity: showDetails ? 1 : 0,
          }}
        >
          <div className="inline-block bg-muted border-2 border-foreground p-6">
            <p className="text-muted-foreground text-sm uppercase tracking-wider mb-2">
              Your new role
            </p>
            <p className="text-xl font-bold mb-1">{scenarioName}</p>
            <p className="text-muted-foreground">at {companyName}</p>
          </div>
        </div>

        {/* Continue button with auto-advance */}
        <div
          style={{
            opacity: showButton ? 1 : 0,
          }}
        >
          <button
            onClick={handleContinue}
            className="bg-foreground text-background px-8 py-4 text-lg font-bold border-4 border-foreground hover:bg-secondary hover:text-secondary-foreground"
          >
            Start Your First Day
          </button>
          <p className="mt-4 text-sm text-muted-foreground font-mono">
            Auto-advancing in {autoAdvanceTimer}s...
          </p>
        </div>
      </div>
    </div>
  );
}
