/**
 * Embeddings Service for Semantic Search
 *
 * Generates text embeddings using Google's text-embedding-004 model for
 * semantic search on candidate assessment data.
 *
 * @since 2026-01-16
 * @see Issue #67: US-011
 */

import { gemini } from "@/lib/gemini";
import { db } from "@/server/db";
import { withRetry } from "@/lib/error-recovery";
import { AssessmentDimension, VideoAssessmentStatus } from "@prisma/client";

// ============================================================================
// Constants
// ============================================================================

/**
 * Model ID for text embeddings
 * Using text-embedding-004 which produces 768-dimensional embeddings
 */
export const EMBEDDING_MODEL = "text-embedding-004";

/**
 * Embedding dimensions (fixed for text-embedding-004)
 */
export const EMBEDDING_DIMENSIONS = 768;

// ============================================================================
// Types
// ============================================================================

/**
 * Input for generating embeddings from assessment data
 */
export interface EmbeddingInput {
  videoAssessmentId: string;
  dimensionScores: Array<{
    dimension: AssessmentDimension;
    observableBehaviors: string;
  }>;
  overallSummary: string;
}

/**
 * Result from embedding generation
 */
export interface EmbeddingResult {
  success: boolean;
  embeddingId?: string;
  error?: string;
}

/**
 * Raw embedding vector type
 */
export type EmbeddingVector = number[];

// ============================================================================
// Embedding Generation
// ============================================================================

/**
 * Generates a text embedding using Google's text-embedding-004 model.
 *
 * @param text - The text to embed
 * @returns Embedding vector (768 dimensions)
 */
export async function generateEmbedding(text: string): Promise<EmbeddingVector> {
  const response = await gemini.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [{ parts: [{ text }] }],
  });

  if (!response.embeddings?.[0]?.values) {
    throw new Error("Failed to generate embedding: no embedding values returned");
  }

  return response.embeddings[0].values;
}

/**
 * Generates an embedding with retry logic.
 *
 * @param text - The text to embed
 * @returns Embedding vector (768 dimensions)
 */
export async function generateEmbeddingWithRetry(
  text: string
): Promise<EmbeddingVector> {
  return withRetry(() => generateEmbedding(text), {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
  });
}

// ============================================================================
// Text Preparation
// ============================================================================

/**
 * Formats dimension scores into a structured text for embedding.
 *
 * Creates a rich text representation that captures the assessment data
 * in a way that's suitable for semantic search.
 *
 * @param dimensionScores - Array of dimension scores with observable behaviors
 * @returns Formatted text for embedding
 */
export function formatDimensionScoresForEmbedding(
  dimensionScores: Array<{
    dimension: AssessmentDimension;
    observableBehaviors: string;
  }>
): string {
  const dimensionLabels: Record<AssessmentDimension, string> = {
    [AssessmentDimension.COMMUNICATION]: "Communication Skills",
    [AssessmentDimension.PROBLEM_SOLVING]: "Problem Solving Ability",
    [AssessmentDimension.TECHNICAL_KNOWLEDGE]: "Technical Knowledge",
    [AssessmentDimension.COLLABORATION]: "Collaboration and Teamwork",
    [AssessmentDimension.ADAPTABILITY]: "Adaptability and Flexibility",
    [AssessmentDimension.LEADERSHIP]: "Leadership Capabilities",
    [AssessmentDimension.CREATIVITY]: "Creativity and Innovation",
    [AssessmentDimension.TIME_MANAGEMENT]: "Time Management Skills",
  };

  const sections = dimensionScores.map(({ dimension, observableBehaviors }) => {
    const label = dimensionLabels[dimension];
    return `${label}:\n${observableBehaviors}`;
  });

  return sections.join("\n\n");
}

/**
 * Creates combined text for embedding from assessment data.
 *
 * Combines observable behaviors and overall summary into a single
 * text representation optimized for semantic search.
 *
 * @param dimensionScores - Array of dimension scores with observable behaviors
 * @param overallSummary - Overall assessment summary
 * @returns Combined text for embedding
 */
export function createEmbeddingText(
  dimensionScores: Array<{
    dimension: AssessmentDimension;
    observableBehaviors: string;
  }>,
  overallSummary: string
): string {
  const behaviorsText = formatDimensionScoresForEmbedding(dimensionScores);

  return `CANDIDATE ASSESSMENT PROFILE

OBSERVABLE BEHAVIORS:
${behaviorsText}

OVERALL SUMMARY:
${overallSummary}`;
}

// ============================================================================
// Embedding Storage
// ============================================================================

/**
 * Generates and stores embeddings for a video assessment.
 *
 * Retrieves the dimension scores and summary, generates a combined embedding,
 * and stores it in the CandidateEmbedding table for semantic search.
 *
 * @param videoAssessmentId - The video assessment to generate embeddings for
 * @returns Result of the embedding generation
 */
