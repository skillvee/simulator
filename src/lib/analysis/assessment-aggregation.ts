/**
 * Assessment Data Aggregation Module
 *
 * Aggregates all assessment signals for final report generation:
 * - HR interview assessment
 * - Chat/call transcripts
 * - Screen recording analysis
 * - PR code review
 * - CI test results
 * - Timing data
 *
 * Scores 8 skill categories:
 * 1. Communication
 * 2. Problem Decomposition
 * 3. AI Leverage
 * 4. Code Quality
 * 5. XFN Collaboration
 * 6. Time Management
 * 7. Technical Decision-Making
 * 8. Presentation
 */

import { gemini } from "@/lib/ai/gemini";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { CodeReviewData } from "@/lib/analysis";
import type { PrCiStatus } from "@/lib/external";
import type {
  ActivityEntry,
  ToolUsage,
  StuckMoment,
} from "@/lib/analysis";
import type { ChatMessage } from "@/types";

// ============================================================================
// Skill Category Schemas and Types
// ============================================================================

/**
 * The 8 skill categories evaluated in the assessment
 */
export const skillCategorySchema = z.enum([
  "communication",
  "problem_decomposition",
  "ai_leverage",
  "code_quality",
  "xfn_collaboration",
  "time_management",
  "technical_decision_making",
  "presentation",
]);

export type SkillCategory = z.infer<typeof skillCategorySchema>;

/**
 * Score for a single skill category (1-5 scale)
 */
export const skillScoreSchema = z.object({
  category: skillCategorySchema,
  score: z.number().min(1).max(5),
  level: z.enum([
    "exceptional",
    "strong",
    "adequate",
    "developing",
    "needs_improvement",
  ]),
  evidence: z.array(z.string()), // Specific examples supporting the score
  notes: z.string(),
});

export type SkillScore = z.infer<typeof skillScoreSchema>;

// ============================================================================
// Collected Signals Interface
// ============================================================================

/**
 * HR Interview signals
 */
export interface HRSignals {
  communicationScore: number | null;
  communicationNotes: string | null;
  cvConsistencyScore: number | null;
  cvVerificationNotes: string | null;
  professionalismScore: number | null;
  technicalDepthScore: number | null;
  cultureFitNotes: string | null;
  interviewDurationSeconds: number | null;
  verifiedClaims: Array<{
    claim: string;
    status: "verified" | "unverified" | "inconsistent" | "flagged";
    notes?: string;
  }>;
}

/**
 * Recording analysis signals
 */
export interface RecordingSignals {
  activityTimeline: ActivityEntry[];
  toolUsage: ToolUsage[];
  stuckMoments: StuckMoment[];
  totalActiveTime: number;
  totalIdleTime: number;
  focusScore: number;
  aiToolsUsed: boolean;
  keyObservations: string[];
}

/**
 * Conversation signals (chat/voice with coworkers)
 */
export interface ConversationSignals {
  coworkerChats: Array<{
    coworkerName: string;
    coworkerRole: string;
    messages: ChatMessage[];
    type: "text" | "voice";
  }>;
  defenseTranscript: ChatMessage[];
  totalCoworkerInteractions: number;
  uniqueCoworkersContacted: number;
}

/**
 * All collected assessment signals
 */
export interface AssessmentSignals {
  // Identifiers
  assessmentId: string;
  userId: string;
  scenarioName: string;

  // HR Interview
  hrInterview: HRSignals | null;

  // Conversations
  conversations: ConversationSignals;

  // Screen recording
  recording: RecordingSignals | null;

  // Code deliverables
  codeReview: CodeReviewData | null;
  ciStatus: PrCiStatus | null;
  prUrl: string | null;

  // Timing
  timing: {
    startedAt: Date;
    completedAt: Date | null;
    totalDurationSeconds: number | null;
    workingPhaseSeconds: number | null;
  };
}

// ============================================================================
// Report Schemas
// ============================================================================

/**
 * Narrative feedback section
 */
export const narrativeFeedbackSchema = z.object({
  overallSummary: z.string(), // 2-3 paragraph executive summary
  strengths: z.array(z.string()), // Top 3-5 strengths
  areasForImprovement: z.array(z.string()), // Top 3-5 improvement areas
  notableObservations: z.array(z.string()), // Interesting patterns/behaviors observed
});

