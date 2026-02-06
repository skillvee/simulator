/**
 * Rubric Seed Data
 *
 * Seeds the assessment rubric system with:
 * - 6 Role Families (Engineering, Product, Data Science, Program Management, Sales, Customer Success)
 * - 3 Universal Dimensions + 3-4 Role-Specific Dimensions per family
 * - 4-level rubric with behavioral anchors per dimension (with role-family overrides for universal dims)
 * - Archetypes per role family with numeric weights
 * - Seniority gates (Junior/Mid/Senior) per archetype
 * - Red flags per role family
 *
 * Run: npx tsx prisma/seed-rubrics.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================================
// UNIVERSAL DIMENSIONS (shared across all role families)
// ============================================================================

const UNIVERSAL_DIMENSIONS = [
  {
    slug: "communication",
    name: "Communication",
    description:
      "Clarity, listening, adaptation to audience, ability to explain and defend decisions.",
    isUniversal: true,
    defaultRubric: [
      {
        level: 1,
        label: "Foundational",
        pattern:
          "Struggles to convey ideas clearly; communication creates friction rather than reducing it.",
        evidence: [
          "Responses are vague, unfocused, or hard to follow",
          "Does not ask questions when requirements are unclear",
          "Cannot explain what their work does or why when asked",
          "Frequent misunderstandings of what is being asked",
        ],
      },
      {
        level: 2,
        label: "Competent",
        pattern:
          "Communicates clearly enough to move work forward without frequent misunderstandings.",
        evidence: [
          "Answers questions with relevant, understandable responses",
          "Asks basic clarifying questions when needed",
          "Can explain their work when asked, though explanations may stay surface-level",
          "Listens to feedback and acknowledges it",
        ],
      },
      {
        level: 3,
        label: "Advanced",
        pattern:
          'Communicates with structure and intent — explains the "why," not just the "what."',
        evidence: [
          "Structures explanations with context before detail",
          "Proactively shares reasoning during work (thinks aloud, comments, or explains approach)",
          "Explains trade-offs and alternatives, not just what they did",
          "Adapts when the other party seems confused or asks follow-ups",
        ],
      },
      {
        level: 4,
        label: "Expert",
        pattern:
          "Communication builds confidence and clarity for everyone involved — adapts to context and anticipates needs.",
        evidence: [
          "Communicates status and blockers proactively without being asked",
          "Anticipates questions or concerns and addresses them preemptively",
          "Explains complex decisions in terms appropriate to the audience",
          "Defends decisions persuasively while remaining genuinely open to feedback",
          "Demonstrates self-awareness about their own strengths and limitations",
        ],
      },
    ],
  },
  {
    slug: "practical_maturity",
    name: "Practical Maturity",
    description:
      "Judgment around trade-offs, scope, constraints, and pragmatic decision-making.",
    isUniversal: true,
    defaultRubric: [
      {
        level: 1,
        label: "Foundational",
        pattern:
          "Does not account for real-world constraints; effort is misallocated relative to the task.",
        evidence: [
          "Spends most of the time on low-priority details while ignoring core requirements",
          "Over-engineers a simple problem or under-delivers on a straightforward task",
          "Makes no reference to constraints (time, scope) during the session",
          "Cannot identify any trade-offs when asked",
        ],
      },
      {
        level: 2,
        label: "Competent",
        pattern:
          "Shows awareness of constraints and delivers a solution that is roughly proportional to the task.",
        evidence: [
          "Addresses core requirements before moving to extras",
          "Shows some awareness of time constraints",
          "Can identify at least one trade-off they made when asked",
          "Solution is appropriately scoped — not wildly over- or under-engineered",
        ],
      },
      {
        level: 3,
        label: "Advanced",
        pattern:
          "Actively manages scope and trade-offs — makes deliberate pragmatic choices throughout the session.",
        evidence: [
          "Explicitly prioritizes work items and explains reasoning",
          "Cuts scope or simplifies when time is short rather than leaving things half-done",
          "Articulates trade-offs between speed, quality, and completeness",
          "Uses simple solutions when they're sufficient; avoids premature optimization",
        ],
      },
      {
        level: 4,
        label: "Expert",
        pattern:
          "Demonstrates the judgment of someone who has delivered real outcomes — every decision reflects awareness of constraints, impact, and what matters most.",
        evidence: [
          "Delivers a working, complete solution within constraints",
          "When encountering an obstacle, pivots quickly rather than sinking time",
          "Frames decisions in terms of impact and value, not just technical correctness",
          "Identifies shortcuts or debt they introduced and explains what they would improve given more time",
          "Balances quality with delivery speed in a way that feels deliberate, not accidental",
        ],
      },
    ],
  },
  {
    slug: "collaboration_coachability",
    name: "Collaboration & Coachability",
    description:
      "How the candidate responds to feedback, asks for help, and interacts with teammates.",
    isUniversal: true,
    defaultRubric: [
      {
        level: 1,
        label: "Foundational",
        pattern:
          "Does not engage constructively with others; feedback is ignored or met with resistance.",
        evidence: [
          "Dismisses or ignores feedback",
          "Becomes defensive when questions are asked about their approach",
          "Does not engage with colleagues — minimal interaction",
          "When given a suggestion, does not acknowledge or act on it",
        ],
      },
      {
        level: 2,
        label: "Competent",
        pattern:
          "Engages respectfully and incorporates feedback when given.",
        evidence: [
          "Accepts feedback politely and acknowledges suggestions",
          "Answers questions about their approach without becoming defensive",
          "Engages with colleagues when prompted",
          "Incorporates at least one piece of feedback into their work",
        ],
      },
      {
        level: 3,
        label: "Advanced",
        pattern:
          "Treats interactions as collaborative — actively seeks input and engages with feedback as a dialogue.",
        evidence: [
          'Solicits feedback proactively ("does this approach make sense?")',
          "Treats review as a collaborative conversation, not an interrogation",
          "Asks clarifying questions when feedback is ambiguous rather than guessing",
          "Credits information or suggestions from others when explaining decisions",
        ],
      },
      {
        level: 4,
        label: "Expert",
        pattern:
          "Interacts in a way that makes the people around them more effective — the kind of collaborator teams want to work with.",
        evidence: [
          "Turns review into a productive discussion — raises their own concerns",
          "Proactively asks for input during work, not just at the end",
          "When disagreeing, explains reasoning while remaining genuinely open to being convinced",
          "Interaction style is one you'd want to see on a team day-to-day",
        ],
      },
    ],
  },
];

// ============================================================================
// ENGINEERING ROLE FAMILY
// ============================================================================

const ENGINEERING = {
  slug: "engineering",
  name: "Software Engineering",
  description:
    "Build features, review code, collaborate with stakeholders. Assessed through coding tasks, PR defense, and collaborative problem-solving.",
  dimensions: [
    {
      slug: "problem_decomposition_design",
      name: "Problem Decomposition & Design",
      description:
        "How the candidate structures problems, breaks them into parts, and designs solutions.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Jumps into implementation without understanding or structuring the problem.",
          evidence: [
            "Starts coding immediately without asking clarifying questions",
            "Cannot articulate what the problem is when asked",
            "No visible plan, task breakdown, or sequencing before implementation",
            "Solution misses major requirements stated in the brief",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Identifies the core problem and works through it in a roughly logical order.",
          evidence: [
            "Asks at least a few clarifying questions during kickoff",
            "Identifies the main problem but may miss secondary requirements or edge cases",
            "Shows some evidence of planning (comments, verbal walkthrough, sequential approach)",
            "Solution addresses the core requirement but may miss boundary conditions",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Deliberately structures the problem before solving it, considering multiple angles.",
          evidence: [
            "Asks targeted questions that reveal unstated assumptions or ambiguities",
            "Breaks the problem into distinct subproblems before coding",
            "Identifies edge cases or failure scenarios without prompting",
            "Considers more than one approach and articulates why they chose their path",
            "Can explain the structure and trade-offs of their design when asked",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Structures problems with a level of rigor that accounts for what's not obvious — dependencies, risks, and future implications.",
          evidence: [
            "Questions during kickoff surface requirements the brief itself was ambiguous about",
            "Plans work by dependency and risk, not just by feature",
            "Proactively addresses failure modes and boundary conditions in design",
            "Articulates alternative designs they considered and why they rejected them",
            "Design accounts for maintainability without over-engineering",
          ],
        },
      ],
    },
    {
      slug: "technical_execution",
      name: "Technical Execution",
      description:
        "Quality, correctness, and efficiency of code produced.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Produces code that does not work or requires significant external help to function.",
          evidence: [
            "Code does not run or produces incorrect output for the primary use case",
            "Significant syntax errors or fundamental misunderstandings of the language/framework",
            "Cannot debug issues without extensive help",
            "No evidence of testing or verifying any part of the solution",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Produces working code that solves the core problem.",
          evidence: [
            "Code runs and produces correct output for the primary use case",
            "Code is readable but may have inefficiencies, duplication, or inconsistent patterns",
            "Handles the happy path; may miss some error states",
            "Makes at least one attempt to verify output",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Produces clean, correct code that handles more than the happy path, with visible attention to quality.",
          evidence: [
            "Code handles edge cases explicitly",
            "Uses language/framework idioms appropriately",
            "Code is modular — functions/components have clear responsibilities",
            "Demonstrates systematic debugging when something goes wrong",
            "Verifies multiple scenarios, not just the happy path",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Produces code that reads as production-quality — efficient, well-structured, and deliberately crafted.",
          evidence: [
            "Makes deliberate performance or optimization choices and can explain them",
            "Error handling is thoughtful and covers realistic failure modes",
            "Code is appropriately abstracted — not too little, not too much",
            "Can discuss the runtime characteristics and limitations of their solution",
            "Code reads as if written by someone who has maintained systems in production",
          ],
        },
      ],
    },
    {
      slug: "learning_velocity",
      name: "Learning Velocity",
      description:
        "Speed of adapting to new information, tools, or feedback during the session.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Does not adapt when new information is available.",
          evidence: [
            "Repeats the same approach after it has already failed",
            "Does not adjust when given direct feedback",
            "Appears stuck and does not seek information or try alternative approaches",
            "Ignores or misapplies information from the brief or kickoff",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern: "Adapts when given explicit guidance.",
          evidence: [
            "Incorporates feedback when directly told",
            "Looks up documentation or references when stuck",
            "Does not repeat the same mistake once corrected",
            "Applies information from the brief to their solution",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Picks up on signals quickly and generalizes learning across contexts.",
          evidence: [
            "Responds to implicit cues, not just direct instructions",
            "Figures out an unfamiliar API or pattern independently within a reasonable time",
            "Applies a lesson from one part of the task to another",
            'Asks "why" questions, not just "what" questions',
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Integrates new information almost immediately and demonstrates visible improvement within the session.",
          evidence: [
            "Adjusts approach mid-stream based on new information",
            "Draws on analogies from other domains to solve unfamiliar problems",
            "Turns feedback into improved output within the same session",
            "Articulates what they learned during the process",
          ],
        },
      ],
    },
    {
      slug: "work_process",
      name: "Work Process",
      description:
        "How the candidate approaches the work itself — use of AI tools, time management, testing, reading requirements.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "No discernible workflow; approach is disorganized or chaotic.",
          evidence: [
            "Jumps between tasks randomly with no visible structure",
            "If using AI tools, copy-pastes output without reading or verifying it",
            "Does not test or verify any output before submitting",
            "Does not read requirements carefully — misses clearly stated information",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Follows a recognizable workflow and uses tools with basic diligence.",
          evidence: [
            "Works in a roughly sequential manner (read → plan → code → test)",
            "If using AI tools, reviews output before using it and catches obvious errors",
            "Tests the happy path before moving on",
            "References the requirements during implementation",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Works with a clear, deliberate process and uses tools strategically.",
          evidence: [
            "Has a visible workflow — reads requirements, plans, implements in order, verifies",
            "If using AI tools, adapts and edits suggestions rather than accepting verbatim",
            "Tests multiple scenarios and edge cases",
            "Manages time visibly — checks progress, adjusts pace or scope",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Workflow is efficient, disciplined, and self-aware — tools are leveraged, not leaned on.",
          evidence: [
            "Minimal wasted time; clear progression from start to finish",
            "Uses AI tools as an accelerator while demonstrating deep understanding of the output",
            "Testing is part of the implementation process, not an afterthought",
            'Shows awareness of their own process (e.g., timeboxing, deliberate sequencing)',
            "Environment setup and tooling use is smooth and confident",
          ],
        },
      ],
    },
  ],
  universalOverrides: {
    communication: [
      {
        level: 1,
        label: "Foundational",
        pattern:
          "Struggles to convey ideas clearly; communication creates friction rather than reducing it.",
        evidence: [
          "Responses during HR interview are vague, unfocused, or hard to follow",
          "Does not ask questions when requirements are unclear",
          "During PR defense, cannot explain what their code does or why",
          "Frequent misunderstandings of what is being asked",
        ],
      },
      {
        level: 2,
        label: "Competent",
        pattern:
          "Communicates clearly enough to move work forward without frequent misunderstandings.",
        evidence: [
          "Answers questions clearly in HR interview with relevant examples",
          "Asks basic clarifying questions during kickoff",
          "Can explain their code when asked but explanations are surface-level",
          "Listens to feedback but may not fully incorporate it",
        ],
      },
      {
        level: 3,
        label: "Advanced",
        pattern:
          'Communicates with structure and intent — explains the "why," not just the "what."',
        evidence: [
          "In HR interview, structures answers with context, action, and result",
          "Proactively communicates approach and reasoning during coding (thinks aloud or comments)",
          "During PR defense, explains not just what but why — trade-offs, alternatives considered",
          "Adapts communication style when the other party seems confused or asks follow-ups",
        ],
      },
      {
        level: 4,
        label: "Expert",
        pattern:
          "Communication builds confidence and clarity for everyone involved — adapts to context and anticipates needs.",
        evidence: [
          "In HR interview, responses demonstrate self-awareness about strengths and growth areas",
          "Communicates status and blockers proactively without being asked",
          "During PR defense, anticipates reviewer concerns and addresses them preemptively",
          "Explains complex technical decisions in terms appropriate to the audience (manager vs. peer)",
          "Persuasive without being dismissive — defends decisions while remaining open to feedback",
        ],
      },
    ],
  },
  archetypes: [
    {
      slug: "frontend_engineer",
      name: "Frontend Engineer",
      description:
        "Build and maintain web/mobile UI; optimize performance; ensure accessibility.",
      weights: {
        problem_decomposition_design: 1.0,
        technical_execution: 1.4,
        learning_velocity: 1.0,
        work_process: 1.0,
        communication: 1.2,
        practical_maturity: 1.0,
        collaboration_coachability: 1.0,
      },
      seniorityGates: {
        JUNIOR: {
          technical_execution: 2,
          learning_velocity: 2,
        },
        MID: {
          problem_decomposition_design: 2,
          technical_execution: 3,
          communication: 2,
          practical_maturity: 2,
          learning_velocity: 2,
          work_process: 2,
          collaboration_coachability: 2,
        },
        SENIOR: {
          problem_decomposition_design: 3,
          technical_execution: 4,
          communication: 3,
          practical_maturity: 3,
          learning_velocity: 2,
          work_process: 3,
          collaboration_coachability: 3,
        },
      },
    },
    {
      slug: "backend_engineer",
      name: "Backend Engineer",
      description:
        "Build scalable services; design APIs; manage data pipelines.",
      weights: {
        problem_decomposition_design: 1.4,
        technical_execution: 1.4,
        learning_velocity: 1.0,
        work_process: 1.0,
        communication: 0.8,
        practical_maturity: 1.0,
        collaboration_coachability: 0.8,
      },
      seniorityGates: {
        JUNIOR: {
          problem_decomposition_design: 2,
          technical_execution: 2,
          learning_velocity: 2,
        },
        MID: {
          problem_decomposition_design: 3,
          technical_execution: 3,
          communication: 2,
          practical_maturity: 2,
          learning_velocity: 2,
          work_process: 2,
          collaboration_coachability: 2,
        },
        SENIOR: {
          problem_decomposition_design: 4,
          technical_execution: 4,
          communication: 2,
          practical_maturity: 3,
          learning_velocity: 3,
          work_process: 3,
          collaboration_coachability: 2,
        },
      },
    },
    {
      slug: "fullstack_engineer",
      name: "Full Stack Engineer",
      description:
        "Combine frontend and backend skills; integrate systems; deliver features end-to-end.",
      weights: {
        problem_decomposition_design: 1.2,
        technical_execution: 1.4,
        learning_velocity: 1.0,
        work_process: 1.0,
        communication: 1.0,
        practical_maturity: 1.0,
        collaboration_coachability: 1.0,
      },
      seniorityGates: {
        JUNIOR: {
          technical_execution: 2,
          learning_velocity: 2,
        },
        MID: {
          problem_decomposition_design: 3,
          technical_execution: 3,
          communication: 2,
          practical_maturity: 2,
          learning_velocity: 2,
          work_process: 2,
          collaboration_coachability: 2,
        },
        SENIOR: {
          problem_decomposition_design: 3,
          technical_execution: 4,
          communication: 3,
          practical_maturity: 3,
          learning_velocity: 3,
          work_process: 3,
          collaboration_coachability: 3,
        },
      },
    },
    {
      slug: "tech_lead",
      name: "Tech Lead / Architect",
      description:
        "Define architecture; guide engineering teams; ensure maintainability and technical strategy.",
      weights: {
        problem_decomposition_design: 1.5,
        technical_execution: 0.8,
        learning_velocity: 0.8,
        work_process: 1.0,
        communication: 1.5,
        practical_maturity: 1.2,
        collaboration_coachability: 1.5,
      },
      seniorityGates: {
        JUNIOR: {},
        MID: {
          problem_decomposition_design: 3,
          technical_execution: 2,
          communication: 3,
          practical_maturity: 3,
          learning_velocity: 2,
          work_process: 2,
          collaboration_coachability: 3,
        },
        SENIOR: {
          problem_decomposition_design: 4,
          technical_execution: 3,
          communication: 4,
          practical_maturity: 4,
          learning_velocity: 3,
          work_process: 3,
          collaboration_coachability: 4,
        },
      },
    },
    {
      slug: "devops_sre",
      name: "DevOps / SRE Engineer",
      description:
        "Build CI/CD pipelines; monitor systems; optimize infrastructure and reliability.",
      weights: {
        problem_decomposition_design: 1.2,
        technical_execution: 1.3,
        learning_velocity: 1.0,
        work_process: 1.3,
        communication: 0.8,
        practical_maturity: 1.4,
        collaboration_coachability: 0.8,
      },
      seniorityGates: {
        JUNIOR: {
          technical_execution: 2,
          work_process: 2,
          learning_velocity: 2,
        },
        MID: {
          problem_decomposition_design: 2,
          technical_execution: 3,
          communication: 2,
          practical_maturity: 3,
          learning_velocity: 2,
          work_process: 3,
          collaboration_coachability: 2,
        },
        SENIOR: {
          problem_decomposition_design: 3,
          technical_execution: 3,
          communication: 2,
          practical_maturity: 4,
          learning_velocity: 3,
          work_process: 4,
          collaboration_coachability: 2,
        },
      },
    },
  ],
  redFlags: [
    {
      slug: "misrepresentation",
      name: "Misrepresentation",
      description:
        "Claims code does something it doesn't, or overstates what they built.",
    },
    {
      slug: "unverified_ai_usage",
      name: "Unverified AI Usage",
      description:
        "Copies AI-generated code without reading, understanding, or testing it.",
    },
    {
      slug: "feedback_dismissal",
      name: "Feedback Dismissal",
      description:
        "Repeatedly ignores or argues against valid feedback during PR defense.",
    },
    {
      slug: "requirements_ignored",
      name: "Requirements Ignored",
      description:
        "Misses clearly stated requirements that were available in the brief.",
    },
    {
      slug: "no_verification",
      name: "No Verification",
      description:
        "Submits code without any form of testing or checking.",
    },
    {
      slug: "time_mismanagement",
      name: "Time Mismanagement",
      description:
        "Spends >50% of coding time on setup, tangents, or non-core features.",
    },
  ],
};

// ============================================================================
// PRODUCT MANAGEMENT ROLE FAMILY
// ============================================================================

const PRODUCT_MANAGEMENT = {
  slug: "product_management",
  name: "Product Management",
  description:
    "Prioritize backlogs, run meetings, present roadmaps. Assessed through stakeholder interviews, prioritization exercises, spec writing, and review.",
  dimensions: [
    {
      slug: "problem_structuring",
      name: "Problem Structuring",
      description:
        "How the candidate frames problems, identifies root causes, and structures their thinking to define what to build and why.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Jumps to solutions without clearly defining the problem or understanding the user.",
          evidence: [
            "Proposes features without articulating the underlying user problem",
            "Cannot distinguish between symptoms and root causes",
            "No visible framework or structure to their analysis",
            "Misses key constraints or stakeholder needs stated in the brief",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Identifies the core problem and attempts to frame it before proposing solutions.",
          evidence: [
            "Asks clarifying questions about user needs and business context",
            "Can articulate the main problem but may miss secondary concerns",
            "Uses some structure (e.g., lists, categories) to organize thinking",
            "Proposed solution addresses the core problem but may not fully account for constraints",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Systematically frames problems from multiple angles — user, business, and technical.",
          evidence: [
            "Defines the problem clearly before exploring solutions",
            "Considers multiple user segments or personas",
            "Identifies assumptions and calls them out explicitly",
            "Frames trade-offs between competing needs or approaches",
            "Uses structured frameworks naturally (jobs-to-be-done, impact/effort, etc.)",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Reframes problems in ways that reveal opportunities others would miss — thinks beyond the obvious.",
          evidence: [
            "Challenges the premise of the problem when appropriate",
            "Connects the problem to broader strategic context or market dynamics",
            "Identifies second-order effects and downstream implications",
            "Structures analysis in a way that makes the decision obvious to stakeholders",
            "Distinguishes between what they know, what they assume, and what they need to validate",
          ],
        },
      ],
    },
    {
      slug: "prioritization_tradeoffs",
      name: "Prioritization & Trade-offs",
      description:
        "How the candidate decides what to build, what to cut, and how to sequence work given limited resources.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Cannot prioritize effectively; treats all items as equally important or defaults to personal preference.",
          evidence: [
            "Presents a list of features without ranking or sequencing",
            "Cannot articulate why one item should come before another",
            "Defaults to building everything or the most interesting feature",
            "Does not reference impact, effort, or urgency when making decisions",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Makes basic prioritization decisions using understandable criteria.",
          evidence: [
            "Can rank items by at least one axis (impact, urgency, effort)",
            "Identifies must-haves vs. nice-to-haves",
            "Adjusts scope when told about constraints",
            "Can explain their prioritization reasoning when asked",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Makes deliberate prioritization decisions using multiple criteria and adapts as context changes.",
          evidence: [
            "Uses impact and effort (or similar multi-axis framework) consistently",
            "Sequences work considering dependencies and learning",
            "Proactively cuts scope when constraints are tight",
            "Can defend prioritization to stakeholders with data or reasoning",
            "Acknowledges what they're choosing NOT to do and why",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Prioritization reflects strategic thinking — connects what to build now to where the product needs to go.",
          evidence: [
            "Ties prioritization to measurable outcomes or hypotheses",
            "Considers second-order effects (e.g., building X first enables Y)",
            "Adapts priority in real-time as new information emerges",
            "Frames trade-offs in terms stakeholders can act on",
            "Identifies the minimum viable experiment rather than the full solution",
          ],
        },
      ],
    },
    {
      slug: "data_reasoning",
      name: "Data Reasoning",
      description:
        "How the candidate uses data to inform decisions, define success metrics, and validate assumptions.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Does not reference data when making decisions; relies purely on intuition or opinion.",
          evidence: [
            "Proposes features without mentioning how success would be measured",
            "Cannot identify what data would validate their assumptions",
            "Makes claims about user behavior without evidence",
            "Does not ask about available data or metrics",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "References data at a basic level and can define simple success metrics.",
          evidence: [
            "Identifies at least one metric for their proposed solution",
            "Asks about existing data or user research",
            "Can distinguish between leading and lagging indicators when prompted",
            "Uses data to support arguments, even if surface-level",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Uses data strategically to make decisions and define clear success criteria.",
          evidence: [
            "Defines success metrics before proposing the solution",
            "Identifies what data they need and how they would collect it",
            "Can spot potential issues with metrics (vanity metrics, gaming, etc.)",
            "Uses data to challenge assumptions, not just confirm them",
            "Proposes experiments or tests to validate hypotheses",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Thinks in terms of hypotheses and evidence — uses data as a decision-making tool, not just a reporting tool.",
          evidence: [
            "Frames decisions as testable hypotheses with clear success/failure criteria",
            "Anticipates confounding factors or measurement challenges",
            "Connects metrics to business outcomes, not just feature adoption",
            "Proposes the simplest way to get signal before investing in a full build",
            "Reasons about statistical significance or sample size intuitively",
          ],
        },
      ],
    },
    {
      slug: "stakeholder_influence",
      name: "Stakeholder Influence",
      description:
        "How the candidate navigates competing interests, builds alignment, and drives decisions across teams.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Cannot navigate stakeholder dynamics; avoids conflict or defers entirely to others.",
          evidence: [
            "Does not acknowledge competing stakeholder interests",
            "Avoids making a recommendation when stakeholders disagree",
            "Cannot explain their position in terms the audience cares about",
            "Relies on authority rather than reasoning to justify decisions",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Recognizes different stakeholder perspectives and communicates their position clearly.",
          evidence: [
            "Acknowledges different viewpoints when presenting a recommendation",
            "Can explain their reasoning in accessible terms",
            "Listens to objections and responds to them",
            "Makes a clear recommendation rather than presenting options without guidance",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Builds alignment proactively — frames recommendations in terms each stakeholder values.",
          evidence: [
            "Adapts framing for different audiences (engineering, design, leadership)",
            "Anticipates objections and addresses them in the proposal",
            "Uses evidence and data to build a compelling case",
            "Proposes compromises that address multiple concerns",
            "Clarifies decision rights — who decides, who is consulted, who is informed",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Drives alignment even in ambiguous or contentious situations — people trust their judgment and process.",
          evidence: [
            "Turns disagreements into structured decision-making processes",
            "Creates frameworks that others can use to make future decisions",
            "Builds trust by being transparent about trade-offs and uncertainties",
            "Gets buy-in from skeptics by genuinely incorporating their concerns",
            "Comfortable saying 'I don't know' while maintaining credibility",
          ],
        },
      ],
    },
  ],
  universalOverrides: {
    communication: [
      {
        level: 1,
        label: "Foundational",
        pattern:
          "Struggles to convey ideas clearly; communication creates friction rather than reducing it.",
        evidence: [
          "Presentations or documents are disorganized and hard to follow",
          "Cannot explain product decisions in terms non-PMs understand",
          "Does not tailor communication to the audience",
          "Frequently misunderstands stakeholder requests or concerns",
        ],
      },
      {
        level: 2,
        label: "Competent",
        pattern:
          "Communicates clearly enough to move work forward without frequent misunderstandings.",
        evidence: [
          "Writes specs or briefs that cover the key information",
          "Can explain product decisions with basic reasoning",
          "Asks clarifying questions in stakeholder conversations",
          "Listens to feedback and acknowledges different perspectives",
        ],
      },
      {
        level: 3,
        label: "Advanced",
        pattern:
          'Communicates with structure and intent — explains the "why," not just the "what."',
        evidence: [
          "Structures written communication with clear problem statement, proposal, and trade-offs",
          "Proactively communicates decisions with rationale to all affected parties",
          "Adjusts communication style for engineering vs. design vs. leadership audiences",
          "Facilitates productive discussions rather than just presenting information",
        ],
      },
      {
        level: 4,
        label: "Expert",
        pattern:
          "Communication builds confidence and clarity for everyone involved — adapts to context and anticipates needs.",
        evidence: [
          "Creates clarity in ambiguous situations — people leave conversations knowing what to do",
          "Communicates complex trade-offs in a way that makes the decision feel straightforward",
          "Written artifacts (PRDs, roadmaps) are referenced and used by the team long after creation",
          "Anticipates what information different stakeholders need and delivers it proactively",
          "Handles difficult conversations (scope cuts, priority changes) with transparency and empathy",
        ],
      },
    ],
  },
  archetypes: [
    {
      slug: "growth_pm",
      name: "Growth Product Manager",
      description:
        "Optimize acquisition, activation, and retention through experimentation and data-driven decisions.",
      weights: {
        problem_structuring: 1.2,
        prioritization_tradeoffs: 1.3,
        data_reasoning: 1.5,
        stakeholder_influence: 1.0,
        communication: 1.0,
        practical_maturity: 1.2,
        collaboration_coachability: 0.8,
      },
      seniorityGates: {
        JUNIOR: { data_reasoning: 2, prioritization_tradeoffs: 2 },
        MID: {
          problem_structuring: 2,
          prioritization_tradeoffs: 3,
          data_reasoning: 3,
          stakeholder_influence: 2,
          communication: 2,
          practical_maturity: 2,
          collaboration_coachability: 2,
        },
        SENIOR: {
          problem_structuring: 3,
          prioritization_tradeoffs: 4,
          data_reasoning: 4,
          stakeholder_influence: 3,
          communication: 3,
          practical_maturity: 3,
          collaboration_coachability: 3,
        },
      },
    },
    {
      slug: "platform_pm",
      name: "Platform Product Manager",
      description:
        "Build internal platforms, developer tools, and infrastructure products that serve other teams.",
      weights: {
        problem_structuring: 1.4,
        prioritization_tradeoffs: 1.2,
        data_reasoning: 1.0,
        stakeholder_influence: 1.3,
        communication: 1.2,
        practical_maturity: 1.2,
        collaboration_coachability: 1.0,
      },
      seniorityGates: {
        JUNIOR: { problem_structuring: 2, prioritization_tradeoffs: 2 },
        MID: {
          problem_structuring: 3,
          prioritization_tradeoffs: 3,
          data_reasoning: 2,
          stakeholder_influence: 2,
          communication: 2,
          practical_maturity: 2,
          collaboration_coachability: 2,
        },
        SENIOR: {
          problem_structuring: 4,
          prioritization_tradeoffs: 3,
          data_reasoning: 3,
          stakeholder_influence: 4,
          communication: 3,
          practical_maturity: 3,
          collaboration_coachability: 3,
        },
      },
    },
    {
      slug: "core_pm",
      name: "Core Product Manager",
      description:
        "Own a product area end-to-end — define strategy, manage roadmap, ship features, measure outcomes.",
      weights: {
        problem_structuring: 1.3,
        prioritization_tradeoffs: 1.3,
        data_reasoning: 1.2,
        stakeholder_influence: 1.2,
        communication: 1.2,
        practical_maturity: 1.0,
        collaboration_coachability: 1.0,
      },
      seniorityGates: {
        JUNIOR: { problem_structuring: 2, prioritization_tradeoffs: 2 },
        MID: {
          problem_structuring: 3,
          prioritization_tradeoffs: 3,
          data_reasoning: 2,
          stakeholder_influence: 2,
          communication: 2,
          practical_maturity: 2,
          collaboration_coachability: 2,
        },
        SENIOR: {
          problem_structuring: 4,
          prioritization_tradeoffs: 4,
          data_reasoning: 3,
          stakeholder_influence: 3,
          communication: 4,
          practical_maturity: 3,
          collaboration_coachability: 3,
        },
      },
    },
  ],
  redFlags: [
    {
      slug: "solution_before_problem",
      name: "Solution Before Problem",
      description:
        "Proposes features or solutions without ever defining or validating the underlying problem.",
    },
    {
      slug: "no_success_criteria",
      name: "No Success Criteria",
      description:
        "Cannot define how they would know if their proposal succeeded or failed.",
    },
    {
      slug: "stakeholder_avoidance",
      name: "Stakeholder Avoidance",
      description:
        "Avoids addressing competing stakeholder interests or refuses to make a recommendation.",
    },
    {
      slug: "data_absence",
      name: "Data Absence",
      description:
        "Makes all decisions on opinion alone; never asks about or references data.",
    },
    {
      slug: "scope_blindness",
      name: "Scope Blindness",
      description:
        "Proposes building everything with no prioritization or phasing.",
    },
  ],
};

// ============================================================================
// DATA SCIENCE ROLE FAMILY
// ============================================================================

const DATA_SCIENCE = {
  slug: "data_science",
  name: "Data Science",
  description:
    "Analyze data, communicate findings, make recommendations. Assessed through data analysis exercises, stakeholder presentations, and methodology review.",
  dimensions: [
    {
      slug: "analytical_reasoning",
      name: "Analytical Reasoning",
      description:
        "How the candidate structures analysis, forms hypotheses, and draws conclusions from data.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Lacks structure in analysis; draws conclusions without supporting evidence.",
          evidence: [
            "Starts analysis without forming a hypothesis or plan",
            "Cannot articulate what question the analysis is trying to answer",
            "Draws conclusions that are not supported by the data presented",
            "Confuses correlation with causation without acknowledgment",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Follows a basic analytical structure and supports conclusions with evidence.",
          evidence: [
            "Defines the question before diving into data",
            "Uses basic exploratory analysis (distributions, summaries, visualizations)",
            "Conclusions are supported by the data they present",
            "Can identify obvious outliers or data quality issues",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Conducts rigorous analysis with clear methodology and awareness of limitations.",
          evidence: [
            "Forms explicit hypotheses and tests them systematically",
            "Considers confounding variables and alternative explanations",
            "Acknowledges limitations of the data or methodology",
            "Segments data meaningfully to uncover non-obvious patterns",
            "Validates findings through multiple approaches",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Analysis reveals insights that change how stakeholders think about the problem — rigorous yet accessible.",
          evidence: [
            "Identifies the right question to ask, not just the obvious one",
            "Uses sophisticated techniques where appropriate but explains them simply",
            "Anticipates objections to methodology and addresses them proactively",
            "Connects quantitative findings to qualitative context",
            "Clearly separates what the data shows from what they recommend",
          ],
        },
      ],
    },
    {
      slug: "technical_proficiency_ds",
      name: "Technical Proficiency",
      description:
        "Competence with analytical tools, statistical methods, and coding for data work.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Struggles with basic tools and methods needed for the analysis task.",
          evidence: [
            "Cannot write working queries or code to extract needed data",
            "Misapplies basic statistical concepts (mean vs. median, significance)",
            "Cannot produce visualizations that communicate findings",
            "Requires extensive help to use analysis tools",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Uses standard tools and methods correctly for routine analysis.",
          evidence: [
            "Writes working code/queries to extract and transform data",
            "Uses basic statistics correctly (distributions, aggregations, correlations)",
            "Produces clear, readable visualizations",
            "Handles data cleaning and preparation competently",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Applies appropriate techniques fluently and chooses the right method for the problem.",
          evidence: [
            "Selects the right statistical test or model for the question at hand",
            "Code is clean, efficient, and reproducible",
            "Creates visualizations that tell a story, not just display data",
            "Handles messy data with appropriate imputation, filtering, or transformation strategies",
            "Understands when a simple approach is sufficient vs. when complexity is justified",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Technical execution is seamless and deliberate — the tools serve the analysis, not the other way around.",
          evidence: [
            "Makes deliberate method choices and can justify them to a technical audience",
            "Anticipates edge cases in data or methodology",
            "Code and analysis are structured for reproducibility and review",
            "Can discuss trade-offs between different modeling approaches",
            "Uses advanced techniques where appropriate without over-complicating simple problems",
          ],
        },
      ],
    },
    {
      slug: "insight_communication",
      name: "Insight Communication",
      description:
        "How the candidate translates analytical findings into actionable recommendations for non-technical audiences.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Cannot translate data findings into language that non-technical stakeholders understand.",
          evidence: [
            "Presents raw numbers or charts without interpretation",
            "Uses jargon that the audience does not understand",
            "Cannot connect findings to business questions or decisions",
            "Visualizations are confusing or misleading",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Presents findings clearly with basic interpretation.",
          evidence: [
            "States what the data shows in plain language",
            "Visualizations are accurate and understandable",
            "Can answer follow-up questions about the analysis",
            "Makes at least one actionable recommendation based on findings",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Tells a compelling data story — the audience leaves knowing what to do and why.",
          evidence: [
            "Structures presentation around decisions, not just data",
            "Highlights the most important finding first, then supports with detail",
            "Adapts explanation depth for the audience",
            "Provides clear recommendations with supporting evidence",
            "Anticipates stakeholder questions and prepares answers",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Transforms complex analysis into clarity — stakeholders trust the findings and act on them.",
          evidence: [
            "Frames analysis in terms of business impact with quantified estimates",
            "Creates visualizations that stakeholders reference and share",
            "Proactively addresses 'so what?' and 'what now?' before being asked",
            "Communicates uncertainty honestly without undermining confidence in findings",
            "Recommendations include proposed success metrics and validation plan",
          ],
        },
      ],
    },
    {
      slug: "methodology_rigor",
      name: "Methodology & Rigor",
      description:
        "How the candidate selects, applies, and validates their analytical approach.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "No visible methodology; analysis is ad hoc and unreproducible.",
          evidence: [
            "Cannot explain why they chose their analytical approach",
            "Does not validate results or check for errors",
            "Ignores data quality issues or missing data",
            "Makes strong claims from weak evidence",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Follows a reasonable approach and performs basic validation.",
          evidence: [
            "Can explain the general approach they are taking",
            "Performs basic sanity checks on results",
            "Acknowledges obvious limitations when asked",
            "Uses appropriate sample sizes and time ranges",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Selects methodology deliberately and validates results rigorously.",
          evidence: [
            "Explains why their approach is appropriate for the question",
            "Performs cross-validation or robustness checks",
            "Proactively identifies potential biases in data or method",
            "Documents assumptions and their impact on conclusions",
            "Tests sensitivity of results to key assumptions",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Methodology choices reflect deep understanding — knows when to be rigorous and when to be pragmatic.",
          evidence: [
            "Designs the analysis to answer the most important question, not the easiest one",
            "Anticipates and addresses critique before presenting",
            "Balances rigor with speed — knows when 80% confidence is enough",
            "Can explain trade-offs between different approaches to non-technical stakeholders",
            "Results are reproducible and well-documented",
          ],
        },
      ],
    },
  ],
  universalOverrides: {},
  archetypes: [
    {
      slug: "analytics_engineer",
      name: "Analytics Engineer",
      description:
        "Build data pipelines, maintain data models, and create reliable datasets for analysis.",
      weights: {
        analytical_reasoning: 1.2,
        technical_proficiency_ds: 1.5,
        insight_communication: 0.8,
        methodology_rigor: 1.3,
        communication: 0.8,
        practical_maturity: 1.2,
        collaboration_coachability: 1.0,
      },
      seniorityGates: {
        JUNIOR: { technical_proficiency_ds: 2, analytical_reasoning: 2 },
        MID: {
          analytical_reasoning: 2,
          technical_proficiency_ds: 3,
          insight_communication: 2,
          methodology_rigor: 2,
          communication: 2,
          practical_maturity: 2,
          collaboration_coachability: 2,
        },
        SENIOR: {
          analytical_reasoning: 3,
          technical_proficiency_ds: 4,
          insight_communication: 2,
          methodology_rigor: 3,
          communication: 2,
          practical_maturity: 3,
          collaboration_coachability: 3,
        },
      },
    },
    {
      slug: "data_analyst",
      name: "Data Analyst",
      description:
        "Analyze business data, create dashboards, and provide insights to drive decisions.",
      weights: {
        analytical_reasoning: 1.3,
        technical_proficiency_ds: 1.0,
        insight_communication: 1.5,
        methodology_rigor: 1.0,
        communication: 1.3,
        practical_maturity: 1.0,
        collaboration_coachability: 1.0,
      },
      seniorityGates: {
        JUNIOR: { analytical_reasoning: 2, insight_communication: 2 },
        MID: {
          analytical_reasoning: 3,
          technical_proficiency_ds: 2,
          insight_communication: 3,
          methodology_rigor: 2,
          communication: 2,
          practical_maturity: 2,
          collaboration_coachability: 2,
        },
        SENIOR: {
          analytical_reasoning: 4,
          technical_proficiency_ds: 3,
          insight_communication: 4,
          methodology_rigor: 3,
          communication: 3,
          practical_maturity: 3,
          collaboration_coachability: 3,
        },
      },
    },
    {
      slug: "ml_engineer",
      name: "ML Engineer",
      description:
        "Build and deploy machine learning models; feature engineering; optimization and research implementation.",
      weights: {
        analytical_reasoning: 1.3,
        technical_proficiency_ds: 1.5,
        insight_communication: 0.8,
        methodology_rigor: 1.4,
        communication: 0.8,
        practical_maturity: 1.0,
        collaboration_coachability: 0.8,
      },
      seniorityGates: {
        JUNIOR: { technical_proficiency_ds: 2, methodology_rigor: 2 },
        MID: {
          analytical_reasoning: 3,
          technical_proficiency_ds: 3,
          insight_communication: 2,
          methodology_rigor: 3,
          communication: 2,
          practical_maturity: 2,
          collaboration_coachability: 2,
        },
        SENIOR: {
          analytical_reasoning: 4,
          technical_proficiency_ds: 4,
          insight_communication: 2,
          methodology_rigor: 4,
          communication: 2,
          practical_maturity: 3,
          collaboration_coachability: 2,
        },
      },
    },
  ],
  redFlags: [
    {
      slug: "unsupported_conclusions",
      name: "Unsupported Conclusions",
      description:
        "Draws strong conclusions that are not supported by the data or analysis presented.",
    },
    {
      slug: "methodology_absence",
      name: "Methodology Absence",
      description:
        "Cannot explain or justify the analytical approach used.",
    },
    {
      slug: "data_quality_blindness",
      name: "Data Quality Blindness",
      description:
        "Ignores obvious data quality issues, missing data, or biases in the dataset.",
    },
    {
      slug: "no_actionable_insight",
      name: "No Actionable Insight",
      description:
        "Presents data without any interpretation or recommendation for what to do next.",
    },
    {
      slug: "overclaiming",
      name: "Overclaiming",
      description:
        "Claims causation from correlation or overstates confidence in findings.",
    },
  ],
};

// ============================================================================
// PROGRAM MANAGEMENT ROLE FAMILY
// ============================================================================

const PROGRAM_MANAGEMENT = {
  slug: "program_management",
  name: "Program Management",
  description:
    "Coordinate teams, resolve conflicts, drive alignment. Assessed through cross-team coordination exercises, risk assessment, and stakeholder management scenarios.",
  dimensions: [
    {
      slug: "program_structuring",
      name: "Program Structuring",
      description:
        "How the candidate organizes work streams, defines milestones, and creates clarity for complex, multi-team efforts.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Cannot organize a multi-step effort; lacks structure or sequencing.",
          evidence: [
            "Presents work items as a flat list without dependencies or milestones",
            "Cannot identify the critical path or key decision points",
            "No visible plan for how teams will coordinate",
            "Does not distinguish between parallel and sequential work",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Creates a basic plan with milestones and identifies major dependencies.",
          evidence: [
            "Breaks the program into phases or milestones",
            "Identifies key dependencies between teams or work streams",
            "Creates a timeline that accounts for major deliverables",
            "Can explain the general sequencing of work",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Structures programs with clear ownership, dependencies, and decision points — stakeholders know what's expected of them.",
          evidence: [
            "Defines clear ownership for each work stream",
            "Maps dependencies explicitly and identifies where coordination is needed",
            "Builds in decision points and checkpoints at appropriate intervals",
            "Considers resource constraints and team capacity in planning",
            "Creates artifacts (timelines, RACI, etc.) that teams actually use",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Structures programs that scale — clear enough for teams to operate autonomously while staying aligned.",
          evidence: [
            "Designs program structure that adapts as scope or context changes",
            "Anticipates coordination challenges before they arise",
            "Creates lightweight governance that enables speed without losing alignment",
            "Plans for the unknown — builds slack, buffers, or decision trees for key risks",
            "Program structure itself communicates priority and sequence without needing explanation",
          ],
        },
      ],
    },
    {
      slug: "risk_identification",
      name: "Risk Identification & Mitigation",
      description:
        "How the candidate identifies, assesses, and plans for risks across a program.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Does not identify risks or assumes everything will go as planned.",
          evidence: [
            "Presents plan without mentioning any risks or contingencies",
            "When asked about risks, cannot name any",
            "Does not consider what happens if a dependency is late or a team is blocked",
            "Reactive only — does not anticipate problems",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Identifies obvious risks and has a basic plan for the most critical ones.",
          evidence: [
            "Names at least a few risks without being prompted",
            "Can describe what they would do if a key risk materializes",
            "Distinguishes between high and low probability risks",
            "Monitors key risks during execution",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Systematically identifies risks across dimensions (technical, people, process, external) and plans mitigations.",
          evidence: [
            "Categorizes risks and assesses both likelihood and impact",
            "Has specific mitigation plans for high-priority risks",
            "Identifies risks related to people and process, not just technical",
            "Builds early warning indicators into the program plan",
            "Escalates appropriately — doesn't wait for risk to become a crisis",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Risk management is embedded in their operating model — they create programs that are resilient to surprises.",
          evidence: [
            "Designs program structure to minimize blast radius of individual failures",
            "Creates decision frameworks for how the team should respond to common risk types",
            "Identifies second-order risks (e.g., 'if team A is late, team B's architecture choice becomes a problem')",
            "Balances risk mitigation with speed — doesn't over-plan for low-probability events",
            "Shares risk assessment transparently with stakeholders to build trust",
          ],
        },
      ],
    },
    {
      slug: "cross_team_coordination",
      name: "Cross-Team Coordination",
      description:
        "How the candidate drives alignment and resolves conflicts across multiple teams with different priorities.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Cannot coordinate across teams; treats the program as a single-team effort.",
          evidence: [
            "Does not acknowledge that different teams have different priorities",
            "Cannot articulate what other teams need from the program",
            "Does not propose communication cadences or coordination mechanisms",
            "Avoids or ignores inter-team conflicts",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Recognizes cross-team dependencies and sets up basic coordination.",
          evidence: [
            "Identifies which teams are involved and their primary contribution",
            "Proposes regular check-ins or status updates",
            "Can explain what each team needs to deliver and when",
            "Addresses inter-team conflicts when they arise",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Actively drives alignment — creates mechanisms that keep teams coordinated without constant intervention.",
          evidence: [
            "Designs coordination mechanisms appropriate to the complexity (standups, shared docs, review meetings)",
            "Proactively surfaces misalignment before it causes problems",
            "Navigates competing priorities by framing shared goals",
            "Creates clear escalation paths for when teams disagree",
            "Adapts coordination overhead to the phase of the program",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Teams stay aligned because of the systems and relationships they've built — coordination feels effortless.",
          evidence: [
            "Creates shared context so teams can self-coordinate on routine decisions",
            "Resolves cross-team conflicts in a way that both sides feel heard",
            "Builds relationships that enable informal coordination alongside formal processes",
            "Scales coordination approach based on program phase and risk level",
            "Other teams proactively come to them when they see potential conflicts",
          ],
        },
      ],
    },
    {
      slug: "execution_tracking",
      name: "Execution Tracking & Accountability",
      description:
        "How the candidate monitors progress, identifies blockers, and drives accountability without micromanaging.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Does not track progress or identify blockers; relies on hope.",
          evidence: [
            "No system for tracking whether work is on schedule",
            "Cannot report current status of key work streams",
            "Does not identify or escalate blockers",
            "Teams are unclear on what is expected of them",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Tracks basic progress and identifies major blockers.",
          evidence: [
            "Maintains a status view of key milestones",
            "Identifies when work is off track",
            "Raises blockers to relevant stakeholders",
            "Can report on program health at a high level",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Drives accountability through clear expectations and proactive tracking — teams know what's expected and when.",
          evidence: [
            "Creates tracking systems that surface problems early",
            "Follows up on commitments without being asked",
            "Distinguishes between on-track, at-risk, and off-track with clear criteria",
            "Drives resolution of blockers rather than just reporting them",
            "Adapts tracking frequency and detail to the program phase",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Accountability is embedded in the program culture — teams hold themselves accountable because expectations and visibility are clear.",
          evidence: [
            "Creates transparency that motivates teams without creating surveillance",
            "Identifies patterns across blockers and addresses systemic issues",
            "Stakeholders trust their status reports because they have a track record of accuracy",
            "Escalates at the right time — not too early (noise) and not too late (crisis)",
            "Balances accountability with support — teams feel enabled, not policed",
          ],
        },
      ],
    },
  ],
  universalOverrides: {},
  archetypes: [
    {
      slug: "technical_program_manager",
      name: "Technical Program Manager",
      description:
        "Coordinate complex technical programs across engineering, infrastructure, and platform teams.",
      weights: {
        program_structuring: 1.4,
        risk_identification: 1.3,
        cross_team_coordination: 1.3,
        execution_tracking: 1.2,
        communication: 1.2,
        practical_maturity: 1.0,
        collaboration_coachability: 1.0,
      },
      seniorityGates: {
        JUNIOR: { program_structuring: 2, cross_team_coordination: 2 },
        MID: {
          program_structuring: 3,
          risk_identification: 2,
          cross_team_coordination: 3,
          execution_tracking: 2,
          communication: 2,
          practical_maturity: 2,
          collaboration_coachability: 2,
        },
        SENIOR: {
          program_structuring: 4,
          risk_identification: 3,
          cross_team_coordination: 4,
          execution_tracking: 3,
          communication: 3,
          practical_maturity: 3,
          collaboration_coachability: 3,
        },
      },
    },
    {
      slug: "business_program_manager",
      name: "Business Program Manager",
      description:
        "Drive cross-functional business initiatives spanning product, marketing, operations, and go-to-market.",
      weights: {
        program_structuring: 1.2,
        risk_identification: 1.0,
        cross_team_coordination: 1.5,
        execution_tracking: 1.3,
        communication: 1.4,
        practical_maturity: 1.0,
        collaboration_coachability: 1.0,
      },
      seniorityGates: {
        JUNIOR: { cross_team_coordination: 2, execution_tracking: 2 },
        MID: {
          program_structuring: 2,
          risk_identification: 2,
          cross_team_coordination: 3,
          execution_tracking: 3,
          communication: 3,
          practical_maturity: 2,
          collaboration_coachability: 2,
        },
        SENIOR: {
          program_structuring: 3,
          risk_identification: 3,
          cross_team_coordination: 4,
          execution_tracking: 4,
          communication: 4,
          practical_maturity: 3,
          collaboration_coachability: 3,
        },
      },
    },
  ],
  redFlags: [
    {
      slug: "no_structure",
      name: "No Structure",
      description:
        "Cannot organize multi-team work into a coherent plan with milestones and dependencies.",
    },
    {
      slug: "conflict_avoidance",
      name: "Conflict Avoidance",
      description:
        "Avoids addressing cross-team conflicts or disagreements, allowing them to fester.",
    },
    {
      slug: "status_blindness",
      name: "Status Blindness",
      description:
        "Cannot accurately report on program health; surprised by delays or blockers.",
    },
    {
      slug: "over_process",
      name: "Over-Processing",
      description:
        "Creates excessive process and governance that slows teams down without adding value.",
    },
    {
      slug: "accountability_gap",
      name: "Accountability Gap",
      description:
        "Does not follow up on commitments or drive resolution of blockers.",
    },
  ],
};

// ============================================================================
// SALES ROLE FAMILY
// ============================================================================

const SALES = {
  slug: "sales",
  name: "Sales",
  description:
    "Run discovery calls, handle objections, close deals. Assessed through simulated customer conversations, discovery exercises, and deal strategy review.",
  dimensions: [
    {
      slug: "discovery_qualification",
      name: "Discovery & Qualification",
      description:
        "How the candidate uncovers customer needs, pain points, and buying context through questions and active listening.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Does not uncover customer needs; pitches without understanding the buyer.",
          evidence: [
            "Starts pitching product features before understanding the customer's situation",
            "Asks no questions or only surface-level questions",
            "Cannot articulate the customer's primary pain point after the conversation",
            "Does not qualify budget, authority, timeline, or need",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Asks enough questions to identify the core need and basic qualifying information.",
          evidence: [
            "Asks about the customer's current situation and challenges",
            "Identifies the primary pain point or need",
            "Gathers at least basic qualifying information (budget, timeline, authority)",
            "Listens to responses and adjusts follow-up questions accordingly",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Conducts thorough discovery that reveals the full picture — need, urgency, decision process, and competitive landscape.",
          evidence: [
            "Uncovers both stated and unstated needs through layered questioning",
            "Maps the decision-making process (who, how, timeline)",
            "Understands the competitive situation and what alternatives the customer is considering",
            "Quantifies the impact of the problem (cost, time, risk)",
            "Customer feels heard and understood by the end of discovery",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Discovery creates value for the customer — they gain new insight into their own problem through the conversation.",
          evidence: [
            "Asks questions that reframe how the customer thinks about their problem",
            "Uncovers needs the customer hadn't articulated even to themselves",
            "Connects dots between different stakeholder needs within the organization",
            "Uses discovery to position themselves as a trusted advisor, not just a vendor",
            "Qualifies out early when there's no fit, saving both parties' time",
          ],
        },
      ],
    },
    {
      slug: "value_articulation",
      name: "Value Articulation",
      description:
        "How the candidate connects product capabilities to customer-specific value and outcomes.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Presents features without connecting them to the customer's needs.",
          evidence: [
            "Lists product features generically without relating to the customer's situation",
            "Cannot explain why the customer should care about a specific capability",
            "Uses the same pitch regardless of the customer's stated needs",
            "Cannot differentiate from competitors in customer-relevant terms",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Connects product capabilities to the customer's stated needs.",
          evidence: [
            "References the customer's pain points when presenting the product",
            "Explains benefits in terms the customer cares about",
            "Can differentiate from at least one competitor at a basic level",
            "Provides at least one relevant example or case study",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Articulates value in terms of measurable outcomes specific to this customer.",
          evidence: [
            "Quantifies the value proposition (ROI, time saved, cost reduced)",
            "Tailors presentation to the specific stakeholder's priorities",
            "Uses customer's own language and metrics to frame value",
            "Differentiates based on what matters to this specific buyer",
            "Connects product value to the customer's strategic goals, not just immediate pain",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Builds a compelling business case that the customer can use internally to champion the purchase.",
          evidence: [
            "Creates a narrative that resonates with different stakeholders in the buying committee",
            "Provides the customer with the language and data they need to sell internally",
            "Addresses the 'do nothing' option and its cost",
            "Positions the solution as de-risking the customer's goals, not just solving a problem",
            "Customer can articulate the value themselves after the conversation",
          ],
        },
      ],
    },
    {
      slug: "objection_handling",
      name: "Objection Handling",
      description:
        "How the candidate addresses concerns, pushback, and skepticism from prospects.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Cannot handle objections; becomes defensive or ignores concerns.",
          evidence: [
            "Dismisses or ignores customer objections",
            "Becomes visibly flustered or defensive when challenged",
            "Repeats the same talking points louder rather than addressing the concern",
            "Does not acknowledge the validity of the customer's concern",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Acknowledges objections and provides a reasonable response.",
          evidence: [
            "Listens to the objection without becoming defensive",
            "Acknowledges the concern before responding",
            "Provides a relevant response that addresses the core concern",
            "Remains calm and professional when challenged",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Turns objections into opportunities to deepen understanding and build trust.",
          evidence: [
            "Probes behind the objection to understand the real concern",
            "Uses objections as a signal to adjust approach or provide different evidence",
            "References relevant case studies or data to address concerns",
            "Addresses the concern without undermining the broader value proposition",
            "Customer feels their concern was genuinely heard and addressed",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Anticipates objections and addresses them before they arise — objections become moments that build confidence.",
          evidence: [
            "Raises and addresses common concerns proactively",
            "Turns competitive objections into differentiation opportunities",
            "Handles price objections by reframing around value and cost of inaction",
            "Knows when to concede a point to maintain credibility",
            "After handling objections, the customer is more confident in the solution than before",
          ],
        },
      ],
    },
    {
      slug: "closing_next_steps",
      name: "Closing & Next Steps",
      description:
        "How the candidate advances deals forward, creates urgency, and secures commitments.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Does not advance the deal; conversation ends without clear next steps.",
          evidence: [
            "Ends conversations without proposing a next step",
            "Does not ask for commitment or advance the deal",
            "Cannot create urgency or explain why acting now matters",
            "Leaves timing and follow-up vague or unspecified",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Ends conversations with a clear next step and basic timeline.",
          evidence: [
            "Proposes a specific next step at the end of the conversation",
            "Gets agreement on timing for the next interaction",
            "Summarizes what was discussed and what will happen next",
            "Follows up as promised",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Systematically advances the deal through clear milestones and mutual commitments.",
          evidence: [
            "Maps the buying process and aligns next steps to it",
            "Secures commitments from the customer (not just from themselves)",
            "Creates legitimate urgency based on the customer's timeline or goals",
            "Proposes next steps that involve other stakeholders to broaden engagement",
            "Tracks and references previous commitments to maintain momentum",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Orchestrates the deal to close — every interaction moves the decision forward with intentionality.",
          evidence: [
            "Builds a mutual close plan that both parties own",
            "Identifies and addresses potential deal-killers early",
            "Creates events or deadlines that drive the decision without being pushy",
            "Coaches the internal champion on how to navigate their buying process",
            "Closing feels like a natural conclusion to a well-run process, not a high-pressure moment",
          ],
        },
      ],
    },
  ],
  universalOverrides: {
    communication: [
      {
        level: 1,
        label: "Foundational",
        pattern:
          "Struggles to convey ideas clearly; communication creates friction rather than reducing it.",
        evidence: [
          "Cannot explain the product or its value in simple terms",
          "Talks more than listens; does not pick up on customer cues",
          "Communication is scripted and does not adapt to the conversation",
          "Cannot build rapport with the prospect",
        ],
      },
      {
        level: 2,
        label: "Competent",
        pattern:
          "Communicates clearly enough to move conversations forward without frequent misunderstandings.",
        evidence: [
          "Explains the product clearly and answers questions accurately",
          "Listens to the customer and responds to what they actually said",
          "Builds basic rapport and professional tone",
          "Follows a conversation flow that makes sense to the buyer",
        ],
      },
      {
        level: 3,
        label: "Advanced",
        pattern:
          'Communicates with intent — adapts tone, pace, and depth to the buyer.',
        evidence: [
          "Mirrors the customer's communication style naturally",
          "Uses storytelling to make points memorable",
          "Summarizes and confirms understanding frequently",
          "Adapts technical depth based on the audience",
        ],
      },
      {
        level: 4,
        label: "Expert",
        pattern:
          "Communication builds trust and momentum — the customer feels they are working with a partner, not being sold to.",
        evidence: [
          "Creates a consultative tone where the customer shares openly",
          "Communicates complex trade-offs in a way that empowers the buyer to decide",
          "Handles difficult conversations (pricing, competition, timing) with confidence and transparency",
          "The customer references things the salesperson said in their internal discussions",
          "Communication creates energy and confidence about moving forward",
        ],
      },
    ],
  },
  archetypes: [
    {
      slug: "account_executive",
      name: "Account Executive",
      description:
        "Full-cycle sales — prospect, qualify, present, negotiate, and close new business.",
      weights: {
        discovery_qualification: 1.3,
        value_articulation: 1.3,
        objection_handling: 1.2,
        closing_next_steps: 1.4,
        communication: 1.2,
        practical_maturity: 1.0,
        collaboration_coachability: 0.8,
      },
      seniorityGates: {
        JUNIOR: { discovery_qualification: 2, value_articulation: 2 },
        MID: {
          discovery_qualification: 3,
          value_articulation: 3,
          objection_handling: 2,
          closing_next_steps: 3,
          communication: 2,
          practical_maturity: 2,
          collaboration_coachability: 2,
        },
        SENIOR: {
          discovery_qualification: 4,
          value_articulation: 4,
          objection_handling: 3,
          closing_next_steps: 4,
          communication: 3,
          practical_maturity: 3,
          collaboration_coachability: 3,
        },
      },
    },
    {
      slug: "sales_development_rep",
      name: "Sales Development Representative",
      description:
        "Prospect and qualify leads; book meetings; build pipeline for account executives.",
      weights: {
        discovery_qualification: 1.5,
        value_articulation: 1.2,
        objection_handling: 1.3,
        closing_next_steps: 1.0,
        communication: 1.3,
        practical_maturity: 0.8,
        collaboration_coachability: 1.2,
      },
      seniorityGates: {
        JUNIOR: { discovery_qualification: 2, communication: 2 },
        MID: {
          discovery_qualification: 3,
          value_articulation: 2,
          objection_handling: 3,
          closing_next_steps: 2,
          communication: 3,
          practical_maturity: 2,
          collaboration_coachability: 2,
        },
        SENIOR: {
          discovery_qualification: 4,
          value_articulation: 3,
          objection_handling: 4,
          closing_next_steps: 3,
          communication: 4,
          practical_maturity: 2,
          collaboration_coachability: 3,
        },
      },
    },
    {
      slug: "solutions_engineer",
      name: "Solutions Engineer",
      description:
        "Technical sales support — product demos, proof of concepts, and technical validation with prospects.",
      weights: {
        discovery_qualification: 1.3,
        value_articulation: 1.5,
        objection_handling: 1.2,
        closing_next_steps: 0.8,
        communication: 1.3,
        practical_maturity: 1.0,
        collaboration_coachability: 1.2,
      },
      seniorityGates: {
        JUNIOR: { value_articulation: 2, discovery_qualification: 2 },
        MID: {
          discovery_qualification: 3,
          value_articulation: 3,
          objection_handling: 2,
          closing_next_steps: 2,
          communication: 2,
          practical_maturity: 2,
          collaboration_coachability: 2,
        },
        SENIOR: {
          discovery_qualification: 3,
          value_articulation: 4,
          objection_handling: 3,
          closing_next_steps: 2,
          communication: 3,
          practical_maturity: 3,
          collaboration_coachability: 3,
        },
      },
    },
  ],
  redFlags: [
    {
      slug: "pitch_without_discovery",
      name: "Pitch Without Discovery",
      description:
        "Starts pitching product features before understanding the customer's situation or needs.",
    },
    {
      slug: "objection_dismissal",
      name: "Objection Dismissal",
      description:
        "Dismisses or ignores valid customer concerns rather than addressing them.",
    },
    {
      slug: "no_next_steps",
      name: "No Next Steps",
      description:
        "Ends conversations without proposing or securing a clear next step.",
    },
    {
      slug: "dishonesty",
      name: "Dishonesty",
      description:
        "Makes claims about the product that are inaccurate or misleading.",
    },
    {
      slug: "customer_disregard",
      name: "Customer Disregard",
      description:
        "Shows no interest in the customer's actual needs; treats the interaction as purely transactional.",
    },
  ],
};

// ============================================================================
// CUSTOMER SUCCESS ROLE FAMILY
// ============================================================================

const CUSTOMER_SUCCESS = {
  slug: "customer_success",
  name: "Customer Success",
  description:
    "Onboard clients, handle escalations, drive renewals. Assessed through onboarding simulations, escalation handling, and account review exercises.",
  dimensions: [
    {
      slug: "onboarding_enablement",
      name: "Onboarding & Enablement",
      description:
        "How the candidate guides customers from purchase to productive use — setting them up for long-term success.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Cannot guide a customer through setup or initial adoption; reactive rather than proactive.",
          evidence: [
            "No plan for how to get the customer to first value",
            "Cannot explain the product's key workflows in terms the customer understands",
            "Waits for the customer to ask questions rather than anticipating needs",
            "Leaves the customer without clear next steps after interactions",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Follows a basic onboarding plan and gets the customer to initial activation.",
          evidence: [
            "Has a structured approach to onboarding (checklist, milestones, etc.)",
            "Explains key features and workflows clearly",
            "Checks in with the customer at reasonable intervals",
            "Customer reaches basic product usage by the end of onboarding",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Customizes onboarding to the customer's specific goals and drives adoption beyond basic usage.",
          evidence: [
            "Tailors onboarding to the customer's use case and success criteria",
            "Sets clear expectations and milestones with the customer",
            "Identifies adoption risks early (low usage, confusion, key contact changes)",
            "Drives the customer to deeper product usage, not just initial setup",
            "Customer can articulate how to use the product for their specific needs after onboarding",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Onboarding creates a foundation for long-term partnership — customers feel set up for sustained success.",
          evidence: [
            "Designs onboarding that accounts for the customer's organizational dynamics",
            "Builds internal champions within the customer's organization during onboarding",
            "Creates resources or frameworks the customer uses independently after onboarding",
            "Transitions from onboarding to ongoing management seamlessly",
            "Customer refers other teams or colleagues to the product based on onboarding experience",
          ],
        },
      ],
    },
    {
      slug: "escalation_handling",
      name: "Escalation Handling",
      description:
        "How the candidate manages customer frustration, resolves issues, and maintains trust during problems.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Cannot manage upset customers; escalations get worse rather than better.",
          evidence: [
            "Becomes defensive or dismissive when the customer is frustrated",
            "Makes promises they cannot keep to calm the customer down",
            "Does not take ownership of the issue",
            "Cannot de-escalate emotionally charged situations",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Handles escalations professionally and gets to resolution, even if not always efficiently.",
          evidence: [
            "Acknowledges the customer's frustration empathetically",
            "Takes ownership and communicates what they will do",
            "Follows through on commitments made during the escalation",
            "Keeps the customer informed of progress",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Turns escalations into trust-building moments — customers feel more confident in the relationship after the issue is resolved.",
          evidence: [
            "De-escalates quickly by validating the customer's experience",
            "Identifies the root cause, not just the symptom",
            "Communicates proactively with a clear timeline and plan",
            "Follows up after resolution to confirm satisfaction",
            "Identifies patterns and feeds back to the product or engineering team to prevent recurrence",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Manages escalations in a way that deepens the partnership — the customer trusts them more because of how problems are handled.",
          evidence: [
            "Anticipates potential escalations and addresses them before they happen",
            "Handles high-stakes escalations (executive involvement, churn risk) with composure",
            "Creates systemic improvements based on escalation patterns",
            "Customer references the escalation handling as a positive experience",
            "Knows when to escalate internally and does so with clear context and proposed solutions",
          ],
        },
      ],
    },
    {
      slug: "value_realization",
      name: "Value Realization & Retention",
      description:
        "How the candidate ensures customers achieve their desired outcomes and drives renewals and expansion.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Does not track whether the customer is getting value; reactive to churn signals.",
          evidence: [
            "Cannot articulate what success looks like for the customer",
            "Does not monitor usage or health indicators",
            "Learns about churn risk only when the customer announces they're leaving",
            "No proactive outreach to ensure adoption",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Monitors basic health indicators and engages customers to drive renewal.",
          evidence: [
            "Tracks product usage and identifies accounts at risk",
            "Conducts regular check-ins or business reviews",
            "Can articulate the value the customer is getting from the product",
            "Prepares for renewal conversations with basic usage data",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Proactively drives value realization — customers see measurable outcomes and willingly expand.",
          evidence: [
            "Defines success metrics with the customer and tracks them collaboratively",
            "Identifies expansion opportunities based on customer goals and product capabilities",
            "Builds business reviews that demonstrate ROI in the customer's terms",
            "Addresses churn risks before they become critical",
            "Customer sees the CSM as contributing to their success, not just managing a vendor relationship",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Customers achieve outcomes that exceed their original expectations — renewal and expansion are natural outcomes.",
          evidence: [
            "Connects product value to the customer's strategic goals and career goals",
            "Builds a partnership where the customer co-creates their success plan",
            "Creates customer advocates who refer new business",
            "Identifies and drives expansion opportunities the customer hadn't considered",
            "Renewal conversations are formalities because the value is already proven",
          ],
        },
      ],
    },
    {
      slug: "relationship_management",
      name: "Relationship Management",
      description:
        "How the candidate builds and maintains trust with key stakeholders across the customer's organization.",
      rubric: [
        {
          level: 1,
          label: "Foundational",
          pattern:
            "Does not build meaningful relationships; interactions are purely transactional.",
          evidence: [
            "Only contacts the customer when there's a problem or renewal approaching",
            "Does not know key stakeholders beyond the primary contact",
            "Cannot adapt their approach to different personality types",
            "Customers would not recognize their name or face",
          ],
        },
        {
          level: 2,
          label: "Competent",
          pattern:
            "Maintains professional relationships with primary contacts.",
          evidence: [
            "Has regular touchpoints with key contacts",
            "Remembers context from previous conversations",
            "Is responsive and reliable in communications",
            "Customer feels comfortable raising concerns with them",
          ],
        },
        {
          level: 3,
          label: "Advanced",
          pattern:
            "Builds multi-threaded relationships across the customer's organization.",
          evidence: [
            "Has relationships beyond the primary contact (executives, end users, IT)",
            "Adapts communication style to different stakeholder types",
            "Proactively shares relevant information, insights, or industry trends",
            "Is seen as a trusted advisor, not just a vendor representative",
            "Navigates internal politics at the customer's organization effectively",
          ],
        },
        {
          level: 4,
          label: "Expert",
          pattern:
            "Relationships are deep enough that the customer proactively involves them in strategic decisions.",
          evidence: [
            "Customer invites them to internal planning meetings or strategy discussions",
            "Has executive-level relationships that can unlock strategic opportunities",
            "Builds relationships that survive contact changes and reorganizations",
            "Customers think of them when facing challenges, even outside the product's scope",
            "Relationship quality directly drives retention and expansion metrics",
          ],
        },
      ],
    },
  ],
  universalOverrides: {
    communication: [
      {
        level: 1,
        label: "Foundational",
        pattern:
          "Struggles to convey ideas clearly; communication creates friction rather than reducing it.",
        evidence: [
          "Cannot explain product features or processes in simple terms",
          "Does not listen to the customer — talks over them or misses key concerns",
          "Written communication is confusing or lacks important context",
          "Fails to set expectations or follow up as promised",
        ],
      },
      {
        level: 2,
        label: "Competent",
        pattern:
          "Communicates clearly enough to move work forward without frequent misunderstandings.",
        evidence: [
          "Explains product features and troubleshooting steps clearly",
          "Listens actively and confirms understanding",
          "Written updates are clear and professional",
          "Follows up on commitments reliably",
        ],
      },
      {
        level: 3,
        label: "Advanced",
        pattern:
          'Communicates with empathy and structure — customers feel heard and know exactly what to expect.',
        evidence: [
          "Adapts tone and approach based on the customer's emotional state",
          "Proactively communicates updates, changes, and upcoming events",
          "Business reviews and reports tell a clear story about value and progress",
          "Handles difficult conversations (price increases, feature gaps) with transparency and empathy",
        ],
      },
      {
        level: 4,
        label: "Expert",
        pattern:
          "Communication deepens trust and creates clarity — customers feel they have a genuine partner invested in their success.",
        evidence: [
          "Communicates in a way that makes the customer feel prioritized among all accounts",
          "Creates written artifacts (playbooks, success plans) that customers reference independently",
          "Handles executive-level communication with confidence and credibility",
          "Communication style adapts seamlessly across cultures, seniority levels, and contexts",
          "Customers proactively share feedback and concerns because they trust the response will be constructive",
        ],
      },
    ],
  },
  archetypes: [
    {
      slug: "onboarding_specialist",
      name: "Onboarding Specialist",
      description:
        "Guide new customers from purchase to productive use; ensure successful initial adoption.",
      weights: {
        onboarding_enablement: 1.5,
        escalation_handling: 1.0,
        value_realization: 1.0,
        relationship_management: 1.2,
        communication: 1.4,
        practical_maturity: 1.0,
        collaboration_coachability: 1.2,
      },
      seniorityGates: {
        JUNIOR: { onboarding_enablement: 2, communication: 2 },
        MID: {
          onboarding_enablement: 3,
          escalation_handling: 2,
          value_realization: 2,
          relationship_management: 2,
          communication: 3,
          practical_maturity: 2,
          collaboration_coachability: 2,
        },
        SENIOR: {
          onboarding_enablement: 4,
          escalation_handling: 3,
          value_realization: 3,
          relationship_management: 3,
          communication: 4,
          practical_maturity: 3,
          collaboration_coachability: 3,
        },
      },
    },
    {
      slug: "customer_success_manager",
      name: "Customer Success Manager",
      description:
        "Own the ongoing customer relationship post-onboarding; drive retention, expansion, and advocacy.",
      weights: {
        onboarding_enablement: 0.8,
        escalation_handling: 1.2,
        value_realization: 1.5,
        relationship_management: 1.4,
        communication: 1.2,
        practical_maturity: 1.2,
        collaboration_coachability: 1.0,
      },
      seniorityGates: {
        JUNIOR: { value_realization: 2, relationship_management: 2 },
        MID: {
          onboarding_enablement: 2,
          escalation_handling: 2,
          value_realization: 3,
          relationship_management: 3,
          communication: 2,
          practical_maturity: 2,
          collaboration_coachability: 2,
        },
        SENIOR: {
          onboarding_enablement: 3,
          escalation_handling: 3,
          value_realization: 4,
          relationship_management: 4,
          communication: 3,
          practical_maturity: 3,
          collaboration_coachability: 3,
        },
      },
    },
    {
      slug: "renewals_manager",
      name: "Renewals Manager",
      description:
        "Drive contract renewals; negotiate terms; identify and mitigate churn risks.",
      weights: {
        onboarding_enablement: 0.8,
        escalation_handling: 1.3,
        value_realization: 1.4,
        relationship_management: 1.3,
        communication: 1.2,
        practical_maturity: 1.3,
        collaboration_coachability: 0.8,
      },
      seniorityGates: {
        JUNIOR: { value_realization: 2, escalation_handling: 2 },
        MID: {
          onboarding_enablement: 2,
          escalation_handling: 3,
          value_realization: 3,
          relationship_management: 2,
          communication: 2,
          practical_maturity: 3,
          collaboration_coachability: 2,
        },
        SENIOR: {
          onboarding_enablement: 2,
          escalation_handling: 4,
          value_realization: 4,
          relationship_management: 3,
          communication: 3,
          practical_maturity: 4,
          collaboration_coachability: 2,
        },
      },
    },
  ],
  redFlags: [
    {
      slug: "customer_blame",
      name: "Customer Blame",
      description:
        "Blames the customer for issues rather than taking ownership of resolution.",
    },
    {
      slug: "reactive_only",
      name: "Reactive Only",
      description:
        "Only engages with the customer when problems arise or renewal is due.",
    },
    {
      slug: "false_promises",
      name: "False Promises",
      description:
        "Makes commitments about product capabilities or timelines that cannot be kept.",
    },
    {
      slug: "churn_blindness",
      name: "Churn Blindness",
      description:
        "Does not recognize warning signs of customer dissatisfaction or disengagement.",
    },
    {
      slug: "single_threaded",
      name: "Single-Threaded",
      description:
        "Only maintains a relationship with one contact at the customer, creating key-person risk.",
    },
  ],
};

// ============================================================================
// SEED FUNCTION
// ============================================================================

interface RubricLevelData {
  level: number;
  label: string;
  pattern: string;
  evidence: string[];
}

interface DimensionData {
  slug: string;
  name: string;
  description: string;
  rubric: RubricLevelData[];
}

interface ArchetypeData {
  slug: string;
  name: string;
  description: string;
  weights: Record<string, number>;
  seniorityGates: Record<string, Record<string, number>>;
}

interface RedFlagData {
  slug: string;
  name: string;
  description: string;
}

interface RoleFamilyData {
  slug: string;
  name: string;
  description: string;
  dimensions: DimensionData[];
  universalOverrides: Record<string, RubricLevelData[]>;
  archetypes: ArchetypeData[];
  redFlags: RedFlagData[];
}

async function seedRubrics() {
  console.log("🔄 Seeding rubric data...\n");

  // Step 1: Create universal dimensions
  console.log("  Creating universal dimensions...");
  const dimensionMap = new Map<string, string>(); // slug -> id

  for (const dim of UNIVERSAL_DIMENSIONS) {
    const created = await prisma.dimension.upsert({
      where: { slug: dim.slug },
      update: {
        name: dim.name,
        description: dim.description,
        isUniversal: dim.isUniversal,
      },
      create: {
        slug: dim.slug,
        name: dim.name,
        description: dim.description,
        isUniversal: dim.isUniversal,
      },
    });
    dimensionMap.set(dim.slug, created.id);

    // Create default rubric levels (roleFamilyId = null)
    // Can't use upsert with null in unique constraint, so delete + create
    await prisma.rubricLevel.deleteMany({
      where: { dimensionId: created.id, roleFamilyId: null },
    });
    for (const level of dim.defaultRubric) {
      await prisma.rubricLevel.create({
        data: {
          dimensionId: created.id,
          roleFamilyId: null,
          level: level.level,
          label: level.label,
          pattern: level.pattern,
          evidence: level.evidence,
        },
      });
    }
  }
  console.log(`    ✓ ${UNIVERSAL_DIMENSIONS.length} universal dimensions created`);

  // Step 2: Create role families with their dimensions, archetypes, etc.
  const roleFamilies: RoleFamilyData[] = [
    ENGINEERING,
    PRODUCT_MANAGEMENT,
    DATA_SCIENCE,
    PROGRAM_MANAGEMENT,
    SALES,
    CUSTOMER_SUCCESS,
  ];

  for (const family of roleFamilies) {
    console.log(`\n  Creating role family: ${family.name}...`);

    // Create the role family
    const rf = await prisma.roleFamily.upsert({
      where: { slug: family.slug },
      update: { name: family.name, description: family.description },
      create: {
        slug: family.slug,
        name: family.name,
        description: family.description,
      },
    });

    // Create role-specific dimensions
    for (let i = 0; i < family.dimensions.length; i++) {
      const dim = family.dimensions[i];
      const created = await prisma.dimension.upsert({
        where: { slug: dim.slug },
        update: { name: dim.name, description: dim.description },
        create: {
          slug: dim.slug,
          name: dim.name,
          description: dim.description,
          isUniversal: false,
        },
      });
      dimensionMap.set(dim.slug, created.id);

      // Link dimension to role family
      await prisma.roleFamilyDimension.upsert({
        where: {
          roleFamilyId_dimensionId: {
            roleFamilyId: rf.id,
            dimensionId: created.id,
          },
        },
        update: { sortOrder: i },
        create: {
          roleFamilyId: rf.id,
          dimensionId: created.id,
          sortOrder: i,
        },
      });

      // Create rubric levels for this dimension
      for (const level of dim.rubric) {
        // Delete existing if any, then create (to handle null roleFamilyId properly)
        await prisma.rubricLevel.deleteMany({
          where: {
            dimensionId: created.id,
            roleFamilyId: null,
            level: level.level,
          },
        });
        await prisma.rubricLevel.create({
          data: {
            dimensionId: created.id,
            roleFamilyId: null,
            level: level.level,
            label: level.label,
            pattern: level.pattern,
            evidence: level.evidence,
          },
        });
      }
    }
    console.log(`    ✓ ${family.dimensions.length} role-specific dimensions`);

    // Link universal dimensions to this role family
    const universalSlugs = UNIVERSAL_DIMENSIONS.map((d) => d.slug);
    for (let i = 0; i < universalSlugs.length; i++) {
      const dimId = dimensionMap.get(universalSlugs[i])!;
      await prisma.roleFamilyDimension.upsert({
        where: {
          roleFamilyId_dimensionId: {
            roleFamilyId: rf.id,
            dimensionId: dimId,
          },
        },
        update: { sortOrder: family.dimensions.length + i },
        create: {
          roleFamilyId: rf.id,
          dimensionId: dimId,
          sortOrder: family.dimensions.length + i,
        },
      });
    }

    // Create role-family-specific overrides for universal dimensions
    for (const [dimSlug, levels] of Object.entries(family.universalOverrides)) {
      const dimId = dimensionMap.get(dimSlug)!;
      for (const level of levels) {
        // Delete existing overrides, then create
        await prisma.rubricLevel.deleteMany({
          where: {
            dimensionId: dimId,
            roleFamilyId: rf.id,
            level: level.level,
          },
        });
        await prisma.rubricLevel.create({
          data: {
            dimensionId: dimId,
            roleFamilyId: rf.id,
            level: level.level,
            label: level.label,
            pattern: level.pattern,
            evidence: level.evidence,
          },
        });
      }
    }
    const overrideCount = Object.keys(family.universalOverrides).length;
    if (overrideCount > 0) {
      console.log(`    ✓ ${overrideCount} universal dimension overrides`);
    }

    // Create archetypes with weights and seniority gates
    for (const arch of family.archetypes) {
      const createdArch = await prisma.archetype.upsert({
        where: { slug: arch.slug },
        update: {
          name: arch.name,
          description: arch.description,
          roleFamilyId: rf.id,
        },
        create: {
          slug: arch.slug,
          name: arch.name,
          description: arch.description,
          roleFamilyId: rf.id,
        },
      });

      // Create weights
      for (const [dimSlug, weight] of Object.entries(arch.weights)) {
        const dimId = dimensionMap.get(dimSlug);
        if (!dimId) {
          console.warn(
            `    ⚠ Dimension ${dimSlug} not found for archetype ${arch.slug}`
          );
          continue;
        }
        await prisma.archetypeWeight.upsert({
          where: {
            archetypeId_dimensionId: {
              archetypeId: createdArch.id,
              dimensionId: dimId,
            },
          },
          update: { weight },
          create: {
            archetypeId: createdArch.id,
            dimensionId: dimId,
            weight,
          },
        });
      }

      // Create seniority gates
      for (const [senLevel, gates] of Object.entries(arch.seniorityGates)) {
        for (const [dimSlug, minScore] of Object.entries(gates)) {
          const dimId = dimensionMap.get(dimSlug);
          if (!dimId) continue;
          await prisma.seniorityGate.upsert({
            where: {
              archetypeId_dimensionId_seniorityLevel: {
                archetypeId: createdArch.id,
                dimensionId: dimId,
                seniorityLevel: senLevel,
              },
            },
            update: { minScore },
            create: {
              archetypeId: createdArch.id,
              dimensionId: dimId,
              seniorityLevel: senLevel,
              minScore,
            },
          });
        }
      }
    }
    console.log(`    ✓ ${family.archetypes.length} archetypes with weights and gates`);

    // Create red flags
    for (const flag of family.redFlags) {
      await prisma.redFlag.upsert({
        where: {
          roleFamilyId_slug: {
            roleFamilyId: rf.id,
            slug: flag.slug,
          },
        },
        update: { name: flag.name, description: flag.description },
        create: {
          roleFamilyId: rf.id,
          slug: flag.slug,
          name: flag.name,
          description: flag.description,
        },
      });
    }
    console.log(`    ✓ ${family.redFlags.length} red flags`);
  }

  // Summary
  const totalDimensions = await prisma.dimension.count();
  const totalRubricLevels = await prisma.rubricLevel.count();
  const totalArchetypes = await prisma.archetype.count();
  const totalWeights = await prisma.archetypeWeight.count();
  const totalGates = await prisma.seniorityGate.count();
  const totalRedFlags = await prisma.redFlag.count();

  console.log("\n✅ Rubric seed complete!");
  console.log(`   ${roleFamilies.length} role families`);
  console.log(`   ${totalDimensions} dimensions (${UNIVERSAL_DIMENSIONS.length} universal)`);
  console.log(`   ${totalRubricLevels} rubric levels`);
  console.log(`   ${totalArchetypes} archetypes`);
  console.log(`   ${totalWeights} archetype weights`);
  console.log(`   ${totalGates} seniority gates`);
  console.log(`   ${totalRedFlags} red flags`);
}

seedRubrics()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
