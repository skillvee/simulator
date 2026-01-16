import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const transcriptSchema = z.object({
  assessmentId: z.string(),
  coworkerId: z.string(),
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

    const { assessmentId, coworkerId, transcript } = parsed.data;

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

    // Verify coworker exists for this assessment's scenario
    const coworker = await db.coworker.findFirst({
      where: {
        id: coworkerId,
        scenarioId: assessment.scenarioId,
      },
    });

    if (!coworker) {
      return NextResponse.json({ error: "Coworker not found" }, { status: 404 });
    }

    // Check if there's already a voice conversation for this coworker
    const existingConversation = await db.conversation.findFirst({
      where: {
        assessmentId,
        coworkerId,
        type: "voice",
      },
    });

    // Cast transcript to Prisma-compatible JSON type
    const transcriptJson = transcript as unknown as Prisma.InputJsonValue;

    if (existingConversation) {
      // Append to existing conversation
      const existingTranscript =
        (existingConversation.transcript as unknown as Array<{
          role: string;
          text: string;
          timestamp: string;
        }>) || [];
      const mergedTranscript = [
        ...existingTranscript,
        ...transcript,
      ] as unknown as Prisma.InputJsonValue;

      await db.conversation.update({
        where: { id: existingConversation.id },
        data: {
          transcript: mergedTranscript,
        },
      });
    } else {
      // Create a new conversation record
      await db.conversation.create({
        data: {
          assessmentId,
          coworkerId,
          type: "voice",
          transcript: transcriptJson,
        },
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
  const coworkerId = searchParams.get("coworkerId");

  if (!assessmentId || !coworkerId) {
    return NextResponse.json(
      { error: "Assessment ID and Coworker ID are required" },
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

    // Get the voice conversation
    const conversation = await db.conversation.findFirst({
      where: {
        assessmentId,
        coworkerId,
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