export type NarrativeFeedback = z.infer<typeof narrativeFeedbackSchema>;

/**
 * Actionable recommendation
 */
export const recommendationSchema = z.object({
  category: skillCategorySchema,
  priority: z.enum(["high", "medium", "low"]),
  title: z.string(),
  description: z.string(),
  actionableSteps: z.array(z.string()),
});

export type Recommendation = z.infer<typeof recommendationSchema>;

/**
 * Full assessment report schema
 */
export const assessmentReportSchema = z.object({
  // Metadata
  generatedAt: z.string(),
  assessmentId: z.string(),
  candidateName: z.string().optional(),

  // Overall scores
  overallScore: z.number().min(1).max(5),
  overallLevel: z.enum([
    "exceptional",
    "strong",
    "adequate",
    "developing",
    "needs_improvement",
  ]),

  // Skill scores (8 categories)
  skillScores: z.array(skillScoreSchema),

  // Narrative feedback
  narrative: narrativeFeedbackSchema,

  // Actionable recommendations
  recommendations: z.array(recommendationSchema),

  // Summary metrics
  metrics: z.object({
    totalDurationMinutes: z.number().nullable(),
    workingPhaseMinutes: z.number().nullable(),
    coworkersContacted: z.number(),
    aiToolsUsed: z.boolean(),
    testsStatus: z.enum(["passing", "failing", "none", "unknown"]),
    codeReviewScore: z.number().nullable(),
  }),
});

export type AssessmentReport = z.infer<typeof assessmentReportSchema>;

// ============================================================================
// Report Generation Functions
// ============================================================================

/**
 * Maps a 1-5 score to a performance level
 */
export function scoreToLevel(
  score: number
): "exceptional" | "strong" | "adequate" | "developing" | "needs_improvement" {
  if (score >= 4.5) return "exceptional";
  if (score >= 3.5) return "strong";
  if (score >= 2.5) return "adequate";
  if (score >= 1.5) return "developing";
  return "needs_improvement";
}

/**
 * Calculates an individual skill score based on collected signals
 */
