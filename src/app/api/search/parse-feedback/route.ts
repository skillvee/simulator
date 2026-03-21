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
import { createLogger } from "@/lib/core";

const logger = createLogger("server:api:search:parse-feedback");

export async function POST(request: NextRequest) {
  try {
    const { feedback } = await request.json();

    if (!feedback || typeof feedback !== "string") {
      return error("Feedback is required and must be a string", 400);
    }

    const result = await parseFeedback(feedback);

    return success(result);
  } catch (err) {
    logger.error("Parse feedback error", { err });
    return error("Failed to parse feedback", 500);
  }
}
