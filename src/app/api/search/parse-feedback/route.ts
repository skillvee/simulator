/**
 * POST /api/search/parse-feedback
 *
 * Parses rejection feedback to extract constraint updates for search refinement.
 *
 * @since 2026-01-17
 * @see Issue #75: US-012b
 */

import { NextRequest } from "next/server";
import { success, error } from "@/lib/api";
import { parseFeedback } from "@/lib/candidate";

export async function POST(request: NextRequest) {
  try {
    const { feedback } = await request.json();

    if (!feedback || typeof feedback !== "string") {
      return error("Feedback is required and must be a string", 400);
    }

    const result = await parseFeedback(feedback);

    return success(result);
  } catch (err) {
    console.error("[parse-feedback] Error:", err);
    return error("Failed to parse feedback", 500);
  }
}
