/**
 * Resource Quality Test
 *
 * Generates resources for 10 different roles and evaluates quality.
 * Run: npx tsx scripts/test-resource-quality.ts
 */

import { generateResources } from "@/lib/scenarios/resource-generator";
import type { ScenarioResource } from "@/types";
import { writeFileSync } from "fs";

// ─── 10 Test Scenarios ───────────────────────────────────────────────

const TEST_SCENARIOS = [
  {
    roleName: "Senior Data Analyst",
    seniorityLevel: "senior",
    companyName: "RetailPulse",
    techStack: ["SQL", "Python", "Looker", "BigQuery", "dbt"],
    taskDescription: `Hey, welcome aboard! So here's the deal — our mobile app conversion funnel has been dropping for the last 3 weeks and nobody can figure out why. Marketing says it's not them, Product says the funnel hasn't changed. I need you to dig into the raw event data, figure out where users are dropping off compared to our baseline, and put together a recommendation deck for the exec meeting on Friday. The data's all in BigQuery — you'll want to look at the events table and the user_sessions view. Oh, and check if the drop correlates with the new onboarding flow we shipped on March 3rd. There's a Looker dashboard with the high-level numbers but it doesn't drill down enough.`,
  },
  {
    roleName: "Backend Software Engineer",
    seniorityLevel: "mid",
    companyName: "StreamVault",
    techStack: ["Go", "PostgreSQL", "Redis", "gRPC", "Kubernetes"],
    taskDescription: `Welcome! We've got a bug that's been driving the on-call team crazy. Our video transcoding service is intermittently failing with timeout errors when processing videos longer than 10 minutes. The error rate jumped from 0.3% to 4.7% after last week's deploy. The service uses a worker pool pattern — jobs go into a Redis queue, workers pick them up and call the transcoding API. We think it might be related to the connection pool changes in PR #892, but we're not sure. Can you investigate, find the root cause, and submit a fix? The repo has the service code and there's a runbook for the transcoding pipeline. Check the error dashboard too — there's a pattern in the failures that might help.`,
  },
  {
    roleName: "Product Manager",
    seniorityLevel: "senior",
    companyName: "HealthBridge",
    techStack: ["Figma", "Amplitude", "Jira", "SQL"],
    taskDescription: `Hey! So we're planning the next quarter and I need your help prioritizing our notification system overhaul. Users are complaining — we send way too many notifications and they're not relevant. We've got data from a recent user survey (n=1,200), usage analytics showing notification engagement rates, and a competitive analysis the design team did. I need you to write a PRD for the first phase of the overhaul. The VP wants to see clear success metrics, a phased rollout plan, and your recommendation on whether we should build an ML-based relevance model or start with simple rule-based filtering. Keep in mind we have limited eng capacity — only 2 backend devs for the next quarter.`,
  },
  {
    roleName: "DevOps / Site Reliability Engineer",
    seniorityLevel: "senior",
    companyName: "FinanceGrid",
    techStack: ["Terraform", "AWS", "Prometheus", "Grafana", "ArgoCD", "Kubernetes"],
    taskDescription: `Welcome to the team! We've got a cost problem — our AWS bill jumped 40% last month and nobody budgeted for it. The CFO is asking questions. I need you to analyze our infrastructure costs, identify the top 3 areas of waste, and propose a cost optimization plan. We suspect it's a combination of oversized EC2 instances, orphaned EBS volumes, and our staging environment running 24/7. We've got the AWS Cost Explorer data, our Terraform configs, and a Grafana dashboard showing resource utilization. The goal is to cut costs by at least 25% without impacting production reliability. Give me a plan I can present to leadership with projected savings.`,
  },
  {
    roleName: "Frontend Engineer",
    seniorityLevel: "mid",
    companyName: "CollabSpace",
    techStack: ["React", "TypeScript", "Next.js", "TailwindCSS", "Storybook"],
    taskDescription: `Hey! We need to fix our document editor's performance. Users on the Enterprise plan are reporting that the editor becomes unusable when documents exceed ~50 pages. We're seeing janky scrolling, slow typing response, and the collaborative cursors lag by 2-3 seconds. Our React profiler shows excessive re-renders in the editor tree — every keystroke re-renders the entire document instead of just the active paragraph. We've got a performance report from the QA team with specific repro steps, the component architecture diagram, and the Lighthouse scores for comparison. I need you to identify the rendering bottleneck and implement a fix. The code is in the editor/ directory of the main repo.`,
  },
  {
    roleName: "Machine Learning Engineer",
    seniorityLevel: "senior",
    companyName: "TrustShield",
    techStack: ["Python", "PyTorch", "MLflow", "Airflow", "Snowflake", "FastAPI"],
    taskDescription: `Welcome! We need to improve our fraud detection model. The current model (XGBoost, trained 6 months ago) has a precision of 78% and recall of 64% — we're missing too many fraudulent transactions and our false positive rate is burning out the manual review team. We've got a new labeled dataset with 50K transactions from the last quarter, feature engineering docs from the previous ML engineer who left, the current model's evaluation metrics broken down by transaction type, and the MLflow experiment history. I need you to analyze what's failing, propose improvements (new features, model architecture, or training strategy), and implement a prototype that we can A/B test. The fraud patterns have shifted — we're seeing more account takeover fraud and less card-not-present fraud than when the model was trained.`,
  },
  {
    roleName: "Data Engineer",
    seniorityLevel: "mid",
    companyName: "LogiTrack",
    techStack: ["Python", "Apache Spark", "Airflow", "Snowflake", "dbt", "AWS S3"],
    taskDescription: `Hey, glad you're here. Our shipment tracking data pipeline is a mess. The daily ETL job that pulls data from our 3PL partners' APIs into Snowflake has been failing intermittently for 2 weeks. When it does run, data arrives 4-6 hours late and the logistics team is making decisions on stale data. The pipeline is an Airflow DAG with 12 tasks — some pull from REST APIs, some from SFTP drops, and one reads from a Kafka topic. I need you to diagnose the failures, fix the reliability issues, and reduce the end-to-end latency to under 1 hour. There's a pipeline diagram, the Airflow DAG configuration, error logs from the last 2 weeks, and the Snowflake schema docs.`,
  },
  {
    roleName: "Security Engineer",
    seniorityLevel: "senior",
    companyName: "VaultPay",
    techStack: ["Python", "Go", "AWS", "Terraform", "Splunk", "Burp Suite"],
    taskDescription: `Welcome aboard — we've got a situation. Our quarterly pen test report just came in and it flagged 3 critical findings: an IDOR vulnerability in the /api/accounts endpoint, a JWT implementation that uses a weak signing key, and an S3 bucket with overly permissive policies that's storing PII. The compliance team needs these fixed before our SOC 2 audit next month. I need you to review the pen test findings, validate each vulnerability, write remediation code, and update our security runbook. You'll have access to the pen test report, the relevant API code, our AWS IAM policy docs, and the current security architecture diagram. Priority is the IDOR and JWT fixes — the S3 bucket is read-only access so slightly lower risk.`,
  },
  {
    roleName: "QA / Test Automation Engineer",
    seniorityLevel: "mid",
    companyName: "BookFlow",
    techStack: ["TypeScript", "Playwright", "Jest", "GitHub Actions", "Cypress"],
    taskDescription: `Hey! We're about to launch our redesigned checkout flow and we need comprehensive E2E test coverage before it goes live next week. The current test suite covers the old flow and about 60% of it is broken because of the UI changes. I need you to review the new checkout flow specs, identify the critical user journeys that need test coverage, and write Playwright tests for them. The design team has a flow diagram, there's a test matrix the QA lead started but didn't finish, and you'll need to look at the existing test suite to see what's salvageable. Key paths: guest checkout, registered user checkout, promo code application, payment failure handling, and international shipping.`,
  },
  {
    roleName: "Technical Program Manager",
    seniorityLevel: "senior",
    companyName: "NexaCloud",
    techStack: ["Jira", "Confluence", "SQL", "Google Sheets"],
    taskDescription: `Welcome! We're in the middle of a platform migration from our monolith to microservices and it's going off the rails. We're 3 weeks behind schedule, two teams are blocked on the shared auth service, and stakeholders are getting nervous. I need you to assess the current state of the migration, identify the critical path blockers, and create a revised project plan. There's a Jira board with the current sprint status, an architecture diagram showing the dependency graph between services, a risk register the previous TPM maintained, and weekly status reports from the last month. The CTO wants a realistic timeline and a clear escalation plan for the auth service dependency. We may need to propose a phased rollout instead of the big-bang migration that was originally planned.`,
  },
];