function calculateSkillScore(
  category: SkillCategory,
  signals: AssessmentSignals
): SkillScore {
  let score = 3; // Default to adequate
  const evidence: string[] = [];
  let notes = "";

  switch (category) {
    case "communication": {
      // Sources: HR interview communication score, conversation clarity, defense presentation
      const hrComm = signals.hrInterview?.communicationScore;
      const hrProf = signals.hrInterview?.professionalismScore;

      if (hrComm !== null && hrComm !== undefined) {
        score = hrComm;
        evidence.push(`HR interview communication score: ${hrComm}/5`);
      }
      if (hrProf !== null && hrProf !== undefined) {
        evidence.push(`Professional demeanor: ${hrProf}/5`);
      }

      // Factor in coworker interaction quality
      if (signals.conversations.coworkerChats.length > 0) {
        evidence.push(
          `Engaged with ${signals.conversations.uniqueCoworkersContacted} coworkers across ${signals.conversations.totalCoworkerInteractions} interactions`
        );
      }

      notes =
        signals.hrInterview?.communicationNotes ||
        "Communication skills assessed during HR interview and coworker interactions.";
      break;
    }

    case "problem_decomposition": {
      // Sources: Recording activity timeline, stuck moments, code structure
      const stuckMoments = signals.recording?.stuckMoments || [];
      const codeQuality = signals.codeReview?.codeQualityScore;
      const patternScore = signals.codeReview?.patternScore;

      if (
        codeQuality !== null &&
        codeQuality !== undefined &&
        patternScore !== null &&
        patternScore !== undefined
      ) {
        score = Math.round((codeQuality + patternScore) / 2);
        evidence.push(
          `Code quality: ${codeQuality}/5, Patterns: ${patternScore}/5`
        );
      }

      if (stuckMoments.length > 0) {
        const avgStuckTime =
          stuckMoments.reduce((sum, m) => sum + m.durationSeconds, 0) /
          stuckMoments.length;
        evidence.push(
          `${stuckMoments.length} stuck moments with avg duration ${Math.round(avgStuckTime)}s`
        );
        // Penalize for many/long stuck moments
        if (stuckMoments.length > 5 || avgStuckTime > 300) {
          score = Math.max(1, score - 1);
        }
      }

      notes =
        "Problem decomposition assessed through code structure and working patterns.";
      break;
    }

    case "ai_leverage": {
      // Sources: Recording tool usage, code review AI detection
      const aiToolsUsed = signals.recording?.aiToolsUsed || false;
      const toolUsage = signals.recording?.toolUsage || [];
      const aiToolUsageEvident =
        signals.codeReview?.summary?.aiToolUsageEvident || false;

      const aiTools = toolUsage.filter(
        (t) =>
          t.tool.toLowerCase().includes("claude") ||
          t.tool.toLowerCase().includes("chatgpt") ||
          t.tool.toLowerCase().includes("copilot") ||
          t.tool.toLowerCase().includes("ai")
      );

      if (aiToolsUsed || aiTools.length > 0) {
        score = 4; // Using AI tools is positive
        evidence.push(
          `AI tools detected in workflow: ${aiTools.map((t) => t.tool).join(", ") || "Yes"}`
        );
      } else {
        score = 3; // Not using AI is neutral
        evidence.push("No AI tool usage detected");
      }

      if (aiToolUsageEvident) {
        evidence.push("AI-assisted code patterns detected in code review");
      }

      notes =
        "AI leverage assessed through tool usage patterns and code analysis.";
      break;
    }

    case "code_quality": {
      // Sources: Code review scores, CI status
      const codeReview = signals.codeReview;
      const ciStatus = signals.ciStatus;

      if (codeReview) {
        score = codeReview.overallScore;
        evidence.push(
          `Code review overall score: ${codeReview.overallScore}/5`
        );
        evidence.push(
          `Quality: ${codeReview.codeQualityScore}/5, Security: ${codeReview.securityScore}/5`
        );

        if (codeReview.summary?.strengths?.length > 0) {
          evidence.push(
            `Strengths: ${codeReview.summary.strengths.slice(0, 2).join("; ")}`
          );
        }
      }

      if (ciStatus) {
        const testStatus = ciStatus.overallStatus;
        evidence.push(`CI status: ${testStatus}`);
        if (testStatus === "success") {
          score = Math.min(5, score + 0.5);
        } else if (testStatus === "failure") {
          score = Math.max(1, score - 0.5);
        }
      }

      score = Math.round(score);
      notes =
        codeReview?.summary?.overallAssessment ||
        "Code quality assessed through automated review.";
      break;
    }

    case "xfn_collaboration": {
      // Sources: Coworker interactions, asking questions, following up
      const coworkersContacted = signals.conversations.uniqueCoworkersContacted;
      const totalInteractions = signals.conversations.totalCoworkerInteractions;

      if (coworkersContacted >= 3) {
        score = 5;
        evidence.push(
          `Excellent collaboration: contacted ${coworkersContacted} different coworkers`
        );
      } else if (coworkersContacted >= 2) {
        score = 4;
        evidence.push(
          `Good collaboration: contacted ${coworkersContacted} coworkers`
        );
      } else if (coworkersContacted === 1) {
        score = 3;
        evidence.push(`Limited collaboration: only contacted 1 coworker`);
      } else {
        score = 2;
        evidence.push("Minimal collaboration: did not reach out to coworkers");
      }

      if (totalInteractions > 5) {
        evidence.push(`${totalInteractions} total interactions with team`);
      }

      notes =
        "Cross-functional collaboration assessed through coworker engagement patterns.";
      break;
    }

    case "time_management": {
      // Sources: Timing data, focus score, activity patterns
      const focusScore = signals.recording?.focusScore;
      const workingMinutes = signals.timing.workingPhaseSeconds
        ? Math.round(signals.timing.workingPhaseSeconds / 60)
        : null;
      const activeTime = signals.recording?.totalActiveTime || 0;
      const idleTime = signals.recording?.totalIdleTime || 0;

      if (focusScore !== null && focusScore !== undefined) {
        score = focusScore;
        evidence.push(`Focus score: ${focusScore}/5`);
      }

      if (activeTime > 0 && idleTime > 0) {
        const activeRatio = activeTime / (activeTime + idleTime);
        evidence.push(`Active time ratio: ${Math.round(activeRatio * 100)}%`);
        if (activeRatio < 0.5) {
          score = Math.max(1, score - 1);
        }
      }

      if (workingMinutes !== null) {
        evidence.push(`Working phase duration: ${workingMinutes} minutes`);
      }

      notes =
        "Time management assessed through focus patterns and activity distribution.";
      break;
    }

    case "technical_decision_making": {
      // Sources: Code review patterns, stuck moment causes, defense discussion
      const patternScore = signals.codeReview?.patternScore;
      const stuckMoments = signals.recording?.stuckMoments || [];
      const maintainability = signals.codeReview?.maintainabilityScore;

      if (patternScore !== null && patternScore !== undefined) {
        score = patternScore;
        evidence.push(`Pattern/architecture score: ${patternScore}/5`);
      }

      if (maintainability !== null && maintainability !== undefined) {
        score = Math.round((score + maintainability) / 2);
        evidence.push(`Maintainability: ${maintainability}/5`);
      }

      // Analyze stuck moment causes
      const technicalDifficulties = stuckMoments.filter(
        (m) => m.potentialCause === "technical_difficulty"
      );
      if (technicalDifficulties.length > 3) {
        score = Math.max(1, score - 1);
        evidence.push(
          `${technicalDifficulties.length} technical difficulties encountered`
        );
      }

      notes =
        "Technical decision-making assessed through code architecture and problem-solving patterns.";
      break;
    }

    case "presentation": {
      // Sources: Defense transcript quality, HR interview, communication clarity
      const hrComm = signals.hrInterview?.communicationScore;
      const technicalDepth = signals.hrInterview?.technicalDepthScore;
      const defenseLength = signals.conversations.defenseTranscript.length;

      if (hrComm !== null && hrComm !== undefined) {
        score = hrComm;
      }

      if (technicalDepth !== null && technicalDepth !== undefined) {
        score = Math.round((score + technicalDepth) / 2);
        evidence.push(`Technical depth in discussions: ${technicalDepth}/5`);
      }

      if (defenseLength > 0) {
        evidence.push(`Defense call: ${defenseLength} exchanges`);
        // Having a substantive defense is good
        if (defenseLength >= 10) {
          score = Math.min(5, score + 0.5);
        }
      }

      score = Math.round(score);
      notes =
        "Presentation skills assessed through interview and defense performance.";
      break;
    }
  }

  return {
    category,
    score,
    level: scoreToLevel(score),
    evidence,
    notes,
  };
}

