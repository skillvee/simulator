import { createLogger } from "@/lib/core";
import type { RubricAssessmentOutput } from "@/types";

const logger = createLogger("analysis:report-migration");

/** Shape of a legacy v1 red/green flag entry */
interface LegacyFlag {
  signal?: string;
  evidence?: string;
}

/** Shape of a legacy v1 skill score entry */
interface LegacySkillScore {
  score?: number | null;
  rationale?: string;
}

/**
 * Legacy VideoEvaluationOutput format detection and migration
 * Converts v1.x format to v3.0.0 RubricAssessmentOutput format
 */
export function migrateVideoEvaluationToRubric(data: unknown): RubricAssessmentOutput | null {
  // Narrow to record so we can access properties safely
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;

  // Check if it's already in v3 format (has dimensionScores array)
  if (record.dimensionScores && Array.isArray(record.dimensionScores)) {
    return data as RubricAssessmentOutput;
  }

  // Check if it's legacy v1 format (has skill_scores object)
  if (record.skill_scores && typeof record.skill_scores === 'object') {
    const overallScore = record.overall_score as { score?: number } | undefined;
    const redFlags = record.red_flags as (LegacyFlag | string)[] | undefined;
    const greenFlags = record.green_flags as (LegacyFlag | string)[] | undefined;
    const areasForImprovement = record.areas_for_improvement as string[] | undefined;
    const skillScores = record.skill_scores as Record<string, LegacySkillScore>;

    const migrated: RubricAssessmentOutput = {
      evaluationVersion: "3.0.0",
      roleFamilySlug: "engineering",  // Default to engineering for legacy data
      overallScore: overallScore?.score || 2.0,
      dimensionScores: [],
      detectedRedFlags: redFlags?.map((rf) => {
        const signal = typeof rf === 'string' ? rf : rf.signal || '';
        const evidence = typeof rf === 'string' ? '' : rf.evidence || '';
        return {
          slug: signal.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          name: signal,
          description: signal,
          evidence,
          timestamps: [],
        };
      }) || [],
      topStrengths: greenFlags?.map((gf) => ({
        dimension: "general",
        score: 3.0,
        description: typeof gf === 'string' ? gf : gf.signal || '',
        evidence: []
      })) || [],
      growthAreas: areasForImprovement?.map((area) => ({
        dimension: "general",
        score: 2.0,
        description: area,
        suggestion: ""
      })) || [],
      overallSummary: (record.overall_summary as string) || "",
      evaluationConfidence: "medium" as const,
      insufficientEvidenceNotes: null
    };

    // Migrate skill scores to dimension scores
    Object.entries(skillScores).forEach(([key, value]) => {
      migrated.dimensionScores.push({
        dimensionSlug: key.toLowerCase().replace(/_/g, '-'),
        dimensionName: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        score: value.score ?? null,
        summary: `Performance in ${key.replace(/_/g, ' ')}`,
        confidence: "medium" as const,
        rationale: value.rationale || "",
        observableBehaviors: [],
        timestamps: [],
        trainableGap: (value.score != null && value.score < 3.0) || false,
        greenFlags: [],
        redFlags: []
      });
    });

    return migrated;
  }

  // Unknown format
  logger.warn("Unknown video evaluation format, cannot migrate", { data: String(data) });
  return null;
}
