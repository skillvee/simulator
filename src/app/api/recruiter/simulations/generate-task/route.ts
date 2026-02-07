/**
 * POST /api/recruiter/simulations/generate-task
 *
 * Auto-generate 2-3 realistic coding task options based on role and company context.
 * Available to RECRUITER and ADMIN roles only.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Recruiter access required" },
      { status: 403 }
    );
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const input: GenerateCodingTaskInput = validationResult.data;

    // Generate task options
    const result = await generateCodingTask(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Task generation error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate tasks";

    return NextResponse.json(
      { error: "Task generation failed", details: errorMessage },
      { status: 500 }
    );
  }
}
