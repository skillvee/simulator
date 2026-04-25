/**
 * Create a fresh v2 test scenario from a hand-crafted JD-style input.
 *
 * Usage:
 *   npx tsx scripts/create-test-scenario.ts <preset-name>
 *
 * Presets are below — each one fully describes a scenario (company,
 * task, coworkers, archetype). After creation, run:
 *   npx tsx scripts/trigger-v2-pipeline.ts <printed-scenario-id>
 */

import { db } from "../src/server/db";

const presets: Record<
  string,
  {
    name: string;
    companyName: string;
    companyDescription: string;
    taskDescription: string;
    techStack: string[];
    archetypeSlug: string;
    targetLevel: string;
    coworkers: Array<{
      name: string;
      role: string;
      personaStyle: string;
      knowledge: Array<{
        topic: string;
        triggerKeywords: string[];
        response: string;
        isCritical: boolean;
      }>;
    }>;
  }
> = {
  "backend-go": {
    name: "Senior Backend Engineer @ Drift",
    companyName: "Drift",
    companyDescription:
      "Drift is a payments-orchestration startup (Series A, ~50 engineers) that routes credit-card transactions across multiple processors to optimize approval rates and fees. Customers are mid-market e-commerce businesses processing $5M-$200M/year.",
    taskDescription: `Our checkout API has a degraded p99 latency problem. Over the past two weeks, p99 has crept from ~180ms to ~850ms, while p50 is unchanged at ~40ms. We're convinced the issue is in the routing service that picks which processor to send each charge to — that service makes parallel calls to 3-5 processor APIs, then aggregates. Engineering Manager Priya thinks one of the processor clients has a slow timeout path that's tail-blocking the request. SRE Hugo set up a Grafana dashboard last week showing the latency distribution per-processor but hasn't been able to dig in. Your job: profile the routing service, find the slow path, and propose a fix. We don't care about the absolute fix — we care that you can navigate a Go codebase you've never seen, instrument it, and reason about distributed timeouts under load.`,
    techStack: ["Express", "Node", "TypeScript", "Prisma", "PostgreSQL"],
    archetypeSlug: "backend_engineer",
    targetLevel: "senior",
    coworkers: [
      {
        name: "Priya Iyer",
        role: "Engineering Manager",
        personaStyle:
          "Direct, time-pressured, will challenge sloppy reasoning. Wants to see how the candidate isolates the problem before proposing changes.",
        knowledge: [
          {
            topic: "Suspected slow processor",
            triggerKeywords: ["processor", "slow", "latency", "p99"],
            response:
              "I think it's the Stripe client — we updated its timeout from 200ms to 5s last sprint to fix flakiness during their incident, and we never reverted it. But that's a hypothesis, not data.",
            isCritical: true,
          },
          {
            topic: "Production traffic pattern",
            triggerKeywords: ["traffic", "load", "qps", "production"],
            response:
              "We're at ~400 qps steady state, peaking around 1.2k during US business hours. Most of the slow tail is concentrated in those peaks.",
            isCritical: false,
          },
        ],
      },
      {
        name: "Hugo Martinez",
        role: "SRE",
        personaStyle:
          "Loves data, will hand over dashboard links and timing histograms when asked. Skeptical of changes without measurement.",
        knowledge: [
          {
            topic: "Grafana dashboard",
            triggerKeywords: ["grafana", "dashboard", "metric"],
            response:
              "The 'Routing Latency by Processor' panel shows Stripe's p99 alone has gone from 110ms to 4.2s. Adyen and Worldpay are flat. Filename in the repo is `dashboards/routing-latency.json`.",
            isCritical: true,
          },
          {
            topic: "Tracing setup",
            triggerKeywords: ["trace", "tracing", "otel"],
            response:
              "We have OpenTelemetry wired through the Express middleware but the processor clients aren't instrumented. Adding spans there is on the backlog — feel free to do it as part of your investigation.",
            isCritical: false,
          },
        ],
      },
      {
        name: "Marcus Chen",
        role: "Senior Backend Engineer",
        personaStyle:
          "Wrote the routing service originally. Will explain code organization, but won't volunteer the cause — wants to see the candidate find it.",
        knowledge: [
          {
            topic: "Routing service architecture",
            triggerKeywords: ["routing", "architecture", "service"],
            response:
              "The handler lives in `src/server/routes/charge.ts`. It calls `RouterService.routeCharge()` which fans out to processor clients via `Promise.all`. Each client is in `src/services/processors/`. Aggregation happens after all settle.",
            isCritical: true,
          },
          {
            topic: "Promise.all behavior",
            triggerKeywords: ["promise", "all", "wait", "settle"],
            response:
              "Yeah `Promise.all` waits for the slowest one — that was the design, we want all processor responses before deciding. But if one is taking 5s now, the whole request takes 5s. That might be the design problem.",
            isCritical: true,
          },
        ],
      },
    ],
  },
  "data-scientist-ml": {
    name: "Senior Data Scientist @ Cluster",
    companyName: "Cluster",
    companyDescription:
      "Cluster is a B2B SaaS company providing customer-segmentation tooling for marketing teams at consumer brands. We're at $25M ARR, 120 employees, growing 50% YoY. The DS team owns the segmentation models that drive all customer-facing recommendations.",
    taskDescription: `Our flagship model — the Lifetime Value (LTV) predictor — is showing degraded accuracy in production. The model was trained 9 months ago and predicted-vs-actual error has crept from 12% MAPE to 27% MAPE, especially on the high-LTV decile. Marketing teams have started complaining that recommendations are mistargeting. We have feature drift logs, retraining-eligible data, and a snapshot of the production training pipeline. Your job: investigate where the drift is coming from (which features changed, when, and why), propose a remediation plan (retrain vs. recalibrate vs. rebuild), and justify the tradeoff. Bonus if you can quantify the business impact of fixing it. We care about the rigor of the analysis more than landing on the "right" answer.`,
    techStack: ["Python", "Pandas", "scikit-learn", "PostgreSQL", "Jupyter"],
    archetypeSlug: "ml_engineer",
    targetLevel: "senior",
    coworkers: [
      {
        name: "Yuki Tanaka",
        role: "Director of Data Science",
        personaStyle:
          "High-context, thinks in business outcomes first. Will push back if the candidate jumps to retraining without first understanding the drift.",
        knowledge: [
          {
            topic: "Drift signal",
            triggerKeywords: ["drift", "feature", "change", "shift"],
            response:
              "The big shift we noticed: the `pct_purchases_promotional` feature jumped from a mean of 18% to 41% in March. That's when we relaxed our promo-discount cap, so it's a deliberate business change, not a data bug.",
            isCritical: true,
          },
          {
            topic: "Business priorities",
            triggerKeywords: ["business", "priority", "stakeholder", "marketing"],
            response:
              "Marketing's biggest complaint is the high-LTV decile being mis-ranked. Whatever you propose, that decile's accuracy needs to improve. We'd rather fix that one decile correctly than improve overall MAPE by 5%.",
            isCritical: true,
          },
        ],
      },
      {
        name: "Sarah Okonkwo",
        role: "Senior ML Engineer",
        personaStyle: "Pragmatic, deeply familiar with the production pipeline. Will help with infra questions.",
        knowledge: [
          {
            topic: "Retraining cadence",
            triggerKeywords: ["retrain", "cadence", "pipeline"],
            response:
              "We retrain monthly via Airflow, but the trigger has been disabled since January because of a data-quality issue with the customer-event log. There's a TODO in `dags/ltv_retrain.py`.",
            isCritical: true,
          },
          {
            topic: "Feature store",
            triggerKeywords: ["feature", "store", "feast"],
            response:
              "Features come from Feast. The drift logs are in the `feast-monitoring` Postgres schema. Filename `monitoring_features.csv` in your data should have the last 6 months of feature stats.",
            isCritical: false,
          },
        ],
      },
      {
        name: "Daniel Kim",
        role: "Marketing Director",
        personaStyle: "Non-technical stakeholder. Cares about results, not methodology. Will ask 'what does this mean for me?' a lot.",
        knowledge: [
          {
            topic: "Business impact",
            triggerKeywords: ["impact", "revenue", "business", "campaign"],
            response:
              "Each 1% MAPE improvement on the high-LTV decile is worth roughly $400k/year in better-targeted retention spend. We're currently overspending on the wrong cohort by my estimate ~$1.2M annualized.",
            isCritical: true,
          },
        ],
      },
    ],
  },
};

