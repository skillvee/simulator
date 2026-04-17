/**
 * Run Real Assessment Script
 *
 * Uploads a local video to Gemini, runs the full rubric-based evaluation pipeline,
 * creates a fake candidate, and stores results so they appear on the recruiter dashboard.
 *
 * Usage: npx tsx scripts/run-real-assessment.ts
 */

import { PrismaClient, VideoAssessmentStatus, Prisma } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
import { hash } from "bcryptjs";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const VIDEO_PATH = path.join(__dirname, "../public/videos/product-demo.mp4");
const VIDEO_MIME_TYPE = "video/mp4";
const VIDEO_EVALUATION_MODEL = "gemini-3-pro-preview";

// Candidate details
const CANDIDATE = {
  email: "jordan.mitchell@test.com",
  password: "testpassword123",
  name: "Jordan Mitchell",
};

// Fixed IDs for idempotent re-runs
const ASSESSMENT_ID = "test-assessment-jordan-real";
const VIDEO_ASSESSMENT_ID = "test-video-assessment-jordan-real";

// Attach to recruiter scenario (Frontend Developer Assessment at Acme Technologies)
const RECRUITER_SCENARIO_ID = "test-scenario-recruiter";

// ============================================================================
// Gemini & Prisma clients
// ============================================================================

const prisma = new PrismaClient();
const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  httpOptions: { apiVersion: "v1alpha" },
});

// ============================================================================
// Rubric loader (inline to avoid TSConfig path alias issues in scripts)
// ============================================================================

interface RubricLevelData {
  level: number;
  label: string;
  pattern: string;
  evidence: string[];
}

interface DimensionWithRubric {
  slug: string;
  name: string;
  description: string;
  isUniversal: boolean;
  levels: RubricLevelData[];
}

interface RedFlagData {
  slug: string;
  name: string;
  description: string;
}

interface RubricPromptInput {
  roleFamilyName: string;
  roleFamilySlug: string;
  dimensions: DimensionWithRubric[];
  redFlags: RedFlagData[];
  videoContext?: {
    videoDurationMinutes?: number;
    taskDescription?: string;
    expectedOutcomes?: string[];
  };
}

