import { auth } from "@/auth";
import { db } from "@/server/db";
import { generateEphemeralToken } from "@/lib/gemini";
import { buildManagerKickoffPrompt } from "@/prompts";
import { success, error } from "@/lib/api-response";
import { validateRequest } from "@/lib/api-validation";
import { KickoffTokenRequestSchema } from "@/lib/schemas";

/**
 * Manager Kickoff Call Token Endpoint
 *
 * Generates an ephemeral token for the manager kickoff call with Gemini Live.
 * The system prompt instructs the manager to give a vague, realistic task briefing
 * that tests the candidate's ability to ask clarifying questions.
 */

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const validated = await validateRequest(request, KickoffTokenRequestSchema);
    if ("error" in validated) return validated.error;
    const { assessmentId } = validated.data;

    // Fetch the assessment and verify ownership
    const assessment = await db.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: session.user.id,
      },
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
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404, "NOT_FOUND");
    }

    // Get manager coworker (or use default)
    const manager = assessment.scenario.coworkers[0] || {
      id: "default-manager",
      name: "Alex Chen",
      role: "Engineering Manager",
      voiceName: null as string | null,
    };

    // Build the manager kickoff system prompt using centralized prompt
    const systemInstruction = buildManagerKickoffPrompt({
      managerName: manager.name,
      managerRole: manager.role,
      companyName: assessment.scenario.companyName,
      candidateName: session.user.name || undefined,
      taskDescription: assessment.scenario.taskDescription,
      techStack: assessment.scenario.techStack,
      repoUrl: assessment.scenario.repoUrl,
    });

    // Generate ephemeral token for client-side connection
    // Use manager's configured voice, or fall back to default
    const token = await generateEphemeralToken({
      systemInstruction,
      voiceName: manager.voiceName || undefined,
    });

    return success({
      token,
      assessmentId: assessment.id,
      managerId: manager.id,
      managerName: manager.name,
      managerRole: manager.role,
    });
  } catch (err) {
    console.error("Error generating kickoff token:", err);
    return error("Failed to initialize kickoff call", 500);
  }
}
