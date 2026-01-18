import { auth } from "@/auth";
import { db } from "@/server/db";
import { generateEphemeralToken } from "@/lib/gemini";
import {
  buildCoworkerMemory,
  formatMemoryForPrompt,
  type ConversationWithMeta,
  type ChatMessage,
} from "@/lib/conversation-memory";
import { fetchPrCiStatus, formatCiStatusForPrompt } from "@/lib/github";
import {
  analyzeCodeReview,
  buildCodeReviewData,
  codeReviewToPrismaJson,
  formatCodeReviewForPrompt,
  type CodeReviewData,
} from "@/lib/code-review";
import { Prisma } from "@prisma/client";
import { buildDefensePrompt } from "@/prompts";
import { success, error } from "@/lib/api-response";
import { validateRequest } from "@/lib/api-validation";
import { DefenseTokenRequestSchema } from "@/lib/schemas";

/**
 * Defense Call Token Endpoint
 *
 * Generates an ephemeral token for the final defense call with Gemini Live.
 * The manager has comprehensive context: PR link, conversation history, and screen analysis.
 */

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const validated = await validateRequest(request, DefenseTokenRequestSchema);
    if ("error" in validated) return validated.error;
    const { assessmentId } = validated.data;

    // Fetch the assessment with all related data
    const assessment = await db.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: session.user.id,
      },
      include: {
        scenario: {
          include: {
            coworkers: {
              where: {
                role: {
                  contains: "Manager",
                  mode: "insensitive",
                },
              },
              take: 1,
            },
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        conversations: true,
        hrAssessment: true,
        recordings: {
          include: {
            segments: {
              include: {
                analysis: true,
              },
            },
          },
        },
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404, "NOT_FOUND");
    }

    if (!assessment.prUrl) {
      return error("No PR URL found. Please submit your PR first.", 400, "PR_REQUIRED");
    }

    // Get manager coworker (or use default)
    const manager = assessment.scenario.coworkers[0] || {
      id: "default-manager",
      name: "Alex Chen",
      role: "Engineering Manager",
      voiceName: null as string | null,
    };

    // Build conversation summary from all conversations
    // Extended type for conversation types (the DB stores more than just text/voice)
    type ExtendedConversationType = "text" | "voice" | "kickoff" | "defense";

    interface ExtendedConversationWithMeta extends Omit<
      ConversationWithMeta,
      "type"
    > {
      type: ExtendedConversationType;
    }

    const allConversations: ExtendedConversationWithMeta[] =
      assessment.conversations.map((conv) => ({
        type: conv.type as ExtendedConversationType,
        coworkerId: conv.coworkerId,
        messages: (conv.transcript as unknown as ChatMessage[]) || [],
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      }));

    // Get memory context for manager (they were in kickoff call)
    const managerConversations = allConversations.filter(
      (c) => c.coworkerId === manager.id || c.type === "kickoff"
    ) as ConversationWithMeta[];
    const managerMemory = await buildCoworkerMemory(
      managerConversations,
      manager.name
    );
    const memoryPrompt = formatMemoryForPrompt(managerMemory, manager.name);

    // Build conversation summary (all conversations)
    let conversationSummary = memoryPrompt;
    const otherConversations = allConversations.filter(
      (c) => c.coworkerId !== manager.id && c.type !== "kickoff"
    );
    if (otherConversations.length > 0) {
      conversationSummary += `\n\n### Other Team Conversations\nThe candidate also had ${otherConversations.length} conversation(s) with other team members.`;
    }

    // Build screen analysis summary
    let screenAnalysisSummary = "";
    const recording = assessment.recordings.find((r) => r.type === "screen");
    if (recording?.analysis) {
      const analysis = recording.analysis as {
        dominantActivity?: string;
        aiToolsUsed?: string[];
        averageFocusScore?: number;
        totalStuckMoments?: number;
      };
      screenAnalysisSummary = `Based on screen recording analysis:
- Primary activity: ${analysis.dominantActivity || "Not determined"}
- AI tools used: ${analysis.aiToolsUsed?.join(", ") || "None detected"}
- Focus score: ${analysis.averageFocusScore ? `${analysis.averageFocusScore}/5` : "Not calculated"}
- Moments of being stuck: ${analysis.totalStuckMoments || 0}`;
    }

    // Build HR interview notes
    let hrInterviewNotes = "";
    if (assessment.hrAssessment) {
      const hr = assessment.hrAssessment;
      hrInterviewNotes = `HR Interview Assessment:
- Communication score: ${hr.communicationScore || "N/A"}/5
- CV consistency: ${hr.cvConsistencyScore || "N/A"}/5
- Professionalism: ${hr.professionalismScore || "N/A"}/5
${hr.communicationNotes ? `- Notes: ${hr.communicationNotes}` : ""}`;
    }

    // Fetch CI status for the PR
    let ciStatusSummary =
      "CI Status: Not available (PR not yet submitted or CI not configured)";
    if (assessment.prUrl) {
      try {
        const ciStatus = await fetchPrCiStatus(assessment.prUrl);
        ciStatusSummary = formatCiStatusForPrompt(ciStatus);
        // Cache the CI status in the assessment
        await db.assessment.update({
          where: { id: assessmentId },
          data: {
            ciStatus: ciStatus as unknown as Prisma.InputJsonValue,
          },
        });
      } catch (error) {
        console.warn("Failed to fetch CI status:", error);
        ciStatusSummary = "CI Status: Failed to fetch from GitHub";
      }
    }

    // Fetch or run code review for the PR
    let codeReviewSummary = "";
    if (assessment.prUrl) {
      try {
        // Check if code review already exists
        const existingAssessment = await db.assessment.findUnique({
          where: { id: assessmentId },
          select: { codeReview: true },
        });

        if (existingAssessment?.codeReview) {
          // Use existing code review
          codeReviewSummary = formatCodeReviewForPrompt(
            existingAssessment.codeReview as unknown as CodeReviewData
          );
        } else {
          // Run code review analysis
          const analysis = await analyzeCodeReview(assessment.prUrl);
          const codeReviewData = buildCodeReviewData(
            assessment.prUrl,
            analysis
          );

          // Cache the code review in the assessment
          await db.assessment.update({
            where: { id: assessmentId },
            data: {
              codeReview: codeReviewToPrismaJson(codeReviewData),
            },
          });

          codeReviewSummary = formatCodeReviewForPrompt(codeReviewData);
        }
      } catch (error) {
        console.warn("Failed to run code review:", error);
        codeReviewSummary = "Code review not available due to an error.";
      }
    }

    // Build the defense system prompt using centralized prompt
    const systemInstruction = buildDefensePrompt({
      managerName: manager.name,
      managerRole: manager.role,
      companyName: assessment.scenario.companyName,
      candidateName: session.user.name || undefined,
      taskDescription: assessment.scenario.taskDescription,
      techStack: assessment.scenario.techStack,
      repoUrl: assessment.scenario.repoUrl,
      prUrl: assessment.prUrl,
      conversationSummary,
      screenAnalysisSummary,
      hrInterviewNotes,
      ciStatusSummary,
      codeReviewSummary,
    });

    // Generate ephemeral token for client-side connection
    // Use manager's configured voice, or fall back to default
    const token = await generateEphemeralToken({
      systemInstruction,
      voiceName: manager.voiceName || undefined,
    });

    return success({
      token,
      assessmentId: assessment.id,
      managerId: manager.id,
      managerName: manager.name,
      managerRole: manager.role,
      prUrl: assessment.prUrl,
    });
  } catch (err) {
    console.error("Error generating defense token:", err);
    return error("Failed to initialize defense call", 500);
  }
}
