/**
 * POST /api/search/parse-feedback
 *
 * Parses rejection feedback to extract constraint updates for search refinement.
 *
 * @since 2026-01-17
 * @see Issue #75: US-012b
 */

import { NextRequest, NextResponse } from "next/server";
import { parseFeedback } from "@/lib/feedback-parsing";

export async function POST(request: NextRequest) {
  try {
    const { feedback } = await request.json();

    if (!feedback || typeof feedback !== "string") {
      return NextResponse.json(
        { error: "Feedback is required and must be a string" },
        { status: 400 }
      );
    }

    const result = await parseFeedback(feedback);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[parse-feedback] Error:", error);
    return NextResponse.json(
      { error: "Failed to parse feedback" },
      { status: 500 }
    );
  }
}
