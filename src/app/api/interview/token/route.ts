import { auth } from "@/auth";
import { db } from "@/server/db";
import { generateEphemeralToken } from "@/lib/gemini";
import {
  buildHRInterviewPrompt,
  formatCVContextForHR,
  formatBasicCandidateContext,
} from "@/prompts";
import { formatProfileForPrompt, profileFromPrismaJson } from "@/lib/cv-parser";
import { success, error } from "@/lib/api-response";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const body = await request.json();
    const { assessmentId } = body;

    if (!assessmentId) {
      return error("Assessment ID is required", 400);
    }

    // Fetch the assessment and verify ownership
    const assessment = await db.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: session.user.id,
      },
      include: {
        scenario: true,
        user: {
          select: {
            name: true,
            email: true,
            cvUrl: true,
            parsedProfile: true,
          },
        },
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404, "NOT_FOUND");
    }

    // Build CV context for the HR interviewer
    let cvContext = "";

    // First, try to use the parsed profile from Assessment (if CV was uploaded during assessment)
    // Then fallback to User's parsed profile (if CV was uploaded from profile page)
    const parsedProfileJson =
      assessment.parsedProfile || assessment.user.parsedProfile;

    if (parsedProfileJson) {
      try {
        const profile = profileFromPrismaJson(parsedProfileJson);
        if (profile) {
          cvContext = formatCVContextForHR(formatProfileForPrompt(profile));
        }
      } catch (error) {
        console.error("Error parsing stored profile:", error);
      }
    }

    // Fallback to basic info if no parsed profile
    const cvUrl = assessment.cvUrl || assessment.user.cvUrl;
    if (!cvContext && cvUrl) {
      cvContext = formatBasicCandidateContext(
        assessment.user.name || undefined,
        assessment.user.email || undefined
      );
    }

    // Build the full system instruction using centralized prompt
    const systemInstruction = buildHRInterviewPrompt({
      companyName: assessment.scenario.companyName,
      companyDescription: assessment.scenario.companyDescription,
      cvContext: cvContext || undefined,
    });

    // Generate ephemeral token for client-side connection
    const token = await generateEphemeralToken({
      systemInstruction,
    });

    return success({
      token,
      assessmentId: assessment.id,
      scenarioName: assessment.scenario.name,
      companyName: assessment.scenario.companyName,
    });
  } catch (err) {
    console.error("Error generating interview token:", err);
    return error("Failed to initialize interview", 500);
  }
}
