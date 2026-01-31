import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import type { CodeReviewData } from "@/lib/analysis";
import type { PrCiStatus } from "@/lib/external";
import type { ChatMessage } from "@/types";
import {
  aggregateSegmentAnalyses,
  type SegmentAnalysisResponse,
} from "@/lib/analysis";
import {
  generateAssessmentReport,
  reportToPrismaJson,
  type AssessmentSignals,
  type AssessmentReport,
  type RecordingSignals,
  type ConversationSignals,
} from "@/lib/analysis";
import { sendReportEmail, isEmailServiceConfigured } from "@/lib/external";

/**
 * Collects all assessment signals from the database
 */
async function collectAssessmentSignals(
  assessmentId: string
): Promise<AssessmentSignals | null> {
  // Fetch assessment with all related data
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
      recordings: {
        include: {
          segments: {
            include: {
              analysis: true,
            },
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

  // Build recording signals
  let recordingSignals: RecordingSignals | null = null;
  if (assessment.recordings.length > 0) {
    const allSegmentAnalyses: SegmentAnalysisResponse[] = [];

    for (const recording of assessment.recordings) {
      for (const segment of recording.segments) {
        if (segment.analysis) {
          // Reconstruct SegmentAnalysisResponse from database data
          const analysis: SegmentAnalysisResponse = {
            activityTimeline:
              (segment.analysis.activityTimeline as Array<{
                timestamp: string;
                activity:
                  | "coding"
                  | "reading_docs"
                  | "browsing"
                  | "debugging"
                  | "testing"
                  | "searching"
                  | "idle"
                  | "planning"
                  | "reviewing"
                  | "communicating"
                  | "other";
                description: string;
                applicationVisible?: string;
              }>) || [],
            toolUsage:
              (segment.analysis.toolUsage as Array<{
                tool: string;
                usageCount: number;
                contextNotes: string;
              }>) || [],
            stuckMoments:
              (segment.analysis.stuckMoments as Array<{
                startTime: string;
                endTime: string;
                description: string;
                potentialCause:
                  | "unclear_requirements"
                  | "technical_difficulty"
                  | "debugging"
                  | "searching_for_solution"
                  | "context_switching"
                  | "environment_issues"
                  | "unknown";
                durationSeconds: number;
              }>) || [],
            summary: {
              totalActiveTimeSeconds: segment.analysis.totalActiveTime || 0,
              totalIdleTimeSeconds: segment.analysis.totalIdleTime || 0,
              focusScore: segment.analysis.focusScore || 3,
              dominantActivity: "unknown",
              aiToolsUsed: false,
              keyObservations: [],
            },
          };

          // Extract additional summary data from aiAnalysis if available
          const aiAnalysis = segment.analysis.aiAnalysis as Record<
            string,
            unknown
          > | null;
          if (aiAnalysis?.summary) {
            const summary = aiAnalysis.summary as Record<string, unknown>;
            analysis.summary.dominantActivity =
              (summary.dominantActivity as string) || "unknown";
            analysis.summary.aiToolsUsed =
              (summary.aiToolsUsed as boolean) || false;
            analysis.summary.keyObservations =
              (summary.keyObservations as string[]) || [];
          }

          allSegmentAnalyses.push(analysis);
        }
      }
    }

    if (allSegmentAnalyses.length > 0) {
      const aggregated = aggregateSegmentAnalyses(allSegmentAnalyses);
      recordingSignals = {
        activityTimeline: aggregated.activityTimeline,
        toolUsage: aggregated.toolUsage,
        stuckMoments: aggregated.stuckMoments,
        totalActiveTime: aggregated.totalActiveTime,
        totalIdleTime: aggregated.totalIdleTime,
        focusScore: aggregated.overallFocusScore,
        aiToolsUsed: aggregated.aiToolsUsed,
        keyObservations: aggregated.keyObservations,
      };
    }
  }

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

  // Build the full signals object
  const signals: AssessmentSignals = {
    assessmentId: assessment.id,
    userId: assessment.userId,
    scenarioName: assessment.scenario.name,

    hrInterview: null,
    conversations: conversationSignals,
    recording: recordingSignals,

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

  return signals;
}

/**
 * POST /api/assessment/report
 * Generates the final assessment report by aggregating all signals
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
      // Construct app base URL from request headers
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

      emailResult = { success: true }; // Mark as attempted
    } else if (!isEmailServiceConfigured()) {
      console.log("Email service not configured, skipping report email");
    } else if (!assessment.user?.email) {
      console.log("No user email available, skipping report email");
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

    // Fetch assessment with report
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
