# PRD: Simulation Builder Redesign — Effortless Setup for Hiring Managers

## Overview

Redesign the simulation creation flow so hiring managers can set up a realistic work simulation with **minimal effort**. The current builder requires ~15 conversational turns to fill in company details, task descriptions, repo URLs, and coworkers one by one. The new flow starts with a job description (or a short guided questionnaire), then auto-generates everything the system needs — coworkers, coding task suggestions, starter repo, company context — so the hiring manager just reviews and saves.

**Core Principle:** The hiring manager is NOT a developer. They should never see GitHub, never configure personas manually, never worry about tech stacks. They paste a job description (or answer 4-5 questions) and get a ready-to-go simulation.

## Goals

- Reduce simulation creation from ~15 conversational turns to **1 paste + 1-2 confirmations** (JD path) or **4-5 questions** (guided path)
- Auto-extract company name, role, tech stack, seniority, and responsibilities from job descriptions
- Auto-generate relevant coworkers with realistic personas and domain knowledge
- Auto-provision starter repos from a template library (hiring manager never touches GitHub)
- Enrich company context from public web sources when possible
- Present a clear preview of what the candidate will experience before saving
- Make the `repoUrl` field completely invisible to the hiring manager

## User Stories

### US-001: Job Description Entry Point

**Description:** As a hiring manager, I want to paste my job description to create a simulation so that I don't have to manually fill in every field.

**Acceptance Criteria:**
- [ ] New simulation page shows a clean entry screen with two clear paths: "Paste a job description" (primary/recommended) and "I don't have one — guide me" (secondary)
- [ ] JD path shows a large text area with placeholder text like "Paste your job description here..."
- [ ] Text area accepts plain text of any length (job descriptions vary widely)
- [ ] A "Create Simulation" / "Continue" button is clearly visible below the text area
- [ ] The "guide me" path navigates to the guided questionnaire (US-003)
- [ ] Page follows the existing recruiter dark-sidebar layout
- [ ] Tests pass
- [ ] Typecheck passes

**Context:**
This replaces the current chat-based entry. The split-panel layout (left: input, right: preview) can be preserved but the left panel changes from chat to structured input. The existing page is at `src/app/recruiter/simulations/new/`. The server component uses `requireRecruiter()` for auth.

---

### US-002: Job Description Parsing with AI

**Description:** As the system, I want to extract structured data from a pasted job description so that I can auto-populate the simulation fields.

**Acceptance Criteria:**
- [ ] Create a server-side API endpoint `POST /api/recruiter/simulations/parse-jd` that accepts `{ jobDescription: string }`
- [ ] Use Gemini Flash to extract: `roleName`, `companyName`, `companyDescription` (inferred from JD context), `techStack` (array of technologies/frameworks/languages mentioned), `seniorityLevel` (junior/mid/senior/staff — inferred from years of experience, title, or responsibility scope), `keyResponsibilities` (array of 3-5 main duties), `domainContext` (what the company/team does)
- [ ] Return structured JSON with all extracted fields, using `null` for anything not found in the JD
- [ ] Extraction completes within 5 seconds for typical JDs (1-3 pages of text)
- [ ] Handle edge cases: very short JDs (just a title), very long JDs (5+ pages), non-English JDs (best effort)
- [ ] Include a confidence indicator for each field (high/medium/low) so the UI can highlight uncertain extractions
- [ ] Tests pass
- [ ] Typecheck passes

**Context:**
Uses `gemini-3-flash-preview` model (same as existing builder chat). The prompt should be structured to return valid JSON. Store the extraction prompt as a versioned constant in `src/prompts/recruiter/` for maintainability.

---

### US-003: Guided Questionnaire (No-JD Path)

**Description:** As a hiring manager without a job description, I want to answer a few simple questions so that the system can generate my simulation.

**Acceptance Criteria:**
- [ ] Show a clean, step-by-step form (not a chat) with 4-5 questions max
- [ ] Question 1: "What's the role title?" — text input with autocomplete suggestions (e.g., "Senior Backend Engineer", "Frontend Developer", "Full Stack Engineer")
- [ ] Question 2: "What's the company name?" — text input
- [ ] Question 3: "What does your company do?" — text area, 1-2 sentences (with placeholder example: "We're a fintech startup building payment infrastructure for small businesses")
- [ ] Question 4: "What technologies does this role use?" — multi-select chips for common stacks (React, Node.js, Python, Go, TypeScript, PostgreSQL, AWS, etc.) plus a free-text "Other" option
- [ ] Question 5: "What seniority level?" — single select: Junior, Mid-level, Senior, Staff+
- [ ] Each question appears one at a time or as a compact vertical form (not overwhelming)
- [ ] "Continue" button becomes active when questions 1 and 2 are answered (minimum required)
- [ ] On submit, data is structured to match the same format as JD parsing output (US-002)
- [ ] Tests pass
- [ ] Typecheck passes

