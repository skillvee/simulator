/**
 * Candidate Search Service
 *
 * Combines semantic search (via embeddings) with archetype fit scores and
 * seniority thresholds for comprehensive candidate matching.
 *
 * @since 2026-01-16
 * @see Issue #67: US-011
 */

import { db } from "@/server/db";
import {
  generateQueryEmbedding,
  buildQueryText,
  type EmbeddingVector,
} from "@/lib/candidate";
import {
  calculateFitScore,
  type RoleArchetype,
  type DimensionScoreInput,
  type FitScoreResult,
} from "@/lib/candidate";
import {
  meetsThreshold,
  type SeniorityLevel,
  type ThresholdCheckResult,
} from "@/lib/candidate";
import { AssessmentDimension, VideoAssessmentStatus } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

/**
 * Search criteria for finding candidates
 */
export interface CandidateSearchCriteria {
  /** Skills/technologies to search for */
  skills: string[];
  /** Experience domains to match */
  experienceDomains: string[];
  /** Target role archetype for weighting */
  archetype: RoleArchetype;
  /** Minimum seniority level (optional, defaults to no threshold) */
  seniorityLevel?: SeniorityLevel;
  /** Additional context for search (optional) */
  additionalContext?: string;
  /** Minimum semantic similarity threshold (0-1, default 0.3) */
  similarityThreshold?: number;
  /** Maximum number of results (default 20) */
  limit?: number;
}

/**
 * Individual candidate search result
 */
export interface CandidateSearchResult {
  /** Video assessment ID */
  videoAssessmentId: string;
  /** User/candidate ID */
  candidateId: string;
  /** Candidate name (if available) */
  candidateName: string | null;
  /** Candidate email (if available) */
  candidateEmail: string | null;
  /** Semantic similarity score (0-1) */
  semanticSimilarity: number;
  /** Archetype fit score result (0-100) */
  fitScore: FitScoreResult;
  /** Seniority threshold check result */
  thresholdResult: ThresholdCheckResult;
  /** Combined ranking score */
  combinedScore: number;
  /** Dimension scores for this candidate */
  dimensionScores: DimensionScoreInput[];
  /** Observable behaviors summary */
  observableBehaviors: string;
  /** Overall assessment summary */
  overallSummary: string;
}

/**
 * Search results with metadata
 */
