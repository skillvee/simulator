# Skillvee Simulator Architecture

A comprehensive developer assessment platform simulating a realistic "day at work." This document provides a single source of truth for understanding the system architecture.

## Overview

Skillvee assesses **HOW developers work**, not just WHAT they produce. Candidates experience a full simulation:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ASSESSMENT FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│   │    HR    │───▶│ Manager  │───▶│  Coding  │───▶│    PR    │            │
│   │Interview │    │ Kickoff  │    │   Task   │    │ Defense  │            │
│   │ (voice)  │    │ (voice)  │    │  (chat)  │    │ (voice)  │            │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘            │
│        │               │               │               │                   │
│        ▼               ▼               ▼               ▼                   │
│   ┌─────────────────────────────────────────────────────────────┐         │
│   │              SCREEN RECORDING (continuous)                   │         │
│   └─────────────────────────────────────────────────────────────┘         │
│                                                                             │
│   Assessment Dimensions: Communication, Problem-Solving, Technical          │
│   Knowledge, Collaboration, Adaptability, Leadership, Creativity,           │
│   Time Management                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Stack:** Next.js 15, React, Supabase (Postgres + Auth + Storage), Vercel, Gemini Live (voice), Gemini Flash (text)

## Assessment Flow

### Phase 1: HR Interview
- **Model:** `gemini-2.5-flash-native-audio-latest` via Gemini Live
- **Purpose:** Verify CV claims, assess communication skills
- **Prompt:** `src/prompts/hr/interview.ts`
- **Duration:** ~20 minutes voice conversation
- **Output:** Transcript, communication/CV verification scores

### Phase 2: Manager Kickoff
- **Model:** `gemini-2.5-flash-native-audio-latest` via Gemini Live
- **Purpose:** Brief candidate on task (intentionally vague to test clarifying questions)
- **Prompt:** `src/prompts/manager/kickoff.ts`
- **Key Design:** Manager is vague - good candidates ask questions
- **Output:** Transcript, record of questions asked

### Phase 3: Coding Task
- **Model:** `gemini-3-flash-preview` for text chat
- **Purpose:** Candidate works on task, can chat with AI coworkers
- **Prompts:** `src/prompts/coworker/persona.ts`
- **Features:**
  - Slack-like interface with multiple coworkers
  - Text chat and voice calls with coworkers
  - Conversation memory across interactions
  - Screen recording captures work process

### Phase 4: PR Defense
- **Model:** `gemini-2.5-flash-native-audio-latest` via Gemini Live
- **Purpose:** Candidate defends their PR to the manager
- **Prompt:** `src/prompts/manager/defense.ts`
- **Context injected:** Code review, conversation history, screen analysis
- **Output:** Final assessment data

## Data Model

### Entity Relationship Diagram

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│    User     │──┬──▶│  Assessment  │◀─────│  Scenario   │
│             │  │   │              │      │             │
│ - id        │  │   │ - status     │      │ - name      │
│ - email     │  │   │ - prUrl      │      │ - repoUrl   │
│ - role      │  │   │ - codeReview │      │ - techStack │
│ - cvUrl     │  │   │ - report     │      └──────┬──────┘
│ - parsedCV  │  │   └──────┬───────┘             │
└─────────────┘  │          │                     │
                 │          ▼                     ▼
                 │   ┌──────────────┐      ┌─────────────┐
                 │   │ Conversation │◀─────│  Coworker   │
                 │   │              │      │             │
                 │   │ - type       │      │ - name      │
                 │   │ - transcript │      │ - role      │
                 │   └──────────────┘      │ - knowledge │
                 │          │              │ - voiceName │
                 │          ▼              └─────────────┘
                 │   ┌──────────────┐
                 │   │  Recording   │
                 │   │              │
                 │   │ - type       │
                 │   │ - storageUrl │
                 │   │ - analysis   │
                 │   └──────────────┘
                 │
                 └──▶┌──────────────────┐
                     │ VideoAssessment  │
                     │                  │
                     │ - status         │
                     │ - videoUrl       │
                     └────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │ DimensionScore   │
                     │                  │
                     │ - dimension      │
                     │ - score (1-5)    │
                     │ - behaviors      │
                     │ - timestamps     │
                     └──────────────────┘
