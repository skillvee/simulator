import { success, error, validateRequest } from "@/lib/api";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { ClientErrorReportSchema } from "@/lib/schemas";
import { createLogger } from "@/lib/core";
import { clientErrorLimiter, applyRateLimit, getClientIp } from "@/lib/rate-limiter";
import type { Prisma } from "@prisma/client";

const logger = createLogger("server:api:errors");

export async function POST(request: Request) {
  // No auth required, but extract userId from session if available
  const session = await auth();
  const sessionUserId = session?.user?.id;

  const validated = await validateRequest(request, ClientErrorReportSchema);
  if ("error" in validated) return validated.error;

  const { assessmentId, userId, errorType, message, stackTrace, componentName, url, metadata } =
    validated.data;

  // Rate limit by assessmentId if provided, otherwise by IP
  const rateLimitKey = assessmentId ?? getClientIp(request);
  const { limited } = applyRateLimit(request, clientErrorLimiter, rateLimitKey);

  if (limited) {
    return error("Rate limit exceeded. Please try again later.", 429, "RATE_LIMIT_EXCEEDED");
  }

  try {
    const clientError = await db.clientError.create({
      data: {
        assessmentId: assessmentId ?? undefined,
        userId: userId ?? sessionUserId ?? undefined,
        errorType,
        message,
        stackTrace: stackTrace ?? undefined,
        componentName: componentName ?? undefined,
        url,
        timestamp: new Date(),
        metadata: (metadata as unknown as Prisma.InputJsonValue) ?? undefined,
      },
    });

    return success({ id: clientError.id }, 201);
  } catch (err) {
    logger.error("Error recording client error", { err });
    return error("Failed to record error", 500);
  }
}
