import { auth } from "@/auth";
import { db } from "@/server/db";
import type { ChatMessage, CoworkerPersona, ConversationWithMeta } from "@/types";
import { AssessmentStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { gemini } from "@/lib/ai/gemini";
import {
  buildCoworkerMemory,
  formatMemoryForPrompt,
  buildCrossCoworkerContext,
} from "@/lib/ai/conversation-memory";
import { parseCoworkerKnowledge } from "@/lib/ai";
import { buildAgentPrompt } from "@/prompts/build-agent-prompt";
import {
  buildPacingCheckInPrompt,
  buildPacingWrapUpPrompt,
  buildPacingCapPrompt,
} from "@/prompts/manager/pacing";
import { isManager } from "@/lib/utils/coworker";
import { success, error, validateRequest } from "@/lib/api";
import { PacingNudgeSchema } from "@/lib/schemas";
import { createLogger } from "@/lib/core";
import { DEFAULT_LANGUAGE, type SupportedLanguage } from "@/lib/core/language";
import { logAICall } from "@/lib/analysis";

const logger = createLogger("api:chat:pacing-nudge");

const NUDGE_MODEL = "gemini-3-flash-preview";

function buildPacingDirective(nudgeType: "checkin" | "wrapup" | "cap"): string {
  switch (nudgeType) {
    case "checkin":
      return buildPacingCheckInPrompt();
    case "wrapup":
      return buildPacingWrapUpPrompt();
    case "cap":
      return buildPacingCapPrompt();
  }
}

/**
 * POST /api/chat/pacing-nudge
 *
 * Generates a manager-voice Slack nudge (check-in / wrap-up / cap) and
 * persists it to the manager's text conversation so it surfaces in the
 * candidate's chat. Idempotent: each `nudgeType` only fires once per
 * assessment (tracked via `Assessment.pacingNudgesDelivered`), so reloads
 * or retries can't double-message.
 *
 * Only allowed during the heads-down WORKING phase. The cap nudge is
 * what the client uses as the "soft stop" replacement for the legacy
 * auto-finalize-at-cap behavior.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  const validated = await validateRequest(request, PacingNudgeSchema);
  if ("error" in validated) return validated.error;
  const { assessmentId, nudgeType } = validated.data;

  const assessment = await db.assessment.findFirst({
    where: { id: assessmentId, userId: session.user.id },
    include: {
      scenario: { include: { coworkers: true } },
    },
  });

  if (!assessment) {
    return error("Assessment not found", 404, "NOT_FOUND");
  }

  // Pacing nudges only fire during heads-down work. After the candidate has
  // moved on (kickoff/walkthrough/completed) they're no longer relevant.
  if (assessment.status !== AssessmentStatus.WORKING) {
    return error(
      `Cannot fire pacing nudge in ${assessment.status} status — only WORKING.`,
      400,
      "INVALID_STATUS"
    );
  }

  // Idempotency: skip if already delivered.
  if (assessment.pacingNudgesDelivered.includes(nudgeType)) {
    return success({ alreadyDelivered: true, nudgeType });
  }

  const managerCoworker = assessment.scenario.coworkers.find((c) => isManager(c.role));
  if (!managerCoworker) {
    return error("No manager configured for this scenario", 400, "NO_MANAGER");
  }

  // Build context for LLM message generation (mirror manager-start's pattern).
  const allConversations = await db.conversation.findMany({
    where: { assessmentId },
    include: { coworker: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const coworkerConversations: ConversationWithMeta[] = allConversations
    .filter((c) => c.coworkerId === managerCoworker.id)
    .map((c) => ({
      type: c.type as "text" | "voice",
      coworkerId: c.coworkerId,
      messages: (c.transcript as unknown as ChatMessage[]) || [],
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

  const memory = await buildCoworkerMemory(coworkerConversations, managerCoworker.name, {});
  const memoryContext = formatMemoryForPrompt(memory, managerCoworker.name);

  const coworkerMap = new Map<string, string>();
  for (const c of allConversations) {
    if (c.coworker) coworkerMap.set(c.coworker.id, c.coworker.name);
  }
  const crossAgentContext = buildCrossCoworkerContext(
    allConversations.map((c) => ({
      type: c.type as "text" | "voice",
      coworkerId: c.coworkerId,
      messages: (c.transcript as unknown as ChatMessage[]) || [],
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    managerCoworker.id,
    coworkerMap
  );

  const persona: CoworkerPersona = {
    name: managerCoworker.name,
    role: managerCoworker.role,
    personaStyle: managerCoworker.personaStyle,
    personality: managerCoworker.personality as CoworkerPersona["personality"],
    knowledge: parseCoworkerKnowledge(managerCoworker.knowledge),
    avatarUrl: managerCoworker.avatarUrl,
  };

  const resourceLabels = Array.isArray(assessment.scenario.resources)
    ? (assessment.scenario.resources as unknown as Array<{ label: string }>).map((r) => r.label)
    : undefined;

  const language =
    (assessment.scenario.language as SupportedLanguage) || DEFAULT_LANGUAGE;

  const systemPrompt = buildAgentPrompt({
    companyName: assessment.scenario.companyName,
    techStack: assessment.scenario.techStack,
    agent: persona,
    taskDescription: assessment.scenario.taskDescription,
    candidateName: session.user.name || undefined,
    conversationHistory: memoryContext,
    crossAgentContext,
    phase: "ongoing",
    phaseContext: buildPacingDirective(nudgeType),
    media: "chat",
    resourceLabels,
    language,
  });

  // Generate the message.
  let nudgeText = "";
  const tracker = await logAICall({
    assessmentId,
    endpoint: "/api/chat/pacing-nudge",
    promptText: systemPrompt,
    modelVersion: NUDGE_MODEL,
    promptType: "PACING_NUDGE",
    promptVersion: "1.0",
    modelUsed: NUDGE_MODEL,
  }).catch(() => null);

  try {
    const response = await gemini.models.generateContent({
      model: NUDGE_MODEL,
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        {
          role: "model",
          parts: [{ text: "I understand. I'll send the pacing nudge now." }],
        },
        { role: "user", parts: [{ text: "Send the pacing nudge message now." }] },
      ],
    });
    nudgeText = response.text?.trim() || "";
    if (!nudgeText) throw new Error("Empty response");
  } catch (err) {
    logger.warn("LLM pacing nudge generation failed, using fallback", {
      err: err instanceof Error ? err.message : String(err),
      nudgeType,
    });
    const firstName = managerCoworker.name.split(" ")[0];
    nudgeText =
      nudgeType === "checkin"
        ? `hey, how's it going?`
        : nudgeType === "wrapup"
          ? `feel free to start wrapping up whenever — would love to hop on the walkthrough soon.`
          : `okay we're at time — let's hop on the walkthrough now and you can show me where you got to.`;
    // Voice the fallback by including the manager's first name lightly — only on cap so it
    // feels personal at the firmest moment.
    if (nudgeType === "cap") {
      nudgeText = `${firstName} here — ${nudgeText}`;
    }
  }

  await tracker?.complete({
    responseText: nudgeText,
    statusCode: 200,
  }).catch(() => {});

  const timestamp = new Date().toISOString();
  const message: ChatMessage = {
    role: "model",
    text: nudgeText,
    timestamp,
  };

  // Persist to manager conversation + flip the idempotency flag atomically.
  // The conditional `updateMany` below is the dedup primitive: Postgres
  // serializes row updates, so two tabs hitting the same threshold both run
  // their UPDATE, but only one matches the predicate (the loser
  // re-evaluates against the post-commit state and matches 0 rows). The
  // status filter handles the other race: the WORKING gate above is checked
  // pre-LLM, but the candidate can transition to WALKTHROUGH_CALL/COMPLETED
  // during the LLM call — re-checking status inside the claim ensures we
  // don't persist a nudge in the wrong phase.
  const result = await db.$transaction(async (tx) => {
    const claim = await tx.assessment.updateMany({
      where: {
        id: assessmentId,
        status: AssessmentStatus.WORKING,
        NOT: { pacingNudgesDelivered: { has: nudgeType } },
      },
      data: {
        pacingNudgesDelivered: { push: nudgeType },
      },
    });
    if (claim.count === 0) {
      return { alreadyDelivered: true as const };
    }

    const existing = await tx.conversation.findFirst({
      where: { assessmentId, coworkerId: managerCoworker.id, type: "text" },
    });

    const transcript: ChatMessage[] = existing
      ? [...((existing.transcript as unknown as ChatMessage[]) || []), message]
      : [message];

    if (existing) {
      await tx.conversation.update({
        where: { id: existing.id },
        data: { transcript: transcript as unknown as Prisma.InputJsonValue },
      });
    } else {
      await tx.conversation.create({
        data: {
          assessmentId,
          coworkerId: managerCoworker.id,
          type: "text",
          transcript: transcript as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return { alreadyDelivered: false as const };
  });

  if (result.alreadyDelivered) {
    return success({ alreadyDelivered: true, nudgeType });
  }

  logger.info("Pacing nudge delivered", {
    assessmentId,
    nudgeType,
    managerId: managerCoworker.id,
  });

  return success({
    alreadyDelivered: false,
    nudgeType,
    managerId: managerCoworker.id,
    message: { ...message },
  });
}
