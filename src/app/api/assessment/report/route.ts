import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { VideoAssessmentStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { AssessmentReport, SkillScore, ScoreLevel, RubricAssessmentOutput } from "@/types";
import { sendReportEmail, isEmailServiceConfigured } from "@/lib/external";
import { getEvaluationResults, evaluateVideo } from "@/lib/analysis";
import { RUBRIC_TO_ASSESSMENT_DIMENSION } from "@/lib/rubric/dimension-mapping";

/**
 * Maps assessment dimension keys to report skill categories.
 * Assessment dimensions (UPPERCASE) → report categories (lowercase).
 */
const ASSESSMENT_DIM_TO_CATEGORY: Record<string, string> = {
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
 * Maps a score (1-4 rubric scale) to a level label
 */
function scoreToLevel(score: number): ScoreLevel {
  if (score >= 3.5) return "exceptional";
  if (score >= 2.5) return "strong";
  if (score >= 1.5) return "adequate";
  return "needs_improvement";
}

/**
 * Converts rubric assessment output (v3) to assessment report format.
 *
 * The v3 rubric system stores dimension scores using role-family-specific slugs
 * (e.g., "technical_execution", "problem_decomposition_design"). This function
 * maps them through RUBRIC_TO_ASSESSMENT_DIMENSION → ASSESSMENT_DIM_TO_CATEGORY
 * to produce the report's skill categories.
 */
function convertRubricToReport(
  rubricResult: RubricAssessmentOutput,
  assessmentId: string,
  candidateName?: string,
  timing?: { totalDurationMinutes: number | null; workingPhaseMinutes: number | null },
  coworkersContacted?: number
): AssessmentReport {
  const skillScores: SkillScore[] = [];

  // Track best score per assessment dimension (multiple rubric dims may map to same one)
  const bestByCategory: Record<string, SkillScore> = {};

  for (const dimScore of rubricResult.dimensionScores) {
    if (dimScore.score === null) continue;

    // Map rubric slug → assessment dimension → report category
    const assessmentDim = RUBRIC_TO_ASSESSMENT_DIMENSION[dimScore.dimensionSlug];
    const category = assessmentDim
      ? ASSESSMENT_DIM_TO_CATEGORY[assessmentDim]
      : dimScore.dimensionSlug; // Fall back to slug itself if no mapping

    if (!category) continue;

    const evidence: string[] = [
      ...dimScore.greenFlags.map(f => `+ ${f}`),
      ...dimScore.redFlags.map(f => `- ${f}`),
    ];

    const candidate: SkillScore = {
      category: category as SkillScore["category"],
      score: dimScore.score,
      level: scoreToLevel(dimScore.score),
      evidence,
      notes: dimScore.rationale,
    };

    // Keep the higher-scoring entry when multiple rubric dims map to same category
    const existing = bestByCategory[category];
    if (!existing || dimScore.score > existing.score) {
      bestByCategory[category] = candidate;
    }
  }

  skillScores.push(...Object.values(bestByCategory));

  // Build narrative from v3 fields (topStrengths / growthAreas / detectedRedFlags)
  const strengths = rubricResult.topStrengths.map(s => s.description);
  const areasForImprovement = rubricResult.growthAreas.map(g => g.description);

  // Add detected red flags to areas for improvement
  for (const rf of rubricResult.detectedRedFlags) {
    areasForImprovement.push(`Red flag: ${rf.evidence}`);
  }

  // Build notable observations from highest-scoring dimension behaviors
  const notableObservations: string[] = rubricResult.dimensionScores
    .filter(d => d.score !== null && d.score >= 3)
    .flatMap(d => d.observableBehaviors.slice(0, 1).map(b => `[${b.timestamp}] ${b.behavior}`))
    .slice(0, 5);

  return {
    generatedAt: new Date().toISOString(),
    assessmentId,
    candidateName,
    overallScore: rubricResult.overallScore,
    overallLevel: scoreToLevel(rubricResult.overallScore),
    skillScores,
    narrative: {
      overallSummary: rubricResult.overallSummary,
      strengths,
      areasForImprovement,
      notableObservations,
    },
    recommendations: skillScores
      .filter(s => s.score <= 2)
      .slice(0, 3)
      .map((skill) => ({
        category: skill.category,
        priority: skill.score <= 1 ? "high" : "medium" as const,
        title: `Improve ${skill.category.replace(/_/g, " ")}`,
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
      aiToolsUsed: true,
      testsStatus: "unknown",
      codeReviewScore: null,
    },
    version: rubricResult.evaluationVersion,
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

    let videoResult: RubricAssessmentOutput | null = null;

    if (videoAssessment?.status === VideoAssessmentStatus.COMPLETED && videoAssessment.summary?.rawAiResponse) {
      // Use existing video evaluation result (v3 rubric format)
      videoResult = videoAssessment.summary.rawAiResponse as unknown as RubricAssessmentOutput;
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
          videoResult = results.summary.rawAiResponse as unknown as RubricAssessmentOutput;
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

    // Convert rubric evaluation to report format
    const report = convertRubricToReport(
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