```

### Key Entities

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| `User` | Platform users (candidates & admins) | email, role (USER/ADMIN), cvUrl, parsedProfile |
| `Scenario` | Assessment scenarios with company context | name, companyName, taskDescription, repoUrl, techStack |
| `Coworker` | AI coworkers within a scenario | name, role, personaStyle, knowledge (JSON), voiceName |
| `Assessment` | A candidate's assessment attempt | userId, scenarioId, status, prUrl, codeReview, report |
| `Conversation` | Chat/voice transcripts | assessmentId, coworkerId, type, transcript (JSON) |
| `Recording` | Screen recording metadata | assessmentId, type, storageUrl, analysis |
| `RecordingSegment` | Recording chunks for robustness | recordingId, chunkPaths, screenshotPaths |
| `HRInterviewAssessment` | HR-specific scores | communicationScore, cvVerificationNotes |
| `VideoAssessment` | Full video evaluation | candidateId, status, scores |
| `DimensionScore` | Per-dimension scores | dimension, score, observableBehaviors, timestamps |
| `CandidateEmbedding` | Semantic search vectors | embedding (vector 768), observableBehaviorsText |

### Assessment Status Flow

```
HR_INTERVIEW → ONBOARDING → WORKING → FINAL_DEFENSE → PROCESSING → COMPLETED
```

### 8 Assessment Dimensions

1. `COMMUNICATION` - Clarity, articulation, asking good questions
2. `PROBLEM_SOLVING` - Breaking down tasks, debugging approach
3. `TECHNICAL_KNOWLEDGE` - Understanding of tech stack, patterns
4. `COLLABORATION` - Engaging coworkers, gathering context
5. `ADAPTABILITY` - Handling ambiguity, changing requirements
6. `LEADERSHIP` - Proactive decisions, taking ownership
7. `CREATIVITY` - Novel approaches, creative solutions
8. `TIME_MANAGEMENT` - Pacing, prioritization

## AI Integration

### Models Used

| Stage | Model | Purpose |
|-------|-------|---------|
| HR Interview | `gemini-2.5-flash-native-audio-latest` | Voice conversation via Gemini Live |
| Manager Kickoff | `gemini-2.5-flash-native-audio-latest` | Voice briefing via Gemini Live |
| Coworker Chat | `gemini-3-flash-preview` | Text chat responses |
| Coworker Voice | `gemini-2.5-flash-native-audio-latest` | Voice calls via Gemini Live |
| PR Defense | `gemini-2.5-flash-native-audio-latest` | Voice review via Gemini Live |
| Code Review | `gemini-3-flash-preview` | PR analysis |
| CV Parsing | `gemini-3-flash-preview` | Extract structured data from CVs |
| Video Evaluation | `gemini-3-flash-preview` | Full assessment analysis |
| Recording Analysis | `gemini-3-flash-preview` | Screenshot/activity analysis |

### Prompt Files

| Domain | File | Purpose |
|--------|------|---------|
| HR | `src/prompts/hr/interview.ts` | HR phone screen persona |
| Manager | `src/prompts/manager/kickoff.ts` | Task briefing (intentionally vague) |
| Manager | `src/prompts/manager/defense.ts` | PR review conversation |
| Manager | `src/prompts/manager/pr-submission.ts` | PR acknowledgment messages |
| Coworker | `src/prompts/coworker/persona.ts` | Chat/voice persona builder |
| Analysis | `src/prompts/analysis/code-review.ts` | PR code review |
| Analysis | `src/prompts/analysis/cv-parser.ts` | CV extraction |
| Analysis | `src/prompts/analysis/video-evaluation.ts` | Full video assessment |
| Analysis | `src/prompts/analysis/recording.ts` | Screen recording analysis |
| Analysis | `src/prompts/analysis/assessment.ts` | Narrative/recommendations |
| Analysis | `src/prompts/analysis/hr-assessment.ts` | HR interview scoring |
| Analysis | `src/prompts/analysis/entity-extraction.ts` | Extract entities from text |
| Analysis | `src/prompts/analysis/feedback-parsing.ts` | Parse feedback responses |

### Gemini Integration Patterns

**Voice (Gemini Live):**
- Ephemeral token obtained from `/api/*/token` endpoints
- Transcription enabled server-side in token config
- Audio: 16kHz input (to Gemini), 24kHz output (from Gemini)
- Connection states: `idle → requesting-permission → connecting → connected → ended`

**Text Chat:**
- `systemInstruction` not supported - use first user/model message pair instead
- Clean JSON markdown from responses before parsing

**AI Call Logging:**
```typescript
import { logAICall } from "@/lib/analysis";

const tracker = await logAICall({
  assessmentId: assessment.id,
  endpoint: "/api/chat",
  promptText: fullPrompt,
  modelVersion: "gemini-3-flash-preview",
  promptType: "CHAT",
});
```

## Key Design Decisions

### 1. Voice Hook Architecture

**Decision:** Composition pattern with shared base hook.

**Rationale:** All voice calls (HR, kickoff, coworker, defense) share common logic but have different token endpoints and end-call behavior.

**Implementation:**
```
src/hooks/voice/
├── types.ts              # VoiceConnectionState, shared types
├── use-voice-base.ts     # ~400 LOC shared logic
├── use-voice-conversation.ts  # HR interview
├── use-coworker-voice.ts      # Coworker calls
├── use-defense-call.ts        # PR defense
└── use-manager-kickoff.ts     # Task briefing
```

### 2. Conversation Memory System

**Decision:** Summarization + recent messages for context injection.

**Rationale:** Full conversation history exceeds context limits. Summarizing older messages while keeping recent ones provides enough context without overflow.

**Implementation:** Memory context injected into coworker prompts via `buildChatPrompt()` and `buildVoicePrompt()`.

### 3. Intentionally Vague Manager Briefings

**Decision:** Manager gives vague task descriptions during kickoff.

**Rationale:** Tests whether candidates ask clarifying questions. Good candidates probe; bad candidates just say "okay" and guess.

**Implementation:** `buildManagerKickoffPrompt()` includes vague briefing with details only provided if asked.

### 4. Screen Recording Robustness

**Decision:** Chunk-based recording with segment stitching.

**Rationale:** Handles interruptions (laptop sleep, permission loss) gracefully. Recording continues across page reloads.

**Implementation:** `RecordingSegment` model stores chunk paths; segments stitched for final analysis.

### 5. Modern Blue Design System

**Decision:** Migrated from neo-brutalist to modern shadcn/ui with blue (#237CF1) primary.

**Rationale:** Professional, accessible design that works well across all components.

**Implementation:** shadcn/ui components (Button, Card, Input, Badge, Avatar) with consistent styling.

### 6. Type Organization

**Decision:** Shared types in `@/types`, component-specific types stay local.

**Rationale:** Prevents circular imports, makes dependencies clear.

**Implementation:** ESLint warns when importing types from implementation files.

## Common Patterns

### API Response Format

```typescript
import { success, error, validationError } from "@/lib/api";

// Success: { success: true, data: T }
return success({ assessment });

// Error: { success: false, error: string, code?: string }
return error("Not found", 404, "NOT_FOUND");

// Validation error with details
return validationError(zodError);
```

### Request Validation

```typescript
import { validateRequest } from "@/lib/api";
import { ChatRequestSchema } from "@/lib/schemas";

const validated = await validateRequest(request, ChatRequestSchema);
if ("error" in validated) return validated.error;
const { assessmentId, message } = validated.data;
```

### Database Query Pattern (Ownership Verification)

```typescript
import { getAssessmentForChat } from "@/server/queries/assessment";

const assessment = await getAssessmentForChat(id, session.user.id);
if (!assessment) {
  redirect("/profile");
}
```

All query functions filter by both `id` AND `userId` for security.

### Prisma JSON Handling

```typescript
// Read: double-cast
const data = record.field as unknown as MyType;

// Write: double-cast
await prisma.model.update({
  data: { field: value as unknown as Prisma.InputJsonValue }
});

// Null: use Prisma.JsonNull
await prisma.model.update({
  data: { field: Prisma.JsonNull }
});
```

### pgvector for Semantic Search

Must use raw SQL - Prisma ORM doesn't support vector operations:

```typescript
const results = await prisma.$queryRaw`
  SELECT * FROM "CandidateEmbedding"
  ORDER BY embedding <-> ${embedding}::vector
  LIMIT 10
`;
```

### Error Recovery Pattern

```typescript
import { env } from "@/lib/core";
import { logAICall } from "@/lib/analysis";

const tracker = await logAICall({ ... });
try {
  const response = await callAI(prompt);
  await tracker.complete({ responseText: response.text });
} catch (err) {
  await tracker.fail(err);
  // Handle retry or fallback
}
```

## Directory Structure

```
simulator/
├── src/
│   ├── app/              # Pages and API routes (Next.js app router)
│   │   ├── api/          # 38 routes across 16 endpoints
│   │   ├── admin/        # Admin panel pages
│   │   ├── assessment/   # Assessment flow pages
│   │   ├── candidate/    # Candidate profile pages
│   │   └── ...
│   ├── components/       # React components (domain-based)
│   │   ├── shared/       # Providers, cv-upload, markdown
│   │   ├── admin/        # Admin navigation, data deletion
│   │   ├── chat/         # Chat, coworker sidebar/voice
│   │   └── assessment/   # Recording guard, voice conversation
│   ├── hooks/            # Voice conversation and recording hooks
│   │   └── voice/        # Voice hook architecture
│   ├── lib/              # Utilities (domain-based)
│   │   ├── core/         # env, admin, error-recovery, analytics
│   │   ├── external/     # github, email, supabase, storage
│   │   ├── media/        # audio, screen, video-recorder
│   │   ├── ai/           # gemini, conversation-memory, coworker-persona
│   │   ├── analysis/     # ai-call-logging, assessment-aggregation
│   │   └── schemas/      # Zod validation schemas
│   ├── prompts/          # AI prompt templates by domain
│   │   ├── hr/           # HR interview
│   │   ├── manager/      # Kickoff, defense, PR submission
│   │   ├── coworker/     # Chat and voice personas
│   │   └── analysis/     # Code review, CV parsing, evaluation
│   ├── server/           # Server-side utilities
│   │   └── queries/      # Reusable assessment queries
│   └── types/            # Shared TypeScript types
├── prisma/               # Database schema
├── tests/                # E2E tests with agent-browser
├── ralph/                # Autonomous GitHub Issues runner
└── docs/                 # Documentation
```

## Testing

### E2E Test Data

Run `npx tsx prisma/seed.ts` to create test users:
- **Login:** `user@test.com` / `testpassword123`
- **Work page:** `/assessments/test-assessment-chat/work`

### Testing Patterns

- Define mocks INSIDE `vi.mock()` factory (Vitest hoisting)
- MediaRecorder doesn't exist in Node.js - mock it
- Test redirects/notFound by mocking next/navigation and expecting throws
- Use `E2E_TEST_MODE` env var to bypass screen recording in headless tests

## Related Documentation

- `CLAUDE.md` - Root project instructions
- `docs/prd.md` - Full PRD with user stories
- `ralph/progress.md` - Learnings from 145+ issues
- `.claude/skills/frontend-design/SKILL.md` - Design system rules
