import { auth } from "@/auth";
import { success, error, validationError } from "@/lib/api";
import { z } from "zod";
import {
  generateCoworkers,
  type GenerateCoworkersInput,
} from "@/lib/scenarios/coworker-generator";

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

/**
 * Request body schema for coworker generation
 */
const requestSchema = z.object({
  roleName: z.string().min(1, "Role name is required"),
  seniorityLevel: z.enum(["junior", "mid", "senior", "staff", "principal"]),
  companyName: z.string().min(1, "Company name is required"),
  companyDescription: z.string().min(1, "Company description is required"),
  techStack: z.array(z.string()).min(1, "Tech stack must have at least one item"),
  taskDescription: z.string().min(1, "Task description is required"),
  keyResponsibilities: z.array(z.string()).min(1, "Key responsibilities must have at least one item"),
});

/**
 * POST /api/recruiter/simulations/generate-coworkers
 * Auto-generate 2-3 realistic coworkers based on role and company context
 * Available to RECRUITER and ADMIN roles
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  try {
    const body = await request.json();

    // Validate request body
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const input: GenerateCoworkersInput = validation.data;

    // Generate coworkers
    const result = await generateCoworkers(input);

    return success(result);
  } catch (err) {
    console.error("Coworker generation error:", err);
    return error("Coworker generation failed", 500);
  }
}