**Context:**
This is the fallback path. Keep it simple — 4-5 fields max. The tech stack multi-select can reuse patterns from shadcn/ui. Questions 3-5 are optional but improve simulation quality. After submit, the flow joins the same path as JD parsing (US-004).

---

### US-004: Auto-Generate Simulation Preview from Parsed Data

**Description:** As a hiring manager, I want to see a complete simulation preview generated from my job description so that I know exactly what candidates will experience.

**Acceptance Criteria:**
- [ ] After JD parsing (US-002) or guided questionnaire (US-003), show a full simulation preview page
- [ ] Preview shows: simulation name (auto-generated, e.g., "Senior Frontend Engineer @ Acme"), company context, the coding task candidates will complete, the team members candidates will interact with (coworkers), and the tech stack
- [ ] Each section is clearly labeled and editable inline (click to edit)
- [ ] Auto-generated content is visually distinguished (e.g., subtle AI badge or "auto-generated" label) so the hiring manager knows what was inferred vs what they provided
- [ ] A prominent "Looks good — Create Simulation" button saves everything
- [ ] An "Edit with AI" option opens a chat panel for conversational refinement (reuses existing chat builder logic)
- [ ] The preview clearly communicates what the CANDIDATE will experience: "Candidates will join as a [role] at [company]. They'll chat with [coworker names] on Slack, complete a coding task, and defend their work in a call with their manager."
- [ ] Tests pass
- [ ] Typecheck passes

**Context:**
This is the key UX moment — the hiring manager sees the full picture before committing. The right panel preview from the current builder can be evolved into this. The "candidate experience summary" at the top is critical for clarity. Uses data from US-002/US-003 plus auto-generated coworkers (US-005) and task (US-006).

---

### US-005: Auto-Generate Coworkers from Role Context

**Description:** As the system, I want to automatically generate 2-3 realistic coworkers based on the role and company context so that the hiring manager doesn't have to create personas manually.

**Acceptance Criteria:**
- [ ] Create a server-side function that generates coworkers given: `roleName`, `seniorityLevel`, `companyName`, `companyDescription`, `techStack`, `taskDescription`, and `keyResponsibilities`
- [ ] Always generate an Engineering Manager coworker (required for kickoff and PR defense calls)
- [ ] Generate 1-2 peer/adjacent coworkers relevant to the role (e.g., a senior developer for a mid-level role, a product manager for a full-stack role, a DevOps engineer for a backend role)
- [ ] Each coworker has: `name` (realistic, diverse names), `role` (specific title), `personaStyle` (detailed communication style matching their role), and `knowledge` items (3-5 items with topics, trigger keywords, responses, and `isCritical` flags)
- [ ] Knowledge items are derived from the job responsibilities and tech stack — they should contain information a real candidate would need to discover during the simulation (e.g., "We use JWT tokens with 24-hour expiry for auth", "The payments service has a rate limit of 100 req/s")
- [ ] At least 2 knowledge items per coworker should be marked `isCritical: true`
- [ ] Coworker personas should feel realistic — not generic. A startup CTO persona should be casual and busy; a big-corp engineering manager should be more structured
- [ ] The AI prompt for generation is stored as a versioned constant in `src/prompts/recruiter/`
- [ ] Tests pass
- [ ] Typecheck passes

**Context:**
This replaces the manual coworker-by-coworker creation in the current chat builder. The existing `CoworkerBuilderData` type in `src/lib/scenarios/scenario-builder.ts` defines the schema. Coworker knowledge items are critical — they're what makes the simulation feel real. The knowledge should relate to the actual task and tech stack, not be generic.

---

### US-006: Auto-Generate Coding Task from Role Context

**Description:** As the system, I want to generate a realistic coding task based on the role, tech stack, and responsibilities so that the simulation tests relevant skills.

**Acceptance Criteria:**
- [ ] Create a server-side function that generates a task description given: `roleName`, `seniorityLevel`, `techStack`, `keyResponsibilities`, and `domainContext`
- [ ] Task description should be 2-4 paragraphs describing what the candidate needs to build — written as if from a manager giving a work assignment, not as a test question
- [ ] Task difficulty calibrated to seniority level: Junior gets well-scoped tasks with clear requirements, Mid gets tasks requiring some architectural decisions, Senior gets ambiguous tasks requiring trade-off discussions
- [ ] Task should relate to the company's actual domain (e.g., a fintech company gets a payments-related task, not a generic todo app)
- [ ] Task should be completable in 60-90 minutes of focused work
- [ ] Present 2-3 task options to the hiring manager (on the preview page from US-004) so they can pick the most relevant one, or describe their own
- [ ] The AI prompt for generation is stored as a versioned constant in `src/prompts/recruiter/`
- [ ] Tests pass
- [ ] Typecheck passes