/**
 * Calculate all 8 skill scores from assessment signals
 */
export function calculateAllSkillScores(
  signals: AssessmentSignals
): SkillScore[] {
  const categories: SkillCategory[] = [
    "communication",
    "problem_decomposition",
    "ai_leverage",
    "code_quality",
    "xfn_collaboration",
    "time_management",
    "technical_decision_making",
    "presentation",
  ];

  return categories.map((category) => calculateSkillScore(category, signals));
}

/**
 * Calculate overall score as weighted average of skill scores
 */
export function calculateOverallScore(skillScores: SkillScore[]): number {
  // Weights for each category (total = 1.0)
  const weights: Record<SkillCategory, number> = {
    communication: 0.15,
    problem_decomposition: 0.15,
    ai_leverage: 0.1,
    code_quality: 0.2,
    xfn_collaboration: 0.1,
    time_management: 0.1,
    technical_decision_making: 0.15,
    presentation: 0.05,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const skill of skillScores) {
    const weight = weights[skill.category];
    weightedSum += skill.score * weight;
    totalWeight += weight;
  }

  return Math.round((weightedSum / totalWeight) * 10) / 10; // Round to 1 decimal
}

// ============================================================================
// Narrative Generation
// ============================================================================

// Assessment prompts are now centralized in src/prompts/analysis/assessment.ts
import {
  NARRATIVE_PROMPT,
  RECOMMENDATIONS_PROMPT,
} from "@/prompts/analysis/assessment";

/**
 * Format skill scores for the narrative prompt
 */
function formatSkillScoresForPrompt(skillScores: SkillScore[]): string {
  return skillScores
    .map(
      (s) =>
        `- ${s.category.replace(/_/g, " ")}: ${s.score}/5 (${s.level})\n  Evidence: ${s.evidence.join("; ")}`
    )
    .join("\n");
}

/**
 * Format HR interview data for the narrative prompt
 */
