/**
 * Seed Challenge Scenarios
 *
 * Creates one pre-built "challenge" scenario per role archetype for the /candidates page.
 * Uses the existing generation pipeline (task → coworkers → resources) via Gemini.
 *
 * Idempotent: skips archetypes that already have a challenge scenario.
 *
 * Run: npx tsx scripts/seed-challenges.ts
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { generateCodingTask } from "../src/lib/scenarios/task-generator";
import { generateCoworkers } from "../src/lib/scenarios/coworker-generator";
import { generateResources } from "../src/lib/scenarios/resource-generator";

const prisma = new PrismaClient();

// --- Per-archetype configuration ---

interface ChallengeConfig {
  roleName: string;
  seniorityLevel: "junior" | "mid" | "senior" | "staff" | "principal";
  techStack: string[];
  keyResponsibilities: string[];
  domainContext: string;
  companyName: string;
  companyDescription: string;
  challengeTagline?: string;
}

const CHALLENGE_CONFIGS: Record<string, ChallengeConfig> = {
  // --- Software Engineering ---
  frontend_engineer: {
    roleName: "Frontend Engineer",
    seniorityLevel: "mid",
    techStack: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
    challengeTagline: "Optimize a sluggish Kanban board struggling with 200+ tasks",
    keyResponsibilities: [
      "Build responsive, accessible UIs",
      "Optimize web performance and Core Web Vitals",
      "Implement and maintain design system components",
    ],
    domainContext:
      "A growing B2B SaaS company building a collaborative project management platform used by 5,000+ teams",
    companyName: "Planwise",
    companyDescription:
      "Planwise is a modern project management platform that helps distributed teams plan, track, and ship software. Built with React and Next.js, serving 5,000+ teams across 40 countries.",
  },
  backend_engineer: {
    roleName: "Backend Engineer",
    seniorityLevel: "mid",
    techStack: ["Node.js", "TypeScript", "PostgreSQL", "Redis", "REST APIs"],
    keyResponsibilities: [
      "Design and implement scalable API services",
      "Manage database schemas and optimize queries",
      "Build reliable data pipelines and background jobs",
    ],
    domainContext:
      "A Series A fintech startup building a real-time payments platform processing $2M+ daily",
    companyName: "PayStream",
    companyDescription:
      "PayStream is a fintech startup building instant B2B payment infrastructure. Our Node.js backend processes thousands of transactions per minute with sub-second settlement times.",
    challengeTagline: "Fix a failing nightly payment reconciliation job at scale",
  },
  fullstack_engineer: {
    roleName: "Full-Stack Engineer",
    seniorityLevel: "mid",
    techStack: ["React", "Node.js", "TypeScript", "PostgreSQL", "GraphQL"],
    keyResponsibilities: [
      "Own features end-to-end from database to UI",
      "Build and maintain APIs consumed by web and mobile clients",
      "Collaborate with design and product on user-facing features",
    ],
    domainContext:
      "A mid-stage healthtech company building a patient engagement platform used by 200+ clinics",
    companyName: "MedConnect",
    companyDescription:
      "MedConnect is a healthtech platform connecting patients with their care teams. Our full-stack TypeScript application serves 200+ clinics with real-time messaging, scheduling, and health record integration.",
    challengeTagline: "Fix a double-booking race condition in a clinic scheduling widget",
  },
  tech_lead: {
    roleName: "Tech Lead",
    seniorityLevel: "senior",
    techStack: ["TypeScript", "React", "Node.js", "AWS", "Terraform"],
    keyResponsibilities: [
      "Lead technical architecture decisions and code reviews",
      "Mentor junior engineers and set team coding standards",
      "Drive technical roadmap and reduce tech debt",
    ],
    domainContext:
      "A Series B e-commerce platform scaling from 100K to 1M users, with a team of 8 engineers",
    companyName: "CartFlow",
    companyDescription:
      "CartFlow is a headless e-commerce platform powering 3,000+ online stores. Engineering team of 25, scaling infrastructure on AWS to handle 10x traffic growth over the next year.",
    challengeTagline: "Design a checkout system that handles 1M users without deadlocks",
  },
  devops_sre: {
    roleName: "DevOps / SRE Engineer",
    seniorityLevel: "mid",
    techStack: [
      "Kubernetes",
      "Terraform",
      "AWS",
      "Docker",
      "GitHub Actions",
      "Prometheus",
    ],
    keyResponsibilities: [
      "Maintain CI/CD pipelines and deployment automation",
      "Monitor system reliability and incident response",
      "Manage cloud infrastructure and cost optimization",
    ],
    domainContext:
      "A data infrastructure company running 50+ microservices on Kubernetes with 99.95% SLA",
    companyName: "DataForge",
    companyDescription:
      "DataForge provides real-time data pipeline infrastructure for enterprise clients. We run 50+ microservices on Kubernetes across 3 AWS regions, processing 10TB of data daily with a 99.95% uptime SLA.",
    challengeTagline: "Cut a 20-minute CI/CD pipeline down to size for a growing microservice",
  },

  // --- Product Management ---
  growth_pm: {
    roleName: "Growth Product Manager",
    seniorityLevel: "mid",
    techStack: ["Amplitude", "SQL", "A/B Testing", "Figma"],
    keyResponsibilities: [
      "Drive user acquisition and activation metrics",
      "Design and analyze growth experiments",
      "Optimize onboarding and conversion funnels",
    ],
    domainContext:
      "A consumer fintech app with 500K users looking to 3x activation rates in Q2",
    companyName: "WalletBuddy",
    companyDescription:
      "WalletBuddy is a personal finance app helping 500K users manage budgets and savings goals. The growth team is focused on improving activation from signup to first budget created.",
    challengeTagline: "3x activation rates by fixing a 60% drop-off at bank linking",
  },
  platform_pm: {
    roleName: "Platform Product Manager",
    seniorityLevel: "mid",
    techStack: ["APIs", "SQL", "Jira", "Datadog"],
    keyResponsibilities: [
      "Define platform API strategy and developer experience",
      "Prioritize internal tooling and infrastructure investments",
      "Coordinate cross-team platform dependencies",
    ],
    domainContext:
      "A mid-stage marketplace platform opening its APIs to third-party developers",
    companyName: "VendorHub",
    companyDescription:
      "VendorHub is a B2B marketplace connecting vendors with enterprise procurement teams. We're launching a public API program to let third-party integrators build on our platform.",
    challengeTagline: "Design a self-service API onboarding flow for external partners",
  },
  core_pm: {
    roleName: "Core Product Manager",
    seniorityLevel: "mid",
    techStack: ["SQL", "Figma", "Amplitude", "Notion"],
    keyResponsibilities: [
      "Own core product features and user experience",
      "Translate user research into product requirements",
      "Manage product roadmap and stakeholder alignment",
    ],
    domainContext:
      "An enterprise collaboration tool with 50K DAU launching a major workflow automation feature",
    companyName: "TeamSync",
    companyDescription:
      "TeamSync is an enterprise collaboration platform with 50K daily active users. The product team is building a workflow automation engine to help teams automate repetitive processes.",
    challengeTagline: "Diagnose and fix a 65% workflow drop-off in your automation tool",
  },

  // --- Data Science ---
  analytics_engineer: {
    roleName: "Analytics Engineer",
    seniorityLevel: "mid",
    techStack: ["SQL", "dbt", "Python", "Snowflake", "Looker"],
    keyResponsibilities: [
      "Build and maintain data models for business reporting",
      "Design data pipelines from raw sources to analytics-ready tables",
      "Partner with stakeholders to define KPIs and metrics",
    ],
    domainContext:
      "A Series B logistics company centralizing data from 12 source systems into a modern data warehouse",
    companyName: "RouteOptim",
    companyDescription:
      "RouteOptim is a logistics optimization platform serving 800+ delivery fleets. The data team is building a unified analytics layer to power real-time fleet performance dashboards.",
    challengeTagline: "Unify messy shipment data from two conflicting systems",
  },
  data_analyst: {
    roleName: "Data Analyst",
    seniorityLevel: "mid",
    techStack: ["SQL", "Python", "Tableau", "Excel", "Jupyter"],
    keyResponsibilities: [
      "Analyze business data to uncover trends and insights",
      "Build dashboards and reports for stakeholders",
      "Support decision-making with data-driven recommendations",
    ],
    domainContext:
      "An ed-tech company analyzing student engagement and course completion patterns across 100K learners",
    companyName: "LearnPath",
    companyDescription:
      "LearnPath is an online learning platform with 100K active students. The analytics team supports product, marketing, and content teams with insights on learner behavior and course effectiveness.",
    challengeTagline: "Investigate why 25% of students drop off after Module 3",
  },
  ml_engineer: {
    roleName: "ML Engineer",
    seniorityLevel: "mid",
    techStack: ["Python", "PyTorch", "FastAPI", "Docker", "MLflow", "PostgreSQL"],
    keyResponsibilities: [
      "Train and deploy machine learning models to production",
      "Build ML pipelines for feature engineering and model serving",
      "Query feature stores and model metrics databases for analysis",
    ],
    domainContext:
      "A content platform building a recommendation engine to personalize feeds for 2M users. The team uses a PostgreSQL feature store and tracks model metrics in a database.",
    companyName: "FeedCraft",
    companyDescription:
      "FeedCraft is a content discovery platform serving personalized feeds to 2M users. The ML team uses a PostgreSQL feature store and MLflow tracking database to build recommendation models.",
    challengeTagline: "Add a real-time trending signal to feed recommendations",
  },

  // --- Program Management ---
  technical_program_manager: {
    roleName: "Technical Program Manager",
    seniorityLevel: "mid",
    techStack: ["Jira", "Confluence", "SQL", "Google Sheets"],
    keyResponsibilities: [
      "Drive cross-team technical programs to delivery",
      "Identify and mitigate program risks",
      "Coordinate engineering dependencies across teams",
    ],
    domainContext:
      "A platform company migrating from monolith to microservices with 6 engineering teams involved",
    companyName: "CloudShift",
    companyDescription:
      "CloudShift is an enterprise SaaS platform in the middle of a major architecture migration from monolith to microservices. Six engineering teams are involved, targeting completion in Q3.",
    challengeTagline: "Unblock an identity service migration with competing team dependencies",
  },
  business_program_manager: {
    roleName: "Business Program Manager",
    seniorityLevel: "mid",
    techStack: ["Google Sheets", "Jira", "Salesforce", "Notion"],
    keyResponsibilities: [
      "Manage cross-functional business programs",
      "Track KPIs and report program health to leadership",
      "Coordinate between engineering, sales, and operations",
    ],
    domainContext:
      "A B2B company launching a new market expansion program across 3 new geographies simultaneously",
    companyName: "GlobalReach",
    companyDescription:
      "GlobalReach is a B2B compliance platform expanding into EMEA, APAC, and LATAM simultaneously. The program management team coordinates across engineering, legal, sales, and local operations.",
    challengeTagline: "Coordinate a simultaneous product launch across three countries",
  },

  // --- Sales ---
  account_executive: {
    roleName: "Account Executive",
    seniorityLevel: "mid",
    techStack: ["Salesforce", "Gong", "LinkedIn Sales Navigator", "Outreach"],
    keyResponsibilities: [
      "Manage full-cycle enterprise deals ($50K-500K ACV)",
      "Build relationships with C-level stakeholders",
      "Navigate complex multi-stakeholder buying processes",
    ],
    domainContext:
      "A cybersecurity startup selling to mid-market companies with a 3-month average sales cycle",
    companyName: "ShieldPoint",
    companyDescription:
      "ShieldPoint provides cloud security posture management for mid-market companies. Average deal size is $120K ACV with a 90-day sales cycle involving CTO, CISO, and procurement.",
    challengeTagline: "Rescue a stalled $150k deal before the quarter closes",
  },
  sales_development_rep: {
    roleName: "Sales Development Rep",
    seniorityLevel: "junior",
    techStack: ["Outreach", "Salesforce", "LinkedIn", "ZoomInfo"],
    keyResponsibilities: [
      "Generate qualified pipeline through outbound prospecting",
      "Research and personalize outreach to target accounts",
      "Book discovery calls for Account Executives",
    ],
    domainContext:
      "A developer tools company targeting engineering leaders at companies with 50-500 engineers",
    companyName: "DevToolsHQ",
    companyDescription:
      "DevToolsHQ builds CI/CD and testing infrastructure for engineering teams. The SDR team targets VP Engineering and CTO personas at mid-market tech companies.",
    challengeTagline: "Book discovery calls from a fresh list of Series B VP Engs",
  },
  solutions_engineer: {
    roleName: "Solutions Engineer",
    seniorityLevel: "mid",
    techStack: ["APIs", "Python", "SQL", "Postman", "AWS"],
    keyResponsibilities: [
      "Lead technical evaluations and proof-of-concept demos",
      "Design integration architectures for enterprise clients",
      "Bridge the gap between sales and engineering",
    ],
    domainContext:
      "A data integration platform selling to enterprise clients needing complex ETL workflows",
    companyName: "PipelineIQ",
    companyDescription:
      "PipelineIQ is an enterprise data integration platform. Solutions engineers lead technical evaluations, design custom integrations, and support complex proof-of-concept deployments.",
    challengeTagline: "Integrate a legacy ERP with messy nested JSON into a live PoC",
  },

  // --- Customer Success ---
  onboarding_specialist: {
    roleName: "Onboarding Specialist",
    seniorityLevel: "junior",
    techStack: ["Gainsight", "Loom", "Zendesk", "Notion"],
    keyResponsibilities: [
      "Guide new customers through implementation and setup",
      "Train users on product features and best practices",
      "Ensure time-to-value within first 30 days",
    ],
    domainContext:
      "A project management SaaS onboarding 50+ new teams per month with a 30-day activation target",
    companyName: "TaskBoard",
    companyDescription:
      "TaskBoard is a project management tool for small teams. The onboarding team guides 50+ new teams per month through setup, data migration, and workflow configuration.",
    challengeTagline: "Build a 30-day onboarding plan for a 20-person agency team",
  },
  customer_success_manager: {
    roleName: "Customer Success Manager",
    seniorityLevel: "mid",
    techStack: ["Gainsight", "Salesforce", "Looker", "Slack"],
    keyResponsibilities: [
      "Manage a portfolio of 30-50 enterprise accounts",
      "Drive adoption, expansion, and renewal outcomes",
      "Identify and mitigate churn risk proactively",
    ],
    domainContext:
      "A workforce analytics platform with $15M ARR and a 92% gross retention rate targeting 95%",
    companyName: "PeopleMetrics",
    companyDescription:
      "PeopleMetrics is a workforce analytics platform with $15M ARR serving 200+ enterprise clients. The CS team manages renewals and expansion across a book of business averaging $75K per account.",
    challengeTagline: "Save a top account showing a 30% drop in engagement before renewal",
  },
  renewals_manager: {
    roleName: "Renewals Manager",
    seniorityLevel: "mid",
    techStack: ["Salesforce", "Gainsight", "Excel", "DocuSign"],
    keyResponsibilities: [
      "Own the end-to-end renewal process for assigned accounts",
      "Negotiate contract terms and pricing",
      "Forecast renewal pipeline and flag at-risk accounts",
    ],
    domainContext:
      "A SaaS company with 500+ accounts up for renewal this quarter and a $5M renewal target",
    companyName: "CloudVault",
    companyDescription:
      "CloudVault provides enterprise backup and disaster recovery. The renewals team manages 500+ accounts with an average contract value of $40K, targeting 96% gross renewal rate.",
    challengeTagline: "Navigate a $250k renewal with declining usage and stakeholder drama",
  },
};

// --- Main script ---

async function main() {
  console.log("🚀 Seeding challenge scenarios...\n");

  // 1. Fetch all archetypes from DB
  const archetypes = await prisma.archetype.findMany({
    include: { roleFamily: true },
  });

  console.log(`Found ${archetypes.length} archetypes in database.\n`);

  if (archetypes.length === 0) {
    console.error(
      "❌ No archetypes found. Run seed-rubrics first: npx tsx prisma/seed-rubrics.ts"
    );
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const archetype of archetypes) {
    const config = CHALLENGE_CONFIGS[archetype.slug];

    if (!config) {
      console.log(`⚠️  No config for archetype "${archetype.slug}", skipping`);
      skipped++;
      continue;
    }

    // Idempotency check
    const existing = await prisma.scenario.findFirst({
      where: { archetypeId: archetype.id, isChallenge: true },
    });

    if (existing) {
      console.log(
        `✅ Challenge for "${archetype.name}" already exists (${existing.id}), skipping`
      );
      skipped++;
      continue;
    }

    console.log(
      `\n🔨 Generating challenge for: ${archetype.name} (${archetype.roleFamily.name})`
    );
    console.log(`   Company: ${config.companyName}`);

    try {
      // Step 1: Generate task
      console.log("   📝 Generating task...");
      const taskResult = await generateCodingTask({
        roleName: config.roleName,
        seniorityLevel: config.seniorityLevel,
        techStack: config.techStack,
        keyResponsibilities: config.keyResponsibilities,
        domainContext: config.domainContext,
        companyName: config.companyName,
        language: "en",
      });
      const task = taskResult.taskOptions[0];
      console.log(`   ✅ Task: ${task.summary}`);

      // Step 2: Generate coworkers
      console.log("   👥 Generating coworkers...");
      const coworkerResult = await generateCoworkers({
        roleName: config.roleName,
        seniorityLevel: config.seniorityLevel,
        companyName: config.companyName,
        companyDescription: config.companyDescription,
        techStack: config.techStack,
        taskDescription: task.description,
        keyResponsibilities: config.keyResponsibilities,
      });
      console.log(
        `   ✅ Coworkers: ${coworkerResult.coworkers.map((c) => c.name).join(", ")}`
      );

      // Step 3: Generate resources
      console.log("   📦 Generating resources...");
      const resourceResult = await generateResources({
        companyName: config.companyName,
        taskDescription: task.description,
        techStack: config.techStack,
        roleName: config.roleName,
        seniorityLevel: config.seniorityLevel,
        language: "en",
      });
      console.log(
        `   ✅ Resources: ${resourceResult.resources.map((r) => r.label).join(", ")}`
      );

      // Step 4: Create scenario in DB
      console.log("   💾 Saving to database...");
      const scenario = await prisma.scenario.create({
        data: {
          name: `${config.roleName} Challenge`,
          companyName: config.companyName,
          companyDescription: config.companyDescription,
          taskDescription: task.description,
          techStack: config.techStack,
          targetLevel: config.seniorityLevel,
          archetypeId: archetype.id,
          resources:
            resourceResult.resources as unknown as Prisma.InputJsonValue,
          isPublished: true,
          isChallenge: true,
          challengeTagline: config.challengeTagline ?? null,
          createdById: null,
        },
      });

      // Step 5: Create coworkers
      for (const cw of coworkerResult.coworkers) {
        await prisma.coworker.create({
          data: {
            scenarioId: scenario.id,
            name: cw.name,
            role: cw.role,
            personaStyle: cw.personaStyle,
            personality: (cw.personality as unknown as Prisma.InputJsonValue) ?? null,
            knowledge: cw.knowledge as unknown as Prisma.InputJsonValue,
            voiceName: null,
          },
        });
      }

      console.log(`   ✅ Created scenario: ${scenario.id}`);
      created++;
    } catch (err) {
      console.error(`   ❌ Failed for "${archetype.name}":`, err);
      failed++;
    }

    // Rate limit delay between generations
    if (created + failed < archetypes.length) {
      console.log("   ⏳ Waiting 3s before next archetype...");
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Created: ${created}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log("=".repeat(50));
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