**Context:**
The task description is stored in `scenario.taskDescription` and is used in coworker prompts (`src/prompts/coworker/persona.ts`) and the manager defense call (`src/prompts/manager/defense.ts`). It needs to be specific enough to code against but vague enough that the candidate must ask clarifying questions to coworkers (testing collaboration skills).

---

### US-007: Starter Repo Template System

**Description:** As the system, I want to automatically provision a starter repository for each simulation so that the hiring manager never needs to interact with GitHub.

**Acceptance Criteria:**
- [ ] Create a template registry mapping tech stacks to starter repo templates (config file or database table)
- [ ] Minimum templates at launch: React + TypeScript (Next.js), Node.js + Express + TypeScript, Python + FastAPI, React + Node.js Full Stack (monorepo)
- [ ] Each template includes: basic project structure, README with setup instructions, package.json/requirements.txt, a simple test setup, and placeholder files where the candidate will work
- [ ] Templates are stored as repos in a SkillVee GitHub organization (or as template definitions that can be forked/cloned programmatically)
- [ ] When a simulation is created, the system automatically selects the best template based on `techStack` and creates a new repo instance (fork or copy) under the SkillVee org
- [ ] The `repoUrl` is set automatically — the hiring manager never sees or configures it
- [ ] If no template matches the tech stack exactly, fall back to the closest match and log a warning
- [ ] Repo creation happens asynchronously (like avatar generation) — simulation is saved immediately, repo is provisioned in the background
- [ ] Tests pass
- [ ] Typecheck passes

**Context:**
Currently `repoUrl` is a required field that the recruiter must provide. This changes it to be system-managed. The `repoUrl` column stays in the database but is populated by the system. The async pattern follows the existing avatar generation approach (fire-and-forget POST). Template repos should be minimal — just enough structure for a candidate to start coding.

---

### US-008: Company Context Enrichment from Web

**Description:** As the system, I want to optionally enrich company context from public web sources so that the simulation feels authentic without the hiring manager having to describe their company in detail.

**Acceptance Criteria:**
- [ ] When a company name is provided (from JD or guided form), attempt to fetch public information about the company
- [ ] Sources to try: company website (homepage/about page), or web search results
- [ ] Extract: company description/mission, industry, approximate size, key products/services
- [ ] Use extracted info to enhance `companyDescription` if the hiring manager's input is sparse (< 50 characters)
- [ ] Enrichment is best-effort — if web fetch fails or returns nothing useful, silently fall back to what the hiring manager provided
- [ ] Enrichment happens during JD parsing or form submission (not a separate step)
- [ ] Never block the flow on enrichment — if it takes too long (>5s), proceed without it
- [ ] Show enriched description on the preview page with an indicator that it was auto-enhanced
- [ ] Tests pass
- [ ] Typecheck passes

**Context:**
This is a nice-to-have that significantly improves simulation quality. The company description flows into all coworker prompts (`src/prompts/coworker/persona.ts`) and the manager defense call. A richer description = more realistic AI personas. Use the existing `WebFetch`-style approach or a simple web search API.

---

### US-009: Remove repoUrl from Required Builder Fields

**Description:** As a developer, I want to update the scenario validation and creation logic to make `repoUrl` system-managed instead of user-provided.

**Acceptance Criteria:**
- [ ] Update `ScenarioBuilderData` type: remove `repoUrl` from user-facing fields
- [ ] Update `getCompletionStatus()` in `scenario-builder.ts`: remove `repoUrl` from the required fields list
- [ ] Update `ScenarioCreateSchema` validation: make `repoUrl` optional (it will be set asynchronously by US-007)
- [ ] Update the Prisma schema if needed: `repoUrl` should have a default value or be nullable (to support the async provisioning window)
- [ ] Update the simulation detail page (`src/app/recruiter/simulations/[id]/client.tsx`): show repo status as "Setting up..." with a spinner while `repoUrl` is null, then show the URL once provisioned
- [ ] Update the candidate-facing flow: if `repoUrl` is null when assessment starts, show "Repository is being prepared, please wait..." message
- [ ] Ensure existing simulations with `repoUrl` already set continue to work unchanged
- [ ] Update existing builder system prompt to stop asking for repo URL
- [ ] Tests pass
- [ ] Typecheck passes

**Context:**
This is the schema/validation change that enables US-007. The `repoUrl` field stays in the database but transitions from "recruiter provides" to "system provisions." This should be done before or alongside US-007. The Prisma migration must be backward-compatible.

---

### US-010: Simulation Preview — Candidate Experience Summary

**Description:** As a hiring manager, I want a clear summary of what the candidate will experience so that I can confidently share the simulation link.

