import { auth } from "@/auth";
import { db } from "@/server/db";
import { provisionAssessmentRepo } from "@/lib/scenarios/repo-templates";
import { success, error, validateRequest } from "@/lib/api";
import { AssessmentCreateSchema } from "@/lib/schemas";
import { createLogger } from "@/lib/core";

const logger = createLogger("api:assessment:create");

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

  // Validate request body
  const validated = await validateRequest(request, AssessmentCreateSchema);
  if ("error" in validated) return validated.error;
  const { scenarioId, targetLevel } = validated.data;

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

    // Create new assessment in WELCOME status
    // Candidate transitions to WORKING when they click "Start Simulation"
    const assessment = await db.assessment.create({
      data: {
        userId,
        scenarioId,
        status: "WELCOME",
        targetLevel: targetLevel ?? null,
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
            logger.info("Repo provisioned", { assessmentId: assessment.id, repoUrl });
          } else {
            await db.assessment.update({
              where: { id: assessment.id },
              data: { repoStatus: "failed" },
            });
          }
        })
        .catch((err) => {
          logger.error("Repo provision failed", { assessmentId: assessment.id, error: String(err) });
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
    logger.error("Unexpected error", { error: String(err) });
    return error("Failed to create assessment", 500);
  }
}
