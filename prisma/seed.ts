/**
 * Database Seed Script
 *
 * Seeds the database with example scenarios and coworkers for development/testing.
 * Run with: npx tsx prisma/seed.ts
 */

import { PrismaClient, Prisma, AssessmentDimension, VideoAssessmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { EXAMPLE_COWORKERS } from "../src/lib/coworker-persona";

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
      techStack: ["TypeScript", "React", "Node.js", "PostgreSQL", "Redis", "WebSocket"],
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
      techStack: ["TypeScript", "React", "Node.js", "PostgreSQL", "Redis", "WebSocket"],
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
      },
    });
    console.log(`  👤 Created coworker: ${created.name} (${created.role})`);
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
          technologies: ["TypeScript", "React", "Node.js", "PostgreSQL", "Redis"],
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
          honors: ["Dean's List", "ACM Programming Contest - Regional Finalist"],
        },
      ],
      skills: [
        { name: "TypeScript", category: "programming_language" as const, proficiencyLevel: "expert" as const },
        { name: "JavaScript", category: "programming_language" as const, proficiencyLevel: "expert" as const },
        { name: "Python", category: "programming_language" as const, proficiencyLevel: "advanced" as const },
        { name: "Java", category: "programming_language" as const, proficiencyLevel: "intermediate" as const },
        { name: "React", category: "framework" as const, proficiencyLevel: "expert" as const },
        { name: "Node.js", category: "framework" as const, proficiencyLevel: "expert" as const },
        { name: "Next.js", category: "framework" as const, proficiencyLevel: "advanced" as const },
        { name: "Vue.js", category: "framework" as const, proficiencyLevel: "advanced" as const },
        { name: "PostgreSQL", category: "database" as const, proficiencyLevel: "expert" as const },
        { name: "Redis", category: "database" as const, proficiencyLevel: "advanced" as const },
        { name: "MongoDB", category: "database" as const, proficiencyLevel: "intermediate" as const },
        { name: "AWS", category: "cloud" as const, proficiencyLevel: "advanced" as const },
        { name: "Docker", category: "tool" as const, proficiencyLevel: "advanced" as const },
        { name: "Git", category: "tool" as const, proficiencyLevel: "expert" as const },
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

    // Check if assessment exists
    const existingAssessment = await prisma.assessment.findFirst({
      where: {
        userId: testUser.id,
        scenarioId: defaultScenario.id,
      },
    });

    if (existingAssessment) {
      await prisma.assessment.update({
        where: { id: existingAssessment.id },
        data: {
          parsedProfile: testParsedProfile as unknown as Prisma.InputJsonValue,
        },
      });
      console.log(`\n📋 Updated assessment with parsed profile for ${testUser.email}`);
    } else {
      await prisma.assessment.create({
        data: {
          userId: testUser.id,
          scenarioId: defaultScenario.id,
          status: "HR_INTERVIEW",
          parsedProfile: testParsedProfile as unknown as Prisma.InputJsonValue,
        },
      });
      console.log(`\n📋 Created assessment with parsed profile for ${testUser.email}`);
    }

    // Create VideoAssessment with dimension scores for candidate profile testing
    const existingVideoAssessment = await prisma.videoAssessment.findFirst({
      where: { candidateId: testUser.id },
    });

    const videoAssessmentId = existingVideoAssessment?.id || "test-video-assessment";

    const dimensionScores = [
      { dimension: AssessmentDimension.COMMUNICATION, score: 4, observableBehaviors: "Clear and professional communication throughout. Asked clarifying questions when needed.", trainableGap: false },
      { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 5, observableBehaviors: "Excellent problem decomposition. Broke down complex tasks into manageable steps.", trainableGap: false },
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 4, observableBehaviors: "Strong technical foundation demonstrated in code implementation.", trainableGap: false },
      { dimension: AssessmentDimension.COLLABORATION, score: 3, observableBehaviors: "Good teamwork, sought help when stuck. Could improve on proactive communication.", trainableGap: true },
      { dimension: AssessmentDimension.ADAPTABILITY, score: 4, observableBehaviors: "Adapted well to changing requirements and new information.", trainableGap: false },
      { dimension: AssessmentDimension.LEADERSHIP, score: 3, observableBehaviors: "Showed initiative but could take more ownership of decisions.", trainableGap: true },
      { dimension: AssessmentDimension.CREATIVITY, score: 4, observableBehaviors: "Proposed creative solutions to technical challenges.", trainableGap: false },
      { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 5, observableBehaviors: "Excellent prioritization and efficient use of time.", trainableGap: false },
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
            timestamps: ["01:23", "05:45", "12:30"],
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
          overallSummary: "Test User demonstrated strong technical skills and excellent problem-solving abilities throughout the simulation. They showed great time management and adaptability while maintaining professional communication. Areas for growth include proactive collaboration and taking more ownership in leadership situations.",
          rawAiResponse: {} as unknown as Prisma.InputJsonValue,
        },
      });

      console.log(`\n🎬 Updated video assessment with dimension scores for ${testUser.email}`);
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
            timestamps: ["01:23", "05:45", "12:30"],
            trainableGap: score.trainableGap,
          },
        });
      }

      await prisma.videoAssessmentSummary.create({
        data: {
          assessmentId: videoAssessment.id,
          overallSummary: "Test User demonstrated strong technical skills and excellent problem-solving abilities throughout the simulation. They showed great time management and adaptability while maintaining professional communication. Areas for growth include proactive collaboration and taking more ownership in leadership situations.",
          rawAiResponse: {} as unknown as Prisma.InputJsonValue,
        },
      });

      console.log(`\n🎬 Created video assessment with dimension scores for ${testUser.email}`);
      console.log(`   Video Assessment ID: ${videoAssessment.id}`);
    }
  }

  // Print summary
  const coworkerCount = await prisma.coworker.count({
    where: { scenarioId: defaultScenario.id },
  });

  console.log("\n📊 Summary:");
  console.log(`   Scenario: ${defaultScenario.name}`);
  console.log(`   Company: ${defaultScenario.companyName}`);
  console.log(`   Coworkers: ${coworkerCount}`);
  console.log(`   Tech Stack: ${defaultScenario.techStack.join(", ")}`);

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
