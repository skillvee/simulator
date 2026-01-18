/**
 * Coworker Persona System
 *
 * Defines types and utilities for building AI coworker personas with distinct
 * personalities and knowledge that candidates must discover through conversation.
 */

import type {
  CoworkerKnowledge,
  PersonalityStyle,
  CoworkerPersona,
  DecorativeTeamMember,
} from "@/types";

// Re-export types for backwards compatibility
export type {
  CoworkerKnowledge,
  PersonalityStyle,
  CoworkerPersona,
  DecorativeTeamMember,
} from "@/types";

/**
 * Build a system prompt for a coworker AI based on their persona
 *
 * @param coworker - The coworker persona data
 * @param context - Additional context (company name, task description, etc.)
 * @returns System prompt string for Gemini
 */
export function buildCoworkerSystemPrompt(
  coworker: CoworkerPersona,
  context: {
    companyName: string;
    candidateName?: string;
    taskDescription?: string;
    techStack?: string[];
  }
): string {
  const knowledgeSection = buildKnowledgeSection(coworker.knowledge);
  const styleGuidelines = getStyleGuidelines(coworker.personaStyle);

  return `You are ${coworker.name}, a ${coworker.role} at ${context.companyName}. You are having a conversation with ${context.candidateName || "a new team member"} who is working on their first task.

## Your Persona
- Name: ${coworker.name}
- Role: ${coworker.role}
- Communication Style: ${coworker.personaStyle}

## Your Knowledge
You hold specific knowledge that the candidate may need for their task. When asked about these topics, provide helpful information. When not asked, don't volunteer information proactively - let them discover what they need.

${knowledgeSection}

## Communication Guidelines
${styleGuidelines}

## Conversation Rules
1. Stay in character as ${coworker.name} throughout the conversation
2. Answer questions fully when the candidate asks about topics you know about
3. If asked about something outside your knowledge, say you don't know or suggest who might
4. Be helpful but don't do their work for them
5. Reference the task context when relevant
${context.taskDescription ? `6. The candidate is working on: "${context.taskDescription.slice(0, 300)}..."` : ""}
${context.techStack?.length ? `7. The tech stack includes: ${context.techStack.join(", ")}` : ""}

## Interaction Style
- Respond naturally as a coworker would in a chat/call
- Keep responses conversational, not like a documentation dump
- If they ask a good question, acknowledge it before answering
- If their question is vague, ask for clarification`;
}

/**
 * Build the knowledge section of the prompt
 */
function buildKnowledgeSection(knowledge: CoworkerKnowledge[]): string {
  if (knowledge.length === 0) {
    return "You don't have specific technical knowledge to share, but you can discuss your role and general processes.";
  }

  const sections = knowledge.map((k) => {
    const criticalMarker = k.isCritical
      ? " [CRITICAL - candidate should discover this]"
      : "";
    return `### ${k.topic}${criticalMarker}
When asked about: ${k.triggerKeywords.join(", ")}
Your response: ${k.response}`;
  });

  return sections.join("\n\n");
}

/**
 * Get communication style guidelines based on persona style
 */
function getStyleGuidelines(personaStyle: string): string {
  // Extract personality hints from the personaStyle string
  const style = personaStyle.toLowerCase();

  const guidelines: string[] = [];

  if (style.includes("formal") || style.includes("professional")) {
    guidelines.push(
      "- Use proper grammar and professional terminology",
      "- Structure your responses clearly",
      "- Address them by name occasionally"
    );
  }

  if (style.includes("casual") || style.includes("friendly")) {
    guidelines.push(
      "- Be warm and approachable",
      "- Use conversational language",
      "- It's okay to use informal phrases like 'yeah', 'cool', 'awesome'"
    );
  }

  if (style.includes("technical") || style.includes("detail")) {
    guidelines.push(
      "- Provide precise technical details",
      "- Use correct terminology",
      "- Include relevant specifics (versions, configurations, etc.)"
    );
  }

  if (style.includes("support") || style.includes("helpful")) {
    guidelines.push(
      "- Proactively offer to help when you sense confusion",
      "- Ask follow-up questions to ensure understanding",
      "- Encourage them when they're on the right track"
    );
  }

  if (style.includes("busy") || style.includes("brief")) {
    guidelines.push(
      "- Keep responses concise",
      "- Get to the point quickly",
      "- Suggest async communication for complex topics"
    );
  }

  // Add the personaStyle itself as the primary guideline
  if (guidelines.length === 0) {
    guidelines.push(`- Follow this communication style: ${personaStyle}`);
  }

  return guidelines.join("\n");
}

