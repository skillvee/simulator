/**
 * Test script: Upload a local video to Gemini File API and run evaluation.
 *
 * Usage: npx tsx scripts/test-video-evaluation.ts
 *
 * This bypasses all DB dependencies so we can validate:
 * 1. Gemini File API upload works
 * 2. The evaluation prompt + video produces valid JSON
 * 3. The response parses correctly
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import {
  buildRubricEvaluationPrompt,
  type RubricPromptInput,
} from "../src/prompts/analysis/rubric-evaluation";

// ---- Config ----
const __dirname = dirname(fileURLToPath(import.meta.url));
const VIDEO_PATH = resolve(__dirname, "../public/videos/test2.mp4");
const MODEL = "gemini-3-pro-preview";

// ---- Minimal test rubric (avoids DB) ----
const TEST_RUBRIC: RubricPromptInput = {
  roleFamilyName: "Engineering",
  roleFamilySlug: "engineering",
  dimensions: [
    {
      slug: "problem_solving",
      name: "Problem Solving",
      description:
        "How the candidate breaks down problems, identifies root causes, and iterates toward solutions.",
      isUniversal: true,
      levels: [
        {
          level: 1,
          label: "Foundational",
          pattern: "Attempts problems but struggles to decompose them.",
          evidence: [
            "Jumps to coding without understanding the problem",
            "Gets stuck and doesn't try alternative approaches",
          ],
        },
        {
          level: 2,
          label: "Developing",
          pattern:
            "Can decompose problems with guidance, tries multiple approaches.",
          evidence: [
            "Breaks problem into smaller parts",
            "Tries a second approach when first fails",
          ],
        },
        {
          level: 3,
          label: "Proficient",
          pattern:
            "Independently decomposes complex problems and systematically explores solutions.",
          evidence: [
            "Creates a plan before coding",
            "Uses debugging tools effectively",
            "Identifies edge cases proactively",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Anticipates problems, designs elegant solutions, and optimizes systematically.",
          evidence: [
            "Identifies architectural implications",
            "Considers performance trade-offs",
            "Proposes multiple solutions and evaluates them",
          ],
        },
      ],
    },
    {
      slug: "communication",
      name: "Communication",
      description:
        "How clearly and effectively the candidate communicates their thought process, asks questions, and collaborates.",
      isUniversal: true,
      levels: [
        {
          level: 1,
          label: "Foundational",
          pattern: "Minimal communication, works silently.",
          evidence: [
            "Doesn't explain thought process",
            "Doesn't ask clarifying questions",
          ],
        },
        {
          level: 2,
          label: "Developing",
          pattern: "Communicates when prompted, some self-narration.",
          evidence: [
            "Responds to questions clearly",
            "Occasionally explains what they're doing",
          ],
        },
        {
          level: 3,
          label: "Proficient",
          pattern:
            "Proactively communicates, explains reasoning, asks good questions.",
          evidence: [
            "Thinks aloud naturally",
            "Asks clarifying questions before starting",
            "Explains trade-offs in their approach",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Exceptional communicator who adapts to audience and drives alignment.",
          evidence: [
            "Adjusts technical depth to audience",
            "Proactively raises risks and blockers",
            "Facilitates productive discussion",
          ],
        },
      ],
    },
    {
      slug: "ai_leverage",
      name: "AI Leverage",
      description:
        "How effectively the candidate uses AI tools to accelerate their work while maintaining quality.",
      isUniversal: false,
      levels: [
        {
          level: 1,
          label: "Foundational",
          pattern: "Doesn't use AI tools or uses them ineffectively.",
          evidence: [
            "Ignores available AI assistance",
            "Copies AI output without review",
          ],
        },
        {
          level: 2,
          label: "Developing",
          pattern: "Uses AI for basic tasks, some review of output.",
          evidence: [
            "Uses AI for code completion",
            "Reviews some AI suggestions before accepting",
          ],
        },
        {
          level: 3,
          label: "Proficient",
          pattern:
            "Strategically uses AI to accelerate work, critically evaluates output.",
          evidence: [
            "Crafts effective prompts",
            "Reviews and modifies AI output",
            "Uses AI for appropriate tasks",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Masterfully integrates AI into workflow, knows when AI helps and when it doesn't.",
          evidence: [
            "Uses AI for complex tasks like architecture review",
            "Identifies and corrects AI mistakes",
            "Achieves significant speedup through AI leverage",
          ],
        },
      ],
    },
  ],
  redFlags: [
    {
      slug: "copy_paste_without_review",
      name: "Copy-Paste Without Review",
      description:
        "Copies code from AI or external sources without reading or understanding it.",
    },
    {
      slug: "dishonesty",
      name: "Dishonesty",
      description:
        "Claims to have done something they didn't, or misrepresents their work.",
    },
  ],
  videoContext: {
    taskDescription:
      "The candidate was asked to implement a feature in a web application as part of a simulated work day assessment.",
  },
};

// ---- Main ----
async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not set. Export it or add to .env");
    process.exit(1);
  }

  const gemini = new GoogleGenAI({ apiKey });

  // 1. Read the test video
  console.log(`📹 Reading video: ${VIDEO_PATH}`);
  const videoBuffer = readFileSync(VIDEO_PATH);
  console.log(`   Size: ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB`);

  // 2. Upload to Gemini File API
  console.log("⬆️  Uploading to Gemini File API...");
  const startUpload = Date.now();

  const file = await gemini.files.upload({
    file: new Blob([videoBuffer], { type: "video/mp4" }),
    config: {
      mimeType: "video/mp4",
      displayName: "test-assessment-recording",
    },
  });

  const uploadMs = Date.now() - startUpload;
  console.log(`   ✅ Uploaded in ${(uploadMs / 1000).toFixed(1)}s`);
  console.log(`   URI: ${file.uri}`);
  console.log(`   Name: ${file.name}`);
  console.log(`   MIME: ${file.mimeType}`);
  console.log(`   Size: ${file.sizeBytes} bytes`);

  if (!file.uri) {
    console.error("❌ No URI returned from upload");
    process.exit(1);
  }

  // 2b. Wait for the file to become ACTIVE (Gemini processes it async)
  console.log("⏳ Waiting for file to become ACTIVE...");
  let fileState = file;
  const maxWaitMs = 120_000;
  const pollIntervalMs = 2_000;
  const waitStart = Date.now();

  while (Date.now() - waitStart < maxWaitMs) {
    if (fileState.name) {
      const status = await gemini.files.get({ name: fileState.name });
      if (status.state === "ACTIVE") {
        console.log("   ✅ File is ACTIVE");
        break;
      }
      if (status.state === "FAILED") {
        console.error("❌ File processing FAILED");
        process.exit(1);
      }
      console.log(`   State: ${status.state} — waiting...`);
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  if (Date.now() - waitStart >= maxWaitMs) {
    console.error("❌ Timed out waiting for file to become ACTIVE");
    process.exit(1);
  }

  // 3. Build the evaluation prompt
  console.log("\n📝 Building evaluation prompt...");
  const prompt = buildRubricEvaluationPrompt(TEST_RUBRIC);
  console.log(`   Prompt length: ${prompt.length} chars`);

  // 4. Send to Gemini for evaluation
  console.log(`\n🤖 Sending to ${MODEL} for evaluation...`);
  const startEval = Date.now();

  const result = await gemini.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            fileData: {
              fileUri: file.uri,
              mimeType: file.mimeType ?? "video/mp4",
            },
          },
          { text: prompt },
        ],
      },
    ],
  });

  const evalMs = Date.now() - startEval;
  const responseText = result.text;

  console.log(`   ✅ Response received in ${(evalMs / 1000).toFixed(1)}s`);
  console.log(
    `   Response length: ${responseText?.length ?? 0} chars`
  );

  if (!responseText) {
    console.error("❌ Empty response from Gemini");
    process.exit(1);
  }

  // 5. Try to parse JSON
  console.log("\n📊 Parsing response...");
  let cleaned = responseText.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned);

    console.log("\n✅ VALID JSON — Evaluation Results:");
    console.log("─".repeat(60));
    console.log(`Overall Score: ${parsed.overall_score}`);
    console.log(
      `Evaluation Confidence: ${parsed.evaluation_confidence}`
    );
    console.log(`Version: ${parsed.evaluation_version}`);
    console.log("");

    if (parsed.dimension_scores) {
      console.log("Dimension Scores:");
      for (const [slug, data] of Object.entries(
        parsed.dimension_scores as Record<string, Record<string, unknown>>
      )) {
        const score = data.score ?? "null";
        const confidence = data.confidence ?? "?";
        const behaviors = Array.isArray(data.observable_behaviors)
          ? data.observable_behaviors.length
          : 0;
        console.log(
          `  ${slug}: ${score}/4 (${confidence}) — ${behaviors} behaviors cited`
        );
      }
    }

    console.log("");
    if (parsed.top_strengths?.length) {
      console.log("Top Strengths:");
      for (const s of parsed.top_strengths) {
        console.log(`  • ${s.dimension} (${s.score}): ${s.description}`);
      }
    }

    if (parsed.growth_areas?.length) {
      console.log("\nGrowth Areas:");
      for (const g of parsed.growth_areas) {
        console.log(`  • ${g.dimension} (${g.score}): ${g.description}`);
      }
    }

    if (parsed.detected_red_flags?.length) {
      console.log("\n⚠️  Red Flags Detected:");
      for (const rf of parsed.detected_red_flags) {
        console.log(`  • ${rf.slug}: ${rf.evidence}`);
      }
    } else {
      console.log("\nNo red flags detected.");
    }

    console.log(`\nOverall Summary:\n${parsed.overall_summary}`);

    if (parsed.insufficient_evidence_notes) {
      console.log(
        `\nInsufficient Evidence Notes: ${parsed.insufficient_evidence_notes}`
      );
    }

    // Write full response for inspection
    console.log("\n─".repeat(60));
    console.log("Full JSON response written below:\n");
    console.log(JSON.stringify(parsed, null, 2));
  } catch (parseErr) {
    console.error("❌ Failed to parse JSON response:");
    console.error(parseErr);
    console.log("\nRaw response:\n");
    console.log(responseText);
  }

  // 6. Cleanup: delete the file from Gemini
  if (file.name) {
    console.log(`\n🗑️  Deleting file ${file.name} from Gemini...`);
    try {
      await gemini.files.delete({ name: file.name });
      console.log("   ✅ Deleted");
    } catch (delErr) {
      console.warn("   ⚠️  Delete failed (non-critical):", delErr);
    }
  }

  console.log("\n✅ Test complete!");
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
