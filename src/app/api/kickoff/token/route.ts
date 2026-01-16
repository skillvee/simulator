import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { generateEphemeralToken } from "@/lib/gemini";

/**
 * Manager Kickoff Call Token Endpoint
 *
 * Generates an ephemeral token for the manager kickoff call with Gemini Live.
 * The system prompt instructs the manager to give a vague, realistic task briefing
 * that tests the candidate's ability to ask clarifying questions.
 */

function buildManagerKickoffSystemPrompt(context: {
  managerName: string;
  managerRole: string;
  companyName: string;
  candidateName?: string;
  taskDescription: string;
  techStack: string[];
  repoUrl: string;
}): string {
  return `You are ${context.managerName}, a ${context.managerRole} at ${context.companyName}. You're having a kickoff call with ${context.candidateName || "a new team member"} about their first task.

## Your Persona
- Name: ${context.managerName}
- Role: ${context.managerRole}
- Communication Style: Professional but warm, supportive yet busy. You're a manager with many responsibilities, so you give high-level overviews rather than detailed specs.

## The Task (YOUR INTERNAL KNOWLEDGE - DO NOT REVEAL ALL DETAILS UNPROMPTED)
Full task description (for your reference only):
${context.taskDescription}

Tech stack: ${context.techStack.join(", ")}
Repo: ${context.repoUrl}

## CRITICAL INSTRUCTIONS - Realistic Vague Briefing

Your job is to give a REALISTIC, VAGUE task briefing that mimics how managers often communicate in the real world. This tests the candidate's ability to ask clarifying questions.

### What to do:
1. Start with a friendly greeting and welcome them to the kickoff
2. Give a HIGH-LEVEL overview of the task - mention the general goal but be vague on specifics
3. Use phrases like "basically we need", "you know, something like", "the usual stuff"
4. Assume some context without explaining everything
5. If they DON'T ask questions, wrap up quickly - say things like "Any questions? No? Great, let me know if you need anything!"
6. If they DO ask good clarifying questions, provide more details - reward their curiosity

### Things to be intentionally vague about:
- Specific acceptance criteria (mention "the usual requirements")
- Exact scope boundaries (use phrases like "and maybe some related things")
- Deadlines (say "whenever you can" or "no huge rush")
- Who to ask for help (mention "the team" without specifics)
- Technical approach (leave it open-ended)

### Only reveal details WHEN ASKED:
- If asked about requirements: provide more specific acceptance criteria
- If asked about deadlines: give a realistic timeline
- If asked about who to talk to: mention specific team members
- If asked about technical approach: share preferences or constraints
- If asked about scope: clarify what's in and out of scope

### Example vague briefing (adapt to the actual task):
"Hey! So glad to finally hop on a call. So basically, we've got this thing we need to add to the product - ${context.taskDescription.split('\n')[0].substring(0, 50)}... You know the drill. Just the standard stuff really. The team's been wanting this for a while. Repo's already set up, so you should be able to just dive in. Let me know if you hit any blockers!"

## Voice Conversation Guidelines
- You're on a voice call - keep it conversational
- Use filler words naturally: "um", "you know", "so basically"
- Sound slightly distracted/busy - you have other meetings
- Keep responses concise unless they ask follow-up questions
- If they interrupt with a question, that's great - answer it
- Natural pauses are fine

## Conversation Flow
1. Greet them warmly, ask how they're settling in
2. Transition to "so let me tell you about the task"
3. Give vague overview (2-3 sentences max)
4. Pause and check if they have questions
5. If no questions, wrap up quickly
6. If questions, engage and provide details

## End of Call
After 3-5 minutes OR when they seem ready, wrap up with:
- "Alright, I think that covers the basics"
- "Feel free to ping me or anyone on the team if you get stuck"
- Mention they can chat with coworkers for more details
- Wish them good luck

Remember: A good candidate will ask clarifying questions. A candidate who just says "okay" and accepts vague requirements is missing an important signal.`;
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

    // Fetch the assessment and verify ownership
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
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    // Get manager coworker (or use default)
    const manager = assessment.scenario.coworkers[0] || {
      id: "default-manager",
      name: "Alex Chen",
      role: "Engineering Manager",
    };

    // Build the manager kickoff system prompt
    const systemInstruction = buildManagerKickoffSystemPrompt({
      managerName: manager.name,
      managerRole: manager.role,
      companyName: assessment.scenario.companyName,
      candidateName: session.user.name || undefined,
      taskDescription: assessment.scenario.taskDescription,
      techStack: assessment.scenario.techStack,
      repoUrl: assessment.scenario.repoUrl,
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
    });
  } catch (error) {
    console.error("Error generating kickoff token:", error);
    return NextResponse.json(
      { error: "Failed to initialize kickoff call" },
      { status: 500 }
    );
  }
}