function formatHRForPrompt(hr: HRSignals | null): string {
  if (!hr) return "HR interview data not available.";

  const parts: string[] = [];
  if (hr.communicationScore)
    parts.push(`Communication: ${hr.communicationScore}/5`);
  if (hr.professionalismScore)
    parts.push(`Professionalism: ${hr.professionalismScore}/5`);
  if (hr.technicalDepthScore)
    parts.push(`Technical depth: ${hr.technicalDepthScore}/5`);
  if (hr.cvConsistencyScore)
    parts.push(`CV consistency: ${hr.cvConsistencyScore}/5`);
  if (hr.communicationNotes) parts.push(`Notes: ${hr.communicationNotes}`);
  if (hr.cultureFitNotes) parts.push(`Culture fit: ${hr.cultureFitNotes}`);
  if (hr.interviewDurationSeconds) {
    parts.push(
      `Duration: ${Math.round(hr.interviewDurationSeconds / 60)} minutes`
    );
  }

  return parts.length > 0
    ? parts.join("\n")
    : "HR interview completed, no detailed scores available.";
}

/**
 * Format code review data for the narrative prompt
 */
function formatCodeReviewForPrompt(review: CodeReviewData | null): string {
  if (!review) return "Code review not available.";

  const parts: string[] = [
    `Overall: ${review.overallScore}/5`,
    `Quality: ${review.codeQualityScore}/5`,
    `Patterns: ${review.patternScore}/5`,
    `Security: ${review.securityScore}/5`,
    `Maintainability: ${review.maintainabilityScore}/5`,
  ];

  if (review.summary?.strengths?.length > 0) {
    parts.push(`Strengths: ${review.summary.strengths.join("; ")}`);
  }
  if (review.summary?.areasForImprovement?.length > 0) {
    parts.push(
      `Areas for improvement: ${review.summary.areasForImprovement.join("; ")}`
    );
  }
  if (review.summary?.testCoverage) {
    parts.push(`Test coverage: ${review.summary.testCoverage}`);
  }

  return parts.join("\n");
}

/**
 * Format recording signals for the narrative prompt
 */
function formatRecordingForPrompt(recording: RecordingSignals | null): string {
  if (!recording) return "Screen recording analysis not available.";

  const parts: string[] = [
    `Focus score: ${recording.focusScore}/5`,
    `Active time: ${Math.round(recording.totalActiveTime / 60)} min`,
    `Idle time: ${Math.round(recording.totalIdleTime / 60)} min`,
    `AI tools used: ${recording.aiToolsUsed ? "Yes" : "No"}`,
  ];

  if (recording.toolUsage.length > 0) {
    const topTools = recording.toolUsage.slice(0, 5).map((t) => t.tool);
    parts.push(`Tools used: ${topTools.join(", ")}`);
  }

  if (recording.stuckMoments.length > 0) {
    parts.push(`Stuck moments: ${recording.stuckMoments.length}`);
    const causes = [
      ...new Set(recording.stuckMoments.map((m) => m.potentialCause)),
    ];
    parts.push(`Common causes: ${causes.join(", ")}`);
  }

  if (recording.keyObservations.length > 0) {
    parts.push(
      `Key observations: ${recording.keyObservations.slice(0, 3).join("; ")}`
    );
  }

  return parts.join("\n");
}

/**
 * Format collaboration data for the narrative prompt
 */
function formatCollaborationForPrompt(
  conversations: ConversationSignals
): string {
  const parts: string[] = [
    `Coworkers contacted: ${conversations.uniqueCoworkersContacted}`,
    `Total interactions: ${conversations.totalCoworkerInteractions}`,
  ];

  if (conversations.coworkerChats.length > 0) {
    const coworkerList = conversations.coworkerChats
      .map(
        (c) =>
          `${c.coworkerName} (${c.coworkerRole}): ${c.messages.length} messages`
      )
      .join("; ");
    parts.push(`Interactions: ${coworkerList}`);
  }

  if (conversations.defenseTranscript.length > 0) {
    parts.push(
      `Defense call: ${conversations.defenseTranscript.length} exchanges`
    );
  }

  return parts.join("\n");
}

/**
 * Format timing data for the narrative prompt
 */
