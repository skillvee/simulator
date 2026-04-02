/**
 * Database Seed Script
 *
 * Seeds the database with example scenarios and coworkers for development/testing.
 * Run with: npx tsx prisma/seed.ts
 */

import {
  PrismaClient,
  Prisma,
  VideoAssessmentStatus,
} from "@prisma/client";
import { hash } from "bcryptjs";
import { EXAMPLE_COWORKERS } from "../src/lib/ai/coworker-persona";

const prisma = new PrismaClient();

// Test user credentials - used by AI agents for E2E testing
const TEST_USERS = {
  admin: {
    email: "admin@test.com",
    password: "testpassword123",
    name: "Test Admin",
    role: "ADMIN" as const,
  },
  user: {
    email: "user@test.com",
    password: "testpassword123",
    name: "Test User",
    role: "USER" as const,
  },
  // Recruiter-focused flow test users (RF-001)
  recruiter: {
    email: "recruiter@test.com",
    password: "testpassword123",
    name: "Test Recruiter",
    role: "RECRUITER" as const,
  },
  candidate: {
    email: "candidate@test.com",
    password: "testpassword123",
    name: "Test Candidate",
    role: "USER" as const,
  },
  // Additional candidates for recruiter dashboard testing
  candidateAlice: {
    email: "alice.johnson@test.com",
    password: "testpassword123",
    name: "Alice Johnson",
    role: "USER" as const,
  },
  candidateBob: {
    email: "bob.martinez@test.com",
    password: "testpassword123",
    name: "Bob Martinez",
    role: "USER" as const,
  },
  candidateCarla: {
    email: "carla.nguyen@test.com",
    password: "testpassword123",
    name: "Carla Nguyen",
    role: "USER" as const,
  },
  candidateSarah: {
    email: "exceptional@test.com",
    password: "testpassword123",
    name: "Sarah Chen",
    role: "USER" as const,
  },
  candidateMarcus: {
    email: "proficient@test.com",
    password: "testpassword123",
    name: "Marcus Johnson",
    role: "USER" as const,
  },
  candidateAlex: {
    email: "developing@test.com",
    password: "testpassword123",
    name: "Alex Rivera",
    role: "USER" as const,
  },
  candidateMatias: {
    email: "mati@hoyl.com",
    password: "testpassword123",
    name: "Matias Hoyl",
    role: "USER" as const,
  },
  candidatePepito: {
    email: "pepito@perez.cl",
    password: "testpassword123",
    name: "Pepito Perez",
    role: "USER" as const,
  },
  // Additional candidates for 20+ candidate simulation
  candidateEmma: {
    email: "emma.watson@test.com",
    password: "testpassword123",
    name: "Emma Watson",
    role: "USER" as const,
  },
  candidateLiam: {
    email: "liam.chen@test.com",
    password: "testpassword123",
    name: "Liam Chen",
    role: "USER" as const,
  },
  candidateOlivia: {
    email: "olivia.patel@test.com",
    password: "testpassword123",
    name: "Olivia Patel",
    role: "USER" as const,
  },
  candidateNoah: {
    email: "noah.kim@test.com",
    password: "testpassword123",
    name: "Noah Kim",
    role: "USER" as const,
  },
  candidateAva: {
    email: "ava.garcia@test.com",
    password: "testpassword123",
    name: "Ava Garcia",
    role: "USER" as const,
  },
  candidateJames: {
    email: "james.taylor@test.com",
    password: "testpassword123",
    name: "James Taylor",
    role: "USER" as const,
  },
  candidateSophia: {
    email: "sophia.anderson@test.com",
    password: "testpassword123",
    name: "Sophia Anderson",
    role: "USER" as const,
  },
  candidateEthan: {
    email: "ethan.wright@test.com",
    password: "testpassword123",
    name: "Ethan Wright",
    role: "USER" as const,
  },
  candidateIsabella: {
    email: "isabella.lee@test.com",
    password: "testpassword123",
    name: "Isabella Lee",
    role: "USER" as const,
  },
  candidateMason: {
    email: "mason.brown@test.com",
    password: "testpassword123",
    name: "Mason Brown",
    role: "USER" as const,
  },
  candidateMia: {
    email: "mia.jones@test.com",
    password: "testpassword123",
    name: "Mia Jones",
    role: "USER" as const,
  },
  candidateLucas: {
    email: "lucas.martinez@test.com",
    password: "testpassword123",
    name: "Lucas Martinez",
    role: "USER" as const,
  },
  candidateCharlotte: {
    email: "charlotte.davis@test.com",
    password: "testpassword123",
    name: "Charlotte Davis",
    role: "USER" as const,
  },
  candidateHenry: {
    email: "henry.wilson@test.com",
    password: "testpassword123",
    name: "Henry Wilson",
    role: "USER" as const,
  },
  candidateAmelia: {
    email: "amelia.moore@test.com",
    password: "testpassword123",
    name: "Amelia Moore",
    role: "USER" as const,
  },
};

// Fixed test assessment IDs - used by AI agents for visual testing
const TEST_ASSESSMENT_IDS = {
  chat: "test-assessment-chat", // Status: WORKING - for chat/sidebar testing
  // Recruiter-focused flow test assessments (RF-001)
  welcome: "test-assessment-welcome", // Status: WELCOME - for welcome page testing
  workingRecruiter: "test-assessment-working-recruiter", // Status: WORKING - for recruiter flow testing
  // Defense call testing (RF-017)
  defense: "test-assessment-defense", // Status: WORKING with prUrl set - for defense call testing
  // Results page testing (RF-018)
  completed: "test-assessment-completed", // Status: COMPLETED - for results page testing
  // Additional candidate assessments for recruiter dashboard
  aliceCompleted: "test-assessment-alice-completed",
  bobCompleted: "test-assessment-bob-completed",
  carlaCompleted: "test-assessment-carla-completed",
  sarahCompleted: "test-assessment-sarah-completed",
  marcusCompleted: "test-assessment-marcus-completed",
  alexCompleted: "test-assessment-alex-completed",
  matiasCompleted: "test-assessment-matias-completed",
  pepitoWorking: "test-assessment-pepito-working",
  // Backend scenario (Stripe) - 20+ candidates
  sarahBackend: "test-assessment-sarah-backend",
  aliceBackend: "test-assessment-alice-backend",
  bobBackend: "test-assessment-bob-backend",
  marcusBackendWorking: "test-assessment-marcus-backend-working",
  candidateBackendWelcome: "test-assessment-candidate-backend-welcome",
  emmaBackend: "test-assessment-emma-backend",
  liamBackend: "test-assessment-liam-backend",
  oliviaBackend: "test-assessment-olivia-backend",
  noahBackend: "test-assessment-noah-backend",
  avaBackend: "test-assessment-ava-backend",
  jamesBackend: "test-assessment-james-backend",
  sophiaBackend: "test-assessment-sophia-backend",
  ethanBackend: "test-assessment-ethan-backend",
  isabellaBackend: "test-assessment-isabella-backend",
  masonBackend: "test-assessment-mason-backend",
  miaBackend: "test-assessment-mia-backend",
  lucasBackend: "test-assessment-lucas-backend",
  charlotteBackend: "test-assessment-charlotte-backend",
  henryBackendWorking: "test-assessment-henry-backend-working",
  ameliaBackendWelcome: "test-assessment-amelia-backend-welcome",
  carlaBackend: "test-assessment-carla-backend",
  alexBackend: "test-assessment-alex-backend",
  matiasBackendWelcome: "test-assessment-matias-backend-welcome",
  pepitoBackendWorking: "test-assessment-pepito-backend-working",
  // Mobile scenario (Notion)
  carlaMobile: "test-assessment-carla-mobile",
  alexMobile: "test-assessment-alex-mobile",
  pepitoMobileWorking: "test-assessment-pepito-mobile-working",
};

// Fixed test scenario ID for recruiter-focused flow (RF-001)
const TEST_SCENARIO_IDS = {
  recruiter: "test-scenario-recruiter",
  backend: "test-scenario-backend",
  mobile: "test-scenario-mobile",
  devops: "test-scenario-devops",
};