// ─── Quality Evaluation ──────────────────────────────────────────────

interface ResourceEvaluation {
  resourceLabel: string;
  resourceType: string;
  contentLength: number;
  wordCount: number;
  issues: string[];
  strengths: string[];
  scores: {
    realism: number;       // 1-5: Does it feel like a real internal doc?
    completeness: number;  // 1-5: Does it have enough info to act on?
    specificity: number;   // 1-5: Are numbers/names/details specific vs generic?
    actionability: number; // 1-5: Can the candidate actually use this to do their task?
    crossRef: number;      // 1-5: Does it reference other resources?
  };
}

interface ScenarioEvaluation {
  roleName: string;
  companyName: string;
  resourceCount: number;
  generationTimeMs: number;
  resources: ResourceEvaluation[];
  overallIssues: string[];
  overallScore: number;
  hasSufficientMaterials: boolean;
  missingResourceTypes: string[];
}

function evaluateResource(
  resource: ScenarioResource,
  allResources: ScenarioResource[],
  roleName: string,
  taskDescription: string
): ResourceEvaluation {
  const content = resource.content ?? "";
  const wordCount = content.split(/\s+/).length;
  const issues: string[] = [];
  const strengths: string[] = [];

  // ── Content length checks ──
  if (wordCount < 450) issues.push(`Very short content: only ${wordCount} words`);
  else if (wordCount < 700) issues.push(`Below target word count: ${wordCount} words`);
  else if (wordCount > 800) strengths.push(`Good content length: ${wordCount} words`);

  // ── Table checks ──
  const tableRows = (content.match(/\|[^|]+\|/g) || []).length;
  const tables = (content.match(/\|[-:]+\|/g) || []).length; // separator rows = number of tables
  if (tables === 0 && ["spreadsheet", "dashboard", "database"].includes(resource.type)) {
    issues.push(`${resource.type} resource has no markdown tables`);
  }
  if (tables > 0 && tableRows < 8) {
    issues.push(`Tables are too small: only ~${tableRows} rows across ${tables} table(s)`);
  }
  if (tables > 0 && tableRows >= 8) {
    strengths.push(`Has substantial tables: ${tableRows} rows across ${tables} table(s)`);
  }

  // ── Cross-reference checks ──
  const otherLabels = allResources
    .filter((r) => r.label !== resource.label)
    .map((r) => r.label);
  const hasSeeAlso = /see also|related/i.test(content);
  const crossRefCount = otherLabels.filter((label) =>
    content.toLowerCase().includes(label.toLowerCase().slice(0, 20))
  ).length;

  if (!hasSeeAlso) issues.push("Missing 'See Also' section");
  if (crossRefCount === 0 && allResources.length > 1) {
    issues.push("No cross-references to other resources");
  }
  if (crossRefCount > 0) {
    strengths.push(`Cross-references ${crossRefCount} other resource(s)`);
  }

  // ── Realism checks ──
  const hasAtMentions = /@\w+/.test(content);
  const hasTodos = /TODO|FIXME|\[ \]|\[x\]/i.test(content);
  const hasTimestamps = /\d{4}-\d{2}-\d{2}|last updated|as of/i.test(content);
  const hasDraft = /draft|WIP|work in progress/i.test(content);
  const hasSpecificNumbers = /\d+\.\d+%|\$[\d,]+|\d{2,}ms/.test(content);

  if (hasAtMentions) strengths.push("Has @mentions (realistic)");
  if (hasTodos) strengths.push("Has TODO items (realistic)");
  if (hasTimestamps) strengths.push("Has timestamps/dates");
  if (hasSpecificNumbers) strengths.push("Has specific numbers (not rounded)");
  if (!hasSpecificNumbers) issues.push("Lacks specific numbers — feels generic");

  // ── Spreadsheet/data checks ──
  if (resource.type === "spreadsheet") {
    const hasDataForDownload = tableRows >= 20;
    if (!hasDataForDownload) {
      issues.push(`Spreadsheet has fewer than 20 data rows (found ~${tableRows}) — not enough for analysis work`);
    }
    // Check if it has CSV-like structured data
    const hasNumericData = /\d+\.\d+/.test(content);
    if (!hasNumericData) issues.push("Spreadsheet lacks numeric data for analysis");
  }

  // ── Database checks ──
  if (resource.type === "database") {
    const hasSchema = /CREATE TABLE|column|type|varchar|int|text|boolean/i.test(content);
    const hasQueryResults = /SELECT|query|result/i.test(content);
    if (!hasSchema) issues.push("Database resource missing schema definitions");
    if (!hasQueryResults) issues.push("Database resource missing example query results");
  }

  // ── Repository checks ──
  if (resource.type === "repository") {
    const hasQuickStart = /quick start|getting started|setup|install/i.test(content);
    const hasArchitecture = /architecture|directory|structure/i.test(content);
    const hasKnownIssues = /known issue|bug|JIRA|ticket/i.test(content);
    const hasCodeBlocks = /```/.test(content);
    // Broader code detection: inline code with function patterns, shell commands, definitions
    const hasCodeContent = hasCodeBlocks ||
      /`[a-zA-Z_]\w*(\.\w+)*\([^)]*\)`/.test(content) ||
      /`(npm|yarn|pnpm|pip|go|cargo|docker|kubectl|terraform|git|curl|make)\s/.test(content) ||
      /\b(function|func|def|fn|async|export|class|impl)\s+\w+/.test(content) ||
      /\b(import|require|from|const|let|var|val)\s+\w+/.test(content);
    const hasConfig = /config|environment|\.env/i.test(content);
    if (!hasQuickStart) issues.push("Repository missing quick start / setup section");
    if (!hasArchitecture) issues.push("Repository missing architecture overview");
    if (!hasCodeContent) issues.push("Repository missing code snippets");
    if (!hasConfig) issues.push("Repository missing configuration reference");
    if (hasKnownIssues) strengths.push("Has known issues section (realistic)");
    if (hasCodeContent) strengths.push("Has code content (realistic)");
  }

  // ── API checks ──
  if (resource.type === "api") {
    const hasEndpoints = /GET |POST |PUT |DELETE |PATCH /i.test(content);
    const hasCodeBlocks = /```/.test(content);
    const hasErrorCodes = /4\d{2}|5\d{2}|error code|status code/i.test(content);
    if (!hasEndpoints) issues.push("API doc missing endpoint definitions");
    if (!hasCodeBlocks) issues.push("API doc missing code examples");
    if (!hasErrorCodes) issues.push("API doc missing error codes");
  }

  // ── Score calculation ──
  const realismScore = Math.min(5, 1 +
    (hasAtMentions ? 1 : 0) +
    (hasTodos ? 0.5 : 0) +
    (hasTimestamps ? 0.5 : 0) +
    (hasDraft ? 0.5 : 0) +
    (hasSpecificNumbers ? 1 : 0) +
    (wordCount > 550 ? 0.5 : 0) +
    (wordCount > 800 ? 0.5 : 0));

  const completenessScore = Math.min(5, 1 +
    (wordCount > 450 ? 1 : 0) +
    (wordCount > 700 ? 1 : 0) +
    (tables > 0 ? 1 : 0) +
    (tableRows >= 8 ? 1 : 0));

  const specificityScore = Math.min(5, 1 +
    (hasSpecificNumbers ? 1.5 : 0) +
    (hasAtMentions ? 0.5 : 0) +
    (hasTimestamps ? 0.5 : 0) +
    (tableRows >= 6 ? 1 : 0) +
    (wordCount > 700 ? 0.5 : 0));

  const actionabilityScore = Math.min(5, 1 +
    (wordCount > 550 ? 1 : 0) +
    (tables > 0 ? 1 : 0) +
    (hasTodos || /open question|decision|recommendation/i.test(content) ? 1 : 0) +
    (hasSpecificNumbers ? 1 : 0));

  const crossRefScore = Math.min(5, 1 +
    (hasSeeAlso ? 1 : 0) +
    (crossRefCount * 1.5));

  return {
    resourceLabel: resource.label,
    resourceType: resource.type,
    contentLength: content.length,
    wordCount,
    issues,
    strengths,
    scores: {
      realism: Math.round(realismScore * 10) / 10,
      completeness: Math.round(completenessScore * 10) / 10,
      specificity: Math.round(specificityScore * 10) / 10,
      actionability: Math.round(actionabilityScore * 10) / 10,
      crossRef: Math.round(crossRefScore * 10) / 10,
    },
  };
}

function evaluateScenario(
  scenario: typeof TEST_SCENARIOS[0],
  resources: ScenarioResource[],
  generationTimeMs: number
): ScenarioEvaluation {
  const evals = resources.map((r) =>
    evaluateResource(r, resources, scenario.roleName, scenario.taskDescription)
  );

  const overallIssues: string[] = [];
  const missingResourceTypes: string[] = [];

  // ── Role-specific resource needs ──
  const role = scenario.roleName.toLowerCase();
  const task = scenario.taskDescription.toLowerCase();
  const types = resources.map((r) => r.type);

  if (role.includes("data analyst") || role.includes("data scientist")) {
    if (!types.includes("spreadsheet") && !types.includes("database")) {
      missingResourceTypes.push("spreadsheet or database (data analyst needs data to analyze!)");
    }
    if (task.includes("dashboard") && !types.includes("dashboard")) {
      missingResourceTypes.push("dashboard (task mentions a dashboard)");
    }
  }

  if (role.includes("engineer") && !role.includes("data")) {
    if (!types.includes("repository") && task.includes("code") || task.includes("repo") || task.includes("fix") || task.includes("implement")) {
      if (!types.includes("repository")) {
        missingResourceTypes.push("repository (engineer needs code context)");
      }
    }
  }

  if (role.includes("product manager")) {
    if (!types.includes("document") && !types.includes("spreadsheet")) {
      missingResourceTypes.push("document or spreadsheet (PM needs requirements/data context)");
    }
  }

  if (role.includes("devops") || role.includes("sre")) {
    if (!types.includes("dashboard")) {
      missingResourceTypes.push("dashboard (SRE needs monitoring data)");
    }
  }

  if (role.includes("ml") || role.includes("machine learning")) {
    if (!types.includes("spreadsheet") && !types.includes("database")) {
      missingResourceTypes.push("spreadsheet or database (ML engineer needs model metrics/data)");
    }
  }

  if (role.includes("security")) {
    if (!types.includes("document")) {
      missingResourceTypes.push("document (security engineer needs pen test report or security docs)");
    }
  }

  if (missingResourceTypes.length > 0) {
    overallIssues.push(`Missing critical resource types: ${missingResourceTypes.join(", ")}`);
  }

  if (resources.length === 1) {
    overallIssues.push("Only 1 resource generated — most tasks need 2-4 for realistic context");
  }

  // Check cross-referencing across the set
  const avgCrossRef = evals.reduce((sum, e) => sum + e.scores.crossRef, 0) / evals.length;
  if (avgCrossRef < 2.5 && resources.length > 1) {
    overallIssues.push("Weak cross-referencing between resources — they feel disconnected");
  }

  const avgScore =
    evals.reduce(
      (sum, e) =>
        sum +
        (e.scores.realism +
          e.scores.completeness +
          e.scores.specificity +
          e.scores.actionability +
          e.scores.crossRef) /
          5,
      0
    ) / evals.length;

  return {
    roleName: scenario.roleName,
    companyName: scenario.companyName,
    resourceCount: resources.length,
    generationTimeMs,
    resources: evals,
    overallIssues,
    overallScore: Math.round(avgScore * 100) / 100,
    hasSufficientMaterials: missingResourceTypes.length === 0,
    missingResourceTypes,
  };
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(80));
  console.log("RESOURCE QUALITY TEST — 10 Roles");
  console.log("=".repeat(80));
  console.log();

  const results: ScenarioEvaluation[] = [];
  const rawContentStore: Record<string, ScenarioResource[]> = {};

  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const scenario = TEST_SCENARIOS[i];
    console.log(`[${i + 1}/10] Generating resources for: ${scenario.roleName} @ ${scenario.companyName}`);

    const startTime = Date.now();
    try {
      const response = await generateResources({ ...scenario, language: "en" });
      const elapsed = Date.now() - startTime;

      console.log(`  -> Generated ${response.resources.length} resource(s) in ${(elapsed / 1000).toFixed(1)}s`);
      for (const r of response.resources) {
        console.log(`     - [${r.type}] ${r.label} (${r.content?.length ?? 0} chars)`);
      }

      rawContentStore[scenario.roleName] = response.resources;
      const evaluation = evaluateScenario(scenario, response.resources, elapsed);
      results.push(evaluation);

      console.log(`  -> Score: ${evaluation.overallScore}/5`);
      if (evaluation.overallIssues.length > 0) {
        for (const issue of evaluation.overallIssues) {
          console.log(`  -> ISSUE: ${issue}`);
        }
      }
      console.log();
    } catch (error) {
      console.error(`  -> FAILED: ${error instanceof Error ? error.message : String(error)}`);
      results.push({
        roleName: scenario.roleName,
        companyName: scenario.companyName,
        resourceCount: 0,
        generationTimeMs: Date.now() - startTime,
        resources: [],
        overallIssues: [`Generation failed: ${error instanceof Error ? error.message : String(error)}`],
        overallScore: 0,
        hasSufficientMaterials: false,
        missingResourceTypes: ["ALL — generation failed"],
      });
      console.log();
    }
  }

  // ─── Summary Report ──────────────────────────────────────────────
  console.log("=".repeat(80));
  console.log("SUMMARY REPORT");
  console.log("=".repeat(80));
  console.log();

  const successful = results.filter((r) => r.resourceCount > 0);
  const failed = results.filter((r) => r.resourceCount === 0);
  const avgScore = successful.reduce((s, r) => s + r.overallScore, 0) / (successful.length || 1);

  console.log(`Successful: ${successful.length}/10`);
  console.log(`Failed: ${failed.length}/10`);
  console.log(`Average Score: ${avgScore.toFixed(2)}/5`);
  console.log();

  console.log("── Per-Role Results ──");
  console.log();
  for (const r of results) {
    const status = r.resourceCount > 0 ? (r.hasSufficientMaterials ? "PASS" : "WARN") : "FAIL";
    const icon = status === "PASS" ? "[OK]" : status === "WARN" ? "[!!]" : "[XX]";
    console.log(`${icon} ${r.roleName} @ ${r.companyName}`);
    console.log(`    Resources: ${r.resourceCount} | Score: ${r.overallScore}/5 | Time: ${(r.generationTimeMs / 1000).toFixed(1)}s`);

    if (r.resources.length > 0) {
      for (const res of r.resources) {
        const resAvg = (res.scores.realism + res.scores.completeness + res.scores.specificity + res.scores.actionability + res.scores.crossRef) / 5;
        console.log(`    - [${res.resourceType}] ${res.resourceLabel}: ${resAvg.toFixed(1)}/5 (${res.wordCount} words)`);
        if (res.issues.length > 0) {
          for (const issue of res.issues) {
            console.log(`      ! ${issue}`);
          }
        }
      }
    }

    if (r.missingResourceTypes.length > 0) {
      console.log(`    MISSING: ${r.missingResourceTypes.join(", ")}`);
    }
    if (r.overallIssues.length > 0) {
      for (const issue of r.overallIssues) {
        console.log(`    ISSUE: ${issue}`);
      }
    }
    console.log();
  }

  // ─── Aggregate Analysis ──────────────────────────────────────────
  console.log("── Dimension Averages (across all resources) ──");
  const allEvals = results.flatMap((r) => r.resources);
  if (allEvals.length > 0) {
    const dims = ["realism", "completeness", "specificity", "actionability", "crossRef"] as const;
    for (const dim of dims) {
      const avg = allEvals.reduce((s, e) => s + e.scores[dim], 0) / allEvals.length;
      console.log(`  ${dim.padEnd(15)}: ${avg.toFixed(2)}/5`);
    }
  }
  console.log();

  // ─── Common Issues ───────────────────────────────────────────────
  const allIssues = allEvals.flatMap((e) => e.issues);
  const issueCounts = new Map<string, number>();
  for (const issue of allIssues) {
    // Normalize similar issues
    const key = issue.replace(/\d+/g, "N");
    issueCounts.set(key, (issueCounts.get(key) ?? 0) + 1);
  }
  const sortedIssues = [...issueCounts.entries()].sort((a, b) => b[1] - a[1]);
  console.log("── Most Common Issues ──");
  for (const [issue, count] of sortedIssues.slice(0, 10)) {
    console.log(`  (${count}x) ${issue}`);
  }
  console.log();

  // ─── Sufficiency Check ──────────────────────────────────────────
  console.log("── Sufficiency Check: Can the candidate do their job? ──");
  for (const r of results) {
    if (r.resourceCount === 0) {
      console.log(`  [FAIL] ${r.roleName}: No resources generated`);
      continue;
    }
    const typeList = r.resources.map((res) => res.resourceType).join(", ");
    if (r.hasSufficientMaterials) {
      console.log(`  [OK]   ${r.roleName}: Has ${typeList}`);
    } else {
      console.log(`  [MISS] ${r.roleName}: Has ${typeList} — MISSING: ${r.missingResourceTypes.join(", ")}`);
    }
  }

  // Save full results as JSON
  const outputPath = "scripts/resource-quality-results.json";
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nFull results saved to ${outputPath}`);

  // Save raw content for each scenario
  const rawOutputPath = "scripts/resource-quality-raw.json";
  writeFileSync(rawOutputPath, JSON.stringify(rawContentStore, null, 2));
  console.log(`Raw resource content saved to ${rawOutputPath}`);
}

main().catch(console.error);
