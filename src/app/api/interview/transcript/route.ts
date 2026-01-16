import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const transcriptSchema = z.object({
  assessmentId: z.string(),
  transcript: z.array(
    z.object({
      role: z.enum(["user", "model"]),
      text: z.string(),
      timestamp: z.string(),
    })
  ),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = transcriptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { assessmentId, transcript } = parsed.data;

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

    // Check if there's already an HR interview conversation for this assessment
    const existingConversation = await db.conversation.findFirst({
      where: {
        assessmentId,
        coworkerId: null, // null indicates HR interview
        type: "voice",
      },
    });

    // Cast transcript to Prisma-compatible JSON type
    const transcriptJson = transcript as unknown as Prisma.InputJsonValue;

    if (existingConversation) {
      // Update the existing conversation
      await db.conversation.update({
        where: { id: existingConversation.id },
        data: {
          transcript: transcriptJson,
        },
      });
    } else {
      // Create a new conversation record
      await db.conversation.create({
        data: {
          assessmentId,
          coworkerId: null, // HR interview has no coworker
          type: "voice",
          transcript: transcriptJson,
        },
      });
    }

    // Update assessment status to ONBOARDING if interview is complete
    if (transcript.length > 0) {
      await db.assessment.update({
        where: { id: assessmentId },
        data: { status: "ONBOARDING" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving transcript:", error);
    return NextResponse.json(
      { error: "Failed to save transcript" },
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

    // Get the HR interview conversation
    const conversation = await db.conversation.findFirst({
      where: {
        assessmentId,
        coworkerId: null,
        type: "voice",
      },
    });

    return NextResponse.json({
      transcript: conversation?.transcript || [],
    });
  } catch (error) {
    console.error("Error fetching transcript:", error);
    return NextResponse.json(
      { error: "Failed to fetch transcript" },
      { status: 500 }
    );
  }
}
