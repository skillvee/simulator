import { db } from "@/server/db";

/**
 * User select fields commonly needed across assessment queries
 */
const userSelectBasic = {
  id: true,
  name: true,
  email: true,
} as const;

/**
 * Get basic assessment with scenario context.
 * Use for pages that need assessment verification and basic scenario info.
 */
export async function getAssessmentWithContext(id: string, userId: string) {
  return db.assessment.findFirst({
    where: { id, userId },
    include: {
      scenario: true,
      user: { select: userSelectBasic },
    },
  });
}

/**
 * Get assessment for chat page with coworkers.
 * Includes scenario with all coworkers for sidebar display.
 */
export async function getAssessmentForChat(id: string, userId: string) {
  const assessment = await db.assessment.findUnique({
    where: { id },
    include: {
      scenario: {
        include: {
          coworkers: true,
          dataFiles: {
            select: {
              id: true,
              filename: true,
              rowCount: true,
              byteSize: true,
              previewRows: true,
              schemaJson: true,
            },
            orderBy: { generatedAt: "asc" },
          },
        },
      },
    },
  });

  // Verify ownership
  if (!assessment || assessment.userId !== userId) {
    return null;
  }

  return assessment;
}

/**
 * Get assessment for results page.
 * Includes scenario name and user info for report display.
 */
export async function getAssessmentForResults(id: string, userId: string) {
  return db.assessment.findFirst({
    where: { id, userId },
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
    },
  });
}

/**
 * Get basic assessment for verification only.
 * Use when you only need to check if assessment exists and belongs to user.
 */
export async function getAssessmentBasic(id: string, userId: string) {
  return db.assessment.findFirst({
    where: { id, userId },
  });
}
