import { db } from "@/server/db";
import { createLogger } from "@/lib/core";

const logger = createLogger("maintenance:data-retention");

const RETENTION_DAYS = 30;

export interface PurgeResult {
  clientErrors: number;
  voiceSessions: number;
  apiRequestLogs: number;
  candidateEvents: number;
  totalDeleted: number;
  cutoffDate: string;
}

/**
 * Purge observability data older than 30 days.
 *
 * Targets ONLY observability tables:
 * - ClientError
 * - VoiceSession
 * - ApiRequestLog
 * - CandidateEvent
 *
 * Does NOT purge assessment artifacts:
 * - AssessmentApiCall (assessment record)
 * - AssessmentLog (assessment record)
 * - Conversation (assessment record)
 */
export async function purgeOldObservabilityData(): Promise<PurgeResult> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  logger.info("Starting observability data purge", {
    cutoffDate: cutoffDate.toISOString(),
    retentionDays: RETENTION_DAYS,
  });

  const [clientErrors, voiceSessions, apiRequestLogs, candidateEvents] =
    await Promise.all([
      db.clientError.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      }),
      db.voiceSession.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      }),
      db.apiRequestLog.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      }),
      db.candidateEvent.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      }),
    ]);

  const result: PurgeResult = {
    clientErrors: clientErrors.count,
    voiceSessions: voiceSessions.count,
    apiRequestLogs: apiRequestLogs.count,
    candidateEvents: candidateEvents.count,
    totalDeleted:
      clientErrors.count +
      voiceSessions.count +
      apiRequestLogs.count +
      candidateEvents.count,
    cutoffDate: cutoffDate.toISOString(),
  };

  logger.info("Observability data purge complete", { ...result });

  return result;
}
