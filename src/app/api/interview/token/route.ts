import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import {
  generateEphemeralToken,
  HR_PERSONA_SYSTEM_PROMPT,
} from "@/lib/gemini";
import { getSignedResumeUrl } from "@/lib/storage";

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
        scenario: true,
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

    // Get CV content if available
    let cvContext = "";
    if (assessment.cvUrl) {
      try {
        // The CV URL is already a signed URL from Supabase
        // We'll include a note about it in the context
        cvContext = `

## Candidate's CV
The candidate has uploaded their CV/resume. Key details from their application:
- Candidate Name: ${assessment.user.name || "Not provided"}
- Email: ${assessment.user.email || "Not provided"}
- CV available at: ${assessment.cvUrl}

Please refer to their CV during the interview and ask specific questions about their listed experience.`;
      } catch (error) {
        console.error("Error getting CV URL:", error);
      }
    }

    // Build the full system instruction with scenario context
    const systemInstruction = `${HR_PERSONA_SYSTEM_PROMPT}

## Interview Context
- Company: ${assessment.scenario.companyName}
- Role: Software Engineer position
- Company Description: ${assessment.scenario.companyDescription}
${cvContext}

Start the interview now by introducing yourself and the company.`;

    // Generate ephemeral token for client-side connection
    const token = await generateEphemeralToken({
      systemInstruction,
    });

    return NextResponse.json({
      token,
      assessmentId: assessment.id,
      scenarioName: assessment.scenario.name,
      companyName: assessment.scenario.companyName,
    });
  } catch (error) {
    console.error("Error generating interview token:", error);
    return NextResponse.json(
      { error: "Failed to initialize interview" },
      { status: 500 }
    );
  }
}