/**
 * Parse coworker knowledge from the JSON stored in the database
 */
export function parseCoworkerKnowledge(
  knowledge: unknown
): CoworkerKnowledge[] {
  if (!knowledge || !Array.isArray(knowledge)) {
    return [];
  }

  return knowledge
    .filter(
      (k): k is CoworkerKnowledge =>
        typeof k === "object" &&
        k !== null &&
        typeof k.topic === "string" &&
        Array.isArray(k.triggerKeywords) &&
        typeof k.response === "string"
    )
    .map((k) => ({
      topic: k.topic,
      triggerKeywords: k.triggerKeywords,
      response: k.response,
      isCritical: Boolean(k.isCritical),
    }));
}

/**
 * Decorative offline team members to make the sidebar feel like a real company.
 * These are display-only and do not have full persona data or knowledge.
 */
export const DECORATIVE_TEAM_MEMBERS: DecorativeTeamMember[] = [
  {
    name: "Maya Torres",
    role: "Product Designer",
  },
  {
    name: "Derek Washington",
    role: "Data Scientist",
  },
  {
    name: "Priya Sharma",
    role: "DevOps Engineer",
  },
  {
    name: "Marcus Lee",
    role: "Frontend Engineer",
  },
  {
    name: "Sofia Andersson",
    role: "UX Researcher",
  },
  {
    name: "James O'Brien",
    role: "Backend Engineer",
  },
  {
    name: "Nina Volkov",
    role: "Engineering Manager",
  },
  {
    name: "Carlos Mendez",
    role: "Machine Learning Engineer",
  },
];

/**
 * Get initials from a name for avatar display
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Example coworker personas for seeding/testing
 *
 * Voice assignments:
 * - Male: Orus (Firm), Puck (Upbeat), Fenrir (Excitable), Charon (Informative), Iapetus (Clear)
 * - Female: Aoede (Breezy), Leda (Youthful), Callirrhoe (Easy-going), Vindemiatrix (Gentle), Despina (Smooth)
 */
