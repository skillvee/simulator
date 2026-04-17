/**
 * Resource Quality Eval
 *
 * Generates full simulations (task + resources) N times and uses an LLM judge
 * to evaluate whether resources are self-contained, useful, and free of
 * broken references. This catches issues like:
 *
 * - External URLs that candidates can't visit
 * - API docs for APIs the candidate can't call
 * - References to repos, dashboards, or tools that don't exist in the simulation
 * - Resources that don't actually help the candidate complete the task
 * - Internal inconsistencies between resources
 *
 * Run:
 *   npx tsx scripts/eval-resource-quality.ts              # 5 runs (default)
 *   npx tsx scripts/eval-resource-quality.ts --runs 3     # custom run count
 *   npx tsx scripts/eval-resource-quality.ts --scenario 2 # run only scenario index 2
 */

import * as fs from "fs";
import * as path from "path";

// Load env BEFORE any app imports (ESM hoists imports, so we use dynamic import below)
for (const envFile of [".env.local", ".env"]) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^([^#=]+)=["']?(.+?)["']?$/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    }
    break;
  }
}

// Dynamic imports — must come after env loading
const { generateResources } = await import("@/lib/scenarios/resource-generator");
const { generateCodingTask } = await import("@/lib/scenarios/task-generator");
const { gemini } = await import("@/lib/ai/gemini");
import type { GenerateCodingTaskInput } from "@/lib/scenarios/task-generator";
import type { ScenarioResource } from "@/types";

// ─── Config ─────────────────────────────────────────────────────────

const JUDGE_MODEL = "gemini-3-flash-preview";
const DEFAULT_RUNS = 5;

// ─── Test Scenarios ─────────────────────────────────────────────────
// Diverse roles that stress-test different resource types

const SCENARIOS: (GenerateCodingTaskInput & { id: string })[] = [
  {
    id: "backend-eng",
    roleName: "Backend Software Engineer",
    seniorityLevel: "mid",
    techStack: ["Java", "Spring Boot", "PostgreSQL", "Kafka", "Docker"],
    keyResponsibilities: [
      "Design and implement microservices",
      "Debug production issues",
      "Code review",
    ],
    domainContext:
      "AdTech company running a real-time bidding platform processing 500K QPS",
    companyName: "AppLovin",
    simulationDepth: "medium",
  },
  {
    id: "data-analyst",
    roleName: "Senior Data Analyst",
    seniorityLevel: "senior",
    techStack: ["SQL", "Python", "Looker", "BigQuery", "dbt"],
    keyResponsibilities: [
      "Analyze business metrics",
      "Build dashboards",
      "Present findings to stakeholders",
    ],
    domainContext:
      "E-commerce marketplace with 2M monthly active users, focus on conversion optimization",
    companyName: "RetailPulse",
    simulationDepth: "medium",
  },
  {
    id: "frontend-eng",
    roleName: "Frontend Engineer",
    seniorityLevel: "mid",
    techStack: ["React", "TypeScript", "Next.js", "TailwindCSS", "Storybook"],
    keyResponsibilities: [
      "Build and maintain UI components",
      "Performance optimization",
      "Accessibility compliance",
    ],
    domainContext:
      "Collaborative document editing platform for enterprise teams",
    companyName: "CollabSpace",
    simulationDepth: "medium",
  },
  {
    id: "devops-sre",
    roleName: "DevOps / Site Reliability Engineer",
    seniorityLevel: "senior",
    techStack: [
      "Terraform",
      "AWS",
      "Prometheus",
      "Grafana",
      "ArgoCD",
      "Kubernetes",
    ],
    keyResponsibilities: [
      "Infrastructure cost optimization",
      "Incident response",
      "CI/CD pipeline maintenance",
    ],
    domainContext:
      "FinTech company processing $2B in annual transactions with strict uptime SLAs",
    companyName: "FinanceGrid",
    simulationDepth: "medium",
  },
  {
    id: "ml-engineer",
    roleName: "Machine Learning Engineer",
    seniorityLevel: "senior",
    techStack: ["Python", "PyTorch", "MLflow", "Airflow", "Snowflake"],
    keyResponsibilities: [
      "Train and deploy ML models",
      "Feature engineering",
      "Model monitoring",
    ],
    domainContext:
      "Fraud detection platform for a payments company, real-time inference at 10K TPS",
    companyName: "TrustShield",
    simulationDepth: "medium",
  },
];