async function main() {
  const presetName = process.argv[2];
  if (!presetName || !presets[presetName]) {
    console.error(`Usage: tsx scripts/create-test-scenario.ts <preset>`);
    console.error(`Presets: ${Object.keys(presets).join(", ")}`);
    process.exit(1);
  }

  const preset = presets[presetName];

  const archetype = await db.archetype.findUnique({
    where: { slug: preset.archetypeSlug },
  });
  if (!archetype) {
    console.error(`Archetype slug "${preset.archetypeSlug}" not found`);
    process.exit(1);
  }

  // Reuse the test recruiter user.
  const recruiter = await db.user.findFirst({
    where: { role: "RECRUITER", email: { contains: "test" } },
  });
  if (!recruiter) {
    console.error("No test recruiter user found");
    process.exit(1);
  }

  const scenario = await db.scenario.create({
    data: {
      name: preset.name,
      companyName: preset.companyName,
      companyDescription: preset.companyDescription,
      taskDescription: preset.taskDescription,
      techStack: preset.techStack,
      archetypeId: archetype.id,
      targetLevel: preset.targetLevel,
      createdById: recruiter.id,
      pipelineVersion: "v2",
      isPublished: false,
      coworkers: {
        create: preset.coworkers.map((c) => ({
          name: c.name,
          role: c.role,
          personaStyle: c.personaStyle,
          knowledge: c.knowledge,
        })),
      },
      simulationCreationLogs: {
        create: {
          status: "COMPLETED",
          userId: recruiter.id,
          roleTitle: preset.name,
          companyName: preset.companyName,
          techStack: preset.techStack,
          seniorityLevel: preset.targetLevel,
          archetypeId: archetype.id,
          source: "test-script",
        },
      },
    },
    select: { id: true, name: true },
  });

  console.log(`Created: ${scenario.id}  (${scenario.name})`);
  console.log(`Now run: npx tsx scripts/trigger-v2-pipeline.ts ${scenario.id}`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
