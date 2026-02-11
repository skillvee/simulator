import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { VideoAssessmentStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { AssessmentReport, SkillScore, ScoreLevel, VideoEvaluationResult, VideoSkillEvaluation, VideoDimension } from "@/types";
import { sendReportEmail, isEmailServiceConfigured } from "@/lib/external";
import { getEvaluationResults, evaluateVideo } from "@/lib/analysis";
import type { VideoEvaluationOutput } from "@/prompts/analysis/video-evaluation";

/**
 * Maps video evaluation dimension names to skill categories for the report
 */
const DIMENSION_TO_CATEGORY: Record<string, string> = {
  COMMUNICATION: "communication",
  PROBLEM_SOLVING: "problem_decomposition",
  TECHNICAL_KNOWLEDGE: "code_quality",
  COLLABORATION: "xfn_collaboration",
  ADAPTABILITY: "technical_decision_making",
  LEADERSHIP: "presentation",
  CREATIVITY: "ai_leverage",
  TIME_MANAGEMENT: "time_management",
};

/**
 * Maps a score (1-5) to a level label
 */
function scoreToLevel(score: number): ScoreLevel {
  if (score >= 4.5) return "exceptional";
  if (score >= 3.5) return "strong";
  if (score >= 2.5) return "adequate";
  if (score >= 1.5) return "developing";
  return "needs_improvement";
}

/**
 * Dimension names for video evaluation
 */
const VIDEO_DIMENSIONS: VideoDimension[] = [
  "COMMUNICATION",
  "PROBLEM_SOLVING",
  "TECHNICAL_KNOWLEDGE",
  "COLLABORATION",
  "ADAPTABILITY",
  "LEADERSHIP",
  "CREATIVITY",
  "TIME_MANAGEMENT",
];

/**
 * Converts video evaluation output to the new video evaluation result format
 */
function convertToVideoEvaluationResult(
  videoResult: VideoEvaluationOutput
): VideoEvaluationResult {
  const skills: VideoSkillEvaluation[] = VIDEO_DIMENSIONS.map(dimension => {
    const scoreData = videoResult.dimension_scores[dimension];
    return {
      dimension,
      score: scoreData?.score ?? null,
      rationale: scoreData?.rationale ?? "",
      greenFlags: scoreData?.greenFlags ?? [],
      redFlags: scoreData?.redFlags ?? [],
      timestamps: scoreData?.timestamps ?? [],
    };
  });

  return {
    evaluationVersion: videoResult.evaluation_version,
    overallScore: videoResult.overall_score,
    skills,
    hiringSignals: videoResult.hiringSignals,
    overallSummary: videoResult.overall_summary,
    evaluationConfidence: videoResult.evaluation_confidence,
    insufficientEvidenceNotes: videoResult.insufficient_evidence_notes ?? undefined,
  };
}

/**
 * Converts video evaluation output to assessment report format
 */
function convertVideoEvaluationToReport(
  videoResult: VideoEvaluationOutput,
  assessmentId: string,
  candidateName?: string,
  timing?: { totalDurationMinutes: number | null; workingPhaseMinutes: number | null },
  coworkersContacted?: number
): AssessmentReport {
  // Convert dimension scores to skill scores (for backward compatibility)
  const skillScores: SkillScore[] = [];

  for (const [dimension, scoreData] of Object.entries(videoResult.dimension_scores)) {
    const category = DIMENSION_TO_CATEGORY[dimension];
    if (!category || scoreData.score === null) continue;

    // Combine green flags and red flags as evidence
    const evidence: string[] = [
      ...scoreData.greenFlags.map(f => `+ ${f}`),
      ...scoreData.redFlags.map(f => `- ${f}`),
    ];

    skillScores.push({
      category: category as SkillScore["category"],
      score: scoreData.score,
      level: scoreToLevel(scoreData.score),
      evidence,
      notes: scoreData.rationale,
    });
  }

  // Build narrative from hiring signals
  const { hiringSignals } = videoResult;

  // Create the video evaluation result for new display
  const videoEvaluation = convertToVideoEvaluationResult(videoResult);

  return {
    generatedAt: new Date().toISOString(),
    assessmentId,
    candidateName,
    overallScore: videoResult.overall_score,
    overallLevel: scoreToLevel(videoResult.overall_score),
    skillScores,
    narrative: {
      overallSummary: videoResult.overall_summary,
      strengths: hiringSignals.overallGreenFlags,
      areasForImprovement: hiringSignals.overallRedFlags,
      notableObservations: videoResult.key_highlights
        .filter(h => h.type === "positive")
        .slice(0, 3)
        .map(h => `[${h.timestamp}] ${h.description}`),
    },
    recommendations: skillScores
      .filter(s => s.score <= 3)
      .slice(0, 3)
      .map((skill) => ({
        category: skill.category,
        priority: skill.score <= 2 ? "high" : "medium" as const,
        title: `Improve ${skill.category.replace("_", " ")}`,
        description: skill.notes,
        actionableSteps: skill.evidence
          .filter(e => e.startsWith("- "))
          .map(e => `Address: ${e.slice(2)}`)
          .slice(0, 3),
      })),
    metrics: {
      totalDurationMinutes: timing?.totalDurationMinutes ?? null,
      workingPhaseMinutes: timing?.workingPhaseMinutes ?? null,
      coworkersContacted: coworkersContacted ?? 0,
      aiToolsUsed: true, // Assumed for simulation context
      testsStatus: "unknown",
      codeReviewScore: null,
    },
    version: videoResult.evaluation_version,
    // Include new video evaluation data for results page
    videoEvaluation,
  };
}

/**
 * Convert report to Prisma JSON format
 */
function reportToPrismaJson(report: AssessmentReport): Prisma.InputJsonValue {
  return report as unknown as Prisma.InputJsonValue;
}

/**
 * POST /api/assessment/report
 * Generates the final assessment report from video evaluation
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
        startedAt: true,
        completedAt: true,
        user: {
          select: { name: true, email: true },
        },
        conversations: {
          select: { coworkerId: true },
          where: { coworkerId: { not: null } },
        },
        recordings: {
          where: { type: "screen" },
          select: { storageUrl: true },
          take: 1,
        },
        scenario: {
          select: { taskDescription: true },
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

    // Check if video recording exists
    const videoUrl = assessment.recordings[0]?.storageUrl;
    if (!videoUrl) {
      return NextResponse.json(
        { error: "No video recording found for this assessment. Video evaluation cannot proceed without a recording." },
        { status: 400 }
      );
    }

    // Check if video assessment exists and get results
    const videoAssessment = await db.videoAssessment.findUnique({
      where: { assessmentId },
      select: {
        id: true,
        status: true,
        summary: {
          select: { rawAiResponse: true },
        },
      },
    });

    let videoResult: VideoEvaluationOutput | null = null;

    if (videoAssessment?.status === VideoAssessmentStatus.COMPLETED && videoAssessment.summary?.rawAiResponse) {
      // Use existing video evaluation result
      videoResult = videoAssessment.summary.rawAiResponse as unknown as VideoEvaluationOutput;
    } else if (!videoAssessment || videoAssessment.status === VideoAssessmentStatus.PENDING ||
               videoAssessment.status === VideoAssessmentStatus.FAILED) {
      // Trigger video evaluation and wait for it
      try {
        // Create video assessment record if it doesn't exist
        let videoAssessmentId: string;

        if (!videoAssessment) {
          const newVideoAssessment = await db.videoAssessment.create({
            data: {
              candidateId: session.user.id,
              assessmentId,
              videoUrl,
              status: VideoAssessmentStatus.PENDING,
            },
          });
          videoAssessmentId = newVideoAssessment.id;
        } else {
          videoAssessmentId = videoAssessment.id;
          // Reset status for retry
          await db.videoAssessment.update({
            where: { id: videoAssessmentId },
            data: { status: VideoAssessmentStatus.PENDING },
          });
        }

        // Run evaluation synchronously
        const evalResult = await evaluateVideo({
          assessmentId: videoAssessmentId,
          videoUrl,
          taskDescription: assessment.scenario.taskDescription,
        });

        if (!evalResult.success) {
          return NextResponse.json(
            { error: `Video evaluation failed: ${evalResult.error}` },
            { status: 500 }
          );
        }

        // Fetch the results
        const results = await getEvaluationResults(videoAssessmentId);
        if (results.summary?.rawAiResponse) {
          videoResult = results.summary.rawAiResponse as unknown as VideoEvaluationOutput;
        }
      } catch (error) {
        console.error("Error running video evaluation:", error);
        return NextResponse.json(
          { error: "Failed to evaluate video" },
          { status: 500 }
        );
      }
    } else if (videoAssessment.status === VideoAssessmentStatus.PROCESSING) {
      return NextResponse.json(
        { error: "Video evaluation is still in progress. Please try again later." },
        { status: 202 }
      );
    }

    if (!videoResult) {
      return NextResponse.json(
        { error: "Could not retrieve video evaluation results" },
        { status: 500 }
      );
    }

    // Calculate timing
    const completedAt = assessment.completedAt || new Date();
    const totalDurationMs = completedAt.getTime() - assessment.startedAt.getTime();
    const totalDurationMinutes = Math.floor(totalDurationMs / 60000);

    // Count unique coworkers contacted
    const uniqueCoworkerIds = new Set(
      assessment.conversations
        .map(c => c.coworkerId)
        .filter((id): id is string => id !== null)
    );

    // Convert video evaluation to report format
    const report = convertVideoEvaluationToReport(
      videoResult,
      assessmentId,
      assessment.user?.name || undefined,
      {
        totalDurationMinutes,
        workingPhaseMinutes: totalDurationMinutes,
      },
      uniqueCoworkerIds.size
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
