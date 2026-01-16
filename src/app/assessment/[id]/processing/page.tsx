import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { ProcessingClient } from "./client";

interface ProcessingPageProps {
  params: Promise<{ id: string }>;
}

export interface ProcessingStats {
  totalDurationMinutes: number | null;
  coworkersContacted: number;
  totalMessages: number;
  scenarioName: string;
  companyName: string;
  userName: string;
  hasHRInterview: boolean;
  hasDefenseCall: boolean;
}

export default async function ProcessingPage({ params }: ProcessingPageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Fetch the assessment and verify ownership
  const assessment = await db.assessment.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      scenario: {
        select: {
          name: true,
          companyName: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      conversations: {
        select: {
          id: true,
          type: true,
          coworkerId: true,
          transcript: true,
        },
      },
      hrAssessment: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!assessment) {
    redirect("/");
  }

  // If assessment already has a report, redirect to results
  if (assessment.report) {
    redirect(`/assessment/${id}/results`);
  }

  // Calculate stats
  const totalDurationMs = assessment.completedAt
    ? assessment.completedAt.getTime() - assessment.startedAt.getTime()
    : Date.now() - assessment.startedAt.getTime();
  const totalDurationMinutes = Math.round(totalDurationMs / 60000);

  // Count unique coworkers contacted (excluding kickoff/defense which are manager)
  const uniqueCoworkerIds = new Set<string>();
  let totalMessages = 0;

  for (const conv of assessment.conversations) {
    if (conv.coworkerId && conv.type !== "kickoff" && conv.type !== "defense") {
      uniqueCoworkerIds.add(conv.coworkerId);
    }
    // Count messages in transcript
    const transcript = conv.transcript as Array<{ role: string; text: string }> | null;
    if (transcript && Array.isArray(transcript)) {
      totalMessages += transcript.length;
    }
  }

  // Check if defense call exists
  const hasDefenseCall = assessment.conversations.some(
    (conv) => conv.type === "defense"
  );

  const stats: ProcessingStats = {
    totalDurationMinutes,
    coworkersContacted: uniqueCoworkerIds.size,
    totalMessages,
    scenarioName: assessment.scenario.name,
    companyName: assessment.scenario.companyName,
    userName: assessment.user?.name || session.user.name || "there",
    hasHRInterview: !!assessment.hrAssessment,
    hasDefenseCall,
  };

  return <ProcessingClient assessmentId={id} stats={stats} />;
}