// ─── LLM Judge ──────────────────────────────────────────────────────

interface JudgeVerdict {
  /** 1-5 overall quality */
  overallScore: number;
  /** Can the candidate complete the task with ONLY these resources? */
  selfContained: {
    score: number;
    missingInfo: string[];
    explanation: string;
  };
  /** Are there references to things that don't exist in the simulation? */
  brokenReferences: {
    score: number;
    references: {
      text: string;
      resourceLabel: string;
      issue: string;
    }[];
    explanation: string;
  };
  /** Is each resource actually useful for the task, or is it filler? */
  usefulness: {
    score: number;
    perResource: {
      label: string;
      type: string;
      useful: boolean;
      reason: string;
    }[];
    explanation: string;
  };
  /** Are there external URLs or links the candidate can't visit? */
  externalUrls: {
    score: number;
    urls: {
      url: string;
      resourceLabel: string;
    }[];
    explanation: string;
  };
  /** Do numbers, names, dates, and systems match across resources? */
  internalConsistency: {
    score: number;
    inconsistencies: string[];
    explanation: string;
  };
  /** Top issues to fix, ordered by severity */
  topIssues: string[];
}

const JUDGE_SYSTEM_PROMPT = `You evaluate resources for Skillvee, a developer assessment platform.

Candidates receive a task and read resources inline in a sidebar. They chat with AI coworkers and produce a written deliverable. They CANNOT visit URLs, clone repos, call APIs, or access external systems.

Evaluate whether the resources give the candidate what they need. Respond with JSON only.`;

async function judgeResources(
  taskDescription: string,
  resources: ScenarioResource[],
  roleName: string
): Promise<JudgeVerdict> {
  const resourcesSummary = resources
    .map(
      (r, i) =>
        `--- RESOURCE ${i + 1}: [${r.type}] "${r.label}" ---\n${r.instructions ? `Instructions: ${r.instructions}\n` : ""}Content:\n${r.content}`
    )
    .join("\n\n");

  const userPrompt = `Evaluate these resources for a ${roleName} simulation.

## TASK
${taskDescription}

## RESOURCES
${resourcesSummary}

## What to evaluate (score each 1-5)

1. **selfContained** — Does the candidate have everything needed to produce a deliverable? What's missing?
2. **brokenReferences** — Do resources reference things that don't exist (other docs, dashboards, wikis, repos NOT in the resource list)?
3. **usefulness** — Is each resource actually helpful for THIS task? Would removing it matter?
4. **externalUrls** — Are there any URLs (http, https, git@) the candidate can't visit? List them.
5. **internalConsistency** — Do numbers, names, and facts match across resources?

Return JSON:
{
  "overallScore": <1-5>,
  "selfContained": { "score": <1-5>, "missingInfo": ["..."], "explanation": "..." },
  "brokenReferences": { "score": <1-5>, "references": [{ "text": "...", "resourceLabel": "...", "issue": "..." }], "explanation": "..." },
  "usefulness": { "score": <1-5>, "perResource": [{ "label": "...", "type": "...", "useful": <bool>, "reason": "..." }], "explanation": "..." },
  "externalUrls": { "score": <1-5>, "urls": [{ "url": "...", "resourceLabel": "..." }], "explanation": "..." },
  "internalConsistency": { "score": <1-5>, "inconsistencies": ["..."], "explanation": "..." },
  "topIssues": ["..."]
}`;

  const response = await gemini.models.generateContent({
    model: JUDGE_MODEL,
    config: {
      systemInstruction: JUDGE_SYSTEM_PROMPT,
      temperature: 0.1,
      responseMimeType: "application/json",
    },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
  });

  const text = response.text ?? "";
  const cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();
  return JSON.parse(cleaned) as JudgeVerdict;
}

// ─── Heuristic URL Detection (backup for LLM judge) ────────────────

