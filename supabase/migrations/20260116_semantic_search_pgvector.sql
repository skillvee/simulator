-- Enable pgvector extension for semantic search (US-011)
-- This migration must be run in Supabase dashboard or via SQL editor

-- Step 1: Enable the pgvector extension
-- Note: In Supabase, this can also be enabled via Dashboard > Database > Extensions > vector
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Create the CandidateEmbedding table
-- This stores embeddings for semantic search on candidate assessment data
CREATE TABLE IF NOT EXISTS "CandidateEmbedding" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "videoAssessmentId" TEXT NOT NULL UNIQUE,
  "observableBehaviorsText" TEXT NOT NULL,
  "overallSummaryText" TEXT NOT NULL,
  "embedding" vector(768) NOT NULL,
  "embeddingModel" TEXT NOT NULL DEFAULT 'text-embedding-004',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CandidateEmbedding_videoAssessmentId_fkey"
    FOREIGN KEY ("videoAssessmentId")
    REFERENCES "VideoAssessment"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Step 3: Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "CandidateEmbedding_videoAssessmentId_idx"
  ON "CandidateEmbedding"("videoAssessmentId");

-- Step 4: Create an index for vector similarity search (optional, improves performance for large datasets)
-- Using HNSW (Hierarchical Navigable Small World) index for fast approximate nearest neighbor search
-- This is optional but recommended for production with many embeddings
-- CREATE INDEX IF NOT EXISTS "CandidateEmbedding_embedding_idx"
--   ON "CandidateEmbedding"
--   USING hnsw (embedding vector_cosine_ops);

-- Step 5: RLS Policies for CandidateEmbedding table
-- Only admins can view embeddings directly
ALTER TABLE "CandidateEmbedding" ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all embeddings
CREATE POLICY "admins_view_embeddings"
  ON "CandidateEmbedding"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- Policy: Service role has full access for API operations
CREATE POLICY "service_role_full_access"
  ON "CandidateEmbedding"
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 6: Create a function for cosine similarity search
-- This function finds candidates similar to a query embedding
CREATE OR REPLACE FUNCTION search_candidates_by_embedding(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  video_assessment_id text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    ce."videoAssessmentId" as video_assessment_id,
    1 - (ce.embedding <=> query_embedding) as similarity
  FROM "CandidateEmbedding" ce
  WHERE 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_candidates_by_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION search_candidates_by_embedding TO service_role;