async function loadRubricForRoleFamily(roleFamilySlug: string): Promise<RubricPromptInput> {
  const roleFamily = await prisma.roleFamily.findUniqueOrThrow({
    where: { slug: roleFamilySlug },
    include: {
      dimensions: {
        include: {
          dimension: {
            include: {
              rubricLevels: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      redFlags: true,
    },
  });

  const dimensions: DimensionWithRubric[] = roleFamily.dimensions.map((rfd) => {
    const dim = rfd.dimension;
    const overrides = dim.rubricLevels.filter((rl) => rl.roleFamilyId === roleFamily.id);
    const defaults = dim.rubricLevels.filter((rl) => rl.roleFamilyId === null);

    const levels: RubricLevelData[] = [1, 2, 3, 4].map((level) => {
      const source = overrides.find((rl) => rl.level === level) || defaults.find((rl) => rl.level === level);
      if (!source) throw new Error(`Missing rubric level ${level} for ${dim.slug}`);
      return {
        level: source.level,
        label: source.label,
        pattern: source.pattern,
        evidence: source.evidence as string[],
      };
    });

    return {
      slug: dim.slug,
      name: dim.name,
      description: dim.description,
      isUniversal: dim.isUniversal,
      levels,
    };
  });

  const redFlags: RedFlagData[] = roleFamily.redFlags.map((rf) => ({
    slug: rf.slug,
    name: rf.name,
    description: rf.description,
  }));

  return {
    roleFamilyName: roleFamily.name,
    roleFamilySlug: roleFamily.slug,
    dimensions,
    redFlags,
  };
}

// ============================================================================
// Prompt builder (inline copy to avoid path alias issues)
// ============================================================================

function buildRubricEvaluationPrompt(input: RubricPromptInput): string {
  const dimensionSections = input.dimensions
    .map((dim, i) => {
      const header = `### ${i + 1}. ${dim.slug.toUpperCase()} — ${dim.name}\n${dim.description}\n`;
      const levels = dim.levels
        .sort((a, b) => a.level - b.level)
        .map((lvl) => {
          const evidenceBullets = lvl.evidence.map((e) => `  - ${e}`).join("\n");
          return `**Level ${lvl.level} — ${lvl.label}**\n\n*Pattern: ${lvl.pattern}*\n\nEvidence may include:\n${evidenceBullets}`;
        })
        .join("\n\n");
      return `${header}\n${levels}`;
    })
    .join("\n\n---\n\n");

  const redFlagSection = input.redFlags.length > 0
    ? `## Red Flags\n\nWatch for these critical issues:\n\n${input.redFlags.map((rf) => `- **${rf.name}** (${rf.slug}): ${rf.description}`).join("\n")}`
    : "";

  const contextSection = input.videoContext
    ? `## Video Context\n\n${input.videoContext.taskDescription ? `**Task:** ${input.videoContext.taskDescription}\n\n` : ""}${input.videoContext.videoDurationMinutes ? `**Duration:** ~${input.videoContext.videoDurationMinutes} minutes\n\n` : ""}${input.videoContext.expectedOutcomes ? `**Expected Outcomes:**\n${input.videoContext.expectedOutcomes.map((o) => `- ${o}`).join("\n")}\n\n` : ""}`
    : "";

  const dimensionSlugs = input.dimensions.map((d) => `"${d.slug}"`).join(", ");
  const redFlagSlugs = input.redFlags.map((rf) => `"${rf.slug}"`).join(", ");

  return `You are an expert technical assessor evaluating a candidate's work simulation video for the **${input.roleFamilyName}** role family.

${contextSection}

## Evaluation Rubric

Evaluate the candidate on each dimension using the 1-4 scale defined below. Base your assessment ONLY on observable behaviors in the video.

${dimensionSections}

${redFlagSection}

## Output Format

Return a JSON object with this exact structure. Do NOT wrap in markdown code blocks.

{
  "evaluation_version": "3.0.0",
  "role_family_slug": "${input.roleFamilySlug}",
  "overall_score": <number 1.0-4.0, weighted average>,
  "overall_summary": "<2-3 paragraph narrative summary>",
  "evaluation_confidence": "high" | "medium" | "low",
  "insufficient_evidence_notes": "<null or string explaining what couldn't be assessed>",
  "dimension_scores": {
    ${input.dimensions.map((d) => `"${d.slug}": {
      "score": <1-4 or null if insufficient evidence>,
      "summary": "<1-2 sentence summary>",
      "confidence": "high" | "medium" | "low",
      "rationale": "<detailed reasoning for score>",
      "observable_behaviors": [
        { "timestamp": "MM:SS", "behavior": "<what was observed>" }
      ],
      "trainable_gap": <boolean>,
      "green_flags": ["<positive signals>"],
      "red_flags": ["<concerning signals>"]
    }`).join(",\n    ")}
  },
  "detected_red_flags": [
    ${input.redFlags.length > 0 ? `{ "slug": "<red_flag_slug>", "evidence": "<what was observed>", "timestamps": ["MM:SS"] }` : ""}
  ],
  "top_strengths": [
    { "dimension": "<slug>", "score": <number>, "description": "<why this is a strength>" }
  ],
  "growth_areas": [
    { "dimension": "<slug>", "score": <number>, "description": "<what could improve>" }
  ]
}

Dimension slugs to use: ${dimensionSlugs}
${redFlagSlugs ? `Red flag slugs to use: ${redFlagSlugs}` : ""}

IMPORTANT:
- Score ONLY what you can observe in the video
- Use timestamps in MM:SS format
- If a dimension cannot be assessed from the video, set score to null and confidence to "low"
- Be specific about observable behaviors — cite what the candidate actually did
- The overall_score should be a weighted average reflecting the candidate's overall performance`;
}

// ============================================================================
// Gemini File Upload
// ============================================================================

async function uploadVideoToGemini(videoPath: string): Promise<string> {
  console.log(`📤 Uploading ${path.basename(videoPath)} to Gemini File API...`);

  const videoBuffer = fs.readFileSync(videoPath);
  const blob = new Blob([videoBuffer], { type: VIDEO_MIME_TYPE });

  const file = await gemini.files.upload({
    file: blob,
    config: {
      mimeType: VIDEO_MIME_TYPE,
      displayName: `assessment-video-${Date.now()}`,
    },
  });

  if (!file.uri || !file.name) {
    throw new Error("Gemini file upload succeeded but no URI/name returned");
  }

  console.log(`   File name: ${file.name}`);
  console.log(`   Waiting for file to become ACTIVE...`);

  // Poll until ACTIVE (max 2 minutes)
  const startTime = Date.now();
  const TIMEOUT = 120_000;
  while (Date.now() - startTime < TIMEOUT) {
    const status = await gemini.files.get({ name: file.name });
    if (status.state === "ACTIVE") {
      console.log(`   ✅ File is ACTIVE (${Math.round((Date.now() - startTime) / 1000)}s)`);
      return file.uri;
    }
    if (status.state === "FAILED") {
      throw new Error(`Gemini file processing failed for ${file.name}`);
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error(`Timed out waiting for Gemini file ${file.name} to become ACTIVE`);
}

// ============================================================================
// Response Parser
// ============================================================================

interface TimestampedBehavior {
  timestamp: string;
  behavior: string;
}

interface DimensionScoreResult {
  dimensionSlug: string;
  score: number | null;
  summary: string;
  confidence: string;
  rationale: string;
  observableBehaviors: TimestampedBehavior[];
  timestamps: string[];
  trainableGap: boolean;
  greenFlags: string[];
  redFlags: string[];
}

interface ParsedEvaluation {
  evaluationVersion: string;
  roleFamilySlug: string;
  overallScore: number | null;
  dimensionScores: DimensionScoreResult[];
  detectedRedFlags: Array<{ slug: string; evidence: string; timestamps: string[] }>;
  topStrengths: Array<{ dimension: string; score: number; description: string }>;
  growthAreas: Array<{ dimension: string; score: number; description: string }>;
  overallSummary: string;
  evaluationConfidence: string;
  insufficientEvidenceNotes: string | null;
}

function parseEvaluationResponse(responseText: string): ParsedEvaluation {
  let cleaned = responseText.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned);

  // overall_score can be null when video has insufficient evidence
  if (parsed.overall_score !== null && typeof parsed.overall_score !== "number") throw new Error("Invalid overall_score");
  if (!parsed.dimension_scores) throw new Error("Missing dimension_scores");
  if (!parsed.overall_summary) throw new Error("Missing overall_summary");

  const dimensionScores = Object.entries(
    parsed.dimension_scores as Record<string, Record<string, unknown>>
  ).map(([slug, data]) => {
    const rawBehaviors = data.observable_behaviors as TimestampedBehavior[] | string[] | undefined;
    let observableBehaviors: TimestampedBehavior[];
    let timestamps: string[];

    if (
      Array.isArray(rawBehaviors) &&
      rawBehaviors.length > 0 &&
      typeof rawBehaviors[0] === "object" &&
      "timestamp" in (rawBehaviors[0] as object)
    ) {
      observableBehaviors = rawBehaviors as TimestampedBehavior[];
      timestamps = observableBehaviors.map((b) => b.timestamp);
    } else {
      const flatBehaviors = (rawBehaviors as string[]) ?? [];
      const flatTimestamps = (data.timestamps as string[]) ?? [];
      observableBehaviors = flatBehaviors.map((b, i) => ({
        timestamp: flatTimestamps[i] ?? "",
        behavior: b,
      }));
      timestamps = flatTimestamps;
    }

    return {
      dimensionSlug: slug,
      score: (data.score as number | null) ?? null,
      summary: (data.summary as string) ?? "",
      confidence: (data.confidence as string) ?? "medium",
      rationale: (data.rationale as string) ?? "",
      observableBehaviors,
      timestamps,
      trainableGap: (data.trainable_gap as boolean) ?? false,
      greenFlags: (data.green_flags as string[]) ?? [],
      redFlags: (data.red_flags as string[]) ?? [],
    };
  });

  return {
    evaluationVersion: parsed.evaluation_version ?? "3.0.0",
    roleFamilySlug: parsed.role_family_slug ?? "engineering",
    overallScore: parsed.overall_score,
    dimensionScores,
    detectedRedFlags: (parsed.detected_red_flags ?? []).map(
      (rf: Record<string, unknown>) => ({
        slug: rf.slug as string,
        evidence: (rf.evidence as string) ?? "",
        timestamps: (rf.timestamps as string[]) ?? [],
      })
    ),
    topStrengths: (parsed.top_strengths ?? []).map((s: Record<string, unknown>) => ({
      dimension: (s.dimension as string) ?? "",
      score: (s.score as number) ?? 0,
      description: (s.description as string) ?? "",
    })),
    growthAreas: (parsed.growth_areas ?? []).map((g: Record<string, unknown>) => ({
      dimension: (g.dimension as string) ?? "",
      score: (g.score as number) ?? 0,
      description: (g.description as string) ?? "",
    })),
    overallSummary: parsed.overall_summary,
    evaluationConfidence: parsed.evaluation_confidence ?? "medium",
    insufficientEvidenceNotes: parsed.insufficient_evidence_notes ?? null,
  };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("🚀 Running Real Assessment Pipeline\n");

  // Verify video exists
  if (!fs.existsSync(VIDEO_PATH)) {
    throw new Error(`Video not found at ${VIDEO_PATH}`);
  }
  const stats = fs.statSync(VIDEO_PATH);
  console.log(`📹 Video: ${path.basename(VIDEO_PATH)} (${(stats.size / 1024 / 1024).toFixed(1)} MB)\n`);

  // ── Step 1: Create candidate user ──
  console.log("👤 Creating candidate user...");
  const hashedPassword = await hash(CANDIDATE.password, 10);
  const user = await prisma.user.upsert({
    where: { email: CANDIDATE.email },
    update: { name: CANDIDATE.name },
    create: {
      email: CANDIDATE.email,
      name: CANDIDATE.name,
      password: hashedPassword,
      role: "USER",
    },
  });
  console.log(`   ✅ User: ${user.name} (${user.email}) - ID: ${user.id}\n`);

  // ── Step 2: Create assessment record ──
  console.log("📋 Creating assessment record...");
  const scenario = await prisma.scenario.findUnique({
    where: { id: RECRUITER_SCENARIO_ID },
  });
  if (!scenario) {
    throw new Error(`Scenario ${RECRUITER_SCENARIO_ID} not found. Run 'npx tsx prisma/seed.ts' first.`);
  }

  const assessment = await prisma.assessment.upsert({
    where: { id: ASSESSMENT_ID },
    update: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
    create: {
      id: ASSESSMENT_ID,
      userId: user.id,
      scenarioId: RECRUITER_SCENARIO_ID,
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });
  console.log(`   ✅ Assessment: ${assessment.id} (COMPLETED)`);
  console.log(`   Scenario: ${scenario.name} at ${scenario.companyName}\n`);

  // ── Step 3: Clean up existing video assessment data ──
  console.log("🧹 Cleaning up previous run data...");
  const existingVA = await prisma.videoAssessment.findUnique({
    where: { assessmentId: ASSESSMENT_ID },
  });
  if (existingVA) {
    await prisma.dimensionScore.deleteMany({ where: { assessmentId: existingVA.id } });
    await prisma.videoAssessmentSummary.deleteMany({ where: { assessmentId: existingVA.id } });
    await prisma.videoAssessment.delete({ where: { id: existingVA.id } });
    console.log("   Deleted previous video assessment data");
  }
  console.log("");

  // ── Step 4: Upload video to Gemini ──
  const geminiFileUri = await uploadVideoToGemini(VIDEO_PATH);
  console.log(`   URI: ${geminiFileUri}\n`);

  // ── Step 5: Load rubric and build prompt ──
  console.log("📚 Loading evaluation rubric...");
  const rubricInput = await loadRubricForRoleFamily("engineering");
  rubricInput.videoContext = {
    taskDescription: scenario.taskDescription,
  };
  const prompt = buildRubricEvaluationPrompt(rubricInput);
  console.log(`   ✅ Rubric loaded: ${rubricInput.dimensions.length} dimensions, ${rubricInput.redFlags.length} red flags`);
  console.log(`   Prompt length: ${prompt.length} chars\n`);

  // ── Step 6: Run Gemini evaluation ──
  console.log("🤖 Sending video to Gemini for evaluation...");
  console.log(`   Model: ${VIDEO_EVALUATION_MODEL}`);
  const startTime = Date.now();

  const result = await gemini.models.generateContent({
    model: VIDEO_EVALUATION_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            fileData: {
              fileUri: geminiFileUri,
              mimeType: VIDEO_MIME_TYPE,
            },
          },
          { text: prompt },
        ],
      },
    ],
  });

  const responseText = result.text;
  if (!responseText) {
    throw new Error("No response from Gemini");
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`   ✅ Response received (${elapsed}s, ${responseText.length} chars)\n`);

  // Save raw response for debugging
  fs.writeFileSync(path.join(__dirname, "real-assessment-raw-response.txt"), responseText);
  console.log(`   Raw response saved to scripts/real-assessment-raw-response.txt\n`);

  // ── Step 7: Parse response ──
  console.log("📊 Parsing evaluation response...");
  const evaluation = parseEvaluationResponse(responseText);
  console.log(`   Overall score: ${evaluation.overallScore}`);
  console.log(`   Confidence: ${evaluation.evaluationConfidence}`);
  console.log(`   Dimensions scored: ${evaluation.dimensionScores.filter((d) => d.score !== null).length}`);
  console.log(`   Red flags detected: ${evaluation.detectedRedFlags.length}`);
  console.log(`   Top strengths: ${evaluation.topStrengths.length}`);
  console.log(`   Growth areas: ${evaluation.growthAreas.length}\n`);

  // Print dimension scores
  console.log("   Dimension Scores:");
  for (const dim of evaluation.dimensionScores) {
    const scoreStr = dim.score !== null ? `${dim.score}/4` : "N/A";
    console.log(`     ${dim.dimensionSlug.padEnd(25)} ${scoreStr} (${dim.confidence})`);
  }
  console.log("");

  // ── Step 8: Store results in database ──
  console.log("💾 Storing results in database...");

  const videoAssessment = await prisma.videoAssessment.create({
    data: {
      id: VIDEO_ASSESSMENT_ID,
      candidateId: user.id,
      assessmentId: ASSESSMENT_ID,
      videoUrl: geminiFileUri,
      status: VideoAssessmentStatus.COMPLETED,
      completedAt: new Date(),
      isSearchable: true,
    },
  });

  // Store dimension scores using rubric slugs directly
  const timestampRegex = /^(\d{1,2}:)?\d{1,2}:\d{2}$/;
  for (const dimScore of evaluation.dimensionScores) {
    if (dimScore.score === null) continue;
    const validTimestamps = dimScore.timestamps.filter((ts) => timestampRegex.test(ts));

    await prisma.dimensionScore.create({
      data: {
        assessmentId: videoAssessment.id,
        dimension: dimScore.dimensionSlug,
        score: dimScore.score,
        confidence: dimScore.confidence,
        observableBehaviors: JSON.stringify(dimScore.observableBehaviors),
        timestamps: validTimestamps as unknown as Prisma.InputJsonValue,
        trainableGap: dimScore.trainableGap,
        rationale: dimScore.rationale,
      },
    });
  }

  // Store summary with full raw AI response
  await prisma.videoAssessmentSummary.create({
    data: {
      assessmentId: videoAssessment.id,
      overallSummary: evaluation.overallSummary,
      rawAiResponse: evaluation as unknown as Prisma.InputJsonValue,
    },
  });

  // Store report with percentiles using rubric slugs
  const dimensionPercentiles: Record<string, number> = {};
  for (const dim of evaluation.dimensionScores) {
    if (dim.score !== null) {
      dimensionPercentiles[dim.dimensionSlug] = [0, 10, 35, 65, 90][dim.score] ?? 50;
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    assessmentId: ASSESSMENT_ID,
    candidateName: CANDIDATE.name,
    overallScore: evaluation.overallScore ?? 0,
    overallLevel: (evaluation.overallScore ?? 0) >= 3.5 ? "exceptional" : (evaluation.overallScore ?? 0) >= 2.5 ? "strong" : "developing",
    videoEvaluation: evaluation,
    percentiles: {
      overall: Math.round((evaluation.overallScore ?? 0) * 25),
      calculatedAt: new Date().toISOString(),
      totalCandidates: 10,
      ...dimensionPercentiles,
    },
    metrics: {
      totalDurationMinutes: 45,
      workingPhaseMinutes: 35,
      coworkersContacted: 2,
      aiToolsUsed: true,
    },
  };

  await prisma.assessment.update({
    where: { id: ASSESSMENT_ID },
    data: {
      report: report as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(`   ✅ VideoAssessment: ${videoAssessment.id}`);
  console.log(`   ✅ ${evaluation.dimensionScores.filter((d) => d.score !== null).length} dimension scores stored`);
  console.log(`   ✅ Summary and report stored\n`);

  // ── Step 9: Cleanup Gemini file ──
  console.log("🗑️  Cleaning up Gemini file...");
  const fileNameMatch = geminiFileUri.match(/files\/[^/]+$/);
  if (fileNameMatch) {
    await gemini.files.delete({ name: fileNameMatch[0] }).catch(() => {
      console.log("   Warning: Failed to delete Gemini file (non-critical)");
    });
  }

  // ── Done ──
  console.log("\n" + "=".repeat(60));
  console.log("✅ ASSESSMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`\nCandidate: ${CANDIDATE.name} (${CANDIDATE.email})`);
  console.log(`Overall Score: ${evaluation.overallScore}/4`);
  console.log(`Confidence: ${evaluation.evaluationConfidence}`);
  console.log(`\nView on recruiter dashboard:`);
  console.log(`  Simulation: /recruiter/assessments/${RECRUITER_SCENARIO_ID}`);
  console.log(`  Candidate:  /recruiter/assessments/${RECRUITER_SCENARIO_ID}?compare=${ASSESSMENT_ID}`);
  console.log(`\nOverall Summary:\n${evaluation.overallSummary}`);

  // Save raw response for debugging
  const outputPath = path.join(__dirname, "real-assessment-result.json");
  fs.writeFileSync(outputPath, JSON.stringify(evaluation, null, 2));
  console.log(`\nFull evaluation saved to: ${outputPath}`);
}

main()
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