function detectExternalUrls(content: string): string[] {
  const urls: string[] = [];
  // http/https URLs
  const httpMatches = content.match(/https?:\/\/[^\s)>\]"']+/g) || [];
  urls.push(...httpMatches);
  // git@ URLs
  const gitMatches = content.match(/git@[^\s)>\]"']+/g) || [];
  urls.push(...gitMatches);
  // git clone commands
  const cloneMatches =
    content.match(/git\s+clone\s+[^\s)>\]"']+/g) || [];
  urls.push(...cloneMatches);
  return urls;
}

// ─── Run Types ──────────────────────────────────────────────────────

interface RunResult {
  runIndex: number;
  scenarioId: string;
  roleName: string;
  companyName: string;
  taskSummary: string;
  taskDescription: string;
  resourceCount: number;
  resources: {
    type: string;
    label: string;
    contentLength: number;
    wordCount: number;
  }[];
  generationTimeMs: number;
  heuristicUrlCount: number;
  heuristicUrls: string[];
  judge: JudgeVerdict;
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const runsArg = args.indexOf("--runs");
  const runs = runsArg !== -1 ? parseInt(args[runsArg + 1], 10) : DEFAULT_RUNS;
  const scenarioArg = args.indexOf("--scenario");
  const scenarioFilter =
    scenarioArg !== -1 ? parseInt(args[scenarioArg + 1], 10) : null;

  const scenarios =
    scenarioFilter !== null ? [SCENARIOS[scenarioFilter]] : SCENARIOS;

  console.log("=".repeat(80));
  console.log(`RESOURCE QUALITY EVAL — ${scenarios.length} scenarios × ${runs} runs = ${scenarios.length * runs} generations`);
  console.log(`Judge model: ${JUDGE_MODEL}`);
  console.log("=".repeat(80));
  console.log();

  const allResults: RunResult[] = [];
  let totalGenerations = 0;
  const totalExpected = scenarios.length * runs;

  for (const scenario of scenarios) {
    for (let run = 0; run < runs; run++) {
      totalGenerations++;
      const label = `[${totalGenerations}/${totalExpected}] ${scenario.roleName} @ ${scenario.companyName} (run ${run + 1}/${runs})`;
      console.log(label);

      try {
        // Step 1: Generate task
        console.log("  Generating task...");
        const taskResponse = await generateCodingTask(scenario);
        const task = taskResponse.taskOptions[0]; // Use first option
        console.log(`  Task: "${task.summary}"`);

        // Step 2: Generate resources for that task
        console.log("  Generating resources...");
        const startTime = Date.now();
        const resourceResponse = await generateResources({
          companyName: scenario.companyName,
          taskDescription: task.description,
          techStack: scenario.techStack,
          roleName: scenario.roleName,
          seniorityLevel: scenario.seniorityLevel,
        });
        const elapsed = Date.now() - startTime;

        const resources = resourceResponse.resources;
        console.log(
          `  Generated ${resources.length} resource(s) in ${(elapsed / 1000).toFixed(1)}s`
        );
        for (const r of resources) {
          const wc = (r.content ?? "").split(/\s+/).length;
          console.log(`    - [${r.type}] ${r.label} (${wc} words)`);
        }

        // Step 3: Heuristic URL check
        const allUrls = resources.flatMap((r) =>
          detectExternalUrls(r.content ?? "")
        );
        if (allUrls.length > 0) {
          console.log(`  !! Found ${allUrls.length} external URL(s) (heuristic):`);
          for (const url of allUrls.slice(0, 5)) {
            console.log(`     ${url}`);
          }
        }

        // Step 4: LLM judge evaluation
        console.log("  Running LLM judge...");
        const verdict = await judgeResources(
          task.description,
          resources,
          scenario.roleName
        );
        console.log(
          `  Judge scores: overall=${verdict.overallScore} self-contained=${verdict.selfContained.score} broken-refs=${verdict.brokenReferences.score} useful=${verdict.usefulness.score} urls=${verdict.externalUrls.score} consistency=${verdict.internalConsistency.score}`
        );

        if (verdict.topIssues.length > 0) {
          console.log("  Top issues:");
          for (const issue of verdict.topIssues.slice(0, 3)) {
            console.log(`    ! ${issue}`);
          }
        }

        allResults.push({
          runIndex: run,
          scenarioId: scenario.id,
          roleName: scenario.roleName,
          companyName: scenario.companyName,
          taskSummary: task.summary,
          taskDescription: task.description,
          resourceCount: resources.length,
          resources: resources.map((r) => ({
            type: r.type,
            label: r.label,
            contentLength: (r.content ?? "").length,
            wordCount: (r.content ?? "").split(/\s+/).length,
          })),
          generationTimeMs: elapsed,
          heuristicUrlCount: allUrls.length,
          heuristicUrls: allUrls,
          judge: verdict,
        });
      } catch (error) {
        console.error(
          `  FAILED: ${error instanceof Error ? error.message : String(error)}`
        );
        allResults.push({
          runIndex: run,
          scenarioId: scenario.id,
          roleName: scenario.roleName,
          companyName: scenario.companyName,
          taskSummary: "FAILED",
          taskDescription: "FAILED",
          resourceCount: 0,
          resources: [],
          generationTimeMs: 0,
          heuristicUrlCount: 0,
          heuristicUrls: [],
          judge: {
            overallScore: 0,
            selfContained: { score: 0, missingInfo: ["Generation failed"], explanation: "Failed" },
            brokenReferences: { score: 0, references: [], explanation: "Failed" },
            usefulness: { score: 0, perResource: [], explanation: "Failed" },
            externalUrls: { score: 0, urls: [], explanation: "Failed" },
            internalConsistency: { score: 0, inconsistencies: [], explanation: "Failed" },
            topIssues: ["Generation failed"],
          },
        });
      }
      console.log();
    }
  }

