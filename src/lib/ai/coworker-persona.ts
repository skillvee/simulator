/**
 * Coworker Persona System
 *
 * Defines types and utilities for building AI coworker personas with distinct
 * personalities and knowledge that candidates must discover through conversation.
 */

import type {
  CoworkerKnowledge,
  CoworkerPersona,
  DecorativeTeamMember,
} from "@/types";

// Re-export types for backwards compatibility
export type {
  CoworkerKnowledge,
  CoworkerPersona,
  CoworkerPersonality,
  DecorativeTeamMember,
} from "@/types";

/**
 * Proactive message configuration for coworkers
 */
export interface ProactiveMessage {
  /** The message text to send */
  message: string;
  /** Minutes after assessment start to send this message */
  delayMinutes: number;
  /** Optional condition for when to send this message */
  condition?: "always" | "after-first-manager-message";
}

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
 * Decorative team members to make the sidebar feel like a real company.
 * These members appear "away" or "in-meeting" and respond with a single canned message.
 */
export const DECORATIVE_TEAM_MEMBERS: DecorativeTeamMember[] = [
  {
    name: "Maya Torres",
    role: "Product Designer",
    avatarUrl: "/avatars/maya-torres.jpg",
    statusMessage: "In a design review",
    availability: "in-meeting",
    cannedResponse: "Hey! I'm in a design review right now. I'll be free in about 30 min - ping me then! In the meantime, {managerName} should be able to help.",
    statusSchedule: [
      { status: "in-meeting", statusMessage: "In a design review", startMinutes: 0 },
      { status: "online", statusMessage: "", startMinutes: 20 },
      { status: "away", statusMessage: "Lunch break", startMinutes: 50 },
    ],
  },
  {
    name: "Derek Washington",
    role: "Data Scientist",
    avatarUrl: "/avatars/derek-washington.jpg",
    statusMessage: "Heads down on a data pipeline",
    availability: "online",
    cannedResponse: "Hey! I'm swamped right now working on a data pipeline, but {managerName} might be able to help with that. I'll ping you when I'm free!",
    statusSchedule: [
      { status: "online", statusMessage: "", startMinutes: 0 },
      { status: "in-meeting", statusMessage: "Team sync", startMinutes: 30 },
      { status: "online", statusMessage: "", startMinutes: 45 },
    ],
  },
  {
    name: "Priya Sharma",
    role: "DevOps Engineer",
    avatarUrl: "/avatars/priya-sharma.jpg",
    statusMessage: "Deploying to staging",
    availability: "away",
    cannedResponse: "Hey! I'm in the middle of a staging deployment right now. {managerName} should be able to help in the meantime. I'll reach out once this is done!",
    statusSchedule: [
      { status: "away", statusMessage: "Deploying to staging", startMinutes: 0 },
      { status: "online", statusMessage: "", startMinutes: 10 },
      { status: "in-meeting", statusMessage: "Planning meeting", startMinutes: 35 },
      { status: "online", statusMessage: "", startMinutes: 50 },
    ],
  },
  {
    name: "Marcus Lee",
    role: "Frontend Engineer",
    avatarUrl: "/avatars/marcus-lee.jpg",
    statusMessage: "",
    availability: "online",
    cannedResponse: "Hey! I'm in our team standup at the moment. Should be done in about 15 minutes. Check with {managerName} if it's urgent, otherwise I'll catch up with you after!",
    statusSchedule: [
      { status: "online", statusMessage: "", startMinutes: 0 },
      { status: "away", statusMessage: "Grabbing coffee", startMinutes: 15 },
      { status: "online", statusMessage: "", startMinutes: 25 },
    ],
  },
  {
    name: "Sofia Andersson",
    role: "UX Researcher",
    avatarUrl: "/avatars/sofia-andersson.jpg",
    statusMessage: "Running user interviews",
    availability: "in-meeting",
    cannedResponse: "Hey! I'm running user interviews all morning. {managerName} can probably help you out. I'll be available this afternoon if you still need me!",
    statusSchedule: [
      { status: "in-meeting", statusMessage: "User interviews", startMinutes: 0 },
      { status: "online", statusMessage: "", startMinutes: 30 },
    ],
  },
  {
    name: "James O'Brien",
    role: "Backend Engineer",
    avatarUrl: "/avatars/james-obrien.jpg",
    statusMessage: "",
    availability: "online",
    cannedResponse: "Hey! I'm swamped debugging a production issue right now, but {managerName} might be able to help with that. I'll ping you when I'm free!",
    statusSchedule: [
      { status: "online", statusMessage: "", startMinutes: 0 },
      { status: "away", statusMessage: "Debugging prod issue", startMinutes: 20 },
      { status: "online", statusMessage: "", startMinutes: 40 },
    ],
  },
  {
    name: "Nina Volkov",
    role: "Engineering Manager",
    avatarUrl: "/avatars/nina-volkov.jpg",
    statusMessage: "",
    availability: "online",
    cannedResponse: "Hey! I'm in a 1:1 right now. {managerName} should be able to help you out. I'll be free in about 20 minutes if you need me after!",
    statusSchedule: [
      { status: "online", statusMessage: "", startMinutes: 0 },
      { status: "in-meeting", statusMessage: "1:1 meeting", startMinutes: 25 },
      { status: "online", statusMessage: "", startMinutes: 40 },
      { status: "away", statusMessage: "Lunch", startMinutes: 55 },
    ],
  },
  {
    name: "Carlos Mendez",
    role: "Machine Learning Engineer",
    avatarUrl: "/avatars/carlos-mendez.jpg",
    statusMessage: "",
    availability: "online",
    cannedResponse: "Hey! I'm monitoring a model training run right now and pretty heads down. {managerName} might be able to help with that. I'll ping you when I'm free!",
    statusSchedule: [
      { status: "online", statusMessage: "", startMinutes: 0 },
      { status: "away", statusMessage: "Training model - AFK", startMinutes: 15 },
      { status: "online", statusMessage: "", startMinutes: 45 },
    ],
  },
];

