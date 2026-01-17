-- RLS Policies for Video Assessment Logs Tables (US-020)
-- Run this migration after schema changes are applied via prisma db push

-- Enable RLS on VideoAssessmentLog table
ALTER TABLE "VideoAssessmentLog" ENABLE ROW LEVEL SECURITY;

-- Only admins can view video assessment logs
CREATE POLICY "admins_view_video_assessment_logs" ON "VideoAssessmentLog"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE id = auth.uid()::text
      AND role = 'ADMIN'
    )
  );

-- Service role has full access for API operations
CREATE POLICY "service_role_full_access_video_assessment_logs" ON "VideoAssessmentLog"
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Enable RLS on VideoAssessmentApiCall table
ALTER TABLE "VideoAssessmentApiCall" ENABLE ROW LEVEL SECURITY;

-- Only admins can view video assessment API calls
CREATE POLICY "admins_view_video_assessment_api_calls" ON "VideoAssessmentApiCall"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE id = auth.uid()::text
      AND role = 'ADMIN'
    )
  );

-- Service role has full access for API operations
CREATE POLICY "service_role_full_access_video_assessment_api_calls" ON "VideoAssessmentApiCall"
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