export const EXAMPLE_COWORKERS: CoworkerPersona[] = [
  {
    name: "Alex Chen",
    role: "Engineering Manager",
    personaStyle:
      "Professional and supportive. Alex is direct but encouraging, balancing being helpful with letting the team grow independently. Uses structured communication but keeps it warm.",
    voiceName: "Charon", // Male - Informative voice matches manager role
    knowledge: [
      {
        topic: "team_structure",
        triggerKeywords: ["team", "who works", "structure", "org", "members"],
        response:
          "We have a great team! There's Jordan (senior dev, knows the codebase inside out), Sam (product manager, owns the roadmap), and Riley (QA lead). Feel free to reach out to any of them - they're all super helpful.",
        isCritical: false,
      },
      {
        topic: "code_review_process",
        triggerKeywords: [
          "code review",
          "PR",
          "pull request",
          "review",
          "approval",
        ],
        response:
          "For code reviews, we need at least one approval from a senior dev before merging. Tag Jordan for technical reviews. Keep PRs small and focused - under 400 lines ideally. We use the PR template for consistency.",
        isCritical: true,
      },
      {
        topic: "expectations",
        triggerKeywords: ["expect", "deadline", "timeline", "when", "how long"],
        response:
          "For your first task, focus on quality over speed. Take the time to understand the codebase. I'd rather you ask questions than make assumptions. No hard deadline, but check in with me if you're blocked.",
        isCritical: false,
      },
    ],
  },
  {
    name: "Jordan Rivera",
    role: "Senior Software Engineer",
    personaStyle:
      "Technical and detail-oriented. Jordan loves diving deep into code details and architectural decisions. Can be a bit terse but always helpful when asked the right questions.",
    voiceName: "Leda", // Female - Youthful voice for technical expert
    knowledge: [
      {
        topic: "authentication",
        triggerKeywords: [
          "auth",
          "login",
          "session",
          "jwt",
          "token",
          "authentication",
        ],
        response:
          "We use JWT tokens with a 24-hour expiry. The auth middleware is in src/middleware/auth.ts. For API routes, use the withAuth wrapper. Make sure to handle the 401 case - users get redirected to /login automatically by the client.",
        isCritical: true,
      },
      {
        topic: "database",
        triggerKeywords: [
          "database",
          "db",
          "prisma",
          "query",
          "schema",
          "migration",
        ],
        response:
          "We use Prisma with PostgreSQL. Schema is in prisma/schema.prisma. Run 'npm run db:migrate' for migrations. Pro tip: use the Prisma Studio ('npm run db:studio') to explore data while debugging.",
        isCritical: true,
      },
      {
        topic: "testing",
        triggerKeywords: ["test", "testing", "vitest", "coverage", "unit test"],
        response:
          "We use Vitest for testing. Run 'npm test' for all tests, 'npm test -- --watch' during development. Aim for 80% coverage on new code. Mock external services - check src/test/mocks for examples.",
        isCritical: false,
      },
      {
        topic: "codebase_architecture",
        triggerKeywords: [
          "architecture",
          "structure",
          "folder",
          "organize",
          "where",
        ],
        response:
          "We follow a feature-based structure. src/features/ has the main business logic, src/lib/ has shared utilities, src/components/ has UI. API routes are in src/app/api/. Check the README for the full map.",
        isCritical: false,
      },
    ],
  },
  {
    name: "Sam Patel",
    role: "Product Manager",
    personaStyle:
      "Friendly and user-focused. Sam always brings the conversation back to user needs and business impact. Casual communication style, often uses emojis and informal language.",
    voiceName: "Puck", // Male - Upbeat voice matches friendly PM style
    knowledge: [
      {
        topic: "requirements",
        triggerKeywords: [
          "requirement",
          "spec",
          "user story",
          "acceptance",
          "criteria",
        ],
        response:
          "The acceptance criteria are in the ticket! But basically: the feature should handle the happy path and show clear error messages for edge cases. Users hate generic errors - always tell them what went wrong and how to fix it.",
        isCritical: true,
      },
      {
        topic: "user_research",
        triggerKeywords: ["user", "research", "feedback", "customer"],
        response:
          "We've had a lot of user feedback on this! The main pain points are: slow load times (users abandon after 3 sec), confusing navigation, and unclear error states. Any improvements here will have big impact.",
        isCritical: false,
      },
      {
        topic: "priorities",
        triggerKeywords: ["priority", "important", "focus", "first", "roadmap"],
        response:
          "Focus on the core functionality first. We can always iterate on nice-to-haves later. Ship something that works well for 80% of cases, then we'll gather feedback and improve. Don't over-engineer!",
        isCritical: false,
      },
    ],
  },
  {
    name: "Riley Kim",
    role: "QA Lead",
    personaStyle:
      "Thorough and methodical. Riley is detail-oriented and thinks about edge cases others miss. Direct communication, asks clarifying questions, always thinking about what could go wrong.",
    voiceName: "Callirrhoe", // Female - Easy-going voice for QA lead
    knowledge: [
      {
        topic: "testing_requirements",
        triggerKeywords: ["qa", "quality", "test case", "edge case", "bug"],
        response:
          "Before marking anything as done, make sure you've tested: happy path, empty states, error states, loading states, and at least one edge case. Check browser console for any warnings or errors. I'll do a thorough review once you're ready.",
        isCritical: true,
      },
      {
        topic: "known_issues",
        triggerKeywords: [
          "known issue",
          "bug",
          "problem",
          "broken",
          "not working",
        ],
        response:
          "Good question! Check our known issues doc in the wiki. There's a race condition in the auth flow that sometimes causes double redirects - if you see that, it's a known thing. Also, the staging environment can be flaky with file uploads.",
        isCritical: false,
      },
      {
        topic: "staging_environment",
        triggerKeywords: ["staging", "environment", "deploy", "preview"],
        response:
          "We deploy to staging automatically on PR creation. Give it 5 minutes after pushing. The preview URL will be in the PR comments. Test there before asking for review - production configs are different from local!",
        isCritical: false,
      },
    ],
  },
];
