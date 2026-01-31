import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import type { CodeReviewData, AssessmentReport, ChatMessage } from "@/types";
import type { PrCiStatus } from "@/lib/external";
import { sendReportEmail, isEmailServiceConfigured } from "@/lib/external";
import type { Prisma } from "@prisma/client";

// Note: The old assessment aggregation was removed in RF-022.
// Report generation will be reimplemented using video evaluation in subsequent issues.
// For now, this route provides placeholder implementations.

/**
 * Conversation signals from chat/voice interactions
 */
interface ConversationSignals {
  coworkerChats: Array<{
    coworkerName: string;
    coworkerRole: string;
    messages: ChatMessage[];
    type: "text" | "voice";
  }>;
  defenseTranscript: ChatMessage[];
  totalCoworkerInteractions: number;
  uniqueCoworkersContacted: number;
}

/**
 * All collected assessment signals (simplified)
 */
interface AssessmentSignals {
  assessmentId: string;
  userId: string;
  scenarioName: string;
  hrInterview: null;
  conversations: ConversationSignals;
  recording: null;
  codeReview: CodeReviewData | null;
  ciStatus: PrCiStatus | null;
  prUrl: string | null;
  timing: {
    startedAt: Date;
    completedAt: Date | null;
    totalDurationSeconds: number | null;
    workingPhaseSeconds: number | null;
  };
}

/**
 * Placeholder: Generate assessment report
 * TODO: Implement using video evaluation in subsequent issues (RF-023+)
 */
async function generateAssessmentReport(
  signals: AssessmentSignals,
  candidateName?: string
): Promise<AssessmentReport> {
  // Placeholder implementation - returns a minimal report
  // This will be replaced with video-based evaluation in subsequent issues
  return {
    generatedAt: new Date().toISOString(),
    assessmentId: signals.assessmentId,
    candidateName,
    overallScore: 3,
    overallLevel: "adequate",
    skillScores: [],
    narrative: {
      overallSummary:
        "Assessment report generation is being updated. Please check back later.",
      strengths: [],
      areasForImprovement: [],
      notableObservations: [],
    },
    recommendations: [],
    version: "2.0.0-placeholder",
  };
}

/**
 * Convert report to Prisma JSON format
 */
function reportToPrismaJson(report: AssessmentReport): Prisma.InputJsonValue {
  return report as unknown as Prisma.InputJsonValue;
}

/**
 * Collects assessment signals from the database (simplified)
 */
async function collectAssessmentSignals(
  assessmentId: string
): Promise<AssessmentSignals | null> {
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      scenario: {
        select: { id: true, name: true, companyName: true },
      },
      conversations: {
        include: {
          coworker: {
            select: { id: true, name: true, role: true },
          },
        },
      },
    },
  });

  if (!assessment) {
    return null;
  }

  // Build conversation signals
  const conversationSignals: ConversationSignals = {
    coworkerChats: [],
    defenseTranscript: [],
    totalCoworkerInteractions: 0,
    uniqueCoworkersContacted: 0,
  };

  const uniqueCoworkerIds = new Set<string>();

  for (const conv of assessment.conversations) {
    const messages = (conv.transcript as unknown as ChatMessage[]) || [];
    const convType = conv.type as "text" | "voice" | "defense";

    if (convType === "defense") {
      conversationSignals.defenseTranscript = messages;
    } else if (conv.coworkerId && conv.coworker) {
      conversationSignals.coworkerChats.push({
        coworkerName: conv.coworker.name,
        coworkerRole: conv.coworker.role,
        messages,
        type: convType === "voice" ? "voice" : "text",
      });
      uniqueCoworkerIds.add(conv.coworkerId);
      conversationSignals.totalCoworkerInteractions += messages.length;
    }
  }

  conversationSignals.uniqueCoworkersContacted = uniqueCoworkerIds.size;

  // Parse code review and CI status from JSON fields
  const codeReview = assessment.codeReview
    ? (assessment.codeReview as unknown as CodeReviewData)
    : null;
  const ciStatus = assessment.ciStatus
    ? (assessment.ciStatus as unknown as PrCiStatus)
    : null;

  // Calculate timing
  const now = new Date();
  const completedAt = assessment.completedAt || now;
  const totalDurationSeconds = Math.floor(
    (completedAt.getTime() - assessment.startedAt.getTime()) / 1000
  );

  return {
    assessmentId: assessment.id,
    userId: assessment.userId,
    scenarioName: assessment.scenario.name,
    hrInterview: null,
    conversations: conversationSignals,
    recording: null, // Screenshot analysis removed in RF-022
    codeReview,
    ciStatus,
    prUrl: assessment.prUrl,
    timing: {
      startedAt: assessment.startedAt,
      completedAt: assessment.completedAt,
      totalDurationSeconds,
      workingPhaseSeconds: totalDurationSeconds,
    },
  };
}

/**
 * POST /api/assessment/report
 * Generates the final assessment report
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { assessmentId, forceRegenerate = false } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
        { status: 400 }
      );
    }

    // Verify assessment exists and belongs to user
    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        userId: true,
        status: true,
        report: true,
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    if (assessment.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized to access this assessment" },
        { status: 403 }
      );
    }

    // Check if we should return existing report
    if (assessment.report && !forceRegenerate) {
      return NextResponse.json({
        success: true,
        report: assessment.report,
        cached: true,
      });
    }

    // Collect all signals
    const signals = await collectAssessmentSignals(assessmentId);
    if (!signals) {
      return NextResponse.json(
        { error: "Failed to collect assessment signals" },
        { status: 500 }
      );
    }

    // Generate the report
    const report = await generateAssessmentReport(
      signals,
      assessment.user?.name || undefined
    );

    // Store the report in the database
    await db.assessment.update({
      where: { id: assessmentId },
      data: {
        report: reportToPrismaJson(report),
      },
    });

    // Send email notification if email service is configured
    let emailResult: { success: boolean; error?: string } = { success: false };
    if (isEmailServiceConfigured() && assessment.user?.email) {
      const host = request.headers.get("host") || "localhost:3000";
      const protocol = host.includes("localhost") ? "http" : "https";
      const appBaseUrl = `${protocol}://${host}`;

      // Send email asynchronously (don't block response)
      sendReportEmail({
        to: assessment.user.email,
        candidateName: assessment.user.name || undefined,
        assessmentId,
        report: report as AssessmentReport,
        appBaseUrl,
      })
        .then((result) => {
          if (result.success) {
            console.log(
              `Report email sent successfully to ${assessment.user?.email}`
            );
          } else {
            console.warn(`Failed to send report email: ${result.error}`);
          }
        })
        .catch((err) => {
          console.error("Error sending report email:", err);
        });

      emailResult = { success: true };
    }

    return NextResponse.json({
      success: true,
      report,
      cached: false,
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error("Error generating assessment report:", error);
    return NextResponse.json(
      { error: "Failed to generate assessment report" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/assessment/report?assessmentId=xxx
 * Retrieves an existing assessment report
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("assessmentId");

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
        { status: 400 }
      );
    }

    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        userId: true,
        status: true,
        report: true,
        user: {
          select: { name: true },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    if (assessment.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized to access this assessment" },
        { status: 403 }
      );
    }

    if (!assessment.report) {
      return NextResponse.json(
        { error: "No report generated yet" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      report: assessment.report,
      assessmentStatus: assessment.status,
    });
  } catch (error) {
    console.error("Error fetching assessment report:", error);
    return NextResponse.json(
      { error: "Failed to fetch assessment report" },
      { status: 500 }
    );
  }
}