**Acceptance Criteria:**
- [ ] At the top of the simulation preview (US-004), display a "Candidate Experience" card that narratively describes the full flow
- [ ] Summary reads like: "When [Candidate Name] joins, they'll be onboarded as a **[Role]** at **[Company]**. They'll meet their team on Slack — **[Coworker 1 name]** ([role]), **[Coworker 2 name]** ([role]), and **[Coworker 3 name]** ([role]). Their manager **[Manager name]** will kick off the project: [1-line task summary]. They'll have ~90 minutes to complete the task, ask questions, and submit a pull request. Finally, they'll defend their work in a call with [Manager name]."
- [ ] Summary updates dynamically as the hiring manager edits any field
- [ ] Summary uses the actual generated coworker names and roles
- [ ] Include a visual timeline/stepper showing the stages: Welcome → Team Chat → Coding → PR Defense → Results
- [ ] Tests pass
- [ ] Typecheck passes

**Context:**
This is the "aha moment" for the hiring manager — they see exactly what the candidate will go through. It answers the question "what is this simulation, actually?" without requiring the HM to understand the technical implementation. This card should be the most prominent element on the preview page.

---

### US-011: Wire Up End-to-End Save Flow

**Description:** As a hiring manager, I want to save the complete simulation in one click so that everything (scenario, coworkers, repo) is created together.

**Acceptance Criteria:**
- [ ] "Create Simulation" button on preview page saves everything in the correct order: (1) Create scenario record, (2) Create coworker records, (3) Trigger avatar generation (async), (4) Trigger repo provisioning (async, US-007)
- [ ] Show a loading state with progress: "Creating simulation...", "Setting up team members...", "Done!"
- [ ] On success, redirect to the simulation detail page (`/recruiter/simulations/[id]`) with a success toast
- [ ] The simulation detail page shows the shareable candidate link prominently (existing behavior)
- [ ] On error, show a descriptive error message and allow retry without losing data
- [ ] The save flow uses the existing API endpoints: `POST /api/recruiter/simulations` and `POST /api/recruiter/simulations/[id]/coworkers`
- [ ] Auto-generate a simulation name from role + company if the hiring manager hasn't edited it (e.g., "Senior Frontend Engineer @ Acme")
- [ ] Tests pass
- [ ] Typecheck passes

**Context:**
This integrates US-001 through US-010 into a working end-to-end flow. The save sequence mirrors the existing builder's `saveScenario()` method in `src/app/recruiter/simulations/new/client.tsx` but with the new data sources.

---

## Functional Requirements

1. The system shall provide two paths for simulation creation: job description paste and guided questionnaire
2. The system shall extract structured role data from unstructured job descriptions using Gemini Flash
3. The system shall auto-generate 2-3 realistic coworker personas with domain-relevant knowledge
4. The system shall auto-generate a coding task calibrated to seniority level
5. The system shall auto-provision starter repos from a template library without hiring manager involvement
6. The system shall optionally enrich company context from public web sources
7. The system shall present a clear preview showing what the candidate will experience
8. The system shall allow inline editing of all auto-generated content
9. The system shall save the complete simulation (scenario + coworkers + repo) in one action
10. The system shall never expose GitHub URLs, repo configuration, or technical persona details to the hiring manager
11. The system shall complete JD parsing within 5 seconds
12. The system shall complete full simulation generation (task + coworkers) within 15 seconds

## Non-Goals

- Custom repo templates uploaded by hiring managers (future feature)
- Multiple coding tasks per simulation (one task per simulation for MVP)
- Hiring manager editing coworker knowledge items directly (use "Edit with AI" chat instead)
- Integration with ATS systems (Greenhouse, Lever, etc.) to pull JDs automatically
- Team collaboration on simulation creation (single creator for now)
- Simulation duplication/cloning (future feature)

## Technical Considerations

### Dependencies
- Gemini Flash API for JD parsing and content generation
- GitHub API for repo provisioning (US-007)
- Web search/fetch for company enrichment (US-008)
- Existing Prisma schema and API routes

### Migration
- `repoUrl` must become nullable in Prisma schema (backward-compatible migration)
- Existing simulations with `repoUrl` continue to work
- New simulations get `repoUrl` set asynchronously

### Performance
- JD parsing: < 5 seconds
- Coworker + task generation: can be parallelized, total < 15 seconds
- Repo provisioning: async, < 60 seconds (non-blocking)
- Company enrichment: best-effort, < 5 seconds timeout

## Success Metrics

- Average simulation creation time drops from ~10 minutes to < 2 minutes
- 80%+ of hiring managers use the JD paste path
- < 20% of hiring managers edit auto-generated coworkers (indicates good defaults)
- 100% of simulations have a working repo URL within 60 seconds of creation