async function main() {
  console.log("🌱 Starting database seed...\n");

  // Create test users for E2E testing
  console.log("👤 Creating test users...");
  const hashedPassword = await hash(TEST_USERS.admin.password, 12);

  for (const [key, userData] of Object.entries(TEST_USERS)) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        role: userData.role,
        password: hashedPassword,
        deletedAt: null, // Ensure not soft-deleted
      },
      create: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        role: userData.role,
        emailVerified: new Date(),
      },
    });
    console.log(`  ✅ ${key}: ${user.email} (${user.role})`);
  }
  console.log("");

  // Create a default scenario for development
  const defaultScenario = await prisma.scenario.upsert({
    where: { id: "default-scenario" },
    update: {
      name: "Full-Stack Feature Implementation",
      companyName: "TechFlow Inc.",
      companyDescription: `TechFlow Inc. is a fast-growing B2B SaaS company building collaborative project management tools.

Founded in 2020, we serve over 5,000 companies with our flagship product "FlowBoard" - a real-time project tracking platform. Our engineering team values clean code, thorough testing, and collaborative problem-solving.

Tech Stack: TypeScript, React, Node.js, PostgreSQL, Redis, Docker, AWS.`,
      taskDescription: `Implement a real-time notification system for the FlowBoard application.

Requirements:
- Users should receive notifications when assigned to a new task
- Notifications should appear in real-time without page refresh
- Users should be able to mark notifications as read
- Implement both browser notifications (if permitted) and in-app notification center
- Notifications should be persisted and retrievable via API

Acceptance Criteria:
1. API endpoint for creating notifications
2. API endpoint for fetching user notifications (paginated)
3. API endpoint for marking notifications as read
4. WebSocket integration for real-time delivery
5. In-app notification bell with unread count
6. Unit tests for all API endpoints`,
      repoUrl: "https://github.com/skillvee/flowboard-task",
      techStack: [
        "TypeScript",
        "React",
        "Node.js",
        "PostgreSQL",
        "Redis",
        "WebSocket",
      ],
      isPublished: true,
    },
    create: {
      id: "default-scenario",
      name: "Full-Stack Feature Implementation",
      companyName: "TechFlow Inc.",
      companyDescription: `TechFlow Inc. is a fast-growing B2B SaaS company building collaborative project management tools.

Founded in 2020, we serve over 5,000 companies with our flagship product "FlowBoard" - a real-time project tracking platform. Our engineering team values clean code, thorough testing, and collaborative problem-solving.

Tech Stack: TypeScript, React, Node.js, PostgreSQL, Redis, Docker, AWS.`,
      taskDescription: `Implement a real-time notification system for the FlowBoard application.

Requirements:
- Users should receive notifications when assigned to a new task
- Notifications should appear in real-time without page refresh
- Users should be able to mark notifications as read
- Implement both browser notifications (if permitted) and in-app notification center
- Notifications should be persisted and retrievable via API

Acceptance Criteria:
1. API endpoint for creating notifications
2. API endpoint for fetching user notifications (paginated)
3. API endpoint for marking notifications as read
4. WebSocket integration for real-time delivery
5. In-app notification bell with unread count
6. Unit tests for all API endpoints`,
      repoUrl: "https://github.com/skillvee/flowboard-task",
      techStack: [
        "TypeScript",
        "React",
        "Node.js",
        "PostgreSQL",
        "Redis",
        "WebSocket",
      ],
      isPublished: true,
    },
  });

  console.log(`✅ Created/Updated scenario: ${defaultScenario.name}`);

  // Delete existing coworkers for this scenario to avoid duplicates
  await prisma.coworker.deleteMany({
    where: { scenarioId: defaultScenario.id },
  });

  console.log("🗑️  Cleared existing coworkers for scenario");

  // Create coworkers from EXAMPLE_COWORKERS
  for (const coworker of EXAMPLE_COWORKERS) {
    const created = await prisma.coworker.create({
      data: {
        scenarioId: defaultScenario.id,
        name: coworker.name,
        role: coworker.role,
        personaStyle: coworker.personaStyle,
        knowledge: coworker.knowledge as unknown as Prisma.InputJsonValue,
        avatarUrl: coworker.avatarUrl ?? null,
        voiceName: coworker.voiceName ?? null,
      },
    });
    console.log(`  👤 Created coworker: ${created.name} (${created.role}) - Voice: ${created.voiceName || 'default'}`);
  }

  console.log(`\n✅ Seeded ${EXAMPLE_COWORKERS.length} coworkers for scenario`);

  // Create a test assessment with parsed profile for visual testing
  const testUser = await prisma.user.findUnique({
    where: { email: TEST_USERS.user.email },
  });

  if (testUser) {
    // Create test assessment with fixed ID for visual testing
    // Uses WORKING status so chat/sidebar pages are accessible
    await prisma.assessment.upsert({
      where: { id: TEST_ASSESSMENT_IDS.chat },
      update: {
        status: "WORKING",
      },
      create: {
        id: TEST_ASSESSMENT_IDS.chat,
        userId: testUser.id,
        scenarioId: defaultScenario.id,
        status: "WORKING",
      },
    });
    console.log(
      `\n📋 Created/updated test assessment for chat page:`
    );
    console.log(
      `   ID: ${TEST_ASSESSMENT_IDS.chat}`
    );
    console.log(
      `   URL: /assessment/${TEST_ASSESSMENT_IDS.chat}/chat`
    );

    // Create VideoAssessment with dimension scores for candidate profile testing
    const existingVideoAssessment = await prisma.videoAssessment.findFirst({
      where: { candidateId: testUser.id },
    });

    const videoAssessmentId =
      existingVideoAssessment?.id || "test-video-assessment";

    const dimensionScores = [
      {
        dimension: "communication",
        score: 3,
        observableBehaviors:
          "Clear and professional communication throughout. Asked clarifying questions when needed.",
        trainableGap: false,
        timestamps: ["2:34", "5:12", "15:07"],
      },
      {
        dimension: "problem_decomposition_design",
        score: 4,
        observableBehaviors:
          "Excellent problem decomposition. Broke down complex tasks into manageable steps.",
        trainableGap: false,
        timestamps: ["10:45", "22:30"],
      },
      {
        dimension: "technical_execution",
        score: 3,
        observableBehaviors:
          "Strong technical foundation demonstrated in code implementation.",
        trainableGap: false,
        timestamps: ["8:15", "18:00", "25:40", "35:20"],
      },
      {
        dimension: "collaboration_coachability",
        score: 3,
        observableBehaviors:
          "Good teamwork, sought help when stuck. Could improve on proactive communication.",
        trainableGap: true,
        timestamps: ["12:00", "28:15"],
      },
      {
        dimension: "practical_maturity",
        score: 3,
        observableBehaviors:
          "Adapted well to changing requirements and new information.",
        trainableGap: false,
        timestamps: ["30:45"],
      },
      {
        dimension: "learning_velocity",
        score: 2,
        observableBehaviors:
          "Showed initiative but could take more ownership of decisions.",
        trainableGap: true,
        timestamps: [],
      },
      {
        dimension: "work_process",
        score: 3,
        observableBehaviors:
          "Proposed creative solutions to technical challenges.",
        trainableGap: false,
        timestamps: ["1:05:30", "1:15:00"],
      },
    ];

    if (existingVideoAssessment) {
      // Update existing video assessment
      await prisma.videoAssessment.update({
        where: { id: existingVideoAssessment.id },
        data: {
          status: VideoAssessmentStatus.COMPLETED,
          completedAt: new Date(),
          isSearchable: true,
        },
      });

      // Delete existing scores and recreate
      await prisma.dimensionScore.deleteMany({
        where: { assessmentId: existingVideoAssessment.id },
      });

      for (const score of dimensionScores) {
        await prisma.dimensionScore.create({
          data: {
            assessmentId: existingVideoAssessment.id,
            dimension: score.dimension,
            score: score.score,
            observableBehaviors: score.observableBehaviors,
            timestamps: score.timestamps,
            trainableGap: score.trainableGap,
          },
        });
      }

      // Delete existing summary and recreate
      await prisma.videoAssessmentSummary.deleteMany({
        where: { assessmentId: existingVideoAssessment.id },
      });

      await prisma.videoAssessmentSummary.create({
        data: {
          assessmentId: existingVideoAssessment.id,
          overallSummary:
            "Test User demonstrated strong technical skills and excellent problem-solving abilities throughout the simulation. They showed great time management and adaptability while maintaining professional communication. Areas for growth include proactive collaboration and taking more ownership in leadership situations.",
          rawAiResponse: {} as unknown as Prisma.InputJsonValue,
        },
      });

      console.log(
        `\n🎬 Updated video assessment with dimension scores for ${testUser.email}`
      );
    } else {
      // Create new video assessment
      const videoAssessment = await prisma.videoAssessment.create({
        data: {
          id: videoAssessmentId,
          candidateId: testUser.id,
          videoUrl: "https://example.com/test-video.mp4",
          status: VideoAssessmentStatus.COMPLETED,
          completedAt: new Date(),
          isSearchable: true,
        },
      });

      for (const score of dimensionScores) {
        await prisma.dimensionScore.create({
          data: {
            assessmentId: videoAssessment.id,
            dimension: score.dimension,
            score: score.score,
            observableBehaviors: score.observableBehaviors,
            timestamps: score.timestamps,
            trainableGap: score.trainableGap,
          },
        });
      }

      await prisma.videoAssessmentSummary.create({
        data: {
          assessmentId: videoAssessment.id,
          overallSummary:
            "Test User demonstrated strong technical skills and excellent problem-solving abilities throughout the simulation. They showed great time management and adaptability while maintaining professional communication. Areas for growth include proactive collaboration and taking more ownership in leadership situations.",
          rawAiResponse: {} as unknown as Prisma.InputJsonValue,
        },
      });

      console.log(
        `\n🎬 Created video assessment with dimension scores for ${testUser.email}`
      );
      console.log(`   Video Assessment ID: ${videoAssessment.id}`);
    }
  }

  // ============================================================================
  // RECRUITER-FOCUSED FLOW TEST DATA (RF-001)
  // ============================================================================

  console.log("\n🎯 Creating recruiter-focused flow test data...");

  // Get the test recruiter user for scenario ownership
  const testRecruiter = await prisma.user.findUnique({
    where: { email: TEST_USERS.recruiter.email },
  });

  // Create test scenario for recruiter flow
  const recruiterScenario = await prisma.scenario.upsert({
    where: { id: TEST_SCENARIO_IDS.recruiter },
    update: {
      name: "Frontend Developer Assessment",
      companyName: "Acme Technologies",
      companyDescription: `Acme Technologies is a technology company focused on building modern web applications.

We value clean code, collaboration, and continuous improvement. Our engineering team works with the latest frontend technologies.

Tech Stack: TypeScript, React, Next.js, Tailwind CSS.`,
      taskDescription: `Build a responsive dashboard component with the following requirements:

Requirements:
- Create a dashboard layout with a sidebar and main content area
- Implement a responsive navigation menu
- Add data visualization components
- Ensure accessibility standards are met

Acceptance Criteria:
1. Dashboard layout renders correctly on desktop and mobile
2. Navigation menu collapses on mobile devices
3. Data charts display sample data
4. All components are keyboard accessible`,
      repoUrl: "https://github.com/skillvee/frontend-task",
      techStack: ["TypeScript", "React", "Next.js", "Tailwind CSS"],
      isPublished: true,
      createdById: testRecruiter?.id ?? null,
    },
    create: {
      id: TEST_SCENARIO_IDS.recruiter,
      name: "Frontend Developer Assessment",
      companyName: "Acme Technologies",
      companyDescription: `Acme Technologies is a technology company focused on building modern web applications.

We value clean code, collaboration, and continuous improvement. Our engineering team works with the latest frontend technologies.

Tech Stack: TypeScript, React, Next.js, Tailwind CSS.`,
      taskDescription: `Build a responsive dashboard component with the following requirements:

Requirements:
- Create a dashboard layout with a sidebar and main content area
- Implement a responsive navigation menu
- Add data visualization components
- Ensure accessibility standards are met

Acceptance Criteria:
1. Dashboard layout renders correctly on desktop and mobile
2. Navigation menu collapses on mobile devices
3. Data charts display sample data
4. All components are keyboard accessible`,
      repoUrl: "https://github.com/skillvee/frontend-task",
      techStack: ["TypeScript", "React", "Next.js", "Tailwind CSS"],
      isPublished: true,
      createdById: testRecruiter?.id ?? null,
    },
  });

  console.log(`  ✅ Recruiter scenario: ${recruiterScenario.name}`);

  // Clean up stale assessments for this scenario (e.g. from E2E tests)
  // that aren't part of our known seed IDs
  const knownAssessmentIds = Object.values(TEST_ASSESSMENT_IDS);
  const staleAssessments = await prisma.assessment.findMany({
    where: {
      scenarioId: recruiterScenario.id,
      id: { notIn: knownAssessmentIds },
    },
    select: { id: true },
  });
  if (staleAssessments.length > 0) {
    // Delete associated video assessments and their scores/summaries first
    for (const stale of staleAssessments) {
      const va = await prisma.videoAssessment.findUnique({
        where: { assessmentId: stale.id },
      });
      if (va) {
        await prisma.dimensionScore.deleteMany({ where: { assessmentId: va.id } });
        await prisma.videoAssessmentSummary.deleteMany({ where: { assessmentId: va.id } });
        await prisma.videoAssessment.delete({ where: { id: va.id } });
      }
    }
    await prisma.assessment.deleteMany({
      where: {
        scenarioId: recruiterScenario.id,
        id: { notIn: knownAssessmentIds },
      },
    });
    console.log(`  🗑️  Cleaned up ${staleAssessments.length} stale assessment(s)`);
  }

  // Create a manager coworker for the recruiter scenario
  await prisma.coworker.deleteMany({
    where: { scenarioId: recruiterScenario.id },
  });

  const manager = await prisma.coworker.create({
    data: {
      scenarioId: recruiterScenario.id,
      name: "Sarah Chen",
      role: "Engineering Manager",
      personaStyle:
        "Friendly and supportive manager who focuses on clear communication and team collaboration. Provides constructive feedback and encourages questions.",
      knowledge: {
        teamSize: 8,
        projectContext: "Dashboard redesign project",
        techDecisions: ["Chose React for frontend", "Using Tailwind for styling"],
      } as unknown as Prisma.InputJsonValue,
      avatarUrl: null,
      voiceName: "Aoede",
    },
  });
  console.log(`  ✅ Manager coworker: ${manager.name} (${manager.role})`);

  // Get the test candidate user
  const testCandidate = await prisma.user.findUnique({
    where: { email: TEST_USERS.candidate.email },
  });

  if (testCandidate) {
    // Create test assessment for welcome/resume flow
    await prisma.assessment.upsert({
      where: { id: TEST_ASSESSMENT_IDS.welcome },
      update: {
        status: "WELCOME",
        scenarioId: recruiterScenario.id,
      },
      create: {
        id: TEST_ASSESSMENT_IDS.welcome,
        userId: testCandidate.id,
        scenarioId: recruiterScenario.id,
        status: "WELCOME",
      },
    });
    // Clean up stale conversations from previous test runs
    await prisma.conversation.deleteMany({
      where: { assessmentId: TEST_ASSESSMENT_IDS.welcome },
    });
    console.log(`  ✅ Welcome assessment: ${TEST_ASSESSMENT_IDS.welcome}`);
    console.log(`     Status: WELCOME (reset to clean slate)`);

    // Create test assessment in working state for recruiter flow
    await prisma.assessment.upsert({
      where: { id: TEST_ASSESSMENT_IDS.workingRecruiter },
      update: {
        status: "WORKING",
        scenarioId: recruiterScenario.id,
      },
      create: {
        id: TEST_ASSESSMENT_IDS.workingRecruiter,
        userId: testCandidate.id,
        scenarioId: recruiterScenario.id,
        status: "WORKING",
      },
    });
    console.log(`  ✅ Working assessment: ${TEST_ASSESSMENT_IDS.workingRecruiter}`);
    console.log(`     URL: /assessment/${TEST_ASSESSMENT_IDS.workingRecruiter}/chat`);

    // Create test assessment with prUrl set for defense call testing (RF-017)
    await prisma.assessment.upsert({
      where: { id: TEST_ASSESSMENT_IDS.defense },
      update: {
        status: "WORKING",
        scenarioId: recruiterScenario.id,
        prUrl: "https://github.com/skillvee/test-repo/pull/1",
      },
      create: {
        id: TEST_ASSESSMENT_IDS.defense,
        userId: testCandidate.id,
        scenarioId: recruiterScenario.id,
        status: "WORKING",
        prUrl: "https://github.com/skillvee/test-repo/pull/1",
      },
    });
    console.log(`  ✅ Defense assessment: ${TEST_ASSESSMENT_IDS.defense}`);
    console.log(`     URL: /assessment/${TEST_ASSESSMENT_IDS.defense}/chat`);
    console.log(`     PR URL: https://github.com/skillvee/test-repo/pull/1`);
    console.log(`     Note: Calls to manager will use defense prompt`);

    // Create test assessment with COMPLETED status and report for results page testing (RF-018, RF-025)
    // Updated with new video evaluation data for RF-025
    const sampleReport = {
      generatedAt: new Date().toISOString(),
      assessmentId: TEST_ASSESSMENT_IDS.completed,
      candidateName: "Test Candidate",
      overallScore: 3.1,
      overallLevel: "strong",
      skillScores: [
        {
          category: "communication",
          score: 3,
          level: "advanced",
          evidence: ["+ Clear explanations in chat", "+ Asked good clarifying questions"],
          notes: "Demonstrated effective communication with team members."
        },
        {
          category: "problem_decomposition",
          score: 4,
          level: "expert",
          evidence: ["+ Broke task into logical steps", "+ Prioritized effectively"],
          notes: "Excellent at breaking down complex problems."
        },
        {
          category: "ai_leverage",
          score: 3,
          level: "advanced",
          evidence: ["+ Used AI tools effectively", "+ Verified AI suggestions"],
          notes: "Good use of AI assistance while maintaining oversight."
        },
        {
          category: "code_quality",
          score: 3,
          level: "advanced",
          evidence: ["+ Clean code structure", "+ Good naming conventions"],
          notes: "Produced high-quality, maintainable code."
        },
        {
          category: "xfn_collaboration",
          score: 3,
          level: "advanced",
          evidence: ["+ Reached out to coworkers", "- Could improve proactive communication"],
          notes: "Good teamwork, room for more proactive engagement."
        },
        {
          category: "time_management",
          score: 4,
          level: "expert",
          evidence: ["+ Completed on time", "+ Efficient task switching"],
          notes: "Excellent time management throughout the simulation."
        },
        {
          category: "technical_decision_making",
          score: 3,
          level: "advanced",
          evidence: ["+ Made sound architectural choices", "+ Considered trade-offs"],
          notes: "Strong technical judgment in design decisions."
        },
        {
          category: "presentation",
          score: 3,
          level: "advanced",
          evidence: ["+ Clear PR description", "+ Well-structured defense"],
          notes: "Presented work effectively in code review."
        },
      ],
      narrative: {
        overallSummary: "This candidate demonstrated strong technical skills and excellent problem-solving abilities throughout the simulation. They showed great time management and adaptability while maintaining professional communication.\n\nKey highlights include their systematic approach to breaking down the task, effective use of AI tools, and clear communication with team members. The candidate delivered quality code on time and presented their work professionally.",
        strengths: [
          "Excellent problem decomposition and systematic approach",
          "Strong time management and task prioritization",
          "Effective use of AI tools while maintaining code ownership",
          "Clear and professional communication",
        ],
        areasForImprovement: [
          "Could be more proactive in seeking feedback early",
          "Consider reaching out to more team members for diverse perspectives",
        ],
        notableObservations: [
          "Adapted well when requirements were clarified",
          "Showed initiative in testing edge cases",
        ],
      },
      recommendations: [
        {
          category: "xfn_collaboration",
          priority: "medium",
          title: "Increase Proactive Communication",
          description: "While collaboration was good, being more proactive in sharing progress and seeking input could enhance teamwork.",
          actionableSteps: [
            "Share progress updates regularly without being asked",
            "Ask for feedback earlier in the development process",
            "Reach out to multiple team members for diverse perspectives",
          ],
        },
      ],
      metrics: {
        totalDurationMinutes: 75,
        workingPhaseMinutes: 60,
        coworkersContacted: 3,
        aiToolsUsed: true,
        testsStatus: "passing",
        codeReviewScore: 4,
      },
      version: "1.1.0",
      // Percentile data for recruiter dashboard
      percentiles: {
        overall: 75,
        dimensions: {
          COMMUNICATION: 78,
          PROBLEM_SOLVING: 92,
          TECHNICAL_KNOWLEDGE: 72,
          COLLABORATION: 50,
          ADAPTABILITY: 76,
          LEADERSHIP: 45,
          CREATIVITY: 80,
          TIME_MANAGEMENT: 93,
        },
        calculatedAt: new Date().toISOString(),
        totalCandidates: 4,
      },
      // Video evaluation data for RF-025
      videoEvaluation: {
        evaluationVersion: "1.1.0",
        overallScore: 3.1,
        skills: [
          {
            dimension: "COMMUNICATION",
            score: 3,
            rationale: "Clear and professional communication throughout the assessment. Asked thoughtful clarifying questions when requirements were ambiguous.",
            greenFlags: [
              "Clear explanations of technical decisions",
              "Asked relevant clarifying questions",
              "Professional tone in all interactions",
            ],
            redFlags: [
              "Could be more concise in written communication",
              "Didn't proactively share progress updates",
            ],
            timestamps: ["02:15", "08:42", "15:30", "32:10"],
          },
          {
            dimension: "PROBLEM_SOLVING",
            score: 4,
            rationale: "Excellent systematic approach to breaking down the task. Formed clear hypotheses when debugging and adapted approach when initial solutions didn't work.",
            greenFlags: [
              "Systematic problem decomposition",
              "Formed and tested hypotheses effectively",
              "Adapted approach when blocked",
            ],
            redFlags: [],
            timestamps: ["10:45", "22:30", "45:20"],
          },
          {
            dimension: "TECHNICAL_KNOWLEDGE",
            score: 3,
            rationale: "Good technical foundation in React and TypeScript. Navigated the codebase and applied standard practices. Some lookups needed for advanced patterns.",
            greenFlags: [
              "Solid React and TypeScript knowledge",
              "Good use of documentation",
            ],
            redFlags: [
              "Hesitation with some advanced patterns",
            ],
            timestamps: ["08:15", "18:00", "25:40", "35:20"],
          },
          {
            dimension: "COLLABORATION",
            score: 3,
            rationale: "Good collaboration instincts - reached out to coworkers when stuck and was receptive to suggestions. Could improve on proactive communication.",
            greenFlags: [
              "Asked for help when appropriate",
              "Receptive to feedback",
            ],
            redFlags: [
              "Could be more proactive in sharing progress",
              "Missed opportunities to engage earlier",
            ],
            timestamps: ["12:00", "28:15"],
          },
          {
            dimension: "ADAPTABILITY",
            score: 3,
            rationale: "Adapted reasonably when requirements were clarified mid-task. Recovered from initial misunderstanding and adjusted implementation.",
            greenFlags: [
              "Adjusted to new information",
              "Recovered from setbacks",
            ],
            redFlags: [
              "Took a bit long to pivot",
            ],
            timestamps: ["30:45", "42:00"],
          },
          {
            dimension: "LEADERSHIP",
            score: 2,
            rationale: "Tended to wait for direction rather than taking ownership. Made some decisions independently but often deferred.",
            greenFlags: [
              "Some initiative shown",
            ],
            redFlags: [
              "Could take more ownership",
              "Waited for direction frequently",
            ],
            timestamps: ["55:00"],
          },
          {
            dimension: "CREATIVITY",
            score: 3,
            rationale: "Proposed some creative solutions to technical challenges. Explored a couple of approaches before settling on implementation.",
            greenFlags: [
              "Some creative problem-solving",
              "Explored alternatives",
            ],
            redFlags: [],
            timestamps: ["1:05:30", "1:15:00"],
          },
          {
            dimension: "TIME_MANAGEMENT",
            score: 4,
            rationale: "Good time awareness and prioritization. Balanced speed and quality effectively and met key milestones.",
            greenFlags: [
              "Good prioritization",
              "Efficient use of time",
              "Balanced speed and quality",
            ],
            redFlags: [],
            timestamps: ["05:00", "20:00", "45:00", "1:10:00"],
          },
        ],
        hiringSignals: {
          overallGreenFlags: [
            "Strong problem-solving and systematic approach",
            "Excellent time management and prioritization",
            "Clear communication and professionalism",
            "Solid technical knowledge in React/TypeScript",
            "Creative solutions to technical challenges",
          ],
          overallRedFlags: [
            "Could be more proactive in collaboration",
            "May benefit from more leadership development",
          ],
          recommendation: "hire",
          recommendationRationale: "This candidate demonstrates strong technical skills and excellent problem-solving abilities. Their systematic approach, time management, and communication skills are notable strengths. While there's room for growth in proactive collaboration and leadership, these are trainable gaps. Recommend moving forward with the hiring process.",
        },
        overallSummary: "The candidate showed strong performance across most dimensions, with exceptional problem-solving and time management skills. They communicated clearly, adapted well to feedback, and delivered quality work. Areas for growth include proactive collaboration and taking more ownership in leadership situations.",
        evaluationConfidence: "high",
        insufficientEvidenceNotes: undefined,
      },
    };

    await prisma.assessment.upsert({
      where: { id: TEST_ASSESSMENT_IDS.completed },
      update: {
        status: "COMPLETED",
        scenarioId: recruiterScenario.id,
        prUrl: "https://github.com/skillvee/test-repo/pull/2",
        report: sampleReport as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
      create: {
        id: TEST_ASSESSMENT_IDS.completed,
        userId: testCandidate.id,
        scenarioId: recruiterScenario.id,
        status: "COMPLETED",
        prUrl: "https://github.com/skillvee/test-repo/pull/2",
        report: sampleReport as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
    console.log(`  ✅ Completed assessment: ${TEST_ASSESSMENT_IDS.completed}`);
    console.log(`     URL: /assessment/${TEST_ASSESSMENT_IDS.completed}/results`);

    // Create VideoAssessment with dimension scores for the completed assessment (US-004)
    const completedVideoAssessmentId = "test-video-assessment-completed";
    const completedDimensionScores = [
      {
        dimension: "communication",
        score: 3,
        observableBehaviors: "Clear and professional communication throughout. Asked clarifying questions when needed.",
        trainableGap: false,
        timestamps: ["02:15", "08:42", "15:30", "32:10"],
      },
      {
        dimension: "problem_decomposition_design",
        score: 4,
        observableBehaviors: "Excellent systematic approach to breaking down the task. Formed clear hypotheses when debugging.",
        trainableGap: false,
        timestamps: ["10:45", "22:30", "45:20"],
      },
      {
        dimension: "technical_execution",
        score: 3,
        observableBehaviors: "Good technical foundation in React and TypeScript. Applied standard best practices.",
        trainableGap: false,
        timestamps: ["08:15", "18:00", "25:40", "35:20"],
      },
      {
        dimension: "collaboration_coachability",
        score: 3,
        observableBehaviors: "Good collaboration instincts - reached out when stuck. Could improve on proactive communication.",
        trainableGap: true,
        timestamps: ["12:00", "28:15"],
      },
      {
        dimension: "practical_maturity",
        score: 3,
        observableBehaviors: "Adapted reasonably when requirements were clarified mid-task.",
        trainableGap: false,
        timestamps: ["30:45", "42:00"],
      },
      {
        dimension: "learning_velocity",
        score: 2,
        observableBehaviors: "Showed initiative in some areas but tended to wait for direction on others.",
        trainableGap: true,
        timestamps: ["55:00"],
      },
      {
        dimension: "work_process",
        score: 3,
        observableBehaviors: "Proposed some creative solutions. Explored a couple of approaches before settling on implementation.",
        trainableGap: false,
        timestamps: ["1:05:30", "1:15:00"],
      },
    ];

    // Delete existing video assessment for this assessment if any
    const existingCompletedVideoAssessment = await prisma.videoAssessment.findUnique({
      where: { assessmentId: TEST_ASSESSMENT_IDS.completed },
    });

    if (existingCompletedVideoAssessment) {
      await prisma.dimensionScore.deleteMany({
        where: { assessmentId: existingCompletedVideoAssessment.id },
      });
      await prisma.videoAssessmentSummary.deleteMany({
        where: { assessmentId: existingCompletedVideoAssessment.id },
      });
      await prisma.videoAssessment.delete({
        where: { id: existingCompletedVideoAssessment.id },
      });
    }

    const completedVideoAssessment = await prisma.videoAssessment.create({
      data: {
        id: completedVideoAssessmentId,
        candidateId: testCandidate.id,
        assessmentId: TEST_ASSESSMENT_IDS.completed,
        videoUrl: "https://example.com/test-video-completed.mp4",
        status: VideoAssessmentStatus.COMPLETED,
        completedAt: new Date(),
        isSearchable: true,
      },
    });

    for (const score of completedDimensionScores) {
      await prisma.dimensionScore.create({
        data: {
          assessmentId: completedVideoAssessment.id,
          dimension: score.dimension,
          score: score.score,
          observableBehaviors: score.observableBehaviors,
          timestamps: score.timestamps,
          trainableGap: score.trainableGap,
        },
      });
    }

    await prisma.videoAssessmentSummary.create({
      data: {
        assessmentId: completedVideoAssessment.id,
        overallSummary: "The candidate showed strong performance across most dimensions, with exceptional problem-solving and time management skills. They communicated clearly, adapted well to feedback, and delivered quality work. Areas for growth include proactive collaboration and taking more ownership in leadership situations.",
        rawAiResponse: {
          hiringSignals: {
            overallGreenFlags: [
              "Strong problem-solving and systematic approach",
              "Excellent time management and prioritization",
              "Clear communication and professionalism",
              "Solid technical knowledge in React/TypeScript",
              "Creative solutions to technical challenges",
            ],
            overallRedFlags: [
              "Could be more proactive in collaboration",
              "May benefit from more leadership development",
            ],
            recommendation: "hire",
          },
          overall_summary: "The candidate showed strong performance across most dimensions, with exceptional problem-solving and time management skills.",
        } as unknown as Prisma.InputJsonValue,
      },
    });

    console.log(`  ✅ Video assessment for completed: ${completedVideoAssessmentId}`);

    // ========================================================================
    // ADDITIONAL CANDIDATES for recruiter dashboard testing
    // ========================================================================
    console.log("\n  📊 Creating additional candidates for recruiter dashboard...");

    // Helper: Build v3 rawAiResponse from seed data
    type SeedCandidate = {
      scores: Array<{ dimension: string; score: number; observableBehaviors: string; trainableGap: boolean; timestamps: string[] }>;
      report: {
        overallScore: number;
        videoEvaluation: {
          evaluationVersion: string;
          overallScore: number;
          skills: Array<{ dimension: string; score: number; rationale: string; greenFlags: string[]; redFlags: string[]; timestamps: string[] }>;
          hiringSignals: { overallGreenFlags: string[]; overallRedFlags: string[]; recommendation: string; recommendationRationale: string };
          overallSummary: string;
          evaluationConfidence: string;
        };
        percentiles: object;
        metrics: object;
      };
      summary: string;
    };

    function buildRawAiResponse(candidate: SeedCandidate) {
      const { videoEvaluation } = candidate.report;
      // Build per-dimension scores with summary and timestamped behaviors
      const dimensionScores = candidate.scores.map((score) => {
        const skill = videoEvaluation.skills.find((s) => s.dimension === score.dimension);
        return {
          dimensionSlug: score.dimension,
          dimensionName: score.dimension,
          score: score.score,
          summary: skill?.rationale?.split(".")[0]?.trim() + "." || "",
          confidence: "high",
          rationale: skill?.rationale || "",
          observableBehaviors: score.observableBehaviors
            .split(/\.\s+/)
            .filter(Boolean)
            .map((behavior, i) => ({
              timestamp: score.timestamps[i] || score.timestamps[0] || "",
              behavior: behavior.endsWith(".") ? behavior : behavior + ".",
            })),
          timestamps: score.timestamps,
          trainableGap: score.trainableGap,
          greenFlags: skill?.greenFlags || [],
          redFlags: skill?.redFlags || [],
        };
      });

      // Derive top strengths from highest-scoring dimensions
      const sortedByScoreDesc = [...dimensionScores].sort((a, b) => b.score - a.score);
      const topStrengths = sortedByScoreDesc
        .filter((d) => d.score >= 3)
        .slice(0, 3)
        .map((d) => ({
          dimension: d.dimensionName,
          score: d.score,
          description: d.greenFlags[0] || d.summary,
        }));

      // Derive growth areas from lowest-scoring dimensions
      const sortedByScoreAsc = [...dimensionScores].sort((a, b) => a.score - b.score);
      const growthAreas = sortedByScoreAsc
        .filter((d) => d.score <= 2)
        .slice(0, 3)
        .map((d) => ({
          dimension: d.dimensionName,
          score: d.score,
          description: d.redFlags[0] || d.rationale?.split(".")[0] || "Needs improvement.",
        }));

      return {
        ...videoEvaluation,
        evaluationVersion: "3.0.0",
        dimensionScores,
        topStrengths,
        growthAreas,
      };
    }

    const additionalCandidates = [
      // ── Alice Johnson ── Exceptional candidate: avg 3.5 ──
      {
        emailKey: "candidateAlice" as const,
        assessmentId: TEST_ASSESSMENT_IDS.aliceCompleted,
        videoAssessmentId: "test-video-assessment-alice",
        scores: [
          { dimension: "communication", score: 4, observableBehaviors: "Exceptional communicator. Clearly articulated decisions and actively sought feedback from team members.", trainableGap: false, timestamps: ["03:10", "09:20", "22:15"] },
          { dimension: "problem_decomposition_design", score: 3, observableBehaviors: "Solid analytical approach. Methodically traced bugs and verified fixes.", trainableGap: false, timestamps: ["11:00", "25:45"] },
          { dimension: "technical_execution", score: 4, observableBehaviors: "Deep understanding of React patterns and TypeScript. Applied advanced patterns confidently.", trainableGap: false, timestamps: ["07:30", "19:00", "33:10", "48:00"] },
          { dimension: "collaboration_coachability", score: 4, observableBehaviors: "Proactively reached out to multiple team members. Incorporated feedback quickly.", trainableGap: false, timestamps: ["14:00", "29:30", "40:15"] },
          { dimension: "practical_maturity", score: 3, observableBehaviors: "Pivoted smoothly when given additional constraints mid-task.", trainableGap: false, timestamps: ["35:00"] },
          { dimension: "learning_velocity", score: 4, observableBehaviors: "Took ownership of decisions and confidently drove the implementation forward.", trainableGap: false, timestamps: ["20:00", "50:00"] },
          { dimension: "work_process", score: 3, observableBehaviors: "Chose straightforward solutions. Effective but less creative in approach.", trainableGap: true, timestamps: ["1:00:00"] },

        ],
        report: {
          overallScore: 3.5,
          recommendation: "strong_hire",
          videoEvaluation: {
            evaluationVersion: "1.1.0",
            overallScore: 3.5,
            skills: [
              { dimension: "COMMUNICATION", score: 4, rationale: "Exceptional communicator throughout.", greenFlags: ["Clear articulation", "Active listener", "Sought feedback proactively"], redFlags: [], timestamps: ["03:10", "09:20", "22:15"] },
              { dimension: "PROBLEM_SOLVING", score: 3, rationale: "Solid analytical approach to debugging.", greenFlags: ["Methodical debugging", "Verified fixes"], redFlags: ["Could explore more edge cases"], timestamps: ["11:00", "25:45"] },
              { dimension: "TECHNICAL_KNOWLEDGE", score: 4, rationale: "Deep expertise in React and TypeScript.", greenFlags: ["Advanced patterns", "Best practices", "Clean architecture"], redFlags: [], timestamps: ["07:30", "19:00", "33:10"] },
              { dimension: "COLLABORATION", score: 4, rationale: "Proactive collaboration with team.", greenFlags: ["Proactive outreach", "Quick feedback incorporation"], redFlags: [], timestamps: ["14:00", "29:30"] },
              { dimension: "ADAPTABILITY", score: 3, rationale: "Handled mid-task changes well.", greenFlags: ["Smooth pivot", "Maintained quality"], redFlags: [], timestamps: ["35:00"] },
              { dimension: "LEADERSHIP", score: 4, rationale: "Strong ownership and decision-making.", greenFlags: ["Took ownership", "Confident decisions", "Drove implementation"], redFlags: [], timestamps: ["20:00", "50:00"] },
              { dimension: "CREATIVITY", score: 3, rationale: "Effective but conventional solutions.", greenFlags: ["Reliable implementations"], redFlags: ["Less creative approaches", "Could explore alternatives"], timestamps: ["1:00:00"] },
              { dimension: "TIME_MANAGEMENT", score: 3, rationale: "Good pacing throughout.", greenFlags: ["Completed with time to spare", "Good prioritization"], redFlags: [], timestamps: ["05:00", "25:00"] },
            ],
            hiringSignals: {
              overallGreenFlags: ["Exceptional communication", "Deep technical expertise", "Strong leadership"],
              overallRedFlags: ["Could be more creative in solutions"],
              recommendation: "strong_hire",
              recommendationRationale: "Alice is a strong candidate with exceptional communication and technical skills. Her leadership ability makes her well-suited for mid-to-senior roles.",
            },
            overallSummary: "Alice demonstrated strong communication and deep technical knowledge. She led confidently and collaborated proactively, making her a top candidate. Her solutions were effective though somewhat conventional.",
            evaluationConfidence: "high",
          },
          percentiles: { overall: 92, calculatedAt: new Date().toISOString(), totalCandidates: 8 },
          metrics: { totalDurationMinutes: 68, workingPhaseMinutes: 55, coworkersContacted: 4, aiToolsUsed: true, testsStatus: "passing", codeReviewScore: 4 },
        },
        summary: "Alice demonstrated strong engineering fundamentals with standout communication and technical skills. She performs particularly well in structured technical discussions, proactively sharing updates and explaining trade-offs clearly to team members. Her deep React and TypeScript expertise allowed her to apply advanced patterns confidently, and her leadership drove the implementation forward decisively. She collaborated proactively, reaching out to multiple team members and incorporating feedback quickly. While her solutions were effective, they tended to be conventional rather than innovative — her one area for growth. Overall, Alice appears to be a capable, methodical engineer with strong collaboration potential and excellent engineering instincts, well-suited for mid-to-senior roles.",
      },
      // ── Bob Martinez ── Below expectations: avg 2.5 ──
      {
        emailKey: "candidateBob" as const,
        assessmentId: TEST_ASSESSMENT_IDS.bobCompleted,
        videoAssessmentId: "test-video-assessment-bob",
        scores: [
          { dimension: "communication", score: 2, observableBehaviors: "Basic communication. Answered questions but did not proactively share updates.", trainableGap: true, timestamps: ["04:00", "18:30"] },
          { dimension: "problem_decomposition_design", score: 2, observableBehaviors: "Trial-and-error approach. Used brute force more than systematic analysis.", trainableGap: true, timestamps: ["13:00", "30:00"] },
          { dimension: "technical_execution", score: 3, observableBehaviors: "Solid core knowledge. Good understanding of React but gaps in TypeScript generics.", trainableGap: false, timestamps: ["10:00", "24:00", "38:00"] },
          { dimension: "collaboration_coachability", score: 2, observableBehaviors: "Minimal collaboration. Worked independently and rarely reached out to team members.", trainableGap: true, timestamps: ["20:00"] },
          { dimension: "practical_maturity", score: 3, observableBehaviors: "Adapted eventually but took time to adjust when requirements changed.", trainableGap: true, timestamps: ["32:00", "45:00"] },
          { dimension: "learning_velocity", score: 2, observableBehaviors: "Waited for direction. Did not take ownership of decisions independently.", trainableGap: true, timestamps: [] },
          { dimension: "work_process", score: 3, observableBehaviors: "Some creative solutions. Found a nice approach to one tricky problem.", trainableGap: false, timestamps: ["55:00", "1:10:00"] },

        ],
        report: {
          overallScore: 2.5,
          recommendation: "no_hire",
          videoEvaluation: {
            evaluationVersion: "1.1.0",
            overallScore: 2.5,
            skills: [
              { dimension: "COMMUNICATION", score: 2, rationale: "Basic but not proactive.", greenFlags: ["Clear when asked"], redFlags: ["Not proactive with updates", "Could share more context"], timestamps: ["04:00", "18:30"] },
              { dimension: "PROBLEM_SOLVING", score: 2, rationale: "Trial-and-error approach.", greenFlags: ["Got to solutions eventually"], redFlags: ["Brute force approach", "Lacked systematic methodology", "Didn't form hypotheses"], timestamps: ["13:00", "30:00"] },
              { dimension: "TECHNICAL_KNOWLEDGE", score: 3, rationale: "Solid foundational skills.", greenFlags: ["Strong React knowledge", "Good debugging"], redFlags: ["Gaps in TypeScript generics"], timestamps: ["10:00", "24:00"] },
              { dimension: "COLLABORATION", score: 2, rationale: "Worked too independently.", greenFlags: ["Self-sufficient"], redFlags: ["Rarely reached out", "Missed collaboration opportunities", "Didn't seek feedback"], timestamps: ["20:00"] },
              { dimension: "ADAPTABILITY", score: 3, rationale: "Slow to adjust.", greenFlags: ["Eventually adapted"], redFlags: ["Took time to pivot"], timestamps: ["32:00"] },
              { dimension: "LEADERSHIP", score: 2, rationale: "Passive in decision-making.", greenFlags: ["Followed instructions well"], redFlags: ["Waited for direction", "No ownership", "Needed prompting"], timestamps: [] },
              { dimension: "CREATIVITY", score: 3, rationale: "Some creative moments.", greenFlags: ["Nice approach to tricky problem"], redFlags: [], timestamps: ["55:00", "1:10:00"] },
              { dimension: "TIME_MANAGEMENT", score: 3, rationale: "Completed but rushed at end.", greenFlags: ["Met deadline"], redFlags: ["Poor prioritization early on", "Rushed final tasks"], timestamps: ["15:00", "40:00"] },
            ],
            hiringSignals: {
              overallGreenFlags: ["Solid React knowledge", "Self-sufficient"],
              overallRedFlags: ["Poor collaboration habits", "Lacks leadership initiative", "Unsystematic problem-solving"],
              recommendation: "no_hire",
              recommendationRationale: "Bob has foundational technical skills but significant gaps in collaboration and leadership. Not ready for a mid-level role without substantial mentorship.",
            },
            overallSummary: "Bob showed decent technical knowledge but struggled with collaboration and leadership. He worked too independently and was passive in decision-making. Significant development needed for mid-level expectations.",
            evaluationConfidence: "high",
          },
          percentiles: { overall: 25, calculatedAt: new Date().toISOString(), totalCandidates: 8 },
          metrics: { totalDurationMinutes: 82, workingPhaseMinutes: 70, coworkersContacted: 1, aiToolsUsed: true, testsStatus: "passing", codeReviewScore: 2 },
        },
        summary: "Bob showed decent core technical knowledge with a solid understanding of React, but significant gaps emerged in collaboration, communication, and leadership. He worked almost entirely independently, rarely reaching out to team members and only doing so when completely stuck. His problem-solving approach relied heavily on trial-and-error rather than systematic analysis, and he was passive in decision-making — waiting for direction rather than taking ownership. While he managed to deliver functional work on time, he rushed toward the end due to poor early prioritization. His communication was reactive rather than proactive, providing clear answers when asked but never initiating updates. Overall, Bob demonstrates the technical baseline for a junior role but falls significantly short of mid-level expectations in the soft skills that matter most for team effectiveness.",
      },
      // ── Carla Nguyen ── Strong candidate: avg 3.25 ──
      {
        emailKey: "candidateCarla" as const,
        assessmentId: TEST_ASSESSMENT_IDS.carlaCompleted,
        videoAssessmentId: "test-video-assessment-carla",
        scores: [
          { dimension: "communication", score: 3, observableBehaviors: "Good communicator. Shared progress regularly and asked thoughtful questions.", trainableGap: false, timestamps: ["02:30", "12:00", "28:00", "42:00"] },
          { dimension: "problem_decomposition_design", score: 3, observableBehaviors: "Structured approach to problems. Drew diagrams and outlined steps before coding.", trainableGap: false, timestamps: ["08:00", "20:00", "38:00"] },
          { dimension: "technical_execution", score: 3, observableBehaviors: "Good fundamentals. Needed to look up some React hooks and TypeScript generics.", trainableGap: true, timestamps: ["06:00", "16:00", "30:00"] },
          { dimension: "collaboration_coachability", score: 4, observableBehaviors: "Outstanding collaborator. Proactively engaged every team member and integrated diverse perspectives.", trainableGap: false, timestamps: ["10:00", "22:00", "35:00", "50:00"] },
          { dimension: "practical_maturity", score: 4, observableBehaviors: "Thrived when requirements changed. Reframed changes as opportunities to improve.", trainableGap: false, timestamps: ["25:00", "40:00"] },
          { dimension: "learning_velocity", score: 3, observableBehaviors: "Took initiative and made some decisions confidently while keeping the team aligned.", trainableGap: false, timestamps: ["15:00", "45:00"] },
          { dimension: "work_process", score: 4, observableBehaviors: "Innovative solutions throughout. Proposed a novel component architecture that simplified the approach.", trainableGap: false, timestamps: ["18:00", "36:00", "52:00"] },

        ],
        report: {
          overallScore: 3.25,
          recommendation: "hire",
          videoEvaluation: {
            evaluationVersion: "1.1.0",
            overallScore: 3.25,
            skills: [
              { dimension: "COMMUNICATION", score: 3, rationale: "Good, proactive communicator.", greenFlags: ["Regular progress updates", "Thoughtful questions"], redFlags: [], timestamps: ["02:30", "12:00", "28:00"] },
              { dimension: "PROBLEM_SOLVING", score: 3, rationale: "Structured and methodical.", greenFlags: ["Diagrammed approach", "Clear step-by-step planning"], redFlags: [], timestamps: ["08:00", "20:00"] },
              { dimension: "TECHNICAL_KNOWLEDGE", score: 3, rationale: "Good fundamentals with some gaps.", greenFlags: ["Solid basics", "Good debugging instincts"], redFlags: ["Needed lookups for advanced patterns", "Some TypeScript uncertainty"], timestamps: ["06:00", "16:00"] },
              { dimension: "COLLABORATION", score: 4, rationale: "Outstanding team player.", greenFlags: ["Proactive engagement", "Integrated diverse perspectives", "Built on others' ideas"], redFlags: [], timestamps: ["10:00", "22:00", "35:00"] },
              { dimension: "ADAPTABILITY", score: 4, rationale: "Thrived under changing requirements.", greenFlags: ["Reframed changes as opportunities", "Maintained quality through pivots"], redFlags: [], timestamps: ["25:00", "40:00"] },
              { dimension: "LEADERSHIP", score: 3, rationale: "Showed initiative in decisions.", greenFlags: ["Took initiative", "Kept team aligned"], redFlags: [], timestamps: ["15:00", "45:00"] },
              { dimension: "CREATIVITY", score: 4, rationale: "Highly innovative approach.", greenFlags: ["Novel component architecture", "Creative solutions", "Simplified complexity"], redFlags: [], timestamps: ["18:00", "36:00", "52:00"] },
              { dimension: "TIME_MANAGEMENT", score: 2, rationale: "Over-invested in design phase.", greenFlags: ["High-quality output"], redFlags: ["Too long on design", "Barely met deadline", "Could prioritize better"], timestamps: ["10:00", "30:00"] },
            ],
            hiringSignals: {
              overallGreenFlags: ["Outstanding collaboration", "Highly creative and innovative", "Thrives under ambiguity"],
              overallRedFlags: ["Some technical knowledge gaps", "Time management needs work"],
              recommendation: "hire",
              recommendationRationale: "Carla is a strong collaborator and creative thinker. Technical gaps are trainable, and time management can improve with experience.",
            },
            overallSummary: "Carla was an outstanding collaborator and creative thinker who thrived when requirements changed. She proposed innovative solutions and engaged every team member. Time management and some technical gaps are areas for growth.",
            evaluationConfidence: "high",
          },
          percentiles: { overall: 75, calculatedAt: new Date().toISOString(), totalCandidates: 8 },
          metrics: { totalDurationMinutes: 78, workingPhaseMinutes: 65, coworkersContacted: 4, aiToolsUsed: true, testsStatus: "passing", codeReviewScore: 3 },
        },
        summary: "Carla was an outstanding collaborator and creative thinker who thrived when requirements changed mid-task. She proactively engaged every team member, integrating diverse perspectives into her approach and elevating the overall quality of work. Her innovative solutions were a highlight — she proposed a novel component architecture that significantly simplified the implementation. Carla communicated regularly, sharing progress updates and asking thoughtful questions that showed deep engagement with the problem. However, time management was her most significant gap: she invested too heavily in the design phase and barely met the deadline, suggesting she needs to develop better prioritization instincts. Her technical fundamentals were solid but she occasionally needed to look up React hooks and TypeScript patterns. Overall, Carla is the kind of engineer who makes teams better — her collaboration and creativity are exceptional assets, and her growth areas (time management and some technical depth) are highly trainable.",
      },
      // ── Sarah Chen ── Top performer: avg 3.75 ──
      {
        emailKey: "candidateSarah" as const,
        assessmentId: TEST_ASSESSMENT_IDS.sarahCompleted,
        videoAssessmentId: "test-video-assessment-sarah",
        scores: [
          { dimension: "communication", score: 4, observableBehaviors: "Exceptional communicator. Proactively shared updates and explained trade-offs clearly.", trainableGap: false, timestamps: ["01:30", "10:00", "25:00", "45:00"] },
          { dimension: "problem_decomposition_design", score: 4, observableBehaviors: "Expert-level problem decomposition. Identified root causes quickly and proposed elegant solutions.", trainableGap: false, timestamps: ["08:00", "18:00", "35:00"] },
          { dimension: "technical_execution", score: 4, observableBehaviors: "Deep mastery of React, TypeScript, and system design. Applied patterns from first principles.", trainableGap: false, timestamps: ["05:00", "15:00", "30:00", "50:00"] },
          { dimension: "collaboration_coachability", score: 3, observableBehaviors: "Engaged team effectively. Built on others' ideas and elevated the conversation.", trainableGap: false, timestamps: ["12:00", "28:00", "42:00"] },
          { dimension: "practical_maturity", score: 4, observableBehaviors: "Thrived under ambiguity. Treated requirement changes as design opportunities.", trainableGap: false, timestamps: ["22:00", "38:00"] },
          { dimension: "learning_velocity", score: 4, observableBehaviors: "Natural leader. Made decisive calls and brought the team along.", trainableGap: false, timestamps: ["20:00", "40:00", "55:00"] },
          { dimension: "work_process", score: 4, observableBehaviors: "Innovative thinker. Proposed a component abstraction that reduced code complexity by 40%.", trainableGap: false, timestamps: ["14:00", "32:00"] },

        ],
        report: {
          overallScore: 3.75,
          recommendation: "strong_hire",
          videoEvaluation: {
            evaluationVersion: "1.1.0",
            overallScore: 3.75,
            skills: [
              { dimension: "COMMUNICATION", score: 4, rationale: "Exceptional communicator at expert level.", greenFlags: ["Proactive updates", "Clear trade-off explanations", "Excellent written and verbal clarity"], redFlags: [], timestamps: ["01:30", "10:00", "25:00"] },
              { dimension: "PROBLEM_SOLVING", score: 4, rationale: "Expert problem decomposition and root cause analysis.", greenFlags: ["Quick root cause identification", "Elegant solutions", "First-principles thinking"], redFlags: [], timestamps: ["08:00", "18:00", "35:00"] },
              { dimension: "TECHNICAL_KNOWLEDGE", score: 4, rationale: "Deep mastery across the stack.", greenFlags: ["Applied patterns from first principles", "System design thinking", "Advanced TypeScript"], redFlags: [], timestamps: ["05:00", "15:00", "30:00"] },
              { dimension: "COLLABORATION", score: 3, rationale: "Elevated every interaction.", greenFlags: ["Built on others' ideas", "Elevated conversations", "Inclusive communication"], redFlags: [], timestamps: ["12:00", "28:00"] },
              { dimension: "ADAPTABILITY", score: 4, rationale: "Thrived under ambiguity.", greenFlags: ["Treated changes as opportunities", "Maintained high quality"], redFlags: [], timestamps: ["22:00", "38:00"] },
              { dimension: "LEADERSHIP", score: 4, rationale: "Natural, decisive leader.", greenFlags: ["Decisive calls", "Brought team along", "Owned outcomes"], redFlags: [], timestamps: ["20:00", "40:00"] },
              { dimension: "CREATIVITY", score: 4, rationale: "Innovative abstractions.", greenFlags: ["Novel component abstraction", "Reduced complexity significantly"], redFlags: [], timestamps: ["14:00", "32:00"] },
              { dimension: "TIME_MANAGEMENT", score: 3, rationale: "Outstanding pacing.", greenFlags: ["Delivered early", "Room for polish", "Strategic prioritization"], redFlags: [], timestamps: ["03:00", "20:00", "45:00"] },
            ],
            hiringSignals: {
              overallGreenFlags: ["Expert across nearly all dimensions", "Natural leader who elevates the team", "Innovative problem-solver"],
              overallRedFlags: [],
              recommendation: "strong_hire",
              recommendationRationale: "Sarah is an exceptional candidate who exceeds mid-level expectations across the board. Strong hire recommendation with high confidence.",
            },
            overallSummary: "Sarah is an outstanding candidate who demonstrated expert-level skills across communication, problem-solving, and technical knowledge. She leads naturally, adapts effortlessly, and produces innovative work.",
            evaluationConfidence: "high",
          },
          percentiles: { overall: 100, calculatedAt: new Date().toISOString(), totalCandidates: 8 },
          metrics: { totalDurationMinutes: 65, workingPhaseMinutes: 52, coworkersContacted: 4, aiToolsUsed: true, testsStatus: "passing", codeReviewScore: 4 },
        },
        summary: "Sarah is an exceptional candidate who demonstrated expert-level capabilities across nearly every dimension assessed. Her communication was outstanding — she proactively shared updates, explained trade-offs clearly, and adapted her explanations to different team members. Her problem-solving approach showed expert-level decomposition, quickly identifying root causes and proposing elegant solutions grounded in first principles. Technically, she demonstrated deep mastery of React, TypeScript, and system design, applying patterns thoughtfully rather than by rote. As a natural leader, she made decisive calls while bringing the team along, and her innovative component abstraction reduced code complexity by an estimated 40%. She thrived under ambiguity, treating requirement changes as design opportunities rather than obstacles. Her only area that wasn't at expert level was collaboration, which was still strong at an advanced level. Overall, Sarah exceeds mid-level expectations across the board and would be a strong hire for senior-level positions.",
      },
      // ── Marcus Johnson ── Meets expectations: avg 2.6 ──
      {
        emailKey: "candidateMarcus" as const,
        assessmentId: TEST_ASSESSMENT_IDS.marcusCompleted,
        videoAssessmentId: "test-video-assessment-marcus",
        scores: [
          { dimension: "communication", score: 2, observableBehaviors: "Communicated when prompted but rarely initiated. Answers were clear but brief.", trainableGap: true, timestamps: ["05:00", "20:00"] },
          { dimension: "problem_decomposition_design", score: 3, observableBehaviors: "Decent problem-solving. Followed a logical approach but missed some optimizations.", trainableGap: false, timestamps: ["10:00", "28:00"] },
          { dimension: "technical_execution", score: 3, observableBehaviors: "Good working knowledge of React. Comfortable with standard patterns but less confident with advanced TypeScript.", trainableGap: false, timestamps: ["08:00", "22:00", "40:00"] },
          { dimension: "collaboration_coachability", score: 2, observableBehaviors: "Limited collaboration. Contacted only one team member and only when explicitly stuck.", trainableGap: true, timestamps: ["25:00"] },
          { dimension: "practical_maturity", score: 3, observableBehaviors: "Handled requirement changes without complaint but didn't leverage them creatively.", trainableGap: false, timestamps: ["30:00"] },
          { dimension: "learning_velocity", score: 2, observableBehaviors: "Followed the task description closely. Did not propose alternatives or take ownership beyond requirements.", trainableGap: true, timestamps: [] },
          { dimension: "work_process", score: 3, observableBehaviors: "Standard solutions. Functional but no novel approaches.", trainableGap: false, timestamps: ["35:00"] },

        ],
        report: {
          overallScore: 2.6,
          recommendation: "no_hire",
          videoEvaluation: {
            evaluationVersion: "1.1.0",
            overallScore: 2.6,
            skills: [
              { dimension: "COMMUNICATION", score: 2, rationale: "Responsive but passive.", greenFlags: ["Clear answers when asked"], redFlags: ["Rarely initiated communication", "Brief responses"], timestamps: ["05:00", "20:00"] },
              { dimension: "PROBLEM_SOLVING", score: 3, rationale: "Logical but not optimized.", greenFlags: ["Logical approach"], redFlags: ["Missed optimizations"], timestamps: ["10:00", "28:00"] },
              { dimension: "TECHNICAL_KNOWLEDGE", score: 3, rationale: "Good working knowledge.", greenFlags: ["Comfortable with React", "Standard patterns"], redFlags: ["Less confident with advanced TS"], timestamps: ["08:00", "22:00"] },
              { dimension: "COLLABORATION", score: 2, rationale: "Minimal outreach.", greenFlags: ["Asked when truly stuck"], redFlags: ["Only contacted one person", "Didn't seek feedback", "Missed team synergies"], timestamps: ["25:00"] },
              { dimension: "ADAPTABILITY", score: 3, rationale: "Handled changes acceptably.", greenFlags: ["No complaints"], redFlags: ["Didn't leverage changes creatively"], timestamps: ["30:00"] },
              { dimension: "LEADERSHIP", score: 2, rationale: "Followed instructions closely.", greenFlags: ["Completed requirements"], redFlags: ["No initiative beyond requirements", "Didn't propose alternatives", "Passive approach"], timestamps: [] },
              { dimension: "CREATIVITY", score: 3, rationale: "Standard implementations.", greenFlags: ["Functional solutions"], redFlags: [], timestamps: ["35:00"] },
              { dimension: "TIME_MANAGEMENT", score: 3, rationale: "Reasonable pacing.", greenFlags: ["On-time completion"], redFlags: [], timestamps: ["05:00", "25:00"] },
            ],
            hiringSignals: {
              overallGreenFlags: ["Solid technical foundation", "Reliable execution"],
              overallRedFlags: ["Passive communicator", "Minimal collaboration", "No leadership initiative"],
              recommendation: "no_hire",
              recommendationRationale: "Marcus meets basic expectations technically but falls short on collaboration and leadership. These soft skill gaps are concerning for a mid-level role.",
            },
            overallSummary: "Marcus delivered functional work with decent technical skills but showed significant gaps in communication, collaboration, and leadership. He operated more like a task executor than a mid-level contributor.",
            evaluationConfidence: "high",
          },
          percentiles: { overall: 50, calculatedAt: new Date().toISOString(), totalCandidates: 8 },
          metrics: { totalDurationMinutes: 75, workingPhaseMinutes: 62, coworkersContacted: 1, aiToolsUsed: true, testsStatus: "passing", codeReviewScore: 3 },
        },
        summary: "Marcus delivered functional work with decent technical skills but operated more like a task executor than a mid-level contributor. His communication was consistently passive — he provided clear answers when prompted but rarely initiated updates or shared context proactively. His problem-solving was logical but missed optimization opportunities, and his collaboration was minimal, reaching out to only one team member and only when explicitly stuck. On the positive side, his React knowledge is solid and his solutions were functional and reliable. He handled requirement changes without complaint, completed work on time, and his code was clean. However, his lack of leadership initiative is concerning: he followed the task description closely but never proposed alternatives or took ownership beyond the minimum requirements. Overall, Marcus shows promise as a junior-level engineer who could grow with mentorship, but the communication and collaboration gaps make him a poor fit for a mid-level role at this time.",
      },
      // ── Alex Rivera ── Weak candidate: avg 2.0 ──
      {
        emailKey: "candidateAlex" as const,
        assessmentId: TEST_ASSESSMENT_IDS.alexCompleted,
        videoAssessmentId: "test-video-assessment-alex",
        scores: [
          { dimension: "communication", score: 2, observableBehaviors: "Minimal communication. Short replies, no proactive updates, unclear explanations.", trainableGap: true, timestamps: ["10:00"] },
          { dimension: "problem_decomposition_design", score: 2, observableBehaviors: "Struggled to break down the task. Got stuck multiple times without forming hypotheses.", trainableGap: true, timestamps: ["15:00", "35:00"] },
          { dimension: "technical_execution", score: 2, observableBehaviors: "Basic React knowledge. Struggled with TypeScript types and component patterns.", trainableGap: true, timestamps: ["08:00", "25:00", "45:00"] },
          { dimension: "collaboration_coachability", score: 2, observableBehaviors: "Asked for help once but didn't act on the feedback received.", trainableGap: true, timestamps: ["30:00"] },
          { dimension: "practical_maturity", score: 2, observableBehaviors: "Frustrated by requirement changes. Complained about scope and resisted pivoting.", trainableGap: true, timestamps: ["32:00", "48:00"] },
          { dimension: "learning_velocity", score: 1, observableBehaviors: "No ownership. Waited for direction on every decision and questioned the task design.", trainableGap: true, timestamps: [] },
          { dimension: "work_process", score: 2, observableBehaviors: "Copy-pasted patterns without understanding. No original problem-solving.", trainableGap: true, timestamps: ["40:00"] },

        ],
        report: {
          overallScore: 2.0,
          recommendation: "no_hire",
          videoEvaluation: {
            evaluationVersion: "1.1.0",
            overallScore: 2.0,
            skills: [
              { dimension: "COMMUNICATION", score: 2, rationale: "Below expectations for mid-level.", greenFlags: ["Responded when asked"], redFlags: ["Minimal communication", "Unclear explanations", "No proactive updates"], timestamps: ["10:00"] },
              { dimension: "PROBLEM_SOLVING", score: 2, rationale: "Struggled to break down problems.", greenFlags: ["Attempted the task"], redFlags: ["Got stuck repeatedly", "No hypothesis forming", "Didn't debug systematically"], timestamps: ["15:00", "35:00"] },
              { dimension: "TECHNICAL_KNOWLEDGE", score: 2, rationale: "Basic knowledge with gaps.", greenFlags: ["Some React familiarity"], redFlags: ["Struggled with TypeScript", "Unfamiliar with component patterns", "Needed extensive lookups"], timestamps: ["08:00", "25:00"] },
              { dimension: "COLLABORATION", score: 2, rationale: "Ineffective collaboration.", greenFlags: ["Asked for help once"], redFlags: ["Didn't act on feedback", "Didn't seek further help when stuck"], timestamps: ["30:00"] },
              { dimension: "ADAPTABILITY", score: 2, rationale: "Resisted changes.", greenFlags: [], redFlags: ["Frustrated by requirement changes", "Complained about scope", "Resisted pivoting"], timestamps: ["32:00", "48:00"] },
              { dimension: "LEADERSHIP", score: 1, rationale: "No ownership demonstrated.", greenFlags: [], redFlags: ["Waited for all direction", "Questioned task design", "No initiative"], timestamps: [] },
              { dimension: "CREATIVITY", score: 2, rationale: "No original thinking.", greenFlags: ["Used existing patterns"], redFlags: ["Copy-paste without understanding", "No original approaches"], timestamps: ["40:00"] },
              { dimension: "TIME_MANAGEMENT", score: 3, rationale: "Did not complete the work.", greenFlags: ["Worked consistently"], redFlags: ["Ran out of time", "Incomplete delivery", "Missed acceptance criteria"], timestamps: ["20:00", "50:00"] },
            ],
            hiringSignals: {
              overallGreenFlags: ["Attempted the full task", "Some React familiarity"],
              overallRedFlags: ["Below mid-level expectations across most dimensions", "Resisted feedback and changes", "No ownership or initiative", "Incomplete delivery"],
              recommendation: "no_hire",
              recommendationRationale: "Alex demonstrated skills below mid-level expectations. Significant gaps in technical knowledge, problem-solving, and soft skills. Not recommended for this role.",
            },
            overallSummary: "Alex struggled across most dimensions. Limited technical knowledge, poor communication, and resistance to changes indicate they're not ready for a mid-level role. Needs significant development.",
            evaluationConfidence: "medium",
          },
          percentiles: { overall: 12, calculatedAt: new Date().toISOString(), totalCandidates: 8 },
          metrics: { totalDurationMinutes: 90, workingPhaseMinutes: 78, coworkersContacted: 1, aiToolsUsed: false, testsStatus: "failing", codeReviewScore: 1 },
        },
        summary: "Alex struggled across most dimensions assessed, demonstrating skills consistently below mid-level expectations. His communication was minimal — short replies with no proactive updates, making it difficult for the team to understand his progress or challenges. When problems arose, he got stuck repeatedly without forming hypotheses or debugging systematically, relying on trial-and-error instead. His React knowledge is basic and he struggled significantly with TypeScript types and component patterns. Perhaps most concerning was his resistance to change: when requirements shifted, he became frustrated, complained about scope, and resisted pivoting — a critical red flag for any engineering role. He asked for help once but didn't act on the feedback received. His one relative bright spot was working consistently throughout the time, though he ultimately delivered incomplete work. Overall, Alex is not ready for a mid-level role and would need significant technical and professional development.",
      },
      // ── Matias Hoyl ── Very weak candidate: avg 1.1 ──
      {
        emailKey: "candidateMatias" as const,
        assessmentId: TEST_ASSESSMENT_IDS.matiasCompleted,
        videoAssessmentId: "test-video-assessment-matias",
        scores: [
          { dimension: "communication", score: 1, observableBehaviors: "Almost no communication. Single-word responses, no questions asked.", trainableGap: true, timestamps: ["20:00"] },
          { dimension: "problem_decomposition_design", score: 1, observableBehaviors: "Could not break down the task. Stared at the screen for extended periods without progress.", trainableGap: true, timestamps: ["10:00", "30:00"] },
          { dimension: "technical_execution", score: 1, observableBehaviors: "Fundamental gaps in React and JavaScript. Could not write basic component logic.", trainableGap: true, timestamps: ["05:00", "15:00", "35:00"] },
          { dimension: "collaboration_coachability", score: 1, observableBehaviors: "Did not reach out to any team member. Worked in complete isolation.", trainableGap: true, timestamps: [] },
          { dimension: "practical_maturity", score: 1, observableBehaviors: "Could not handle the initial requirements, let alone changes.", trainableGap: true, timestamps: [] },
          { dimension: "learning_velocity", score: 1, observableBehaviors: "No decisions made. Appeared overwhelmed and disengaged.", trainableGap: true, timestamps: [] },
          { dimension: "work_process", score: 1, observableBehaviors: "No meaningful code produced. Could not get past initial setup.", trainableGap: true, timestamps: [] },

        ],
        report: {
          overallScore: 1.0,
          recommendation: "no_hire",
          videoEvaluation: {
            evaluationVersion: "1.1.0",
            overallScore: 1.0,
            skills: [
              { dimension: "COMMUNICATION", score: 1, rationale: "Essentially non-communicative.", greenFlags: [], redFlags: ["Single-word responses", "No questions asked", "No proactive communication"], timestamps: ["20:00"] },
              { dimension: "PROBLEM_SOLVING", score: 1, rationale: "Unable to decompose the task.", greenFlags: [], redFlags: ["Could not break down the problem", "Extended idle periods", "No debugging attempts"], timestamps: ["10:00", "30:00"] },
              { dimension: "TECHNICAL_KNOWLEDGE", score: 1, rationale: "Fundamental gaps.", greenFlags: [], redFlags: ["Cannot write basic React components", "JavaScript fundamentals lacking", "Could not set up project"], timestamps: ["05:00", "15:00"] },
              { dimension: "COLLABORATION", score: 1, rationale: "Complete isolation.", greenFlags: [], redFlags: ["No outreach to team", "Did not use available resources", "Worked alone entirely"], timestamps: [] },
              { dimension: "ADAPTABILITY", score: 1, rationale: "Could not handle base requirements.", greenFlags: [], redFlags: ["Overwhelmed by initial scope", "No progress to adapt from"], timestamps: [] },
              { dimension: "LEADERSHIP", score: 1, rationale: "No engagement.", greenFlags: [], redFlags: ["Appeared disengaged", "No decisions made", "Overwhelmed"], timestamps: [] },
              { dimension: "CREATIVITY", score: 1, rationale: "No meaningful output.", greenFlags: [], redFlags: ["No code produced", "Could not get past setup"], timestamps: [] },
              { dimension: "TIME_MANAGEMENT", score: 1, rationale: "No deliverable.", greenFlags: [], redFlags: ["Entire time on setup", "No deliverable produced", "No time awareness"], timestamps: ["05:00", "40:00"] },
            ],
            hiringSignals: {
              overallGreenFlags: ["Showed up and attempted the assessment"],
              overallRedFlags: ["Fundamental skill gaps across all dimensions", "No meaningful output produced", "Appeared overwhelmed and disengaged", "Not ready for any developer role"],
              recommendation: "no_hire",
              recommendationRationale: "Matias demonstrated fundamental gaps across all dimensions. Not ready for a developer role at any level.",
            },
            overallSummary: "Matias was unable to make meaningful progress on the assessment. Fundamental gaps in technical knowledge, communication, and problem-solving were evident throughout.",
            evaluationConfidence: "high",
          },
          percentiles: { overall: 5, calculatedAt: new Date().toISOString(), totalCandidates: 8 },
          metrics: { totalDurationMinutes: 90, workingPhaseMinutes: 85, coworkersContacted: 0, aiToolsUsed: false, testsStatus: "not_run", codeReviewScore: 0 },
        },
        summary: "Matias was unable to make meaningful progress on the assessment, demonstrating fundamental gaps across every dimension evaluated. He spent the entire assessment time attempting to set up the project environment and was unable to produce any meaningful code or deliverable. Communication was essentially non-existent — he gave single-word responses and asked no clarifying questions. He could not break down the task into manageable steps, staring at the screen for extended periods without progress. His technical knowledge showed fundamental gaps in both React and core JavaScript, making it impossible for him to write basic component logic. He worked in complete isolation, not reaching out to any team member for help or guidance. He appeared overwhelmed and disengaged throughout, making no decisions and showing no initiative. This assessment suggests Matias is not currently prepared for a developer role at any level and would need substantial foundational training.",
      },
    ];

    for (const candidate of additionalCandidates) {
      const candidateUser = await prisma.user.findUnique({
        where: { email: TEST_USERS[candidate.emailKey].email },
      });

      if (!candidateUser) {
        console.log(`  ⚠️ ${candidate.emailKey} user not found, skipping`);
        continue;
      }

      // Create the completed assessment with full report
      await prisma.assessment.upsert({
        where: { id: candidate.assessmentId },
        update: {
          status: "COMPLETED",
          scenarioId: recruiterScenario.id,
          prUrl: `https://github.com/skillvee/test-repo/pull/${additionalCandidates.indexOf(candidate) + 3}`,
          report: candidate.report as unknown as Prisma.InputJsonValue,
          completedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last week
        },
        create: {
          id: candidate.assessmentId,
          userId: candidateUser.id,
          scenarioId: recruiterScenario.id,
          status: "COMPLETED",
          prUrl: `https://github.com/skillvee/test-repo/pull/${additionalCandidates.indexOf(candidate) + 3}`,
          report: candidate.report as unknown as Prisma.InputJsonValue,
          completedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Delete existing video assessment for this assessment if any
      const existingVA = await prisma.videoAssessment.findUnique({
        where: { assessmentId: candidate.assessmentId },
      });
      if (existingVA) {
        await prisma.dimensionScore.deleteMany({ where: { assessmentId: existingVA.id } });
        await prisma.videoAssessmentSummary.deleteMany({ where: { assessmentId: existingVA.id } });
        await prisma.videoAssessment.delete({ where: { id: existingVA.id } });
      }

      // Create video assessment
      const va = await prisma.videoAssessment.create({
        data: {
          id: candidate.videoAssessmentId,
          candidateId: candidateUser.id,
          assessmentId: candidate.assessmentId,
          videoUrl: `https://example.com/test-video-${candidate.emailKey}.mp4`,
          status: VideoAssessmentStatus.COMPLETED,
          completedAt: new Date(),
          isSearchable: true,
        },
      });

      // Create dimension scores
      for (const score of candidate.scores) {
        await prisma.dimensionScore.create({
          data: {
            assessmentId: va.id,
            dimension: score.dimension,
            score: score.score,
            observableBehaviors: score.observableBehaviors,
            timestamps: score.timestamps,
            trainableGap: score.trainableGap,
          },
        });
      }

      // Create summary with v3 enriched rawAiResponse
      await prisma.videoAssessmentSummary.create({
        data: {
          assessmentId: va.id,
          overallSummary: candidate.summary,
          rawAiResponse: buildRawAiResponse(candidate) as unknown as Prisma.InputJsonValue,
        },
      });

      console.log(`  ✅ ${TEST_USERS[candidate.emailKey].name}: score ${candidate.report.overallScore} (${candidate.report.recommendation})`);
    }

    // ── Pepito Perez ── Working status (no scores yet) ──
    const pepitoUser = await prisma.user.findUnique({
      where: { email: TEST_USERS.candidatePepito.email },
    });
    if (pepitoUser) {
      await prisma.assessment.upsert({
        where: { id: TEST_ASSESSMENT_IDS.pepitoWorking },
        update: {
          status: "WORKING",
          scenarioId: recruiterScenario.id,
        },
        create: {
          id: TEST_ASSESSMENT_IDS.pepitoWorking,
          userId: pepitoUser.id,
          scenarioId: recruiterScenario.id,
          status: "WORKING",
        },
      });
      console.log(`  ✅ Pepito Perez: Working (in progress)`);
    }
  } else {
    console.log("  ⚠️ Test candidate user not found, skipping recruiter flow assessments");
  }

  // ============================================================================
  // SIMULATION 2: Backend API Engineer at Stripe (senior, 24 candidates)
  // ============================================================================
  console.log("\n🔧 Creating Backend API Engineer simulation (Stripe)...");

  const backendScenario = await prisma.scenario.upsert({
    where: { id: TEST_SCENARIO_IDS.backend },
    update: {
      name: "Backend API Engineer",
      companyName: "Stripe",
      companyDescription: "Stripe builds economic infrastructure for the internet. Our team builds high-throughput payment processing APIs serving millions of requests per second.",
      taskDescription: "Design and implement a rate-limiting middleware for the payments API. Must support per-merchant limits, sliding windows, and graceful degradation under load.",
      repoUrl: "https://github.com/skillvee/stripe-backend-task",
      techStack: ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker"],
      isPublished: true,
      targetLevel: "senior",
      createdById: testRecruiter?.id ?? null,
    },
    create: {
      id: TEST_SCENARIO_IDS.backend,
      name: "Backend API Engineer",
      companyName: "Stripe",
      companyDescription: "Stripe builds economic infrastructure for the internet. Our team builds high-throughput payment processing APIs serving millions of requests per second.",
      taskDescription: "Design and implement a rate-limiting middleware for the payments API. Must support per-merchant limits, sliding windows, and graceful degradation under load.",
      repoUrl: "https://github.com/skillvee/stripe-backend-task",
      techStack: ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker"],
      isPublished: true,
      targetLevel: "senior",
      createdById: testRecruiter?.id ?? null,
    },
  });
  console.log(`  ✅ Backend scenario: ${backendScenario.name}`);

  // Clean up stale assessments for backend scenario
  const knownBackendIds = [
    TEST_ASSESSMENT_IDS.sarahBackend, TEST_ASSESSMENT_IDS.aliceBackend, TEST_ASSESSMENT_IDS.bobBackend,
    TEST_ASSESSMENT_IDS.marcusBackendWorking, TEST_ASSESSMENT_IDS.candidateBackendWelcome,
    TEST_ASSESSMENT_IDS.emmaBackend, TEST_ASSESSMENT_IDS.liamBackend, TEST_ASSESSMENT_IDS.oliviaBackend,
    TEST_ASSESSMENT_IDS.noahBackend, TEST_ASSESSMENT_IDS.avaBackend, TEST_ASSESSMENT_IDS.jamesBackend,
    TEST_ASSESSMENT_IDS.sophiaBackend, TEST_ASSESSMENT_IDS.ethanBackend, TEST_ASSESSMENT_IDS.isabellaBackend,
    TEST_ASSESSMENT_IDS.masonBackend, TEST_ASSESSMENT_IDS.miaBackend, TEST_ASSESSMENT_IDS.lucasBackend,
    TEST_ASSESSMENT_IDS.charlotteBackend, TEST_ASSESSMENT_IDS.henryBackendWorking, TEST_ASSESSMENT_IDS.ameliaBackendWelcome,
    TEST_ASSESSMENT_IDS.carlaBackend, TEST_ASSESSMENT_IDS.alexBackend, TEST_ASSESSMENT_IDS.matiasBackendWelcome,
    TEST_ASSESSMENT_IDS.pepitoBackendWorking,
  ];
  const staleBackend = await prisma.assessment.findMany({
    where: { scenarioId: backendScenario.id, id: { notIn: knownBackendIds } },
    select: { id: true },
  });
  if (staleBackend.length > 0) {
    for (const stale of staleBackend) {
      const va = await prisma.videoAssessment.findUnique({ where: { assessmentId: stale.id } });
      if (va) {
        await prisma.dimensionScore.deleteMany({ where: { assessmentId: va.id } });
        await prisma.videoAssessmentSummary.deleteMany({ where: { assessmentId: va.id } });
        await prisma.videoAssessment.delete({ where: { id: va.id } });
      }
    }
    await prisma.assessment.deleteMany({ where: { scenarioId: backendScenario.id, id: { notIn: knownBackendIds } } });
    console.log(`  🗑️  Cleaned up ${staleBackend.length} stale backend assessment(s)`);
  }

  // Create coworker for backend scenario
  await prisma.coworker.deleteMany({ where: { scenarioId: backendScenario.id } });
  await prisma.coworker.create({
    data: {
      scenarioId: backendScenario.id,
      name: "David Park",
      role: "Staff Engineer",
      personaStyle: "Technically rigorous staff engineer who values system design thinking. Asks pointed questions about scalability and failure modes.",
      knowledge: { teamSize: 12, projectContext: "Payments API platform", techDecisions: ["Redis for rate limiting", "FastAPI for performance"] } as unknown as Prisma.InputJsonValue,
      avatarUrl: null,
      voiceName: "Puck",
    },
  });
  console.log(`  ✅ Coworker: David Park (Staff Engineer)`);

  // Helper to create a completed candidate for a scenario
  async function createCompletedCandidate(opts: {
    emailKey: keyof typeof TEST_USERS;
    assessmentId: string;
    videoAssessmentId: string;
    scenarioId: string;
    overallScore: number;
    recommendation: string;
    summary: string;
    percentile: number;
    scores: Array<{ dimension: string; score: number; observableBehaviors: string; trainableGap: boolean; timestamps: string[] }>;
    daysAgo?: number;
    metrics?: { totalDurationMinutes: number; workingPhaseMinutes: number; coworkersContacted: number; aiToolsUsed: boolean; testsStatus: string; codeReviewScore: number };
  }) {
    const user = await prisma.user.findUnique({ where: { email: TEST_USERS[opts.emailKey].email } });
    if (!user) { console.log(`  ⚠️ ${opts.emailKey} not found, skipping`); return; }

    const completedAt = new Date(Date.now() - (opts.daysAgo ?? Math.random() * 14) * 24 * 60 * 60 * 1000);
    const metrics = opts.metrics ?? { totalDurationMinutes: 70 + Math.floor(Math.random() * 20), workingPhaseMinutes: 55 + Math.floor(Math.random() * 15), coworkersContacted: Math.floor(Math.random() * 4) + 1, aiToolsUsed: Math.random() > 0.3, testsStatus: opts.overallScore >= 2.5 ? "passing" : "failing", codeReviewScore: Math.round(opts.overallScore) };

    // Build skills array for videoEvaluation from dimension scores
    const dimMap: Record<string, string> = {
      communication: "COMMUNICATION", problem_decomposition_design: "PROBLEM_SOLVING",
      technical_execution: "TECHNICAL_KNOWLEDGE", collaboration_coachability: "COLLABORATION",
      practical_maturity: "ADAPTABILITY", learning_velocity: "LEADERSHIP",
      work_process: "CREATIVITY",
    };
    const skills = opts.scores.map(s => ({
      dimension: dimMap[s.dimension] || s.dimension.toUpperCase(),
      score: s.score,
      rationale: s.observableBehaviors,
      greenFlags: s.score >= 3 ? [s.observableBehaviors.split(".")[0]] : [],
      redFlags: s.score <= 2 ? [s.observableBehaviors.split(".")[0]] : [],
      timestamps: s.timestamps,
    }));

    const report = {
      generatedAt: completedAt.toISOString(),
      assessmentId: opts.assessmentId,
      candidateName: TEST_USERS[opts.emailKey].name,
      overallScore: opts.overallScore,
      overallLevel: opts.overallScore >= 3.5 ? "expert" : opts.overallScore >= 2.5 ? "strong" : "developing",
      skillScores: opts.scores.map(s => ({ category: s.dimension, score: s.score, level: s.score >= 3 ? "advanced" : "developing", evidence: [s.observableBehaviors], notes: "" })),
      narrative: { overallSummary: opts.summary, strengths: skills.filter(s => s.score >= 3).map(s => s.rationale.split(".")[0]), areasForImprovement: skills.filter(s => s.score <= 2).map(s => s.rationale.split(".")[0]), notableObservations: [] },
      recommendations: [],
      metrics,
      version: "1.1.0",
      percentiles: { overall: opts.percentile, calculatedAt: completedAt.toISOString(), totalCandidates: 24 },
      videoEvaluation: {
        evaluationVersion: "1.1.0",
        overallScore: opts.overallScore,
        skills,
        hiringSignals: {
          overallGreenFlags: skills.filter(s => s.score >= 3).map(s => s.greenFlags[0]).filter(Boolean),
          overallRedFlags: skills.filter(s => s.score <= 2).map(s => s.redFlags[0]).filter(Boolean),
          recommendation: opts.recommendation,
          recommendationRationale: opts.summary,
        },
        overallSummary: opts.summary,
        evaluationConfidence: "high" as const,
      },
    };

    await prisma.assessment.upsert({
      where: { id: opts.assessmentId },
      update: { status: "COMPLETED", scenarioId: opts.scenarioId, report: report as unknown as Prisma.InputJsonValue, completedAt },
      create: { id: opts.assessmentId, userId: user.id, scenarioId: opts.scenarioId, status: "COMPLETED", report: report as unknown as Prisma.InputJsonValue, completedAt },
    });

    // Delete existing video assessment if any
    const existingVA = await prisma.videoAssessment.findUnique({ where: { assessmentId: opts.assessmentId } });
    if (existingVA) {
      await prisma.dimensionScore.deleteMany({ where: { assessmentId: existingVA.id } });
      await prisma.videoAssessmentSummary.deleteMany({ where: { assessmentId: existingVA.id } });
      await prisma.videoAssessment.delete({ where: { id: existingVA.id } });
    }

    const va = await prisma.videoAssessment.create({
      data: { id: opts.videoAssessmentId, candidateId: user.id, assessmentId: opts.assessmentId, videoUrl: `https://example.com/${opts.videoAssessmentId}.mp4`, status: VideoAssessmentStatus.COMPLETED, completedAt, isSearchable: true },
    });

    for (const score of opts.scores) {
      await prisma.dimensionScore.create({
        data: { assessmentId: va.id, dimension: score.dimension, score: score.score, observableBehaviors: score.observableBehaviors, timestamps: score.timestamps, trainableGap: score.trainableGap },
      });
    }

    await prisma.videoAssessmentSummary.create({
      data: {
        assessmentId: va.id,
        overallSummary: opts.summary,
        rawAiResponse: buildRawAiResponse({ scores: opts.scores, report: report as SeedCandidate["report"], summary: opts.summary }) as unknown as Prisma.InputJsonValue,
      },
    });

    console.log(`  ✅ ${TEST_USERS[opts.emailKey].name}: score ${opts.overallScore} (${opts.recommendation})`);
  }

  // Helper to create a non-completed (WORKING/WELCOME) candidate
  async function createPendingCandidate(opts: { emailKey: keyof typeof TEST_USERS; assessmentId: string; scenarioId: string; status: "WORKING" | "WELCOME" }) {
    const user = await prisma.user.findUnique({ where: { email: TEST_USERS[opts.emailKey].email } });
    if (!user) return;
    await prisma.assessment.upsert({
      where: { id: opts.assessmentId },
      update: { status: opts.status, scenarioId: opts.scenarioId },
      create: { id: opts.assessmentId, userId: user.id, scenarioId: opts.scenarioId, status: opts.status },
    });
    console.log(`  ✅ ${TEST_USERS[opts.emailKey].name}: ${opts.status}`);
  }

  // === Backend scenario candidates (24 total: 18 completed, 3 working, 3 welcome) ===
  const backendCandidates: Parameters<typeof createCompletedCandidate>[0][] = [
    { emailKey: "candidateSarah", assessmentId: TEST_ASSESSMENT_IDS.sarahBackend, videoAssessmentId: "va-sarah-backend", scenarioId: backendScenario.id, overallScore: 3.75, recommendation: "strong_hire", percentile: 96, daysAgo: 2, summary: "Exceptional systems thinker who designed an elegant rate-limiting solution with sliding windows. Deep Python and Redis expertise, outstanding architectural decisions.", scores: [
      { dimension: "communication", score: 4, observableBehaviors: "Proactively documented design decisions and trade-offs.", trainableGap: false, timestamps: ["02:00", "15:00", "35:00"] },
      { dimension: "problem_decomposition_design", score: 4, observableBehaviors: "Expert decomposition of rate-limiting into composable middleware layers.", trainableGap: false, timestamps: ["05:00", "20:00"] },
      { dimension: "technical_execution", score: 4, observableBehaviors: "Deep Redis and Python expertise. Implemented sliding window with atomic operations.", trainableGap: false, timestamps: ["08:00", "22:00", "40:00"] },
      { dimension: "collaboration_coachability", score: 3, observableBehaviors: "Engaged well with the team, shared progress updates regularly.", trainableGap: false, timestamps: ["12:00", "30:00"] },
      { dimension: "practical_maturity", score: 4, observableBehaviors: "Handled edge cases proactively, designed for failure modes.", trainableGap: false, timestamps: ["25:00"] },
      { dimension: "learning_velocity", score: 4, observableBehaviors: "Owned the design end-to-end, drove decisions confidently.", trainableGap: false, timestamps: ["18:00", "42:00"] },
      { dimension: "work_process", score: 3, observableBehaviors: "Solid engineering process. Tests first, then implementation.", trainableGap: false, timestamps: ["10:00", "35:00"] },
    ]},
    { emailKey: "candidateAlice", assessmentId: TEST_ASSESSMENT_IDS.aliceBackend, videoAssessmentId: "va-alice-backend", scenarioId: backendScenario.id, overallScore: 3.25, recommendation: "hire", percentile: 78, daysAgo: 3, summary: "Strong communicator with solid backend fundamentals. Good API design instincts but needs more experience with distributed systems at scale.", scores: [
      { dimension: "communication", score: 4, observableBehaviors: "Clear, structured communication. Excellent PR descriptions.", trainableGap: false, timestamps: ["03:00", "20:00"] },
      { dimension: "problem_decomposition_design", score: 3, observableBehaviors: "Good decomposition but missed some edge cases in distributed scenarios.", trainableGap: false, timestamps: ["08:00", "25:00"] },
      { dimension: "technical_execution", score: 3, observableBehaviors: "Solid Python skills. Some gaps in Redis optimization patterns.", trainableGap: true, timestamps: ["10:00", "30:00", "45:00"] },
      { dimension: "collaboration_coachability", score: 4, observableBehaviors: "Outstanding team engagement. Built on feedback effectively.", trainableGap: false, timestamps: ["15:00", "35:00"] },
      { dimension: "practical_maturity", score: 3, observableBehaviors: "Adapted to feedback well but initially missed failure scenarios.", trainableGap: false, timestamps: ["28:00"] },
      { dimension: "learning_velocity", score: 3, observableBehaviors: "Showed initiative and took ownership of her component.", trainableGap: false, timestamps: ["22:00"] },
      { dimension: "work_process", score: 3, observableBehaviors: "Clean code organization. Good test coverage.", trainableGap: false, timestamps: ["12:00", "38:00"] },
    ]},
    { emailKey: "candidateBob", assessmentId: TEST_ASSESSMENT_IDS.bobBackend, videoAssessmentId: "va-bob-backend", scenarioId: backendScenario.id, overallScore: 2.0, recommendation: "no_hire", percentile: 15, daysAgo: 5, summary: "Struggled with system design complexity. Basic Python knowledge but lacks distributed systems experience needed for senior role.", scores: [
      { dimension: "communication", score: 2, observableBehaviors: "Minimal updates. Did not explain design decisions.", trainableGap: true, timestamps: ["10:00"] },
      { dimension: "problem_decomposition_design", score: 2, observableBehaviors: "Monolithic approach. Did not decompose the rate limiter into components.", trainableGap: true, timestamps: ["15:00", "35:00"] },
      { dimension: "technical_execution", score: 2, observableBehaviors: "Basic Python but struggled with async patterns and Redis.", trainableGap: true, timestamps: ["08:00", "25:00"] },
      { dimension: "collaboration_coachability", score: 2, observableBehaviors: "Did not seek help when stuck on Redis integration.", trainableGap: true, timestamps: ["30:00"] },
      { dimension: "practical_maturity", score: 2, observableBehaviors: "Did not consider failure modes or graceful degradation.", trainableGap: true, timestamps: ["40:00"] },
      { dimension: "learning_velocity", score: 1, observableBehaviors: "Waited for direction on every design decision.", trainableGap: true, timestamps: [] },
      { dimension: "work_process", score: 2, observableBehaviors: "No tests written. Ad-hoc development approach.", trainableGap: true, timestamps: ["20:00"] },
    ]},
    { emailKey: "candidateEmma", assessmentId: TEST_ASSESSMENT_IDS.emmaBackend, videoAssessmentId: "va-emma-backend", scenarioId: backendScenario.id, overallScore: 3.5, recommendation: "strong_hire", percentile: 88, daysAgo: 1, summary: "Impressive senior-level candidate. Designed a highly scalable token-bucket algorithm with Redis Lua scripts. Strong systems thinking and clean code.", scores: [
      { dimension: "communication", score: 3, observableBehaviors: "Clear technical communication. Good at explaining complex trade-offs.", trainableGap: false, timestamps: ["05:00", "25:00"] },
      { dimension: "problem_decomposition_design", score: 4, observableBehaviors: "Broke rate-limiting into token bucket, sliding window, and fixed window strategies.", trainableGap: false, timestamps: ["08:00", "18:00"] },
      { dimension: "technical_execution", score: 4, observableBehaviors: "Expert Redis usage with Lua scripts for atomic rate limiting.", trainableGap: false, timestamps: ["12:00", "30:00", "45:00"] },
      { dimension: "collaboration_coachability", score: 3, observableBehaviors: "Collaborated when needed but preferred deep focus time.", trainableGap: false, timestamps: ["20:00"] },
      { dimension: "practical_maturity", score: 4, observableBehaviors: "Considered failure modes, added circuit breakers and fallback strategies.", trainableGap: false, timestamps: ["28:00", "42:00"] },
      { dimension: "learning_velocity", score: 3, observableBehaviors: "Made confident decisions with clear rationale.", trainableGap: false, timestamps: ["15:00", "35:00"] },
      { dimension: "work_process", score: 4, observableBehaviors: "TDD approach with comprehensive integration tests.", trainableGap: false, timestamps: ["10:00", "32:00"] },
    ]},
    { emailKey: "candidateLiam", assessmentId: TEST_ASSESSMENT_IDS.liamBackend, videoAssessmentId: "va-liam-backend", scenarioId: backendScenario.id, overallScore: 3.0, recommendation: "hire", percentile: 62, daysAgo: 4, summary: "Solid mid-to-senior engineer. Good fundamentals and clean implementation. Needs growth in system design thinking for true senior level.", scores: [
      { dimension: "communication", score: 3, observableBehaviors: "Regular updates and clear explanations.", trainableGap: false, timestamps: ["04:00", "22:00"] },
      { dimension: "problem_decomposition_design", score: 3, observableBehaviors: "Reasonable decomposition. Followed standard patterns.", trainableGap: false, timestamps: ["10:00", "28:00"] },
      { dimension: "technical_execution", score: 3, observableBehaviors: "Good Python and FastAPI knowledge. Standard Redis usage.", trainableGap: false, timestamps: ["08:00", "20:00", "38:00"] },
      { dimension: "collaboration_coachability", score: 3, observableBehaviors: "Engaged with the team appropriately.", trainableGap: false, timestamps: ["15:00", "30:00"] },
      { dimension: "practical_maturity", score: 3, observableBehaviors: "Handled basic edge cases but missed some distributed failure scenarios.", trainableGap: true, timestamps: ["25:00"] },
      { dimension: "learning_velocity", score: 3, observableBehaviors: "Took initiative within scope but didn't push boundaries.", trainableGap: false, timestamps: ["18:00"] },
      { dimension: "work_process", score: 3, observableBehaviors: "Clean code with adequate test coverage.", trainableGap: false, timestamps: ["12:00", "35:00"] },
    ]},
    { emailKey: "candidateOlivia", assessmentId: TEST_ASSESSMENT_IDS.oliviaBackend, videoAssessmentId: "va-olivia-backend", scenarioId: backendScenario.id, overallScore: 3.4, recommendation: "hire", percentile: 82, daysAgo: 2, summary: "Strong problem solver with excellent adaptability. Proposed an innovative approach to distributed rate limiting using consistent hashing.", scores: [
      { dimension: "communication", score: 3, observableBehaviors: "Good written communication. Documented approach thoroughly.", trainableGap: false, timestamps: ["06:00", "28:00"] },
      { dimension: "problem_decomposition_design", score: 4, observableBehaviors: "Innovative decomposition using consistent hashing for distributed rate limiting.", trainableGap: false, timestamps: ["10:00", "22:00"] },
      { dimension: "technical_execution", score: 3, observableBehaviors: "Strong Python skills. Good understanding of distributed systems.", trainableGap: false, timestamps: ["08:00", "25:00", "40:00"] },
      { dimension: "collaboration_coachability", score: 3, observableBehaviors: "Shared ideas and incorporated suggestions from team.", trainableGap: false, timestamps: ["15:00", "32:00"] },
      { dimension: "practical_maturity", score: 4, observableBehaviors: "Excellent at handling ambiguity. Proposed graceful degradation strategies.", trainableGap: false, timestamps: ["20:00", "38:00"] },
      { dimension: "learning_velocity", score: 3, observableBehaviors: "Drove key decisions with clear reasoning.", trainableGap: false, timestamps: ["18:00"] },
      { dimension: "work_process", score: 4, observableBehaviors: "Creative approach to testing distributed behavior.", trainableGap: false, timestamps: ["14:00", "35:00"] },
    ]},
    { emailKey: "candidateNoah", assessmentId: TEST_ASSESSMENT_IDS.noahBackend, videoAssessmentId: "va-noah-backend", scenarioId: backendScenario.id, overallScore: 2.7, recommendation: "no_hire", percentile: 38, daysAgo: 6, summary: "Decent fundamentals but lacks the depth needed for senior. Implementation was functional but not production-ready.", scores: [
      { dimension: "communication", score: 3, observableBehaviors: "Adequate communication. Shared some updates.", trainableGap: false, timestamps: ["05:00", "25:00"] },
      { dimension: "problem_decomposition_design", score: 3, observableBehaviors: "Basic decomposition. Followed tutorial-like approach.", trainableGap: true, timestamps: ["12:00"] },
      { dimension: "technical_execution", score: 3, observableBehaviors: "Working knowledge of Python and Redis but no advanced patterns.", trainableGap: true, timestamps: ["10:00", "30:00"] },
      { dimension: "collaboration_coachability", score: 2, observableBehaviors: "Limited outreach. Mostly worked alone.", trainableGap: true, timestamps: ["20:00"] },
      { dimension: "practical_maturity", score: 2, observableBehaviors: "Did not consider edge cases or failure modes.", trainableGap: true, timestamps: ["35:00"] },
      { dimension: "learning_velocity", score: 3, observableBehaviors: "Followed instructions well but didn't go beyond.", trainableGap: false, timestamps: ["15:00"] },
      { dimension: "work_process", score: 3, observableBehaviors: "Clean code but minimal testing.", trainableGap: true, timestamps: ["22:00"] },
    ]},
    { emailKey: "candidateAva", assessmentId: TEST_ASSESSMENT_IDS.avaBackend, videoAssessmentId: "va-ava-backend", scenarioId: backendScenario.id, overallScore: 3.6, recommendation: "strong_hire", percentile: 92, daysAgo: 1, summary: "Outstanding candidate with deep backend expertise. Implemented a sophisticated multi-tier rate limiting system with excellent observability.", scores: [
      { dimension: "communication", score: 4, observableBehaviors: "Exceptional documentation and communication throughout.", trainableGap: false, timestamps: ["03:00", "18:00", "40:00"] },
      { dimension: "problem_decomposition_design", score: 4, observableBehaviors: "Multi-tier rate limiting with per-endpoint, per-user, and global limits.", trainableGap: false, timestamps: ["07:00", "20:00"] },
      { dimension: "technical_execution", score: 4, observableBehaviors: "Expert Python async patterns. Built custom Redis pipeline for performance.", trainableGap: false, timestamps: ["10:00", "28:00", "45:00"] },
      { dimension: "collaboration_coachability", score: 3, observableBehaviors: "Good team engagement. Shared learnings proactively.", trainableGap: false, timestamps: ["14:00", "32:00"] },
      { dimension: "practical_maturity", score: 4, observableBehaviors: "Added Prometheus metrics and structured logging for observability.", trainableGap: false, timestamps: ["22:00", "38:00"] },
      { dimension: "learning_velocity", score: 3, observableBehaviors: "Confident decision-making with clear justifications.", trainableGap: false, timestamps: ["16:00", "35:00"] },
      { dimension: "work_process", score: 3, observableBehaviors: "Good engineering process with iterative development.", trainableGap: false, timestamps: ["12:00", "30:00"] },
    ]},
    { emailKey: "candidateJames", assessmentId: TEST_ASSESSMENT_IDS.jamesBackend, videoAssessmentId: "va-james-backend", scenarioId: backendScenario.id, overallScore: 2.4, recommendation: "no_hire", percentile: 22, daysAgo: 7, summary: "Struggled with the complexity of distributed rate limiting. Basic Python knowledge but significant gaps in system design and Redis.", scores: [
      { dimension: "communication", score: 2, observableBehaviors: "Sparse communication. Did not share design thinking.", trainableGap: true, timestamps: ["12:00"] },
      { dimension: "problem_decomposition_design", score: 2, observableBehaviors: "Monolithic implementation without clear separation of concerns.", trainableGap: true, timestamps: ["15:00", "30:00"] },
      { dimension: "technical_execution", score: 3, observableBehaviors: "Decent Python basics but struggled with async and Redis.", trainableGap: true, timestamps: ["08:00", "25:00"] },
      { dimension: "collaboration_coachability", score: 2, observableBehaviors: "Worked in isolation. Asked for help only when completely blocked.", trainableGap: true, timestamps: ["28:00"] },
      { dimension: "practical_maturity", score: 3, observableBehaviors: "Accepted feedback gracefully when given.", trainableGap: false, timestamps: ["32:00"] },
      { dimension: "learning_velocity", score: 2, observableBehaviors: "Followed step-by-step but no independent thinking.", trainableGap: true, timestamps: [] },
      { dimension: "work_process", score: 3, observableBehaviors: "Some testing but incomplete coverage.", trainableGap: true, timestamps: ["20:00"] },
    ]},
    { emailKey: "candidateSophia", assessmentId: TEST_ASSESSMENT_IDS.sophiaBackend, videoAssessmentId: "va-sophia-backend", scenarioId: backendScenario.id, overallScore: 3.3, recommendation: "hire", percentile: 75, daysAgo: 3, summary: "Strong collaborator with good backend skills. Excellent at synthesizing feedback and improving her solution iteratively.", scores: [
      { dimension: "communication", score: 4, observableBehaviors: "Outstanding communicator. Shared progress and blockers proactively.", trainableGap: false, timestamps: ["04:00", "18:00", "35:00"] },
      { dimension: "problem_decomposition_design", score: 3, observableBehaviors: "Good decomposition with iterative refinement.", trainableGap: false, timestamps: ["09:00", "24:00"] },
      { dimension: "technical_execution", score: 3, observableBehaviors: "Solid Python and FastAPI skills. Some Redis learning curve.", trainableGap: false, timestamps: ["07:00", "22:00", "38:00"] },
      { dimension: "collaboration_coachability", score: 4, observableBehaviors: "Best collaborator in the cohort. Synthesized feedback brilliantly.", trainableGap: false, timestamps: ["12:00", "28:00", "42:00"] },
      { dimension: "practical_maturity", score: 3, observableBehaviors: "Adapted well to requirement changes.", trainableGap: false, timestamps: ["20:00", "36:00"] },
      { dimension: "learning_velocity", score: 3, observableBehaviors: "Took ownership and drove improvements.", trainableGap: false, timestamps: ["15:00"] },
      { dimension: "work_process", score: 3, observableBehaviors: "Good testing habits and clean code.", trainableGap: false, timestamps: ["10:00", "32:00"] },
    ]},
    { emailKey: "candidateEthan", assessmentId: TEST_ASSESSMENT_IDS.ethanBackend, videoAssessmentId: "va-ethan-backend", scenarioId: backendScenario.id, overallScore: 2.85, recommendation: "no_hire", percentile: 45, daysAgo: 5, summary: "Mid-level engineer attempting senior role. Functional implementation but lacks the depth and ownership expected at senior level.", scores: [
      { dimension: "communication", score: 3, observableBehaviors: "Clear when asked but not proactive.", trainableGap: false, timestamps: ["08:00", "28:00"] },
      { dimension: "problem_decomposition_design", score: 3, observableBehaviors: "Standard approach to rate limiting. No innovation.", trainableGap: false, timestamps: ["12:00", "25:00"] },
      { dimension: "technical_execution", score: 3, observableBehaviors: "Solid implementation but nothing senior-level.", trainableGap: false, timestamps: ["10:00", "30:00"] },
      { dimension: "collaboration_coachability", score: 3, observableBehaviors: "Engaged appropriately with the team.", trainableGap: false, timestamps: ["15:00", "32:00"] },
      { dimension: "practical_maturity", score: 3, observableBehaviors: "Handled requirements adequately.", trainableGap: false, timestamps: ["22:00"] },
      { dimension: "learning_velocity", score: 2, observableBehaviors: "Followed the spec but didn't propose improvements.", trainableGap: true, timestamps: ["18:00"] },
      { dimension: "work_process", score: 3, observableBehaviors: "Reasonable process with some tests.", trainableGap: false, timestamps: ["14:00", "35:00"] },
    ]},
    { emailKey: "candidateIsabella", assessmentId: TEST_ASSESSMENT_IDS.isabellaBackend, videoAssessmentId: "va-isabella-backend", scenarioId: backendScenario.id, overallScore: 3.15, recommendation: "hire", percentile: 68, daysAgo: 4, summary: "Well-rounded candidate with strong adaptability. Pivoted her approach effectively when initial design hit scaling issues.", scores: [
      { dimension: "communication", score: 3, observableBehaviors: "Good communication skills. Shared updates regularly.", trainableGap: false, timestamps: ["05:00", "22:00"] },
      { dimension: "problem_decomposition_design", score: 3, observableBehaviors: "Good decomposition. Pivoted effectively when initial approach didn't scale.", trainableGap: false, timestamps: ["10:00", "28:00"] },
      { dimension: "technical_execution", score: 3, observableBehaviors: "Strong Python fundamentals. Growing Redis expertise.", trainableGap: false, timestamps: ["08:00", "25:00", "40:00"] },
      { dimension: "collaboration_coachability", score: 3, observableBehaviors: "Collaborative and receptive to feedback.", trainableGap: false, timestamps: ["14:00", "30:00"] },
      { dimension: "practical_maturity", score: 4, observableBehaviors: "Excellent adaptability. Recognized scaling issues early and pivoted.", trainableGap: false, timestamps: ["18:00", "35:00"] },
      { dimension: "learning_velocity", score: 3, observableBehaviors: "Showed initiative in redesigning her approach.", trainableGap: false, timestamps: ["20:00"] },
      { dimension: "work_process", score: 3, observableBehaviors: "Solid process with good test coverage.", trainableGap: false, timestamps: ["12:00", "32:00"] },
    ]},
    { emailKey: "candidateMason", assessmentId: TEST_ASSESSMENT_IDS.masonBackend, videoAssessmentId: "va-mason-backend", scenarioId: backendScenario.id, overallScore: 1.7, recommendation: "no_hire", percentile: 8, daysAgo: 8, summary: "Not ready for senior backend role. Fundamental gaps in distributed systems, API design, and Python async patterns.", scores: [
      { dimension: "communication", score: 2, observableBehaviors: "Minimal communication. Did not share progress.", trainableGap: true, timestamps: ["15:00"] },
      { dimension: "problem_decomposition_design", score: 1, observableBehaviors: "Could not decompose the rate-limiting problem effectively.", trainableGap: true, timestamps: ["10:00"] },
      { dimension: "technical_execution", score: 2, observableBehaviors: "Basic Python but no async or Redis experience.", trainableGap: true, timestamps: ["08:00", "30:00"] },
      { dimension: "collaboration_coachability", score: 2, observableBehaviors: "Did not seek help despite being stuck.", trainableGap: true, timestamps: [] },
      { dimension: "practical_maturity", score: 2, observableBehaviors: "Did not handle requirement changes.", trainableGap: true, timestamps: ["25:00"] },
      { dimension: "learning_velocity", score: 1, observableBehaviors: "No ownership. Waited for direction throughout.", trainableGap: true, timestamps: [] },
      { dimension: "work_process", score: 2, observableBehaviors: "No tests. Incomplete implementation.", trainableGap: true, timestamps: ["20:00"] },
    ]},
    { emailKey: "candidateMia", assessmentId: TEST_ASSESSMENT_IDS.miaBackend, videoAssessmentId: "va-mia-backend", scenarioId: backendScenario.id, overallScore: 3.1, recommendation: "hire", percentile: 65, daysAgo: 3, summary: "Good all-around candidate with strong collaboration skills. Solid implementation with room to grow in system design depth.", scores: [
      { dimension: "communication", score: 3, observableBehaviors: "Clear and professional communication.", trainableGap: false, timestamps: ["04:00", "20:00", "38:00"] },
      { dimension: "problem_decomposition_design", score: 3, observableBehaviors: "Good decomposition following established patterns.", trainableGap: false, timestamps: ["09:00", "24:00"] },
      { dimension: "technical_execution", score: 3, observableBehaviors: "Solid Python and Redis basics.", trainableGap: false, timestamps: ["07:00", "22:00"] },
      { dimension: "collaboration_coachability", score: 4, observableBehaviors: "Excellent team player. Helped others while making progress.", trainableGap: false, timestamps: ["12:00", "28:00", "42:00"] },
      { dimension: "practical_maturity", score: 3, observableBehaviors: "Adapted to changes smoothly.", trainableGap: false, timestamps: ["18:00"] },
      { dimension: "learning_velocity", score: 3, observableBehaviors: "Took initiative in her area of focus.", trainableGap: false, timestamps: ["15:00", "35:00"] },
      { dimension: "work_process", score: 3, observableBehaviors: "Clean code with good test coverage.", trainableGap: false, timestamps: ["10:00", "30:00"] },
    ]},
    { emailKey: "candidateLucas", assessmentId: TEST_ASSESSMENT_IDS.lucasBackend, videoAssessmentId: "va-lucas-backend", scenarioId: backendScenario.id, overallScore: 2.3, recommendation: "no_hire", percentile: 18, daysAgo: 6, summary: "Below senior expectations. Functional but shallow implementation. Struggled with system design thinking and distributed concepts.", scores: [
      { dimension: "communication", score: 2, observableBehaviors: "Brief answers. No proactive updates.", trainableGap: true, timestamps: ["10:00"] },
      { dimension: "problem_decomposition_design", score: 2, observableBehaviors: "Flat architecture without clear separation.", trainableGap: true, timestamps: ["14:00", "30:00"] },
      { dimension: "technical_execution", score: 3, observableBehaviors: "Decent Python but lacked Redis depth.", trainableGap: true, timestamps: ["08:00", "25:00"] },
      { dimension: "collaboration_coachability", score: 2, observableBehaviors: "Minimal engagement with team.", trainableGap: true, timestamps: ["22:00"] },
      { dimension: "practical_maturity", score: 2, observableBehaviors: "Did not consider production concerns.", trainableGap: true, timestamps: ["28:00"] },
      { dimension: "learning_velocity", score: 2, observableBehaviors: "Followed a tutorial approach without adaptation.", trainableGap: true, timestamps: [] },
      { dimension: "work_process", score: 3, observableBehaviors: "Some tests but gaps in edge cases.", trainableGap: true, timestamps: ["18:00"] },
    ]},
    { emailKey: "candidateCharlotte", assessmentId: TEST_ASSESSMENT_IDS.charlotteBackend, videoAssessmentId: "va-charlotte-backend", scenarioId: backendScenario.id, overallScore: 3.45, recommendation: "hire", percentile: 85, daysAgo: 2, summary: "Strong senior candidate. Excellent error handling and observability patterns. Clear architectural thinking with production-ready implementation.", scores: [
      { dimension: "communication", score: 4, observableBehaviors: "Excellent written communication. Clear architectural diagrams.", trainableGap: false, timestamps: ["03:00", "18:00", "40:00"] },
      { dimension: "problem_decomposition_design", score: 4, observableBehaviors: "Clean architecture with clear module boundaries.", trainableGap: false, timestamps: ["08:00", "22:00"] },
      { dimension: "technical_execution", score: 3, observableBehaviors: "Strong Python and good Redis patterns. Some optimization opportunities missed.", trainableGap: false, timestamps: ["10:00", "28:00", "42:00"] },
      { dimension: "collaboration_coachability", score: 3, observableBehaviors: "Good collaboration with thoughtful code reviews.", trainableGap: false, timestamps: ["14:00", "32:00"] },
      { dimension: "practical_maturity", score: 4, observableBehaviors: "Production-ready thinking. Excellent error handling.", trainableGap: false, timestamps: ["20:00", "38:00"] },
      { dimension: "learning_velocity", score: 3, observableBehaviors: "Confident decision-making with good reasoning.", trainableGap: false, timestamps: ["16:00"] },
      { dimension: "work_process", score: 3, observableBehaviors: "Structured development with comprehensive testing.", trainableGap: false, timestamps: ["12:00", "35:00"] },
    ]},
    { emailKey: "candidateCarla", assessmentId: TEST_ASSESSMENT_IDS.carlaBackend, videoAssessmentId: "va-carla-backend", scenarioId: backendScenario.id, overallScore: 3.0, recommendation: "hire", percentile: 58, daysAgo: 4, summary: "Creative problem solver with strong collaboration. Good fundamentals but needs more backend systems experience for senior level.", scores: [
      { dimension: "communication", score: 3, observableBehaviors: "Good communication. Regular progress updates.", trainableGap: false, timestamps: ["05:00", "22:00"] },
      { dimension: "problem_decomposition_design", score: 3, observableBehaviors: "Creative approach to the problem. Good decomposition.", trainableGap: false, timestamps: ["10:00", "25:00"] },
      { dimension: "technical_execution", score: 3, observableBehaviors: "Growing backend skills. Solid Python basics.", trainableGap: true, timestamps: ["08:00", "28:00"] },
      { dimension: "collaboration_coachability", score: 4, observableBehaviors: "Outstanding collaboration. Elevated team discussions.", trainableGap: false, timestamps: ["14:00", "30:00", "42:00"] },
      { dimension: "practical_maturity", score: 3, observableBehaviors: "Adapted well to changes in requirements.", trainableGap: false, timestamps: ["18:00"] },
      { dimension: "learning_velocity", score: 2, observableBehaviors: "Could take more ownership of design decisions.", trainableGap: true, timestamps: ["20:00"] },
      { dimension: "work_process", score: 3, observableBehaviors: "Innovative testing approach.", trainableGap: false, timestamps: ["12:00", "35:00"] },
    ]},
    { emailKey: "candidateAlex", assessmentId: TEST_ASSESSMENT_IDS.alexBackend, videoAssessmentId: "va-alex-backend", scenarioId: backendScenario.id, overallScore: 1.85, recommendation: "no_hire", percentile: 10, daysAgo: 9, summary: "Significant gaps in backend engineering. Struggled with the fundamental concepts needed for this role.", scores: [
      { dimension: "communication", score: 2, observableBehaviors: "Minimal communication. Unclear explanations.", trainableGap: true, timestamps: ["12:00"] },
      { dimension: "problem_decomposition_design", score: 2, observableBehaviors: "Could not decompose the problem effectively.", trainableGap: true, timestamps: ["15:00"] },
      { dimension: "technical_execution", score: 2, observableBehaviors: "Limited Python async understanding. No Redis experience.", trainableGap: true, timestamps: ["10:00", "30:00"] },
      { dimension: "collaboration_coachability", score: 2, observableBehaviors: "Asked for help once but didn't apply feedback.", trainableGap: true, timestamps: ["25:00"] },
      { dimension: "practical_maturity", score: 2, observableBehaviors: "Frustrated by complexity of requirements.", trainableGap: true, timestamps: ["28:00"] },
      { dimension: "learning_velocity", score: 1, observableBehaviors: "No initiative. Waited for all direction.", trainableGap: true, timestamps: [] },
      { dimension: "work_process", score: 2, observableBehaviors: "No tests. Incomplete implementation.", trainableGap: true, timestamps: ["20:00"] },
    ]},
  ];

  for (const c of backendCandidates) {
    await createCompletedCandidate(c);
  }

  // Working/Welcome candidates for backend scenario
  await createPendingCandidate({ emailKey: "candidateMarcus", assessmentId: TEST_ASSESSMENT_IDS.marcusBackendWorking, scenarioId: backendScenario.id, status: "WORKING" });
  await createPendingCandidate({ emailKey: "candidate", assessmentId: TEST_ASSESSMENT_IDS.candidateBackendWelcome, scenarioId: backendScenario.id, status: "WELCOME" });
  await createPendingCandidate({ emailKey: "candidateHenry", assessmentId: TEST_ASSESSMENT_IDS.henryBackendWorking, scenarioId: backendScenario.id, status: "WORKING" });
  await createPendingCandidate({ emailKey: "candidateAmelia", assessmentId: TEST_ASSESSMENT_IDS.ameliaBackendWelcome, scenarioId: backendScenario.id, status: "WELCOME" });
  await createPendingCandidate({ emailKey: "candidateMatias", assessmentId: TEST_ASSESSMENT_IDS.matiasBackendWelcome, scenarioId: backendScenario.id, status: "WELCOME" });
  await createPendingCandidate({ emailKey: "candidatePepito", assessmentId: TEST_ASSESSMENT_IDS.pepitoBackendWorking, scenarioId: backendScenario.id, status: "WORKING" });

  console.log(`  📊 Backend scenario: 18 completed + 3 working + 3 welcome = 24 candidates`);

  // ============================================================================
  // SIMULATION 3: React Native Developer at Notion (mid, 3 candidates)
  // ============================================================================
  console.log("\n📱 Creating React Native Developer simulation (Notion)...");

  const mobileScenario = await prisma.scenario.upsert({
    where: { id: TEST_SCENARIO_IDS.mobile },
    update: {
      name: "React Native Developer",
      companyName: "Notion",
      companyDescription: "Notion is the all-in-one workspace for notes, docs, and project management. Our mobile team builds the cross-platform experience used by millions.",
      taskDescription: "Build a drag-and-drop block editor component for the mobile app. Must support text, image, and checklist blocks with smooth animations.",
      repoUrl: "https://github.com/skillvee/notion-mobile-task",
      techStack: ["React Native", "TypeScript", "GraphQL", "Expo"],
      isPublished: true,
      targetLevel: "mid",
      createdById: testRecruiter?.id ?? null,
    },
    create: {
      id: TEST_SCENARIO_IDS.mobile,
      name: "React Native Developer",
      companyName: "Notion",
      companyDescription: "Notion is the all-in-one workspace for notes, docs, and project management. Our mobile team builds the cross-platform experience used by millions.",
      taskDescription: "Build a drag-and-drop block editor component for the mobile app. Must support text, image, and checklist blocks with smooth animations.",
      repoUrl: "https://github.com/skillvee/notion-mobile-task",
      techStack: ["React Native", "TypeScript", "GraphQL", "Expo"],
      isPublished: true,
      targetLevel: "mid",
      createdById: testRecruiter?.id ?? null,
    },
  });
  console.log(`  ✅ Mobile scenario: ${mobileScenario.name}`);

  // Clean up stale assessments for mobile scenario
  const knownMobileIds = [TEST_ASSESSMENT_IDS.carlaMobile, TEST_ASSESSMENT_IDS.alexMobile, TEST_ASSESSMENT_IDS.pepitoMobileWorking];
  const staleMobile = await prisma.assessment.findMany({ where: { scenarioId: mobileScenario.id, id: { notIn: knownMobileIds } }, select: { id: true } });
  if (staleMobile.length > 0) {
    for (const stale of staleMobile) {
      const va = await prisma.videoAssessment.findUnique({ where: { assessmentId: stale.id } });
      if (va) {
        await prisma.dimensionScore.deleteMany({ where: { assessmentId: va.id } });
        await prisma.videoAssessmentSummary.deleteMany({ where: { assessmentId: va.id } });
        await prisma.videoAssessment.delete({ where: { id: va.id } });
      }
    }
    await prisma.assessment.deleteMany({ where: { scenarioId: mobileScenario.id, id: { notIn: knownMobileIds } } });
  }

  await prisma.coworker.deleteMany({ where: { scenarioId: mobileScenario.id } });
  await prisma.coworker.create({
    data: {
      scenarioId: mobileScenario.id,
      name: "Lisa Wong",
      role: "Mobile Lead",
      personaStyle: "Pragmatic mobile lead who cares deeply about UX polish and performance. Gives actionable feedback on animation smoothness and gesture handling.",
      knowledge: { teamSize: 6, projectContext: "Block editor mobile port", techDecisions: ["React Native for cross-platform", "Reanimated for gestures"] } as unknown as Prisma.InputJsonValue,
      avatarUrl: null,
      voiceName: "Kore",
    },
  });
  console.log(`  ✅ Coworker: Lisa Wong (Mobile Lead)`);

  await createCompletedCandidate({
    emailKey: "candidateCarla", assessmentId: TEST_ASSESSMENT_IDS.carlaMobile, videoAssessmentId: "va-carla-mobile", scenarioId: mobileScenario.id,
    overallScore: 3.5, recommendation: "hire", percentile: 90, daysAgo: 2,
    summary: "Excellent mobile developer with strong UX instincts. Built smooth drag-and-drop interactions with polished animations. Great collaborator who elevated the design through proactive feedback.",
    scores: [
      { dimension: "communication", score: 3, observableBehaviors: "Clear updates and good questions about UX requirements.", trainableGap: false, timestamps: ["03:00", "18:00"] },
      { dimension: "problem_decomposition_design", score: 4, observableBehaviors: "Broke the block editor into reusable, composable components.", trainableGap: false, timestamps: ["08:00", "22:00"] },
      { dimension: "technical_execution", score: 4, observableBehaviors: "Expert React Native and Reanimated usage. Smooth 60fps animations.", trainableGap: false, timestamps: ["10:00", "28:00", "42:00"] },
      { dimension: "collaboration_coachability", score: 4, observableBehaviors: "Proactively improved the design based on UX feedback.", trainableGap: false, timestamps: ["14:00", "32:00"] },
      { dimension: "practical_maturity", score: 3, observableBehaviors: "Handled gesture conflicts well when requirements expanded.", trainableGap: false, timestamps: ["20:00"] },
      { dimension: "learning_velocity", score: 3, observableBehaviors: "Took ownership of the animation system.", trainableGap: false, timestamps: ["16:00", "35:00"] },
      { dimension: "work_process", score: 4, observableBehaviors: "Creative approach to block rendering with excellent visual results.", trainableGap: false, timestamps: ["12:00", "30:00"] },
    ],
  });

  await createCompletedCandidate({
    emailKey: "candidateAlex", assessmentId: TEST_ASSESSMENT_IDS.alexMobile, videoAssessmentId: "va-alex-mobile", scenarioId: mobileScenario.id,
    overallScore: 1.75, recommendation: "no_hire", percentile: 10, daysAgo: 5,
    summary: "Struggled with React Native fundamentals. Could not implement gesture handling or animations. Limited mobile development experience.",
    scores: [
      { dimension: "communication", score: 2, observableBehaviors: "Minimal communication about blockers.", trainableGap: true, timestamps: ["10:00"] },
      { dimension: "problem_decomposition_design", score: 2, observableBehaviors: "Could not break down the block editor architecture.", trainableGap: true, timestamps: ["15:00"] },
      { dimension: "technical_execution", score: 1, observableBehaviors: "No React Native experience. Could not set up Reanimated.", trainableGap: true, timestamps: ["08:00", "25:00"] },
      { dimension: "collaboration_coachability", score: 2, observableBehaviors: "Did not seek help despite being completely blocked.", trainableGap: true, timestamps: ["30:00"] },
      { dimension: "practical_maturity", score: 2, observableBehaviors: "Frustrated by mobile-specific challenges.", trainableGap: true, timestamps: ["20:00"] },
      { dimension: "learning_velocity", score: 1, observableBehaviors: "No ownership. Appeared overwhelmed.", trainableGap: true, timestamps: [] },
      { dimension: "work_process", score: 2, observableBehaviors: "No meaningful output produced.", trainableGap: true, timestamps: ["18:00"] },
    ],
  });

  await createPendingCandidate({ emailKey: "candidatePepito", assessmentId: TEST_ASSESSMENT_IDS.pepitoMobileWorking, scenarioId: mobileScenario.id, status: "WORKING" });
  console.log(`  📊 Mobile scenario: 2 completed + 1 working = 3 candidates`);

  // ============================================================================
  // SIMULATION 4: DevOps Engineer at Datadog (draft, no candidates)
  // ============================================================================
  console.log("\n☁️ Creating DevOps Engineer simulation (Datadog, draft)...");

  const devopsScenario = await prisma.scenario.upsert({
    where: { id: TEST_SCENARIO_IDS.devops },
    update: {
      name: "DevOps Engineer",
      companyName: "Datadog",
      companyDescription: "Datadog is the monitoring and analytics platform for cloud-scale infrastructure. Our DevOps team builds the deployment and orchestration systems.",
      taskDescription: "Design a zero-downtime deployment pipeline for a microservices architecture. Implement blue-green deployments with automated canary analysis.",
      repoUrl: null,
      techStack: ["Kubernetes", "Terraform", "AWS", "Go"],
      isPublished: false,
      targetLevel: "senior",
      createdById: testRecruiter?.id ?? null,
    },
    create: {
      id: TEST_SCENARIO_IDS.devops,
      name: "DevOps Engineer",
      companyName: "Datadog",
      companyDescription: "Datadog is the monitoring and analytics platform for cloud-scale infrastructure. Our DevOps team builds the deployment and orchestration systems.",
      taskDescription: "Design a zero-downtime deployment pipeline for a microservices architecture. Implement blue-green deployments with automated canary analysis.",
      repoUrl: null,
      techStack: ["Kubernetes", "Terraform", "AWS", "Go"],
      isPublished: false,
      targetLevel: "senior",
      createdById: testRecruiter?.id ?? null,
    },
  });
  console.log(`  ✅ DevOps scenario (draft): ${devopsScenario.name}`);

  await prisma.coworker.deleteMany({ where: { scenarioId: devopsScenario.id } });
  await prisma.coworker.create({
    data: {
      scenarioId: devopsScenario.id,
      name: "Ryan O'Brien",
      role: "Platform Lead",
      personaStyle: "Experienced platform engineer who values reliability and automation. Expects candidates to think about failure modes and monitoring.",
      knowledge: { teamSize: 8, projectContext: "Platform reliability initiative", techDecisions: ["Kubernetes for orchestration", "Terraform for IaC"] } as unknown as Prisma.InputJsonValue,
      avatarUrl: null,
      voiceName: "Charon",
    },
  });
  console.log(`  ✅ Coworker: Ryan O'Brien (Platform Lead)`);

  // Print summary
  console.log("\n📊 Summary:");
  for (const scenario of [defaultScenario, recruiterScenario, backendScenario, mobileScenario, devopsScenario]) {
    const assessmentCount = await prisma.assessment.count({ where: { scenarioId: scenario.id } });
    const coworkers = await prisma.coworker.count({ where: { scenarioId: scenario.id } });
    console.log(`   ${scenario.name} (${scenario.companyName}): ${assessmentCount} candidates, ${coworkers} coworkers`);
  }

  console.log("\n🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