function formatTimingForPrompt(timing: AssessmentSignals["timing"]): string {
  const parts: string[] = [`Started: ${timing.startedAt.toISOString()}`];

  if (timing.completedAt) {
    parts.push(`Completed: ${timing.completedAt.toISOString()}`);
  }
  if (timing.totalDurationSeconds) {
    parts.push(
      `Total duration: ${Math.round(timing.totalDurationSeconds / 60)} minutes`
    );
  }
  if (timing.workingPhaseSeconds) {
    parts.push(
      `Working phase: ${Math.round(timing.workingPhaseSeconds / 60)} minutes`
    );
  }

  return parts.join("\n");
}

/**
 * Generate narrative feedback using Gemini
 */
export async function generateNarrativeFeedback(
  signals: AssessmentSignals,
  skillScores: SkillScore[]
): Promise<NarrativeFeedback> {
  const prompt = NARRATIVE_PROMPT.replace(
    "{skillScores}",
    formatSkillScoresForPrompt(skillScores)
  )
    .replace("{hrInterview}", formatHRForPrompt(signals.hrInterview))
    .replace("{codeReview}", formatCodeReviewForPrompt(signals.codeReview))
    .replace("{recording}", formatRecordingForPrompt(signals.recording))
    .replace(
      "{collaboration}",
      formatCollaborationForPrompt(signals.conversations)
    )
    .replace("{timing}", formatTimingForPrompt(signals.timing));

  try {
    const result = await gemini.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const responseText = result.text;
    if (!responseText) {
      throw new Error("No response from Gemini for narrative generation");
    }

    const cleanedResponse = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleanedResponse);
    return narrativeFeedbackSchema.parse(parsed);
  } catch (error) {
    console.error("Error generating narrative feedback:", error);
    // Return fallback narrative
    return {
      overallSummary:
        "The candidate completed the assessment. Detailed narrative analysis is not available due to a processing error.",
      strengths: skillScores
        .filter((s) => s.score >= 4)
        .map((s) => `Strong ${s.category.replace(/_/g, " ")} skills`),
      areasForImprovement: skillScores
        .filter((s) => s.score <= 2)
        .map((s) => `${s.category.replace(/_/g, " ")} needs development`),
      notableObservations: [],
    };
  }
}

// ============================================================================
// Recommendations Generation
// ============================================================================

// RECOMMENDATIONS_PROMPT is imported from @/prompts/analysis/assessment above

/**
 * Generate actionable recommendations using Gemini
 */
export async function generateRecommendations(
  skillScores: SkillScore[],
  narrative: NarrativeFeedback
): Promise<Recommendation[]> {
  // Sort scores from lowest to highest
  const sortedScores = [...skillScores].sort((a, b) => a.score - b.score);
  const weaknesses = sortedScores.slice(0, 3);

  const prompt = RECOMMENDATIONS_PROMPT.replace(
    "{skillScores}",
    sortedScores
      .map((s) => `${s.category}: ${s.score}/5 - ${s.notes}`)
      .join("\n")
  )
    .replace(
      "{weaknesses}",
      weaknesses
        .map((s) => `${s.category}: ${s.evidence.join("; ")}`)
        .join("\n")
    )
    .replace("{observations}", narrative.notableObservations.join("\n"));

  try {
    const result = await gemini.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const responseText = result.text;
    if (!responseText) {
      throw new Error("No response from Gemini for recommendations generation");
    }

    const cleanedResponse = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleanedResponse);
    const validated = z
      .object({ recommendations: z.array(recommendationSchema) })
      .parse(parsed);

    return validated.recommendations;
  } catch (error) {
    console.error("Error generating recommendations:", error);
    // Return fallback recommendations based on lowest scores
    return weaknesses.slice(0, 3).map((skill, index) => ({
      category: skill.category,
      priority:
        index === 0
          ? ("high" as const)
          : index === 1
            ? ("medium" as const)
            : ("low" as const),
      title: `Improve ${skill.category.replace(/_/g, " ")}`,
      description: skill.notes,
      actionableSteps: [
        `Review feedback on ${skill.category.replace(/_/g, " ")}`,
        "Practice with similar scenarios",
        "Seek mentorship in this area",
      ],
    }));
  }
}

// ============================================================================
// Main Aggregation Function
// ============================================================================

/**
 * Generate the full assessment report from collected signals
 */
