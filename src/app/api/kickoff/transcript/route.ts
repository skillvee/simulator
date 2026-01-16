import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import type { Prisma } from "@prisma/client";
import type { TranscriptMessage } from "@/lib/gemini";

/**
 * Manager Kickoff Transcript Endpoint
 *
 * POST: Save kickoff call transcript
 * GET: Retrieve kickoff call transcript
 *
 * Uses the Conversation model with type "kickoff" and coworkerId = managerId
 */

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { assessmentId, managerId, transcript } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
        { status: 400 }
      );
    }

    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: "Transcript array is required" },
        { status: 400 }
      );
    }

    // Verify assessment ownership
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

    // Find or create the kickoff conversation
    const existingConversation = await db.conversation.findFirst({
      where: {
        assessmentId,
        type: "kickoff",
      },
    });

    if (existingConversation) {
      // Append to existing transcript
      const existingTranscript =
        (existingConversation.transcript as unknown as TranscriptMessage[]) ||
        [];
      const updatedTranscript = [...existingTranscript, ...transcript];

      const updated = await db.conversation.update({
        where: { id: existingConversation.id },
        data: {
          transcript: updatedTranscript as unknown as Prisma.InputJsonValue,
        },
      });

      return NextResponse.json({
        id: updated.id,
        messageCount: updatedTranscript.length,
      });
    } else {
      // Create new kickoff conversation
      const created = await db.conversation.create({
        data: {
          assessmentId,
          coworkerId: managerId || null, // Manager's coworker ID if available
          type: "kickoff",
          transcript: transcript as unknown as Prisma.InputJsonValue,
        },
      });

      return NextResponse.json({
        id: created.id,
        messageCount: transcript.length,
      });
    }
  } catch (error) {
    console.error("Error saving kickoff transcript:", error);
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

  try {
    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("assessmentId");

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
        { status: 400 }
      );
    }

    // Verify assessment ownership
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

    // Get the kickoff conversation
    const conversation = await db.conversation.findFirst({
      where: {
        assessmentId,
        type: "kickoff",
      },
    });

    if (!conversation) {
      return NextResponse.json({
        transcript: [],
        messageCount: 0,
      });
    }

    const transcript =
      (conversation.transcript as unknown as TranscriptMessage[]) || [];

    return NextResponse.json({
      id: conversation.id,
      transcript,
      messageCount: transcript.length,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    });
  } catch (error) {
    console.error("Error retrieving kickoff transcript:", error);
    return NextResponse.json(
      { error: "Failed to retrieve transcript" },
      { status: 500 }
    );
  }
}