export async function generateAndStoreEmbeddings(
  videoAssessmentId: string
): Promise<EmbeddingResult> {
  try {
    // Fetch the video assessment with scores and summary
    const assessment = await db.videoAssessment.findUnique({
      where: { id: videoAssessmentId },
      include: {
        scores: {
          select: {
            dimension: true,
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

    if (!assessment) {
      return {
        success: false,
        error: `Video assessment not found: ${videoAssessmentId}`,
      };
    }

    if (assessment.status !== VideoAssessmentStatus.COMPLETED) {
      return {
        success: false,
        error: `Video assessment is not completed (status: ${assessment.status})`,
      };
    }

    if (assessment.scores.length === 0) {
      return {
        success: false,
        error: "No dimension scores available for embedding",
      };
    }

    if (!assessment.summary) {
      return {
        success: false,
        error: "No summary available for embedding",
      };
    }

    // Create the text to embed
    const observableBehaviorsText = formatDimensionScoresForEmbedding(
      assessment.scores
    );
    const embeddingText = createEmbeddingText(
      assessment.scores,
      assessment.summary.overallSummary
    );

    // Generate the embedding
    const embedding = await generateEmbeddingWithRetry(embeddingText);

    // Store the embedding using raw SQL since Prisma doesn't fully support pgvector
    // The embedding is stored as a vector type in PostgreSQL
    const result = await db.$executeRaw`
      INSERT INTO "CandidateEmbedding" (
        "id",
        "videoAssessmentId",
        "observableBehaviorsText",
        "overallSummaryText",
        "embedding",
        "embeddingModel",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${generateCuid()},
        ${videoAssessmentId},
        ${observableBehaviorsText},
        ${assessment.summary.overallSummary},
        ${vectorToPostgres(embedding)}::vector,
        ${EMBEDDING_MODEL},
        NOW(),
        NOW()
      )
      ON CONFLICT ("videoAssessmentId") DO UPDATE SET
        "observableBehaviorsText" = EXCLUDED."observableBehaviorsText",
        "overallSummaryText" = EXCLUDED."overallSummaryText",
        "embedding" = EXCLUDED."embedding",
        "embeddingModel" = EXCLUDED."embeddingModel",
        "updatedAt" = NOW()
      RETURNING "id"
    `;

    console.log(
      `[Embeddings] Generated and stored embedding for video assessment ${videoAssessmentId}`
    );

    return {
      success: true,
      embeddingId: result.toString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[Embeddings] Failed to generate embeddings for ${videoAssessmentId}:`,
      message
    );

    return {
      success: false,
      error: message,
    };
  }
}

// ============================================================================
// Query Embedding Generation
// ============================================================================

/**
 * Generates a query embedding for searching candidates.
 *
 * Creates an embedding from extracted skills and experience domains
 * that can be used to find similar candidates via cosine similarity.
 *
 * @param skills - Array of skill keywords (e.g., ["TypeScript", "React"])
 * @param experienceDomains - Array of experience domains (e.g., ["backend", "databases"])
 * @param additionalContext - Optional additional context for the query
 * @returns Query embedding vector
 */
export async function generateQueryEmbedding(
  skills: string[],
  experienceDomains: string[],
  additionalContext?: string
): Promise<EmbeddingVector> {
  const queryText = buildQueryText(skills, experienceDomains, additionalContext);
  return generateEmbeddingWithRetry(queryText);
}

/**
 * Builds query text from skills and experience domains.
 *
 * @param skills - Array of skill keywords
 * @param experienceDomains - Array of experience domains
 * @param additionalContext - Optional additional context
 * @returns Formatted query text
 */
export function buildQueryText(
  skills: string[],
  experienceDomains: string[],
  additionalContext?: string
): string {
  const parts: string[] = [];

  if (skills.length > 0) {
    parts.push(`Required skills and technologies: ${skills.join(", ")}`);
  }

  if (experienceDomains.length > 0) {
    parts.push(`Experience domains: ${experienceDomains.join(", ")}`);
  }

  if (additionalContext) {
    parts.push(`Additional requirements: ${additionalContext}`);
  }

  return parts.join("\n\n") || "General software engineering candidate";
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a CUID for database IDs.
 * Simple implementation for compatibility with Prisma's default cuid().
 */
function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 12);
  return `c${timestamp}${randomPart}`;
}

/**
 * Converts an embedding vector to PostgreSQL vector format.
 *
 * @param embedding - Array of numbers
 * @returns PostgreSQL vector string format
 */
function vectorToPostgres(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/**
 * Parses a PostgreSQL vector string to an array of numbers.
 *
 * @param vectorString - PostgreSQL vector string format
 * @returns Array of numbers
 */
export function parsePostgresVector(vectorString: string): number[] {
  // Format: [0.1,0.2,0.3,...] or (0.1,0.2,0.3,...)
  const cleaned = vectorString.replace(/[\[\]()]/g, "");
  return cleaned.split(",").map((v) => parseFloat(v.trim()));
}

// ============================================================================
// Status Check
// ============================================================================

/**
 * Checks if embeddings exist for a video assessment.
 *
 * @param videoAssessmentId - The video assessment ID to check
 * @returns Whether embeddings exist
 */
export async function hasEmbeddings(
  videoAssessmentId: string
): Promise<boolean> {
  const count = await db.$executeRaw`
    SELECT COUNT(*) FROM "CandidateEmbedding"
    WHERE "videoAssessmentId" = ${videoAssessmentId}
  `;
  return count > 0;
}

/**
 * Gets embedding metadata for a video assessment.
 *
 * @param videoAssessmentId - The video assessment ID
 * @returns Embedding metadata or null if not found
 */
export async function getEmbeddingMetadata(
  videoAssessmentId: string
): Promise<{
  id: string;
  embeddingModel: string;
  createdAt: Date;
} | null> {
  const results: Array<{
    id: string;
    embeddingModel: string;
    createdAt: Date;
  }> = await db.$queryRaw`
    SELECT "id", "embeddingModel", "createdAt"
    FROM "CandidateEmbedding"
    WHERE "videoAssessmentId" = ${videoAssessmentId}
    LIMIT 1
  `;

  return results[0] || null;
}
