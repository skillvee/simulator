import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { generateEphemeralToken } from "@/lib/gemini";
import { buildManagerKickoffPrompt } from "@/prompts";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { assessmentId } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    // Get manager coworker (or use default)
    const manager = assessment.scenario.coworkers[0] || {
      id: "default-manager",
      name: "Alex Chen",
      role: "Engineering Manager",
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
    const token = await generateEphemeralToken({
      systemInstruction,
    });

    return NextResponse.json({
      token,
      assessmentId: assessment.id,
      managerId: manager.id,
      managerName: manager.name,
      managerRole: manager.role,
    });
  } catch (error) {
    console.error("Error generating kickoff token:", error);
    return NextResponse.json(
      { error: "Failed to initialize kickoff call" },
      { status: 500 }
    );
  }
}
