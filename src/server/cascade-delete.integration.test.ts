/**
 * Integration tests for cascade delete behavior.
 *
 * These tests verify that database cascade deletes work correctly.
 * They run against the actual database, so they should be run with care.
 *
 * Run with: npm run test:integration
 *
 * @see Issue #156: DI-001
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, AssessmentStatus } from "@prisma/client";

const prisma = new PrismaClient();

// Test IDs with unique prefix to avoid conflicts
const TEST_PREFIX = `cascade-test-${Date.now()}`;

describe("Scenario → Assessment Cascade Delete", () => {
  let testUserId: string;
  let _testScenarioId: string;
  let testAssessmentIds: string[] = [];

  beforeAll(async () => {
    // Create a test user for assessments
    const user = await prisma.user.create({
      data: {
        id: `${TEST_PREFIX}-user`,
        email: `${TEST_PREFIX}@test.com`,
        name: "Cascade Test User",
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test user (cascades to assessments)
    try {
      await prisma.user.delete({
        where: { id: testUserId },
      });
    } catch {
      // User may already be deleted via cascade
    }

    // Clean up any orphaned scenarios
    try {
      await prisma.scenario.deleteMany({
        where: { id: { startsWith: TEST_PREFIX } },
      });
    } catch {
      // May not exist
    }

    await prisma.$disconnect();
  });

  it("should cascade delete assessments when scenario is deleted", async () => {
    // Create a scenario with multiple assessments
    const scenario = await prisma.scenario.create({
      data: {
        id: `${TEST_PREFIX}-scenario-1`,
        name: "Test Scenario for Cascade",
        companyName: "Test Company",
        companyDescription: "Test Description",
        taskDescription: "Test Task",
        repoUrl: "https://github.com/test/repo",
        techStack: ["typescript"],
      },
    });
    _testScenarioId = scenario.id;

    // Create multiple assessments for the scenario
    const assessment1 = await prisma.assessment.create({
      data: {
        id: `${TEST_PREFIX}-assessment-1`,
        userId: testUserId,
        scenarioId: scenario.id,
        status: AssessmentStatus.HR_INTERVIEW,
      },
    });

    const assessment2 = await prisma.assessment.create({
      data: {
        id: `${TEST_PREFIX}-assessment-2`,
        userId: testUserId,
        scenarioId: scenario.id,
        status: AssessmentStatus.WORKING,
      },
    });

    const assessment3 = await prisma.assessment.create({
      data: {
        id: `${TEST_PREFIX}-assessment-3`,
        userId: testUserId,
        scenarioId: scenario.id,
        status: AssessmentStatus.COMPLETED,
      },
    });

    testAssessmentIds = [assessment1.id, assessment2.id, assessment3.id];

    // Verify assessments exist
    const assessmentsBefore = await prisma.assessment.findMany({
      where: { scenarioId: scenario.id },
    });
    expect(assessmentsBefore).toHaveLength(3);

    // Delete the scenario
    await prisma.scenario.delete({
      where: { id: scenario.id },
    });

    // Verify all assessments are deleted (cascade)
    const assessmentsAfter = await prisma.assessment.findMany({
      where: { id: { in: testAssessmentIds } },
    });
    expect(assessmentsAfter).toHaveLength(0);

    // Verify scenario is deleted
    const scenarioAfter = await prisma.scenario.findUnique({
      where: { id: scenario.id },
    });
    expect(scenarioAfter).toBeNull();
  });

  it("should cascade delete nested relations (conversations, recordings, HR assessments)", async () => {
    // Create a scenario
    const scenario = await prisma.scenario.create({
      data: {
        id: `${TEST_PREFIX}-scenario-2`,
        name: "Test Scenario with Nested Relations",
        companyName: "Test Company",
        companyDescription: "Test Description",
        taskDescription: "Test Task",
        repoUrl: "https://github.com/test/repo",
        techStack: ["typescript"],
      },
    });

    // Create an assessment with nested relations
    const assessment = await prisma.assessment.create({
      data: {
        id: `${TEST_PREFIX}-assessment-nested`,
        userId: testUserId,
        scenarioId: scenario.id,
        status: AssessmentStatus.WORKING,
      },
    });

    // Create a conversation for the assessment
    const conversation = await prisma.conversation.create({
      data: {
        id: `${TEST_PREFIX}-conversation`,
        assessmentId: assessment.id,
        type: "text",
        transcript: [],
      },
    });

    // Create a recording for the assessment
    const recording = await prisma.recording.create({
      data: {
        id: `${TEST_PREFIX}-recording`,
        assessmentId: assessment.id,
        type: "screen",
        storageUrl: "https://storage.test/recording.webm",
        startTime: new Date(),
      },
    });

    // Create an HR assessment
    const hrAssessment = await prisma.hRInterviewAssessment.create({
      data: {
        id: `${TEST_PREFIX}-hr-assessment`,
        assessmentId: assessment.id,
        communicationScore: 4,
        professionalismScore: 5,
      },
    });

    // Create an assessment log
    await prisma.assessmentLog.create({
      data: {
        id: `${TEST_PREFIX}-log`,
        assessmentId: assessment.id,
        eventType: "STARTED",
      },
    });

    // Create an API call log
    await prisma.assessmentApiCall.create({
      data: {
        id: `${TEST_PREFIX}-api-call`,
        assessmentId: assessment.id,
        promptText: "Test prompt",
        modelVersion: "test-model",
      },
    });

    // Verify all nested relations exist
    expect(
      await prisma.conversation.findUnique({ where: { id: conversation.id } })
    ).not.toBeNull();
    expect(
      await prisma.recording.findUnique({ where: { id: recording.id } })
    ).not.toBeNull();
    expect(
      await prisma.hRInterviewAssessment.findUnique({
        where: { id: hrAssessment.id },
      })
    ).not.toBeNull();

    // Delete the scenario (should cascade to assessment → nested relations)
    await prisma.scenario.delete({
      where: { id: scenario.id },
    });

    // Verify all nested relations are deleted
    expect(
      await prisma.assessment.findUnique({ where: { id: assessment.id } })
    ).toBeNull();
    expect(
      await prisma.conversation.findUnique({ where: { id: conversation.id } })
    ).toBeNull();
    expect(
      await prisma.recording.findUnique({ where: { id: recording.id } })
    ).toBeNull();
    expect(
      await prisma.hRInterviewAssessment.findUnique({
        where: { id: hrAssessment.id },
      })
    ).toBeNull();
  });

  it("should not affect assessments of other scenarios", async () => {
    // Create two scenarios
    const scenario1 = await prisma.scenario.create({
      data: {
        id: `${TEST_PREFIX}-scenario-isolated-1`,
        name: "Scenario 1",
        companyName: "Company 1",
        companyDescription: "Description 1",
        taskDescription: "Task 1",
        repoUrl: "https://github.com/test/repo1",
        techStack: ["typescript"],
      },
    });

    const scenario2 = await prisma.scenario.create({
      data: {
        id: `${TEST_PREFIX}-scenario-isolated-2`,
        name: "Scenario 2",
        companyName: "Company 2",
        companyDescription: "Description 2",
        taskDescription: "Task 2",
        repoUrl: "https://github.com/test/repo2",
        techStack: ["python"],
      },
    });

    // Create assessments for each scenario
    const assessment1 = await prisma.assessment.create({
      data: {
        id: `${TEST_PREFIX}-assessment-s1`,
        userId: testUserId,
        scenarioId: scenario1.id,
        status: AssessmentStatus.WORKING,
      },
    });

    const assessment2 = await prisma.assessment.create({
      data: {
        id: `${TEST_PREFIX}-assessment-s2`,
        userId: testUserId,
        scenarioId: scenario2.id,
        status: AssessmentStatus.WORKING,
      },
    });

    // Delete scenario 1
    await prisma.scenario.delete({
      where: { id: scenario1.id },
    });

    // Verify assessment1 is deleted (cascade from scenario1)
    expect(
      await prisma.assessment.findUnique({ where: { id: assessment1.id } })
    ).toBeNull();

    // Verify assessment2 still exists (belongs to scenario2)
    expect(
      await prisma.assessment.findUnique({ where: { id: assessment2.id } })
    ).not.toBeNull();

    // Cleanup scenario2
    await prisma.scenario.delete({
      where: { id: scenario2.id },
    });
  });

  it("should handle scenario with coworkers", async () => {
    // Create a scenario with coworkers
    const scenario = await prisma.scenario.create({
      data: {
        id: `${TEST_PREFIX}-scenario-coworkers`,
        name: "Scenario with Coworkers",
        companyName: "Test Company",
        companyDescription: "Test Description",
        taskDescription: "Test Task",
        repoUrl: "https://github.com/test/repo",
        techStack: ["typescript"],
        coworkers: {
          create: [
            {
              id: `${TEST_PREFIX}-coworker-1`,
              name: "Alex Chen",
              role: "Engineering Manager",
              personaStyle: "professional",
              knowledge: {},
            },
            {
              id: `${TEST_PREFIX}-coworker-2`,
              name: "Jordan Smith",
              role: "Senior Developer",
              personaStyle: "technical",
              knowledge: {},
            },
          ],
        },
      },
    });

    // Create an assessment with a conversation linked to a coworker
    const assessment = await prisma.assessment.create({
      data: {
        id: `${TEST_PREFIX}-assessment-coworker`,
        userId: testUserId,
        scenarioId: scenario.id,
        status: AssessmentStatus.WORKING,
      },
    });

    // Create a conversation with a coworker
    await prisma.conversation.create({
      data: {
        id: `${TEST_PREFIX}-conversation-coworker`,
        assessmentId: assessment.id,
        coworkerId: `${TEST_PREFIX}-coworker-1`,
        type: "voice",
        transcript: [{ role: "user", content: "Hello" }],
      },
    });

    // Verify coworkers exist
    const coworkersBefore = await prisma.coworker.findMany({
      where: { scenarioId: scenario.id },
    });
    expect(coworkersBefore).toHaveLength(2);

    // Delete the scenario (should cascade to coworkers, assessments, conversations)
    await prisma.scenario.delete({
      where: { id: scenario.id },
    });

    // Verify all are deleted
    const coworkersAfter = await prisma.coworker.findMany({
      where: { id: { startsWith: TEST_PREFIX } },
    });
    expect(coworkersAfter).toHaveLength(0);

    expect(
      await prisma.assessment.findUnique({ where: { id: assessment.id } })
    ).toBeNull();
  });
});
