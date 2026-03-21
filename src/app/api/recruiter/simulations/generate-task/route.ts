/**
 * POST /api/recruiter/simulations/generate-task
 *
 * Auto-generate 2-3 realistic work challenge options based on role and company context.
 * Available to RECRUITER and ADMIN roles only.
 */

import { auth } from "@/auth";
import { success, error, validationError } from "@/lib/api";
import {
  generateCodingTask,
  type GenerateCodingTaskInput,
} from "@/lib/scenarios/task-generator";
import { z } from "zod";

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

/**
 * Request body schema
 */
const requestSchema = z.object({
  roleName: z.string().min(1, "Role name is required"),
  seniorityLevel: z.enum(["junior", "mid", "senior", "staff", "principal"]),
  techStack: z.array(z.string()).min(1, "Tech stack is required"),
  keyResponsibilities: z
    .array(z.string())
    .min(1, "Key responsibilities are required"),
  domainContext: z.string().min(1, "Domain context is required"),
  companyName: z.string().min(1, "Company name is required"),
});

export async function POST(request: Request) {
  // Check authentication
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      return validationError(validationResult.error);
    }

    const input: GenerateCodingTaskInput = validationResult.data;

    // Generate task options
    const result = await generateCodingTask(input);

    return success(result);
  } catch (err) {
    console.error("Task generation error:", err);
    return error("Task generation failed", 500);
  }
}
