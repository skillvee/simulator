import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";
import { z } from "zod";

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

const CreateLogSchema = z.object({
  roleTitle: z.string().optional(),
  companyName: z.string().optional(),
  techStack: z.array(z.string()).optional().default([]),
  seniorityLevel: z.string().optional(),
  archetypeId: z.string().optional(),
  source: z.enum(["jd_paste", "guided"]).default("guided"),
});

const UpdateLogSchema = z.object({
  logId: z.string().min(1),
  status: z.enum(["STARTED", "GENERATING", "SAVING", "COMPLETED", "FAILED"]),
  scenarioId: z.string().optional(),
  failedStep: z.string().optional(),
  errorMessage: z.string().optional(),
  errorDetails: z.unknown().optional(),
  roleTitle: z.string().optional(),
  companyName: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  seniorityLevel: z.string().optional(),
  archetypeId: z.string().optional(),
});

/**
 * POST /api/recruiter/simulations/creation-log
 * Create a new creation log entry when simulation creation starts
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return error("Unauthorized", 401);

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  try {
    const body = await request.json();
    const validated = CreateLogSchema.safeParse(body);
    if (!validated.success) {
      return error("Invalid request body", 400, "VALIDATION_ERROR");
    }

    const log = await db.simulationCreationLog.create({
      data: {
        userId: user.id,
        status: "STARTED",
        roleTitle: validated.data.roleTitle,
        companyName: validated.data.companyName,
        techStack: validated.data.techStack,
        seniorityLevel: validated.data.seniorityLevel,
        archetypeId: validated.data.archetypeId,
        source: validated.data.source,
      },
    });

    return success({ logId: log.id }, 201);
  } catch (err) {
    console.error("Failed to create simulation creation log:", err);
    return error("Failed to create log entry", 500);
  }
}

/**
 * PATCH /api/recruiter/simulations/creation-log
 * Update a creation log entry (status change, error, or completion)
 */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return error("Unauthorized", 401);

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  try {
    const body = await request.json();
    const validated = UpdateLogSchema.safeParse(body);
    if (!validated.success) {
      return error("Invalid request body", 400, "VALIDATION_ERROR");
    }

    const { logId, status, scenarioId, failedStep, errorMessage, errorDetails, ...updates } = validated.data;

    // Verify the log belongs to this user
    const existing = await db.simulationCreationLog.findFirst({
      where: { id: logId, userId: user.id },
    });
    if (!existing) {
      return error("Log entry not found", 404);
    }

    const updateData: Record<string, unknown> = { status };

    if (scenarioId) updateData.scenarioId = scenarioId;
    if (failedStep) updateData.failedStep = failedStep;
    if (errorMessage) updateData.errorMessage = errorMessage;
    if (errorDetails !== undefined) updateData.errorDetails = errorDetails as object;
    if (updates.roleTitle) updateData.roleTitle = updates.roleTitle;
    if (updates.companyName) updateData.companyName = updates.companyName;
    if (updates.techStack) updateData.techStack = updates.techStack;
    if (updates.seniorityLevel) updateData.seniorityLevel = updates.seniorityLevel;
    if (updates.archetypeId) updateData.archetypeId = updates.archetypeId;

    if (status === "COMPLETED" || status === "FAILED") {
      updateData.completedAt = new Date();
    }

    const log = await db.simulationCreationLog.update({
      where: { id: logId },
      data: updateData,
    });

    return success({ log });
  } catch (err) {
    console.error("Failed to update simulation creation log:", err);
    return error("Failed to update log entry", 500);
  }
}
