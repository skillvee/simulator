import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { generateEphemeralToken } from "@/lib/gemini";
import {
  buildCoworkerMemory,
  formatMemoryForPrompt,
  type ConversationWithMeta,
  type ChatMessage,
} from "@/lib/conversation-memory";
import {
  fetchPrCiStatus,
  formatCiStatusForPrompt,
  type PrCiStatus,
} from "@/lib/github";
import {
  analyzeCodeReview,
  buildCodeReviewData,
  codeReviewToPrismaJson,
  formatCodeReviewForPrompt,
  type CodeReviewData,
} from "@/lib/code-review";
import { Prisma } from "@prisma/client";

/**
 * Defense Call Token Endpoint
 *
 * Generates an ephemeral token for the final defense call with Gemini Live.
 * The manager has comprehensive context: PR link, conversation history, and screen analysis.
 */

interface DefenseContext {
  managerName: string;
  managerRole: string;
  companyName: string;
  candidateName?: string;
  taskDescription: string;
  techStack: string[];
  repoUrl: string;
  prUrl: string;
  conversationSummary: string;
  screenAnalysisSummary: string;
  hrInterviewNotes: string;
  ciStatusSummary: string;
  codeReviewSummary: string;
}

function buildDefenseSystemPrompt(context: DefenseContext): string {
  return `You are ${context.managerName}, a ${context.managerRole} at ${context.companyName}. You're having a final defense call with ${context.candidateName || "the candidate"} where they will walk you through their PR and defend their technical decisions.

## Your Persona
- Name: ${context.managerName}
- Role: ${context.managerRole}
- Communication Style: Professional, curious, and evaluative. You want to understand their thinking process and decision-making.

## The Task Context
Task description: ${context.taskDescription}

Tech stack: ${context.techStack.join(", ")}
Repo: ${context.repoUrl}

## Their PR
PR Link: ${context.prUrl}

### CI/Test Status
${context.ciStatusSummary}

### AI Code Review Analysis
${context.codeReviewSummary || "Code review not yet completed."}

## Your Knowledge About This Candidate

### HR Interview Notes
${context.hrInterviewNotes || "No HR interview notes available."}

### Screen Recording Analysis
${context.screenAnalysisSummary || "No screen analysis available yet."}

### Conversation History Summary
${context.conversationSummary || "No previous conversations recorded."}

## CRITICAL INSTRUCTIONS - Final Defense Call

Your goal is to EVALUATE the candidate's solution by asking probing questions. This is not a casual chat - it's a technical review.

### What to do:
1. Start with a friendly greeting and thank them for completing the task
2. Ask them to walk you through their solution at a high level
3. Ask probing questions about specific technical decisions
4. Explore trade-offs they considered
5. Ask about challenges they faced and how they solved them
6. Inquire about what they would do differently given more time
7. Ask about any edge cases or error handling
8. Wrap up with any final questions

### Types of Questions to Ask:
- "Why did you choose this approach over alternatives?"
- "What trade-offs did you consider here?"
- "How does this handle [edge case]?"
- "I noticed you talked to [coworker] about X - how did that influence your solution?"
- "What was the most challenging part?"
- "If you had more time, what would you improve?"
- "How would this scale if we had 10x the users?"
- "Tell me about your testing strategy"
- "I see the CI tests [passed/failed] - can you walk me through your test coverage?"
- "Did you add any new tests? What scenarios did you test for?"
- "If tests failed, what was the issue and how would you fix it?"

### Things to Probe:
- Code organization and architecture decisions
- Performance considerations
- Error handling approach
- Security considerations (if relevant)
- Testing approach and test coverage
- Whether they added their own tests (this is important!)
- Trade-offs between different solutions
- Communication with team members
- Use of AI tools and how they leveraged them

### Assessment Criteria (Internal - Don't Share):
You are evaluating:
1. Technical depth - Do they understand their code deeply?
2. Decision-making - Can they justify their choices?
3. Communication - Can they explain complex concepts clearly?
4. Problem-solving - How did they approach challenges?
5. Self-awareness - Do they know the limitations of their solution?
6. Growth mindset - What would they do differently?

### Conversation Flow:
1. Warm greeting, congratulate them on submitting
2. "So, walk me through what you built"
3. High-level architecture questions
4. Specific implementation questions
5. Trade-off and decision questions
6. Challenges and problem-solving
7. Future improvements
8. Any final questions from them
9. Thank them and close

### Red Flags to Note:
- Cannot explain their own code
- Defensive when questioned
- Blames tools/team/circumstances
- No awareness of limitations
- Vague or evasive answers

### Green Flags to Note:
- Clear, structured explanations
- Acknowledges trade-offs openly
- Shows learning from challenges
- Considers edge cases
- Thoughtful about improvements
- Good use of team resources

## Voice Conversation Guidelines
- You're on a voice call - keep it conversational but focused
- Listen carefully to their explanations
- Ask follow-up questions when something is unclear
- It's okay to push back gently on weak explanations
- Take notes mentally - the transcript is saved
- Natural pauses are fine, give them time to think
- Sound genuinely interested in their approach

## End of Call
After 10-15 minutes OR when you've covered the key areas, wrap up with:
- "I think I have a good picture of your solution now"
- Ask if they have any questions for you
- Thank them for walking you through it
- Let them know you'll be reviewing everything

Remember: A great candidate can explain their code, justify decisions, and show self-awareness about improvements. A weak candidate is defensive, vague, or cannot explain what they built.`;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { assessmentId } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    if (!assessment.prUrl) {
      return NextResponse.json(
        { error: "No PR URL found. Please submit your PR first." },
        { status: 400 }
      );
    }

    // Get manager coworker (or use default)
    const manager = assessment.scenario.coworkers[0] || {
      id: "default-manager",
      name: "Alex Chen",
      role: "Engineering Manager",
    };

    // Build conversation summary from all conversations
    // Extended type for conversation types (the DB stores more than just text/voice)
    type ExtendedConversationType = "text" | "voice" | "kickoff" | "defense";

    interface ExtendedConversationWithMeta extends Omit<ConversationWithMeta, "type"> {
      type: ExtendedConversationType;
    }

    const allConversations: ExtendedConversationWithMeta[] = assessment.conversations.map(
      (conv) => ({
        type: conv.type as ExtendedConversationType,
        coworkerId: conv.coworkerId,
        messages: (conv.transcript as unknown as ChatMessage[]) || [],
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })
    );

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
    let ciStatusSummary = "CI Status: Not available (PR not yet submitted or CI not configured)";
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
          const codeReviewData = buildCodeReviewData(assessment.prUrl, analysis);

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

    // Build the defense system prompt
    const systemInstruction = buildDefenseSystemPrompt({
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
    const token = await generateEphemeralToken({
      systemInstruction,
    });

    return NextResponse.json({
      token,
      assessmentId: assessment.id,
      managerId: manager.id,
      managerName: manager.name,
      managerRole: manager.role,
      prUrl: assessment.prUrl,
    });
  } catch (error) {
    console.error("Error generating defense token:", error);
    return NextResponse.json(
      { error: "Failed to initialize defense call" },
      { status: 500 }
    );
  }
}
