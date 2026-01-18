import { db } from "@/server/db";

/**
 * User select fields commonly needed across assessment queries
 */
const userSelectBasic = {
  id: true,
  name: true,
  email: true,
} as const;

const userSelectWithProfile = {
  ...userSelectBasic,
  cvUrl: true,
  parsedProfile: true,
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
      user: { select: userSelectWithProfile },
    },
  });
}

/**
 * Get assessment for HR interview page.
 * Includes scenario info, user CV data, and HR conversation transcript.
 */
export async function getAssessmentForHRInterview(id: string, userId: string) {
  return db.assessment.findFirst({
    where: { id, userId },
    include: {
      scenario: {
        select: {
          name: true,
          companyName: true,
          companyDescription: true,
        },
      },
      conversations: {
        where: {
          coworkerId: null,
          type: "voice",
        },
        select: {
          transcript: true,
        },
      },
      user: {
        select: {
          cvUrl: true,
        },
      },
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
 * Get assessment for defense page.
 * Includes scenario with manager coworker for PR defense call.
 */
export async function getAssessmentForDefense(id: string, userId: string) {
  return db.assessment.findFirst({
    where: { id, userId },
    include: {
      scenario: {
        include: {
          coworkers: {
            where: {
              role: {
                contains: "Manager",
                mode: "insensitive",
              },
            },
            take: 1,
          },
        },
      },
    },
  });
}

/**
 * Get assessment for welcome/onboarding page.
 * Includes scenario with coworkers and HR assessment status.
 */
export async function getAssessmentForWelcome(id: string, userId: string) {
  const assessment = await db.assessment.findUnique({
    where: { id },
    include: {
      scenario: {
        include: {
          coworkers: true,
        },
      },
      hrAssessment: true,
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