export interface CandidateSearchResults {
  /** Array of matching candidates, sorted by combined score */
  candidates: CandidateSearchResult[];
  /** Total count before any limits */
  totalMatches: number;
  /** Search criteria used */
  criteria: CandidateSearchCriteria;
  /** Query text used for embedding */
  queryText: string;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default similarity threshold for semantic search
 */
export const DEFAULT_SIMILARITY_THRESHOLD = 0.3;

/**
 * Default maximum results to return
 */
export const DEFAULT_RESULT_LIMIT = 20;

/**
 * Weight for semantic similarity in combined score (0-1)
 */
export const SEMANTIC_WEIGHT = 0.4;

/**
 * Weight for archetype fit score in combined score (0-1)
 */
export const FIT_SCORE_WEIGHT = 0.6;

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Searches for candidates matching the given criteria.
 *
 * This function:
 * 1. Generates a query embedding from skills and experience
 * 2. Performs cosine similarity search via pgvector
 * 3. Filters by seniority threshold (if specified)
 * 4. Calculates archetype fit scores
 * 5. Combines semantic similarity with fit score for final ranking
 *
 * @param criteria - Search criteria including skills, archetype, etc.
 * @returns Search results with candidates sorted by combined score
 */
export async function searchCandidates(
  criteria: CandidateSearchCriteria
): Promise<CandidateSearchResults> {
  const {
    skills,
    experienceDomains,
    archetype,
    seniorityLevel,
    additionalContext,
    similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD,
    limit = DEFAULT_RESULT_LIMIT,
  } = criteria;

  // Build the query text
  const queryText = buildQueryText(
    skills,
    experienceDomains,
    additionalContext
  );

  // Generate query embedding
  const queryEmbedding = await generateQueryEmbedding(
    skills,
    experienceDomains,
    additionalContext
  );

  // Perform semantic search
  const semanticResults = await performSemanticSearch(
    queryEmbedding,
    similarityThreshold,
    limit * 2 // Fetch more than needed to allow for filtering
  );

  if (semanticResults.length === 0) {
    return {
      candidates: [],
      totalMatches: 0,
      criteria,
      queryText,
    };
  }

  // Get full candidate data for semantic matches
  const videoAssessmentIds = semanticResults.map((r) => r.videoAssessmentId);
  const candidateData = await fetchCandidateData(videoAssessmentIds);

  // Process each candidate
  const processedCandidates: CandidateSearchResult[] = [];

  for (const semanticMatch of semanticResults) {
    const data = candidateData.get(semanticMatch.videoAssessmentId);
    if (!data) continue;

    // Build dimension scores
    const dimensionScores: DimensionScoreInput[] = data.scores.map((s) => ({
      dimension: s.dimension as AssessmentDimension,
      score: s.score,
    }));

    // Check seniority threshold
    const thresholdResult = meetsThreshold(
      dimensionScores,
      archetype,
      seniorityLevel ?? "JUNIOR"
    );

    // Skip candidates who don't meet threshold (if threshold specified)
    if (seniorityLevel && !thresholdResult.meetsThreshold) {
      continue;
    }

    // Calculate fit score
    const fitScore = calculateFitScore(dimensionScores, archetype);

    // Calculate combined score
    const combinedScore = calculateCombinedScore(
      semanticMatch.similarity,
      fitScore.fitScore
    );

    processedCandidates.push({
      videoAssessmentId: semanticMatch.videoAssessmentId,
      candidateId: data.candidateId,
      candidateName: data.candidateName,
      candidateEmail: data.candidateEmail,
      semanticSimilarity: semanticMatch.similarity,
      fitScore,
      thresholdResult,
      combinedScore,
      dimensionScores,
      observableBehaviors: data.observableBehaviors,
      overallSummary: data.overallSummary,
    });
  }

  // Sort by combined score (descending)
  processedCandidates.sort((a, b) => b.combinedScore - a.combinedScore);

  // Apply limit
  const limitedCandidates = processedCandidates.slice(0, limit);

  return {
    candidates: limitedCandidates,
    totalMatches: processedCandidates.length,
    criteria,
    queryText,
  };
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Performs cosine similarity search using pgvector.
 *
 * @param queryEmbedding - The query embedding vector
 * @param threshold - Minimum similarity threshold (0-1)
 * @param limit - Maximum results to return
 * @returns Array of matches with video assessment ID and similarity score
 */
async function performSemanticSearch(
  queryEmbedding: EmbeddingVector,
  threshold: number,
  limit: number
): Promise<Array<{ videoAssessmentId: string; similarity: number }>> {
  const vectorString = `[${queryEmbedding.join(",")}]`;

  const results: Array<{
    video_assessment_id: string;
    similarity: number;
  }> = await db.$queryRaw`
    SELECT
      ce."videoAssessmentId" as video_assessment_id,
      1 - (ce.embedding <=> ${vectorString}::vector) as similarity
    FROM "CandidateEmbedding" ce
    INNER JOIN "VideoAssessment" va ON va.id = ce."videoAssessmentId"
    WHERE
      va.status = ${VideoAssessmentStatus.COMPLETED}
      AND 1 - (ce.embedding <=> ${vectorString}::vector) > ${threshold}
    ORDER BY ce.embedding <=> ${vectorString}::vector
    LIMIT ${limit}
  `;

  return results.map((r) => ({
    videoAssessmentId: r.video_assessment_id,
    similarity: r.similarity,
  }));
}

/**
 * Fetches detailed candidate data for a set of video assessments.
 *
 * @param videoAssessmentIds - Array of video assessment IDs
 * @returns Map of video assessment ID to candidate data
 */
async function fetchCandidateData(videoAssessmentIds: string[]): Promise<
  Map<
    string,
    {
      candidateId: string;
      candidateName: string | null;
      candidateEmail: string | null;
      scores: Array<{ dimension: AssessmentDimension; score: number }>;
      observableBehaviors: string;
      overallSummary: string;
    }
  >
> {
  const assessments = await db.videoAssessment.findMany({
    where: {
      id: { in: videoAssessmentIds },
      status: VideoAssessmentStatus.COMPLETED,
    },
    include: {
      candidate: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      scores: {
        select: {
          dimension: true,
          score: true,
          observableBehaviors: true,
        },
      },
      summary: {
        select: {
          overallSummary: true,
        },
      },
    },
  });

  const dataMap = new Map<
    string,
    {
      candidateId: string;
      candidateName: string | null;
      candidateEmail: string | null;
      scores: Array<{ dimension: AssessmentDimension; score: number }>;
      observableBehaviors: string;
      overallSummary: string;
    }
  >();

  for (const assessment of assessments) {
    if (!assessment.summary) continue;

    // Combine all observable behaviors into a single string
    const observableBehaviors = assessment.scores
      .map((s) => `${s.dimension}: ${s.observableBehaviors}`)
      .join("\n\n");

    dataMap.set(assessment.id, {
      candidateId: assessment.candidate.id,
      candidateName: assessment.candidate.name,
      candidateEmail: assessment.candidate.email,
      scores: assessment.scores.map((s) => ({
        dimension: s.dimension as AssessmentDimension,
        score: s.score,
      })),
      observableBehaviors,
      overallSummary: assessment.summary.overallSummary,
    });
  }

  return dataMap;
}

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Calculates combined score from semantic similarity and fit score.
 *
 * The combined score uses weighted averaging:
 * - 40% semantic similarity (normalized to 0-100)
 * - 60% archetype fit score (already 0-100)
 *
 * @param semanticSimilarity - Cosine similarity score (0-1)
 * @param fitScore - Archetype fit score (0-100)
 * @returns Combined score (0-100)
 */
export function calculateCombinedScore(
  semanticSimilarity: number,
  fitScore: number
): number {
  // Normalize semantic similarity to 0-100 scale
  const normalizedSimilarity = semanticSimilarity * 100;

  // Weighted combination
  const combined =
    SEMANTIC_WEIGHT * normalizedSimilarity + FIT_SCORE_WEIGHT * fitScore;

  // Round to 1 decimal place
  return Math.round(combined * 10) / 10;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets all candidates with embeddings for a given status.
 *
 * @param status - Video assessment status to filter by (default: COMPLETED)
 * @returns Array of video assessment IDs with embeddings
 */
export async function getCandidatesWithEmbeddings(
  status: VideoAssessmentStatus = VideoAssessmentStatus.COMPLETED
): Promise<string[]> {
  const results: Array<{ videoAssessmentId: string }> = await db.$queryRaw`
    SELECT ce."videoAssessmentId"
    FROM "CandidateEmbedding" ce
    INNER JOIN "VideoAssessment" va ON va.id = ce."videoAssessmentId"
    WHERE va.status = ${status}
  `;

  return results.map((r) => r.videoAssessmentId);
}

/**
 * Gets embedding statistics for monitoring.
 *
 * @returns Statistics about candidate embeddings
 */
export async function getEmbeddingStats(): Promise<{
  totalEmbeddings: number;
  completedAssessments: number;
  pendingEmbeddings: number;
}> {
  // Count total embeddings
  const embeddingCount = await db.$executeRaw`
    SELECT COUNT(*) FROM "CandidateEmbedding"
  `;

  // Count completed assessments
  const completedCount = await db.videoAssessment.count({
    where: { status: VideoAssessmentStatus.COMPLETED },
  });

  return {
    totalEmbeddings: Number(embeddingCount),
    completedAssessments: completedCount,
    pendingEmbeddings: completedCount - Number(embeddingCount),
  };
}
