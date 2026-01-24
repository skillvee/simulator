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

/**
 * Tests for Conversation → Coworker SetNull behavior.
 *
 * When a coworker is deleted directly (not via scenario cascade), conversations
 * that reference that coworker should have their coworkerId set to null rather
 * than being deleted. This preserves conversation history.
 *
 * @see Issue #159: DI-004
 */
describe("Conversation → Coworker SetNull Behavior", () => {
  let testUserId: string;
  let testScenarioId: string;

  const TEST_PREFIX_SETNULL = `setnull-test-${Date.now()}`;

  beforeAll(async () => {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-user`,
        email: `${TEST_PREFIX_SETNULL}@test.com`,
        name: "SetNull Test User",
      },
    });
    testUserId = user.id;

    // Create a test scenario
    const scenario = await prisma.scenario.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-scenario`,
        name: "SetNull Test Scenario",
        companyName: "Test Company",
        companyDescription: "Test Description",
        taskDescription: "Test Task",
        repoUrl: "https://github.com/test/repo",
        techStack: ["typescript"],
      },
    });
    testScenarioId = scenario.id;
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await prisma.scenario.delete({
        where: { id: testScenarioId },
      });
    } catch {
      // May already be deleted
    }

    try {
      await prisma.user.delete({
        where: { id: testUserId },
      });
    } catch {
      // May already be deleted
    }

    await prisma.$disconnect();
  });

  it("should set coworkerId to null when coworker is deleted", async () => {
    // Create a coworker
    const coworker = await prisma.coworker.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-coworker-1`,
        scenarioId: testScenarioId,
        name: "Test Coworker",
        role: "Developer",
        personaStyle: "friendly",
        knowledge: {},
      },
    });

    // Create an assessment
    const assessment = await prisma.assessment.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-assessment-1`,
        userId: testUserId,
        scenarioId: testScenarioId,
        status: AssessmentStatus.WORKING,
      },
    });

    // Create a conversation with the coworker
    const conversation = await prisma.conversation.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-conversation-1`,
        assessmentId: assessment.id,
        coworkerId: coworker.id,
        type: "voice",
        transcript: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
        ],
      },
    });

    // Verify conversation has coworkerId set
    const conversationBefore = await prisma.conversation.findUnique({
      where: { id: conversation.id },
    });
    expect(conversationBefore?.coworkerId).toBe(coworker.id);

    // Delete the coworker directly
    await prisma.coworker.delete({
      where: { id: coworker.id },
    });

    // Verify conversation still exists but with null coworkerId
    const conversationAfter = await prisma.conversation.findUnique({
      where: { id: conversation.id },
    });
    expect(conversationAfter).not.toBeNull();
    expect(conversationAfter?.coworkerId).toBeNull();

    // Verify transcript is preserved
    expect(conversationAfter?.transcript).toEqual([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ]);
  });

  it("should preserve all conversations with different coworkers when one is deleted", async () => {
    // Create two coworkers
    const coworker1 = await prisma.coworker.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-coworker-2a`,
        scenarioId: testScenarioId,
        name: "Coworker One",
        role: "Manager",
        personaStyle: "professional",
        knowledge: {},
      },
    });

    const coworker2 = await prisma.coworker.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-coworker-2b`,
        scenarioId: testScenarioId,
        name: "Coworker Two",
        role: "Developer",
        personaStyle: "casual",
        knowledge: {},
      },
    });

    // Create an assessment
    const assessment = await prisma.assessment.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-assessment-2`,
        userId: testUserId,
        scenarioId: testScenarioId,
        status: AssessmentStatus.WORKING,
      },
    });

    // Create conversations with each coworker
    const conversation1 = await prisma.conversation.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-conversation-2a`,
        assessmentId: assessment.id,
        coworkerId: coworker1.id,
        type: "voice",
        transcript: [{ role: "user", content: "Talk with manager" }],
      },
    });

    const conversation2 = await prisma.conversation.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-conversation-2b`,
        assessmentId: assessment.id,
        coworkerId: coworker2.id,
        type: "voice",
        transcript: [{ role: "user", content: "Talk with developer" }],
      },
    });

    // Delete only coworker1
    await prisma.coworker.delete({
      where: { id: coworker1.id },
    });

    // Verify conversation1 exists with null coworkerId
    const conv1After = await prisma.conversation.findUnique({
      where: { id: conversation1.id },
    });
    expect(conv1After).not.toBeNull();
    expect(conv1After?.coworkerId).toBeNull();

    // Verify conversation2 still has its coworkerId intact
    const conv2After = await prisma.conversation.findUnique({
      where: { id: conversation2.id },
    });
    expect(conv2After).not.toBeNull();
    expect(conv2After?.coworkerId).toBe(coworker2.id);

    // Cleanup
    await prisma.coworker.delete({
      where: { id: coworker2.id },
    });
  });

  it("should handle HR interview conversations (already null coworkerId) correctly", async () => {
    // Create an assessment
    const assessment = await prisma.assessment.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-assessment-3`,
        userId: testUserId,
        scenarioId: testScenarioId,
        status: AssessmentStatus.HR_INTERVIEW,
      },
    });

    // Create an HR interview conversation (no coworker - simulates HR)
    const hrConversation = await prisma.conversation.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-conversation-hr`,
        assessmentId: assessment.id,
        coworkerId: null, // HR interviews don't have a coworker
        type: "voice",
        transcript: [
          { role: "assistant", content: "Welcome to the HR interview" },
          { role: "user", content: "Thank you" },
        ],
      },
    });

    // Verify HR conversation works with null coworkerId
    const hrConversationFetched = await prisma.conversation.findUnique({
      where: { id: hrConversation.id },
    });
    expect(hrConversationFetched).not.toBeNull();
    expect(hrConversationFetched?.coworkerId).toBeNull();
    expect(hrConversationFetched?.transcript).toHaveLength(2);
  });

  it("should still cascade delete conversations when scenario is deleted", async () => {
    // Create a new scenario specifically for this test
    const localScenario = await prisma.scenario.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-scenario-cascade`,
        name: "Cascade Test Scenario",
        companyName: "Test Company",
        companyDescription: "Test Description",
        taskDescription: "Test Task",
        repoUrl: "https://github.com/test/repo",
        techStack: ["typescript"],
      },
    });

    // Create a coworker in this scenario
    const coworker = await prisma.coworker.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-coworker-cascade`,
        scenarioId: localScenario.id,
        name: "Cascade Coworker",
        role: "Developer",
        personaStyle: "helpful",
        knowledge: {},
      },
    });

    // Create an assessment
    const assessment = await prisma.assessment.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-assessment-cascade`,
        userId: testUserId,
        scenarioId: localScenario.id,
        status: AssessmentStatus.WORKING,
      },
    });

    // Create a conversation with the coworker
    const conversation = await prisma.conversation.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-conversation-cascade`,
        assessmentId: assessment.id,
        coworkerId: coworker.id,
        type: "text",
        transcript: [{ role: "user", content: "Testing cascade" }],
      },
    });

    // Verify all exist
    expect(
      await prisma.coworker.findUnique({ where: { id: coworker.id } })
    ).not.toBeNull();
    expect(
      await prisma.conversation.findUnique({ where: { id: conversation.id } })
    ).not.toBeNull();

    // Delete the scenario (should cascade delete everything)
    await prisma.scenario.delete({
      where: { id: localScenario.id },
    });

    // Verify scenario cascade deleted the coworker
    expect(
      await prisma.coworker.findUnique({ where: { id: coworker.id } })
    ).toBeNull();

    // Verify assessment cascade deleted the conversation
    expect(
      await prisma.assessment.findUnique({ where: { id: assessment.id } })
    ).toBeNull();
    expect(
      await prisma.conversation.findUnique({ where: { id: conversation.id } })
    ).toBeNull();
  });

  it("should handle multiple conversations with same coworker", async () => {
    // Create a coworker
    const coworker = await prisma.coworker.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-coworker-multi`,
        scenarioId: testScenarioId,
        name: "Multi Conversation Coworker",
        role: "Tech Lead",
        personaStyle: "analytical",
        knowledge: {},
      },
    });

    // Create an assessment
    const assessment = await prisma.assessment.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-assessment-multi`,
        userId: testUserId,
        scenarioId: testScenarioId,
        status: AssessmentStatus.WORKING,
      },
    });

    // Create multiple conversations with the same coworker
    const conversation1 = await prisma.conversation.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-conversation-multi-1`,
        assessmentId: assessment.id,
        coworkerId: coworker.id,
        type: "voice",
        transcript: [{ role: "user", content: "First conversation" }],
      },
    });

    const conversation2 = await prisma.conversation.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-conversation-multi-2`,
        assessmentId: assessment.id,
        coworkerId: coworker.id,
        type: "text",
        transcript: [{ role: "user", content: "Second conversation" }],
      },
    });

    const conversation3 = await prisma.conversation.create({
      data: {
        id: `${TEST_PREFIX_SETNULL}-conversation-multi-3`,
        assessmentId: assessment.id,
        coworkerId: coworker.id,
        type: "voice",
        transcript: [{ role: "user", content: "Third conversation" }],
      },
    });

    // Delete the coworker
    await prisma.coworker.delete({
      where: { id: coworker.id },
    });

    // Verify all conversations exist with null coworkerId
    const conv1 = await prisma.conversation.findUnique({
      where: { id: conversation1.id },
    });
    const conv2 = await prisma.conversation.findUnique({
      where: { id: conversation2.id },
    });
    const conv3 = await prisma.conversation.findUnique({
      where: { id: conversation3.id },
    });

    expect(conv1).not.toBeNull();
    expect(conv1?.coworkerId).toBeNull();
    expect(conv1?.transcript).toEqual([
      { role: "user", content: "First conversation" },
    ]);

    expect(conv2).not.toBeNull();
    expect(conv2?.coworkerId).toBeNull();
    expect(conv2?.transcript).toEqual([
      { role: "user", content: "Second conversation" },
    ]);

    expect(conv3).not.toBeNull();
    expect(conv3?.coworkerId).toBeNull();
    expect(conv3?.transcript).toEqual([
      { role: "user", content: "Third conversation" },
    ]);
  });
});