/**
 * Channel message configuration for #general ambient chatter
 */
export interface ChannelMessage {
  senderName: string;
  senderRole: string;
  senderAvatarUrl?: string;
  text: string;
  timestamp: string;
  reactions?: Array<{ emoji: string; count: number }>;
}

/**
 * Pre-scripted messages that appear in #general at the start of the assessment
 * These simulate team activity from earlier that morning
 */
export const GENERAL_CHANNEL_MESSAGES: ChannelMessage[] = [
  {
    senderName: "Nina Volkov",
    senderRole: "Engineering Manager",
    senderAvatarUrl: "/avatars/nina-volkov.jpg",
    text: "Good morning team! Standup in 15 min 🙂",
    timestamp: "9:00 AM",
  },
  {
    senderName: "Marcus Lee",
    senderRole: "Frontend Engineer",
    senderAvatarUrl: "/avatars/marcus-lee.jpg",
    text: "Morning! Just pushed a fix for the flaky test on main",
    timestamp: "9:02 AM",
    reactions: [{ emoji: "👍", count: 3 }],
  },
  {
    senderName: "Derek Washington",
    senderRole: "Data Scientist",
    senderAvatarUrl: "/avatars/derek-washington.jpg",
    text: "Nice, that was annoying 😅",
    timestamp: "9:03 AM",
  },
  {
    senderName: "Priya Sharma",
    senderRole: "DevOps Engineer",
    senderAvatarUrl: "/avatars/priya-sharma.jpg",
    text: "Heads up - deploying config changes to staging in 10 min. Should be quick.",
    timestamp: "9:08 AM",
  },
  {
    senderName: "Sofia Andersson",
    senderRole: "UX Researcher",
    senderAvatarUrl: "/avatars/sofia-andersson.jpg",
    text: "Shared the new user flow wireframes in #design, would love feedback when you get a chance",
    timestamp: "9:15 AM",
    reactions: [{ emoji: "👀", count: 2 }],
  },
  {
    senderName: "James O'Brien",
    senderRole: "Backend Engineer",
    senderAvatarUrl: "/avatars/james-obrien.jpg",
    text: "Quick heads up - the staging DB will be down for maintenance at 11 AM, ~15 min window",
    timestamp: "9:22 AM",
  },
  {
    senderName: "Carlos Mendez",
    senderRole: "ML Engineer",
    senderAvatarUrl: "/avatars/carlos-mendez.jpg",
    text: "New model benchmark results are in. TL;DR: 12% improvement on the recommendation engine 🎉",
    timestamp: "9:30 AM",
    reactions: [{ emoji: "🎉", count: 4 }],
  },
  {
    senderName: "Nina Volkov",
    senderRole: "Engineering Manager",
    senderAvatarUrl: "/avatars/nina-volkov.jpg",
    text: "Great work Carlos! Can you share the full report in #ml-eng?",
    timestamp: "9:31 AM",
  },
  {
    senderName: "Maya Torres",
    senderRole: "Product Designer",
    senderAvatarUrl: "/avatars/maya-torres.jpg",
    text: "Reminder: design review at 10:30. I'll share the Figma link in #design beforehand",
    timestamp: "9:40 AM",
  },
];

/**
 * Ambient messages that appear periodically during the assessment
 * to make the team feel alive
 */
