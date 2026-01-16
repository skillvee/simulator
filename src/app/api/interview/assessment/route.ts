import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { gemini } from "@/lib/gemini";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

// Schema for creating/updating HR assessment
const hrAssessmentSchema = z.object({
  assessmentId: z.string(),
  interviewStartedAt: z.string().datetime().optional(),
  interviewEndedAt: z.string().datetime().optional(),
});

// Schema for the AI analysis response
const aiAnalysisSchema = z.object({
  communicationScore: z.number().min(1).max(5),
  communicationNotes: z.string(),
  cvVerificationNotes: z.string(),
  cvConsistencyScore: z.number().min(1).max(5),
  verifiedClaims: z.array(
    z.object({
      claim: z.string(),
      status: z.enum(["verified", "unverified", "inconsistent", "flagged"]),
      notes: z.string().optional(),
    })
  ),
  professionalismScore: z.number().min(1).max(5),
  technicalDepthScore: z.number().min(1).max(5),
  cultureFitNotes: z.string(),
  summary: z.string(),
});

const ANALYSIS_PROMPT = `You are an expert HR interview analyst. Analyze the following interview transcript between an HR interviewer and a job candidate.

Provide a detailed assessment in JSON format with the following structure:
{
  "communicationScore": <1-5, where 5 is excellent communication clarity>,
  "communicationNotes": "<detailed notes on communication skills: clarity, articulation, listening, response quality>",
  "cvVerificationNotes": "<notes on how well the candidate's claims in the interview aligned with expected CV/resume content>",
  "cvConsistencyScore": <1-5, where 5 means all claims seemed consistent and verifiable>,
  "verifiedClaims": [
    {
      "claim": "<specific claim made by candidate>",
      "status": "<verified|unverified|inconsistent|flagged>",
      "notes": "<optional explanation>"
    }
  ],
  "professionalismScore": <1-5, where 5 is highly professional demeanor>,
  "technicalDepthScore": <1-5, where 5 shows deep technical knowledge>,
  "cultureFitNotes": "<observations about culture fit, work style, values>",
  "summary": "<2-3 sentence overall assessment summary>"
}

IMPORTANT: Return ONLY valid JSON, no additional text or markdown formatting.

Interview Transcript:
`;

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = hrAssessmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { assessmentId, interviewStartedAt, interviewEndedAt } = parsed.data;

    // Verify the assessment belongs to the user
    const assessment = await db.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: session.user.id,
      },
      include: {
        conversations: {
          where: {
            coworkerId: null, // HR interview
            type: "voice",
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

    const hrConversation = assessment.conversations[0];
    if (!hrConversation) {
      return NextResponse.json(
        { error: "HR interview not found" },
        { status: 404 }
      );
    }

    // Get the transcript
    const transcript = hrConversation.transcript as Array<{
      role: string;
      text: string;
      timestamp: string;
    }>;

    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        { error: "No transcript available for analysis" },
        { status: 400 }
      );
    }

    // Format transcript for analysis
    const formattedTranscript = transcript
      .map(
        (msg) =>
          `[${msg.timestamp}] ${msg.role === "model" ? "Interviewer" : "Candidate"}: ${msg.text}`
      )
      .join("\n\n");

    // Analyze the transcript using Gemini
    const model = gemini.models.generateContent;
    const result = await gemini.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: ANALYSIS_PROMPT + formattedTranscript }],
        },
      ],
    });

    const responseText = result.text;
    if (!responseText) {
      return NextResponse.json(
        { error: "Failed to analyze transcript" },
        { status: 500 }
      );
    }

    // Parse the AI analysis
    let aiAnalysis;
    try {
      // Clean up potential markdown formatting
      const cleanedResponse = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      aiAnalysis = aiAnalysisSchema.parse(JSON.parse(cleanedResponse));
    } catch (parseError) {
      console.error("Failed to parse AI analysis:", parseError);
      console.error("Raw response:", responseText);
      return NextResponse.json(
        { error: "Failed to parse AI analysis" },
        { status: 500 }
      );
    }

    // Calculate interview duration if timestamps provided
    let interviewDurationSeconds: number | undefined;
    if (interviewStartedAt && interviewEndedAt) {
      const start = new Date(interviewStartedAt);
      const end = new Date(interviewEndedAt);
      interviewDurationSeconds = Math.round((end.getTime() - start.getTime()) / 1000);
    }

    // Create or update HR assessment record
    const hrAssessmentData: Prisma.HRInterviewAssessmentUncheckedCreateInput = {
      assessmentId,
      communicationScore: aiAnalysis.communicationScore,
      communicationNotes: aiAnalysis.communicationNotes,
      cvVerificationNotes: aiAnalysis.cvVerificationNotes,
      cvConsistencyScore: aiAnalysis.cvConsistencyScore,
      verifiedClaims: aiAnalysis.verifiedClaims as Prisma.InputJsonValue,
      professionalismScore: aiAnalysis.professionalismScore,
      technicalDepthScore: aiAnalysis.technicalDepthScore,
      cultureFitNotes: aiAnalysis.cultureFitNotes,
      aiAnalysis: {
        ...aiAnalysis,
        analyzedAt: new Date().toISOString(),
        transcriptLength: transcript.length,
      } as Prisma.InputJsonValue,
      interviewStartedAt: interviewStartedAt ? new Date(interviewStartedAt) : undefined,
      interviewEndedAt: interviewEndedAt ? new Date(interviewEndedAt) : undefined,
      interviewDurationSeconds,
    };

    const hrAssessment = await db.hRInterviewAssessment.upsert({
      where: { assessmentId },
      create: hrAssessmentData,
      update: {
        ...hrAssessmentData,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      hrAssessment: {
        id: hrAssessment.id,
        communicationScore: hrAssessment.communicationScore,
        communicationNotes: hrAssessment.communicationNotes,
        cvVerificationNotes: hrAssessment.cvVerificationNotes,
        cvConsistencyScore: hrAssessment.cvConsistencyScore,
        verifiedClaims: hrAssessment.verifiedClaims,
        professionalismScore: hrAssessment.professionalismScore,
        technicalDepthScore: hrAssessment.technicalDepthScore,
        cultureFitNotes: hrAssessment.cultureFitNotes,
        interviewStartedAt: hrAssessment.interviewStartedAt,
        interviewEndedAt: hrAssessment.interviewEndedAt,
        interviewDurationSeconds: hrAssessment.interviewDurationSeconds,
      },
    });
  } catch (error) {
    console.error("Error creating HR assessment:", error);
    return NextResponse.json(
      { error: "Failed to create HR assessment" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const assessmentId = searchParams.get("assessmentId");

  if (!assessmentId) {
    return NextResponse.json(
      { error: "Assessment ID is required" },
      { status: 400 }
    );
  }

  try {
    // Verify the assessment belongs to the user
    const assessment = await db.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: session.user.id,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    // Get the HR assessment
    const hrAssessment = await db.hRInterviewAssessment.findUnique({
      where: { assessmentId },
    });

    if (!hrAssessment) {
      return NextResponse.json(
        { error: "HR assessment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ hrAssessment });
  } catch (error) {
    console.error("Error fetching HR assessment:", error);
    return NextResponse.json(
      { error: "Failed to fetch HR assessment" },
      { status: 500 }
    );
  }
}
