/**
 * Database Seed Script
 *
 * Seeds the database with example scenarios and coworkers for development/testing.
 * Run with: npx tsx prisma/seed.ts
 */

import {
  PrismaClient,
  Prisma,
  AssessmentDimension,
  VideoAssessmentStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
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
    // TODO: Change to "RECRUITER" after RF-002 schema changes
    role: "USER" as const,
  },
  candidate: {
    email: "candidate@test.com",
    password: "testpassword123",
    name: "Test Candidate",
    role: "USER" as const,
  },
};

// Fixed test assessment IDs - used by AI agents for visual testing
const TEST_ASSESSMENT_IDS = {
  chat: "test-assessment-chat", // Status: WORKING - for chat/sidebar testing
  // Recruiter-focused flow test assessments (RF-001)
  welcome: "test-assessment-welcome", // TODO: Change to WELCOME status after RF-002 schema changes
  workingRecruiter: "test-assessment-working-recruiter", // Status: WORKING - for recruiter flow testing
};

// Fixed test scenario ID for recruiter-focused flow (RF-001)
const TEST_SCENARIO_IDS = {
  recruiter: "test-scenario-recruiter",
};

async function main() {
  console.log("🌱 Starting database seed...\n");

  // Create test users for E2E testing
  console.log("👤 Creating test users...");
  const hashedPassword = await bcrypt.hash(TEST_USERS.admin.password, 12);

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
    // Create or update assessment with parsed profile for Test User
    const testParsedProfile = {
      name: "Test User",
      email: "user@test.com",
      phone: "+1 (555) 123-4567",
      location: "San Francisco, CA",
      linkedIn: "https://linkedin.com/in/testuser",
      github: "https://github.com/testuser",
      website: "https://testuser.dev",
      summary:
        "Senior software engineer with 7+ years of experience building scalable web applications. Passionate about clean code, developer experience, and mentoring junior engineers.",
      workExperience: [
        {
          company: "TechCorp Inc.",
          title: "Senior Software Engineer",
          startDate: "Jan 2021",
          duration: "3 years",
          location: "San Francisco, CA",
          description:
            "Led development of real-time collaboration features serving 100K+ users.",
          highlights: [
            "Architected and shipped WebSocket-based real-time sync, reducing latency by 60%",
            "Mentored team of 4 junior engineers",
            "Improved CI/CD pipeline, cutting deploy time from 30min to 5min",
          ],
          technologies: [
            "TypeScript",
            "React",
            "Node.js",
            "PostgreSQL",
            "Redis",
          ],
        },
        {
          company: "StartupXYZ",
          title: "Full Stack Developer",
          startDate: "Mar 2018",
          endDate: "Dec 2020",
          duration: "2 years 10 months",
          location: "Remote",
          description: "Built core product features from MVP to Series A.",
          highlights: [
            "Implemented payment system processing $2M+ monthly",
            "Built admin dashboard used by 50+ customer success reps",
          ],
          technologies: ["JavaScript", "Vue.js", "Python", "Django", "MySQL"],
        },
        {
          company: "BigTech Co.",
          title: "Software Engineer",
          startDate: "Jun 2016",
          endDate: "Feb 2018",
          duration: "1 year 8 months",
          location: "Seattle, WA",
          highlights: [
            "Developed internal tools used by 1000+ employees",
            "Participated in on-call rotation for critical services",
          ],
          technologies: ["Java", "Spring Boot", "AWS", "Kubernetes"],
        },
      ],
      education: [
        {
          institution: "University of California, Berkeley",
          degree: "Bachelor of Science",
          field: "Computer Science",
          startDate: "2012",
          endDate: "2016",
          gpa: "3.7",
          honors: [
            "Dean's List",
            "ACM Programming Contest - Regional Finalist",
          ],
        },
      ],
      skills: [
        {
          name: "TypeScript",
          category: "programming_language" as const,
          proficiencyLevel: "expert" as const,
        },
        {
          name: "JavaScript",
          category: "programming_language" as const,
          proficiencyLevel: "expert" as const,
        },
        {
          name: "Python",
          category: "programming_language" as const,
          proficiencyLevel: "advanced" as const,
        },
        {
          name: "Java",
          category: "programming_language" as const,
          proficiencyLevel: "intermediate" as const,
        },
        {
          name: "React",
          category: "framework" as const,
          proficiencyLevel: "expert" as const,
        },
        {
          name: "Node.js",
          category: "framework" as const,
          proficiencyLevel: "expert" as const,
        },
        {
          name: "Next.js",
          category: "framework" as const,
          proficiencyLevel: "advanced" as const,
        },
        {
          name: "Vue.js",
          category: "framework" as const,
          proficiencyLevel: "advanced" as const,
        },
        {
          name: "PostgreSQL",
          category: "database" as const,
          proficiencyLevel: "expert" as const,
        },
        {
          name: "Redis",
          category: "database" as const,
          proficiencyLevel: "advanced" as const,
        },
        {
          name: "MongoDB",
          category: "database" as const,
          proficiencyLevel: "intermediate" as const,
        },
        {
          name: "AWS",
          category: "cloud" as const,
          proficiencyLevel: "advanced" as const,
        },
        {
          name: "Docker",
          category: "tool" as const,
          proficiencyLevel: "advanced" as const,
        },
        {
          name: "Git",
          category: "tool" as const,
          proficiencyLevel: "expert" as const,
        },
        { name: "Agile/Scrum", category: "methodology" as const },
        { name: "Technical Leadership", category: "soft_skill" as const },
        { name: "Mentoring", category: "soft_skill" as const },
      ],
      certifications: [
        {
          name: "AWS Solutions Architect - Associate",
          issuer: "Amazon Web Services",
          dateObtained: "Mar 2022",
        },
        {
          name: "Professional Scrum Master I",
          issuer: "Scrum.org",
          dateObtained: "Jan 2021",
        },
      ],
      languages: [
        { language: "English", proficiency: "native" as const },
        { language: "Spanish", proficiency: "conversational" as const },
      ],
      totalYearsOfExperience: 7,
      seniorityLevel: "senior" as const,
      parsedAt: new Date().toISOString(),
      parseQuality: "high" as const,
    };

    // Create test assessment with fixed ID for visual testing
    // Uses WORKING status so chat/sidebar pages are accessible
    await prisma.assessment.upsert({
      where: { id: TEST_ASSESSMENT_IDS.chat },
      update: {
        status: "WORKING",
        parsedProfile: testParsedProfile as unknown as Prisma.InputJsonValue,
      },
      create: {
        id: TEST_ASSESSMENT_IDS.chat,
        userId: testUser.id,
        scenarioId: defaultScenario.id,
        status: "WORKING",
        parsedProfile: testParsedProfile as unknown as Prisma.InputJsonValue,
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
        dimension: AssessmentDimension.COMMUNICATION,
        score: 4,
        observableBehaviors:
          "Clear and professional communication throughout. Asked clarifying questions when needed.",
        trainableGap: false,
        timestamps: ["2:34", "5:12", "15:07"],
      },
      {
        dimension: AssessmentDimension.PROBLEM_SOLVING,
        score: 5,
        observableBehaviors:
          "Excellent problem decomposition. Broke down complex tasks into manageable steps.",
        trainableGap: false,
        timestamps: ["10:45", "22:30"],
      },
      {
        dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE,
        score: 4,
        observableBehaviors:
          "Strong technical foundation demonstrated in code implementation.",
        trainableGap: false,
        timestamps: ["8:15", "18:00", "25:40", "35:20"],
      },
      {
        dimension: AssessmentDimension.COLLABORATION,
        score: 3,
        observableBehaviors:
          "Good teamwork, sought help when stuck. Could improve on proactive communication.",
        trainableGap: true,
        timestamps: ["12:00", "28:15"],
      },
      {
        dimension: AssessmentDimension.ADAPTABILITY,
        score: 4,
        observableBehaviors:
          "Adapted well to changing requirements and new information.",
        trainableGap: false,
        timestamps: ["30:45"],
      },
      {
        dimension: AssessmentDimension.LEADERSHIP,
        score: 3,
        observableBehaviors:
          "Showed initiative but could take more ownership of decisions.",
        trainableGap: true,
        timestamps: [],
      },
      {
        dimension: AssessmentDimension.CREATIVITY,
        score: 4,
        observableBehaviors:
          "Proposed creative solutions to technical challenges.",
        trainableGap: false,
        timestamps: ["1:05:30", "1:15:00"],
      },
      {
        dimension: AssessmentDimension.TIME_MANAGEMENT,
        score: 5,
        observableBehaviors:
          "Excellent prioritization and efficient use of time.",
        trainableGap: false,
        timestamps: ["5:00", "20:00", "45:00"],
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

  // Create test scenario for recruiter flow
  const recruiterScenario = await prisma.scenario.upsert({
    where: { id: TEST_SCENARIO_IDS.recruiter },
    update: {
      name: "Frontend Developer Assessment",
      companyName: "Test Recruiter Company",
      companyDescription: `Test Recruiter Company is a technology company focused on building modern web applications.

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
    },
    create: {
      id: TEST_SCENARIO_IDS.recruiter,
      name: "Frontend Developer Assessment",
      companyName: "Test Recruiter Company",
      companyDescription: `Test Recruiter Company is a technology company focused on building modern web applications.

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
    },
  });

  console.log(`  ✅ Recruiter scenario: ${recruiterScenario.name}`);

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
    // TODO: Change to WELCOME status after RF-002 schema changes
    await prisma.assessment.upsert({
      where: { id: TEST_ASSESSMENT_IDS.welcome },
      update: {
        status: "ONBOARDING", // TODO: Change to WELCOME after RF-002
        scenarioId: recruiterScenario.id,
      },
      create: {
        id: TEST_ASSESSMENT_IDS.welcome,
        userId: testCandidate.id,
        scenarioId: recruiterScenario.id,
        status: "ONBOARDING", // TODO: Change to WELCOME after RF-002
      },
    });
    console.log(`  ✅ Welcome assessment: ${TEST_ASSESSMENT_IDS.welcome}`);
    console.log(`     Status: ONBOARDING (TODO: change to WELCOME)`);

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
  } else {
    console.log("  ⚠️ Test candidate user not found, skipping recruiter flow assessments");
  }

  // Print summary
  const coworkerCount = await prisma.coworker.count({
    where: { scenarioId: defaultScenario.id },
  });

  const recruiterCoworkerCount = await prisma.coworker.count({
    where: { scenarioId: recruiterScenario.id },
  });

  console.log("\n📊 Summary:");
  console.log(`   Default Scenario: ${defaultScenario.name}`);
  console.log(`   Company: ${defaultScenario.companyName}`);
  console.log(`   Coworkers: ${coworkerCount}`);
  console.log(`   Tech Stack: ${defaultScenario.techStack.join(", ")}`);
  console.log("");
  console.log(`   Recruiter Scenario: ${recruiterScenario.name}`);
  console.log(`   Company: ${recruiterScenario.companyName}`);
  console.log(`   Coworkers: ${recruiterCoworkerCount}`);
  console.log(`   Tech Stack: ${recruiterScenario.techStack.join(", ")}`);

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
