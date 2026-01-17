import { gemini } from "@/lib/gemini";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

// Schema for activity timeline entries
export const activityEntrySchema = z.object({
  timestamp: z.string(),
  activity: z.enum([
    "coding",
    "reading_docs",
    "browsing",
    "debugging",
    "testing",
    "searching",
    "idle",
    "planning",
    "reviewing",
    "communicating",
    "other",
  ]),
  description: z.string(),
  applicationVisible: z.string().optional(),
});

// Schema for tool usage entries
export const toolUsageSchema = z.object({
  tool: z.string(),
  usageCount: z.number(),
  contextNotes: z.string(),
});

// Schema for stuck moments
export const stuckMomentSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  description: z.string(),
  potentialCause: z.enum([
    "unclear_requirements",
    "technical_difficulty",
    "debugging",
    "searching_for_solution",
    "context_switching",
    "environment_issues",
    "unknown",
  ]),
  durationSeconds: z.number(),
});

// Full analysis response schema
export const segmentAnalysisResponseSchema = z.object({
  activityTimeline: z.array(activityEntrySchema),
  toolUsage: z.array(toolUsageSchema),
  stuckMoments: z.array(stuckMomentSchema),
  summary: z.object({
    totalActiveTimeSeconds: z.number(),
    totalIdleTimeSeconds: z.number(),
    focusScore: z.number().min(1).max(5),
    dominantActivity: z.string(),
    aiToolsUsed: z.boolean(),
    keyObservations: z.array(z.string()),
  }),
});

export type ActivityEntry = z.infer<typeof activityEntrySchema>;
export type ToolUsage = z.infer<typeof toolUsageSchema>;
export type StuckMoment = z.infer<typeof stuckMomentSchema>;
export type SegmentAnalysisResponse = z.infer<typeof segmentAnalysisResponseSchema>;

// Screenshot analysis prompt is now centralized in src/prompts/analysis/recording.ts
import { buildScreenshotAnalysisContext } from "@/prompts/analysis/recording";

/**
 * Analyzes screenshots from a recording segment using Gemini Pro Vision
 * @param screenshotUrls - Array of signed URLs to screenshots
 * @param segmentStartTime - When the segment started
 * @param segmentDurationSeconds - Duration of the segment
 * @returns Analysis results
 */
export async function analyzeSegmentScreenshots(
  screenshotUrls: string[],
  segmentStartTime: Date,
  segmentDurationSeconds: number
): Promise<SegmentAnalysisResponse> {
  if (screenshotUrls.length === 0) {
    // Return empty analysis for segments with no screenshots
    return {
      activityTimeline: [],
      toolUsage: [],
      stuckMoments: [],
      summary: {
        totalActiveTimeSeconds: 0,
        totalIdleTimeSeconds: segmentDurationSeconds,
        focusScore: 3,
        dominantActivity: "unknown",
        aiToolsUsed: false,
        keyObservations: ["No screenshots available for analysis"],
      },
    };
  }

  // Build the content array with images
  const imagePromises = screenshotUrls.map(async (url, index) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch screenshot ${index}: ${response.status}`);
        return null;
      }
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mimeType = response.headers.get("content-type") || "image/png";
      return {
        inlineData: {
          mimeType,
          data: base64,
        },
      };
    } catch (error) {
      console.warn(`Error fetching screenshot ${index}:`, error);
      return null;
    }
  });

  const images = (await Promise.all(imagePromises)).filter(
    (img): img is { inlineData: { mimeType: string; data: string } } => img !== null
  );

  if (images.length === 0) {
    throw new Error("No screenshots could be fetched for analysis");
  }

  // Build content with context and images using centralized prompt
  const contextText = buildScreenshotAnalysisContext(
    images.length,
    segmentStartTime,
    segmentDurationSeconds
  );

  const contents = [
    {
      role: "user" as const,
      parts: [{ text: contextText }, ...images],
    },
  ];

  // Call Gemini Flash for vision analysis
  const result = await gemini.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
  });

  const responseText = result.text;
  if (!responseText) {
    throw new Error("No response from Gemini for screenshot analysis");
  }

  // Parse and validate the response
  const cleanedResponse = responseText
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  const parsed = JSON.parse(cleanedResponse);
  const validated = segmentAnalysisResponseSchema.parse(parsed);

  return validated;
}

/**
 * Creates the SegmentAnalysis data object for database storage
 */
export function buildSegmentAnalysisData(
  segmentId: string,
  analysis: SegmentAnalysisResponse,
  screenshotsAnalyzed: number
): Prisma.SegmentAnalysisUncheckedCreateInput {
  return {
    segmentId,
    activityTimeline: analysis.activityTimeline as Prisma.InputJsonValue,
    toolUsage: analysis.toolUsage as Prisma.InputJsonValue,
    stuckMoments: analysis.stuckMoments as Prisma.InputJsonValue,
    totalActiveTime: analysis.summary.totalActiveTimeSeconds,
    totalIdleTime: analysis.summary.totalIdleTimeSeconds,
    focusScore: analysis.summary.focusScore,
    screenshotsAnalyzed,
    aiAnalysis: {
      ...analysis,
      analyzedAt: new Date().toISOString(),
    } as Prisma.InputJsonValue,
  };
}

/**
 * Aggregates multiple segment analyses into a single recording analysis
 */
export function aggregateSegmentAnalyses(
  analyses: SegmentAnalysisResponse[]
): {
  activityTimeline: ActivityEntry[];
  toolUsage: ToolUsage[];
  stuckMoments: StuckMoment[];
  totalActiveTime: number;
  totalIdleTime: number;
  overallFocusScore: number;
  aiToolsUsed: boolean;
  keyObservations: string[];
} {
  // Combine all activity timelines
  const activityTimeline = analyses.flatMap((a) => a.activityTimeline);

  // Aggregate tool usage (combine counts for same tools)
  const toolUsageMap = new Map<string, ToolUsage>();
  for (const analysis of analyses) {
    for (const tool of analysis.toolUsage) {
      const existing = toolUsageMap.get(tool.tool);
      if (existing) {
        existing.usageCount += tool.usageCount;
        existing.contextNotes += `; ${tool.contextNotes}`;
      } else {
        toolUsageMap.set(tool.tool, { ...tool });
      }
    }
  }
  const toolUsage = Array.from(toolUsageMap.values());

  // Combine stuck moments
  const stuckMoments = analyses.flatMap((a) => a.stuckMoments);

  // Aggregate time metrics
  const totalActiveTime = analyses.reduce(
    (sum, a) => sum + a.summary.totalActiveTimeSeconds,
    0
  );
  const totalIdleTime = analyses.reduce(
    (sum, a) => sum + a.summary.totalIdleTimeSeconds,
    0
  );

  // Average focus score (weighted by segment duration could be added)
  const overallFocusScore =
    analyses.length > 0
      ? Math.round(
          analyses.reduce((sum, a) => sum + a.summary.focusScore, 0) /
            analyses.length
        )
      : 3;

  // Check if AI tools were used in any segment
  const aiToolsUsed = analyses.some((a) => a.summary.aiToolsUsed);

  // Combine key observations
  const keyObservations = analyses.flatMap((a) => a.summary.keyObservations);

  return {
    activityTimeline,
    toolUsage,
    stuckMoments,
    totalActiveTime,
    totalIdleTime,
    overallFocusScore,
    aiToolsUsed,
    keyObservations,
  };
}
