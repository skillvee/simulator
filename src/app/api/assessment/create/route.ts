import { auth } from "@/auth";
import { db } from "@/server/db";
import { provisionAssessmentRepo } from "@/lib/scenarios/repo-templates";
import { success, error } from "@/lib/api";

/**
 * POST /api/assessment/create
 * Create a new assessment for a candidate
 *
 * Request body:
 * - scenarioId: string - The scenario to create an assessment for
 *
 * Returns:
 * - assessment: object - The created assessment
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  const userId = session.user.id;

  // Parse request body
  let scenarioId: string;
  try {
    const body = await request.json();
    scenarioId = body.scenarioId;

    if (!scenarioId || typeof scenarioId !== "string") {
      return error("scenarioId is required", 400);
    }
  } catch {
    return error("Invalid request body", 400);
  }

  try {
    // Fetch the scenario (include repoUrl for per-assessment repo provisioning)
    const scenario = await db.scenario.findUnique({
      where: { id: scenarioId },
      select: {
        id: true,
        name: true,
        isPublished: true,
        repoUrl: true,
      },
    });

    if (!scenario) {
      return error("Scenario not found", 404);
    }

    // Only allow creating assessments for published scenarios
    if (!scenario.isPublished) {
      return error("Scenario is not available", 400);
    }

    // Check for existing assessment for this user and scenario
    const existingAssessment = await db.assessment.findFirst({
      where: {
        userId,
        scenarioId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingAssessment) {
      // Return existing assessment instead of creating a new one
      return success({
        assessment: existingAssessment,
        isExisting: true,
      });
    }

    // Create new assessment with WORKING status (skips welcome page)
    const assessment = await db.assessment.create({
      data: {
        userId,
        scenarioId,
        status: "WORKING",
        repoStatus: scenario.repoUrl ? "pending" : null,
      },
    });

    // Fire-and-forget: provision a per-assessment repo if the scenario has a template repo
    if (scenario.repoUrl) {
      provisionAssessmentRepo(assessment.id, scenario.repoUrl)
        .then(async (repoUrl) => {
          if (repoUrl) {
            await db.assessment.update({
              where: { id: assessment.id },
              data: { repoUrl, repoStatus: "ready" },
            });
            console.log(
              `[assessment/create] Repo provisioned for assessment ${assessment.id}: ${repoUrl}`
            );
          } else {
            await db.assessment.update({
              where: { id: assessment.id },
              data: { repoStatus: "failed" },
            });
          }
        })
        .catch((err) => {
          console.error(
            `[assessment/create] Repo provision failed for ${assessment.id}:`,
            err
          );
          db.assessment
            .update({
              where: { id: assessment.id },
              data: { repoStatus: "failed" },
            })
            .catch(() => {});
        });
    }

    return success(
      {
        assessment,
        isExisting: false,
      },
      201
    );
  } catch (err) {
    console.error("[assessment/create] Unexpected error:", err);
    return error("Failed to create assessment", 500);
  }
}