export async function generateAssessmentReport(
  signals: AssessmentSignals,
  candidateName?: string
): Promise<AssessmentReport> {
  // Calculate all skill scores
  const skillScores = calculateAllSkillScores(signals);

  // Calculate overall score
  const overallScore = calculateOverallScore(skillScores);
  const overallLevel = scoreToLevel(overallScore);

  // Generate narrative feedback
  const narrative = await generateNarrativeFeedback(signals, skillScores);

  // Generate recommendations
  const recommendations = await generateRecommendations(skillScores, narrative);

  // Determine test status
  let testsStatus: "passing" | "failing" | "none" | "unknown" = "unknown";
  if (signals.ciStatus) {
    if (signals.ciStatus.overallStatus === "success") {
      testsStatus = "passing";
    } else if (signals.ciStatus.overallStatus === "failure") {
      testsStatus = "failing";
    } else if (signals.ciStatus.checksCount === 0) {
      testsStatus = "none";
    }
  }

  // Build the report
  const report: AssessmentReport = {
    generatedAt: new Date().toISOString(),
    assessmentId: signals.assessmentId,
    candidateName,

    overallScore,
    overallLevel,

    skillScores,

    narrative,

    recommendations,

    metrics: {
      totalDurationMinutes: signals.timing.totalDurationSeconds
        ? Math.round(signals.timing.totalDurationSeconds / 60)
        : null,
      workingPhaseMinutes: signals.timing.workingPhaseSeconds
        ? Math.round(signals.timing.workingPhaseSeconds / 60)
        : null,
      coworkersContacted: signals.conversations.uniqueCoworkersContacted,
      aiToolsUsed: signals.recording?.aiToolsUsed || false,
      testsStatus,
      codeReviewScore: signals.codeReview?.overallScore || null,
    },
  };

  return report;
}

/**
 * Converts AssessmentReport to Prisma JSON input
 */
export function reportToPrismaJson(
  report: AssessmentReport
): Prisma.InputJsonValue {
  return report as unknown as Prisma.InputJsonValue;
}

/**
 * Formats the report for display or export
 */
export function formatReportForDisplay(report: AssessmentReport): string {
  const lines: string[] = [];

  lines.push("# Assessment Report");
  lines.push(`Generated: ${report.generatedAt}`);
  if (report.candidateName) {
    lines.push(`Candidate: ${report.candidateName}`);
  }
  lines.push("");

  lines.push(
    `## Overall Score: ${report.overallScore}/5 (${report.overallLevel})`
  );
  lines.push("");

  lines.push("## Skill Scores");
  for (const skill of report.skillScores) {
    lines.push(
      `- **${skill.category.replace(/_/g, " ")}**: ${skill.score}/5 (${skill.level})`
    );
  }
  lines.push("");

  lines.push("## Summary");
  lines.push(report.narrative.overallSummary);
  lines.push("");

  lines.push("## Strengths");
  for (const strength of report.narrative.strengths) {
    lines.push(`- ${strength}`);
  }
  lines.push("");

  lines.push("## Areas for Improvement");
  for (const area of report.narrative.areasForImprovement) {
    lines.push(`- ${area}`);
  }
  lines.push("");

  lines.push("## Recommendations");
  for (const rec of report.recommendations) {
    lines.push(`### ${rec.title} (${rec.priority} priority)`);
    lines.push(rec.description);
    lines.push("**Action steps:**");
    for (const step of rec.actionableSteps) {
      lines.push(`- ${step}`);
    }
    lines.push("");
  }

  lines.push("## Metrics");
  if (report.metrics.totalDurationMinutes) {
    lines.push(
      `- Total duration: ${report.metrics.totalDurationMinutes} minutes`
    );
  }
  if (report.metrics.workingPhaseMinutes) {
    lines.push(
      `- Working phase: ${report.metrics.workingPhaseMinutes} minutes`
    );
  }
  lines.push(`- Coworkers contacted: ${report.metrics.coworkersContacted}`);
  lines.push(`- AI tools used: ${report.metrics.aiToolsUsed ? "Yes" : "No"}`);
  lines.push(`- Tests status: ${report.metrics.testsStatus}`);
  if (report.metrics.codeReviewScore) {
    lines.push(`- Code review score: ${report.metrics.codeReviewScore}/5`);
  }

  return lines.join("\n");
}