  // ─── Aggregate Report ───────────────────────────────────────────

  console.log("=".repeat(80));
  console.log("AGGREGATE REPORT");
  console.log("=".repeat(80));
  console.log();

  const successful = allResults.filter((r) => r.resourceCount > 0);
  const failed = allResults.filter((r) => r.resourceCount === 0);

  console.log(`Runs: ${successful.length} succeeded, ${failed.length} failed out of ${allResults.length} total`);
  console.log();

  if (successful.length === 0) {
    console.log("No successful runs to analyze.");
    return;
  }

  // Dimension averages
  const dims = [
    "overallScore",
    "selfContained",
    "brokenReferences",
    "usefulness",
    "externalUrls",
    "internalConsistency",
  ] as const;

  console.log("── Score Averages (1-5, higher is better) ──");
  console.log();
  for (const dim of dims) {
    const scores = successful.map((r) =>
      dim === "overallScore"
        ? r.judge.overallScore
        : (r.judge[dim] as { score: number }).score
    );
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const bar = "█".repeat(Math.round(avg)) + "░".repeat(5 - Math.round(avg));
    console.log(
      `  ${dim.padEnd(22)} ${bar} ${avg.toFixed(2)} (min=${min}, max=${max})`
    );
  }
  console.log();

  // Per-scenario breakdown
  console.log("── Per-Scenario Breakdown ──");
  console.log();
  for (const scenario of scenarios) {
    const scenarioRuns = successful.filter(
      (r) => r.scenarioId === scenario.id
    );
    if (scenarioRuns.length === 0) continue;

    const avgOverall =
      scenarioRuns.reduce((s, r) => s + r.judge.overallScore, 0) /
      scenarioRuns.length;
    const avgSelfContained =
      scenarioRuns.reduce((s, r) => s + r.judge.selfContained.score, 0) /
      scenarioRuns.length;
    const avgBrokenRefs =
      scenarioRuns.reduce((s, r) => s + r.judge.brokenReferences.score, 0) /
      scenarioRuns.length;
    const avgUrls =
      scenarioRuns.reduce((s, r) => s + r.judge.externalUrls.score, 0) /
      scenarioRuns.length;
    const totalHeuristicUrls = scenarioRuns.reduce(
      (s, r) => s + r.heuristicUrlCount,
      0
    );

    const status = avgOverall >= 4 ? "[OK]" : avgOverall >= 3 ? "[!!]" : "[XX]";
    console.log(
      `${status} ${scenario.roleName} @ ${scenario.companyName} (${scenarioRuns.length} runs)`
    );
    console.log(
      `    overall=${avgOverall.toFixed(1)} self-contained=${avgSelfContained.toFixed(1)} broken-refs=${avgBrokenRefs.toFixed(1)} urls=${avgUrls.toFixed(1)} heuristic-urls=${totalHeuristicUrls}`
    );
  }
  console.log();