export const AMBIENT_MESSAGES: Array<ChannelMessage & { delayMinutes: number }> = [
  {
    senderName: "Priya Sharma",
    senderRole: "DevOps Engineer",
    senderAvatarUrl: "/avatars/priya-sharma.jpg",
    text: "Staging deploy complete ✅",
    timestamp: "", // Will be set dynamically
    delayMinutes: 10,
  },
  {
    senderName: "Marcus Lee",
    senderRole: "Frontend Engineer",
    senderAvatarUrl: "/avatars/marcus-lee.jpg",
    text: "Anyone else seeing the new ESLint rule flagging optional chaining? Is that intentional?",
    timestamp: "",
    delayMinutes: 20,
  },
  {
    senderName: "Derek Washington",
    senderRole: "Data Scientist",
    senderAvatarUrl: "/avatars/derek-washington.jpg",
    text: "Yeah I think that was in the latest config update. @nina should we revert?",
    timestamp: "",
    delayMinutes: 22,
  },
  {
    senderName: "Nina Volkov",
    senderRole: "Engineering Manager",
    senderAvatarUrl: "/avatars/nina-volkov.jpg",
    text: "Let's keep it for now, we can discuss in standup tomorrow",
    timestamp: "",
    delayMinutes: 24,
  },
  {
    senderName: "James O'Brien",
    senderRole: "Backend Engineer",
    senderAvatarUrl: "/avatars/james-obrien.jpg",
    text: "Staging DB is back up 👍",
    timestamp: "",
    delayMinutes: 35,
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
 * Get proactive messages for a coworker based on their role
 * These messages will be sent automatically during the assessment
 * to make the team feel more alive and realistic.
 *
 * @param coworkerName - The name of the coworker
 * @param coworkerRole - The role of the coworker
 * @returns Array of proactive messages to schedule
 */
export function getProactiveMessages(
  coworkerName: string,
  coworkerRole: string
): ProactiveMessage[] {
  const role = coworkerRole.toLowerCase();

  // Managers already auto-start conversations, so don't send proactive messages
  if (role.includes("manager")) {
    return [];
  }

  // DevOps/Infrastructure Engineers
  if (role.includes("devops") || role.includes("infrastructure") || role.includes("sre")) {
    return [
      {
        message: "Hey, just a heads up - CI is running a bit slow today, deploys are taking ~5 min extra. Nothing to worry about though!",
        delayMinutes: 15,
        condition: "always",
      },
    ];
  }

  // Frontend Engineers
  if (role.includes("frontend") || role.includes("front-end")) {
    return [
      {
        message: "Welcome to the team! If you need any help navigating the frontend codebase, feel free to ask. The component library docs are in /docs/components 👋",
        delayMinutes: 20,
        condition: "always",
      },
    ];
  }

  // Backend Engineers
  if (role.includes("backend") || role.includes("back-end")) {
    return [
      {
        message: "Hey! The auth module has some quirks - happy to walk you through it if you need. Just ping me!",
        delayMinutes: 25,
        condition: "always",
      },
    ];
  }

  // UX/UI Designers or Researchers
  if (role.includes("ux") || role.includes("designer") || role.includes("research")) {
    return [
      {
        message: "Hi! I shared some wireframes in Figma earlier this week - they might be relevant to your task. Let me know if you need the link!",
        delayMinutes: 30,
        condition: "always",
      },
    ];
  }

  // QA/Test Engineers
  if (role.includes("qa") || role.includes("test") || role.includes("quality")) {
    return [
      {
        message: "Hey, welcome aboard! Just a heads up - our staging environment refreshes every night at midnight, so any test data gets wiped. Let me know if you need help setting up test accounts!",
        delayMinutes: 18,
        condition: "always",
      },
    ];
  }

  // Product Managers
  if (role.includes("product") && !role.includes("engineer")) {
    return [
      {
        message: "Hey! Quick reminder that users have been asking for better error messages on this flow. Might be worth keeping that in mind for your task 🙂",
        delayMinutes: 22,
        condition: "always",
      },
    ];
  }

  // Data Scientists/Analysts
  if (role.includes("data") || role.includes("analyst") || role.includes("ml") || role.includes("machine learning")) {
    return [
      {
        message: "Welcome! If you need any user behavior data or analytics for your task, I can pull that for you. Just let me know!",
        delayMinutes: 28,
        condition: "always",
      },
    ];
  }

  // Generic software engineer or other roles - friendly welcome
  return [
    {
      message: "Hey, welcome to the team! Let me know if you have any questions - happy to help! 😊",
      delayMinutes: 20,
      condition: "always",
    },
  ];
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
    personality: {
      warmth: "welcoming",
      helpfulness: "balanced",
      verbosity: "moderate",
      opinionStrength: "opinionated",
      mood: "focused-and-busy",
      relationshipDynamic: "mentoring",
      petPeeves: [
        "Expects you to have read the task description before asking questions about it",
        "Dislikes when people escalate before trying to solve it themselves",
      ],
    },
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
    personality: {
      warmth: "guarded",
      helpfulness: "requires-justification",
      verbosity: "terse",
      opinionStrength: "opinionated",
      mood: "stressed-about-deadline",
      relationshipDynamic: "slightly-territorial",
      petPeeves: [
        "Hates vague questions like 'how does the backend work?' — be specific",
        "Gets frustrated when people don't check existing code before asking",
      ],
    },
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
    personality: {
      warmth: "welcoming",
      helpfulness: "generous",
      verbosity: "verbose",
      opinionStrength: "deferring",
      mood: "upbeat-after-launch",
      relationshipDynamic: "peer-collaborative",
      petPeeves: [
        "Wants user impact framed, not just technical details — 'why does this matter to users?'",
      ],
    },
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
    personality: {
      warmth: "neutral",
      helpfulness: "balanced",
      verbosity: "moderate",
      opinionStrength: "neutral",
      mood: "neutral",
      relationshipDynamic: "indifferent",
      petPeeves: [
        "Hates when people skip writing tests or mark things 'done' without testing edge cases",
      ],
    },
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
