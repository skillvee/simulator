#!/usr/bin/env npx tsx
/**
 * CLI for running prompt evals
 *
 * Usage:
 *   npx tsx scripts/run-evals.ts                              # Run all 15 scenarios
 *   npx tsx scripts/run-evals.ts --name "baseline"            # Run with a label
 *   npx tsx scripts/run-evals.ts --category manager           # Only manager scenarios
 *   npx tsx scripts/run-evals.ts --scenarios manager-initial-greeting,nonmanager-casual-hello
 *   npx tsx scripts/run-evals.ts --prompt-file /path/to/prompt.txt  # Test custom prompt
 *   npx tsx scripts/run-evals.ts --list                       # List all scenario IDs
 *   npx tsx scripts/run-evals.ts --verbose                    # Show per-scenario scores
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { runEvalSuite, listScenarios } from "../src/lib/evals/runner";
import type { EvalScenario } from "../src/lib/evals/types";
import { buildAgentPrompt } from "../src/prompts/build-agent-prompt";

// Load env
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=["']?(.+?)["']?$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const db = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  // Parse flags
  const getFlag = (name: string): string | undefined => {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };
  const hasFlag = (name: string) => args.includes(`--${name}`);

  if (hasFlag("list")) {
    console.log("\nAvailable scenarios:\n");
    for (const s of listScenarios()) {
      console.log(`  ${s.id.padEnd(35)} [${s.category}] ${s.name}`);
    }
    process.exit(0);
  }

  if (hasFlag("help")) {
    console.log(`
Usage: npx tsx scripts/run-evals.ts [options]

Options:
  --name <label>           Label for this eval run (default: timestamp)
  --category <cat>         Filter: manager | non-manager | edge-case
  --scenarios <ids>        Comma-separated scenario IDs
  --prompt-file <path>     Custom prompt template file (for A/B testing)
  --verbose                Show per-scenario scores as they complete
  --list                   List all scenario IDs
  --help                   Show this help
`);
    process.exit(0);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY not found in environment");
    process.exit(1);
  }

  const name = getFlag("name") || `eval-${new Date().toISOString().slice(0, 16).replace("T", "-")}`;
  const category = getFlag("category") as "manager" | "non-manager" | "edge-case" | undefined;
  const scenarioIds = getFlag("scenarios")?.split(",");
  const promptFile = getFlag("prompt-file");
  const verbose = hasFlag("verbose") || true; // Default verbose

  // Custom prompt override
  let promptOverride: ((scenario: EvalScenario) => string) | undefined;
  if (promptFile) {
    const promptTemplate = fs.readFileSync(promptFile, "utf-8");
    console.log(`Using custom prompt from: ${promptFile}`);
    promptOverride = (scenario: EvalScenario) => {
      // Replace placeholders in the template
      return promptTemplate
        .replace(/\{agentName\}/g, scenario.agent.name)
        .replace(/\{agentRole\}/g, scenario.agent.role)
        .replace(/\{companyName\}/g, scenario.companyName)
        .replace(/\{personaStyle\}/g, scenario.agent.personaStyle)
        .replace(/\{conversationHistory\}/g, scenario.conversationHistory)
        .replace(/\{crossAgentContext\}/g, scenario.crossAgentContext);
    };
  }

  console.log(`\n🧪 Running eval: "${name}"\n`);

  // Create eval run in DB
  const evalRun = await db.evalRun.create({
    data: {
      name,
      promptVersion: promptOverride ? "custom" : "production",
      model: "gemini-3-flash-preview",
      status: "running",
      scenarioCount: scenarioIds?.length || (category ? 6 : 15),
    },
  });

  const startTime = Date.now();

  try {
    const { results, overallScore, promptVersion } = await runEvalSuite(
      { name, category, scenarioIds, verbose },
      {
        apiKey,
        promptOverride,
        onProgress: (completed, total, scenarioName) => {
          if (completed < total) {
            process.stdout.write(`  ⏳ [${completed + 1}/${total}] ${scenarioName}...`);
          }
        },
      }
    );

    // Store results in DB
    for (const result of results) {
      await db.evalResult.create({
        data: {
          evalRunId: evalRun.id,
          scenarioId: result.scenarioId,
          scenarioName: result.scenarioName,
          category: result.category,
          prompt: result.prompt,
          userMessage: result.userMessage,
          response: result.response,
          generationMs: result.generationMs,
          judgments: result.judgments as unknown as import("@prisma/client").Prisma.InputJsonValue,
          naturalness: result.naturalness,
          roleAccuracy: result.roleAccuracy,
          brevity: result.brevity,
          contextAwareness: result.contextAwareness,
          infoDiscipline: result.infoDiscipline,
          aiIsms: result.aiIsms,
          overallScore: result.overallScore,
          flagged: result.flagged,
        },
      });
    }

    // Update eval run
    await db.evalRun.update({
      where: { id: evalRun.id },
      data: {
        status: "completed",
        overallScore,
        promptVersion,
        completedAt: new Date(),
        scenarioCount: results.length,
      },
    });

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

    // Print summary
    console.log(`\n${"─".repeat(60)}`);
    console.log(`\n📊 Eval Results: "${name}"\n`);
    console.log(`  Overall Score: ${overallScore.toFixed(2)}/5.00`);
    console.log(`  Scenarios: ${results.length}`);
    console.log(`  Duration: ${durationSec}s`);
    console.log(`  Prompt: ${promptVersion}`);
    console.log(`  Run ID: ${evalRun.id}`);

    // Per-dimension averages
    const dims = ["naturalness", "roleAccuracy", "brevity", "contextAwareness", "infoDiscipline", "aiIsms"] as const;
    console.log(`\n  Per-dimension averages:`);
    for (const dim of dims) {
      const avg = results.reduce((s, r) => s + (r[dim] || 0), 0) / results.length;
      const bar = "█".repeat(Math.round(avg)) + "░".repeat(5 - Math.round(avg));
      console.log(`    ${dim.padEnd(20)} ${bar} ${avg.toFixed(2)}`);
    }

    // Flagged scenarios
    const flagged = results.filter((r) => r.flagged);
    if (flagged.length > 0) {
      console.log(`\n  ⚠️  Flagged scenarios (judge disagreement):`);
      for (const r of flagged) {
        console.log(`    - ${r.scenarioName} (${r.overallScore.toFixed(1)}/5)`);
      }
    }

    // Lowest scoring scenarios
    const sorted = [...results].sort((a, b) => a.overallScore - b.overallScore);
    console.log(`\n  Lowest scoring:`);
    for (const r of sorted.slice(0, 3)) {
      console.log(`    ${r.overallScore.toFixed(1)}/5  ${r.scenarioName}`);
    }

    console.log(`\n  View details: /admin/evals/${evalRun.id}`);
    console.log();
  } catch (err) {
    await db.evalRun.update({
      where: { id: evalRun.id },
      data: { status: "failed" },
    });
    console.error("\n❌ Eval failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