  // External URL summary
  const runsWithUrls = successful.filter((r) => r.heuristicUrlCount > 0);
  console.log("── External URL Report ──");
  console.log(
    `  ${runsWithUrls.length}/${successful.length} runs contained external URLs (heuristic detection)`
  );
  if (runsWithUrls.length > 0) {
    const allUrlSet = new Set(runsWithUrls.flatMap((r) => r.heuristicUrls));
    console.log(`  Unique URLs found: ${allUrlSet.size}`);
    for (const url of [...allUrlSet].slice(0, 10)) {
      console.log(`    - ${url}`);
    }
  }
  console.log();

  // Broken references detail
  const runsWithBrokenRefs = successful.filter(
    (r) => r.judge.brokenReferences.references.length > 0
  );
  console.log("── Broken References Report ──");
  console.log(
    `  ${runsWithBrokenRefs.length}/${successful.length} runs had broken references`
  );
  if (runsWithBrokenRefs.length > 0) {
    // Group by issue type
    const refIssues = runsWithBrokenRefs.flatMap((r) =>
      r.judge.brokenReferences.references.map((ref) => ref.issue)
    );
    const issueCounts = new Map<string, number>();
    for (const issue of refIssues) {
      const key = issue.slice(0, 80);
      issueCounts.set(key, (issueCounts.get(key) ?? 0) + 1);
    }
    const sorted = [...issueCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [issue, count] of sorted.slice(0, 10)) {
      console.log(`    (${count}x) ${issue}`);
    }
  }
  console.log();

  // Resource usefulness
  const uselessResources = successful.flatMap((r) =>
    r.judge.usefulness.perResource
      .filter((pr) => !pr.useful)
      .map((pr) => ({
        ...pr,
        scenario: r.roleName,
      }))
  );
  console.log("── Useless Resources Report ──");
  console.log(
    `  ${uselessResources.length} resource(s) flagged as not useful across ${successful.length} runs`
  );
  if (uselessResources.length > 0) {
    // Group by type
    const typeCounts = new Map<string, number>();
    for (const r of uselessResources) {
      typeCounts.set(r.type, (typeCounts.get(r.type) ?? 0) + 1);
    }
    for (const [type, count] of [...typeCounts.entries()].sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`    ${type}: ${count}x flagged as not useful`);
    }
    console.log();
    for (const r of uselessResources.slice(0, 5)) {
      console.log(`    [${r.type}] "${r.label}" (${r.scenario}): ${r.reason}`);
    }
  }
  console.log();

  // Top issues across all runs
  const allIssues = successful.flatMap((r) => r.judge.topIssues);
  const issueCounts = new Map<string, number>();
  for (const issue of allIssues) {
    // Normalize by trimming and lowercasing first 60 chars
    const key = issue.slice(0, 60).toLowerCase().trim();
    issueCounts.set(key, (issueCounts.get(key) ?? 0) + 1);
  }
  const sortedIssues = [...issueCounts.entries()].sort((a, b) => b[1] - a[1]);
  console.log("── Most Common Issues (across all runs) ──");
  for (const [issue, count] of sortedIssues.slice(0, 15)) {
    console.log(`  (${count}x) ${issue}`);
  }
  console.log();

  // Pass/fail summary
  const passThreshold = 3.5;
  const passing = successful.filter(
    (r) =>
      r.judge.overallScore >= passThreshold &&
      r.judge.selfContained.score >= passThreshold &&
      r.judge.brokenReferences.score >= passThreshold &&
      r.judge.externalUrls.score >= passThreshold
  );
  console.log("── Pass/Fail (threshold: all dimensions >= 3.5) ──");
  console.log(
    `  ${passing.length}/${successful.length} runs PASSED (${((passing.length / successful.length) * 100).toFixed(0)}%)`
  );
  console.log();

  // Save results
  const outputPath = "scripts/eval-resource-quality-results.json";
  fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
  console.log(`Full results saved to ${outputPath}`);
}

main().catch(console.error);
