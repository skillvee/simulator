# Recruiter-Focused Flow Redesign

## Overview

This document describes the redesign of Skillvee from a candidate-initiated flow to a recruiter-focused flow. Instead of candidates creating accounts and starting assessments on their own, recruiters create scenarios and share links with candidates.

## Current vs New Flow

### Current Flow (Candidate-Initiated)
```
Candidate signs up → CV upload → HR interview → Congratulations → Kickoff call → Slack → Submit PR → Defense page → Results
```

### New Flow (Recruiter-Focused)
```
Recruiter: Sign up → Dashboard → Create scenario → Share link (/join/[scenarioId])

Candidate: /join/[id] → Auth + Scenario info → Welcome (consent) → Slack → Work → Post PR → Manager says "call me" → Candidate calls → Hang up → Results
```

## Key Changes Summary

| Aspect | Before | After |
|--------|--------|-------|
| Entry point | Candidate signs up at /start | Recruiter shares /join/[scenarioId] link |
| CV Upload | Required | Removed |
| HR Interview | Required voice interview | Removed |
| Kickoff | Separate /kickoff page with call | Manager messages in Slack, then call |
| Defense | Separate /defense page | Happens in Slack - candidate calls manager |
| Status flow | HR_INTERVIEW → ONBOARDING → WORKING → FINAL_DEFENSE → PROCESSING → COMPLETED | WELCOME → WORKING → COMPLETED |

---

## Pages to Remove

### Candidate Pages
- `/start` - Smart router page (entire directory)
- `/assessment/[id]/cv-upload` - CV upload page
- `/assessment/[id]/hr-interview` - HR interview page
- `/assessment/[id]/congratulations` - Onboarding transition
- `/assessment/[id]/kickoff` - Manager briefing call
- `/assessment/[id]/defense` - Defense call page

### API Routes to Remove
- `/api/upload/cv` - CV upload handler
- `/api/interview/token` - HR interview token
- `/api/interview/transcript` - HR transcript storage
- `/api/kickoff/token` - Kickoff call token
- `/api/defense/token` - Defense call token (replaced by in-Slack call)

### Components to Remove
- `src/components/shared/cv-upload.tsx` - CV upload component

### Tests to Remove
- Any E2E tests for removed pages
- Unit tests for removed components/APIs

---

## Database Changes

### Models to Remove
- `HRInterviewAssessment` - Entire model

### Fields to Remove
- `User.cvUrl`
- `User.parsedProfile`
- `Assessment.cvUrl`
- `Assessment.parsedProfile`

### Enum Changes

**AssessmentStatus** - Remove old values, add WELCOME:
```prisma
enum AssessmentStatus {
  WELCOME    // After auth, on welcome page
  WORKING    // In Slack, working on task
  COMPLETED  // Assessment finished
}
```

**Role** - Add RECRUITER:
```prisma
enum Role {
  USER
  ADMIN
  RECRUITER
}
```

### New Fields
- `Scenario.createdById` - Foreign key to User (recruiter who created it)

---

## New Recruiter Routes

### Pages
| Route | Purpose |
|-------|---------|
| `/sign-up/recruiter` | Recruiter signup form |
| `/recruiter` | Redirects to dashboard |
| `/recruiter/dashboard` | Overview: stats, recent activity |
| `/recruiter/scenarios` | List of recruiter's scenarios |
| `/recruiter/scenarios/new` | Scenario builder (reuse from admin) |
| `/recruiter/scenarios/[id]` | Scenario detail with shareable link |
| `/recruiter/candidates` | List of candidates who've taken assessments |

### Dashboard Features
- Scenario count with "Create new" CTA
- Candidate count (completed assessments)
- Basic stats: completion rate, assessments this week
- Quick links to scenarios and candidates

### Scenario List Features
- Name, company name
- Shareable link with copy button
- Assessment count per scenario
- No published/draft toggle (all recruiter scenarios are active)

### Scenario Builder
- Reuse existing admin scenario builder (`/admin/scenarios/builder`)
- Remove the `isPublished` toggle for recruiters
- Scenarios are owned by the creating recruiter (`createdById`)

---

## Join Page (`/join/[scenarioId]`)

### Layout
Combined view with scenario info + auth form.

**Left/Top Section - Scenario Info:**
- Company name and logo (if available)
- Role/position
- Tech stack
- Task overview
- Estimated duration
- What to expect (AI-powered simulation, screen recorded)

**Right/Bottom Section - Auth:**
- Email/password signup form
- OAuth buttons (Google, LinkedIn)
- "Already have an account? Sign in" link

### Behavior
- Not logged in → Show combined auth + info page
- Logged in + no assessment for this scenario → Redirect to Welcome page, create assessment
- Logged in + existing in-progress assessment for this scenario → Redirect to Welcome with "Resume" button
- Logged in + different scenario assessment exists → Allow (users can have multiple assessments)
- Invalid/missing scenarioId → Show error page

---

## Welcome Page (`/assessment/[id]/welcome`)

### Purpose
Explain what's about to happen and get explicit consent for screen recording.

### Content Sections
1. **What is Skillvee** - Brief explanation of the day-at-work simulation
2. **Screen Recording** - We'll record your screen to assess how you work
3. **AI Usage Encouraged** - Feel free to use any AI tools (Copilot, ChatGPT, etc.)
4. **Intentionally Vague** - Context is intentionally vague; seek clarification from colleagues in Slack

### Consent
- Single checkbox: "I understand and agree to screen recording and the assessment process"
- "Start Simulation" button (disabled until checkbox checked)
- If resuming existing assessment: Show "Resume Simulation" instead

### On Start/Resume
1. If new: Create assessment record with status WELCOME
2. Update status to WORKING
3. Start screen recording
4. Redirect to `/assessment/[id]/chat`

---

## Slack/Chat Modifications

### Manager Auto-Start
When candidate enters chat view:
1. Wait 5-10 seconds (simulate realistic timing)
2. Manager sends initial messages with vague task context
3. Manager may suggest hopping on a call to discuss

### PR URL Detection
- Monitor candidate messages for GitHub/GitLab PR URL patterns
- Regex pattern: `https?:\/\/(github\.com|gitlab\.com)\/[^\s]+\/(pull|merge_requests)\/\d+`
- When detected:
  1. Save URL to `assessment.prUrl`
  2. Record timestamp
  3. Manager AI responds naturally: "Awesome! Give me a call to review this"

### Defense Call Flow
1. Candidate clicks call button to call manager
2. System detects this is post-PR-submission (assessment.prUrl exists)
3. Call uses defense prompt (code review discussion)
4. When candidate hangs up:
   - Stop screen recording
   - Update assessment status to COMPLETED
   - Navigate to `/assessment/[id]/results`

### Technical Implementation
- Modify `/api/chat/token` or create new endpoint for defense call context
- The call system already exists in Slack UI (bottom-left call panel)
- Need to pass different system prompt based on whether PR has been submitted

---

## Results Page Changes

### Current Behavior
- Shows assessment report
- Generates report on-demand if missing
- Has loading state during generation

### Changes Needed
- Remove checks for PROCESSING status (no longer exists)
- Handle report generation inline when candidate arrives after defense call
- Display new simplified assessment data (see Assessment Simplification below)

---

## Assessment Simplification

### Overview
Simplify the assessment from multiple LLM calls to a single video evaluation. Remove HR information, code review, screenshot analysis, and other complexity. One video assessment evaluates 8 skills and provides hiring signals for recruiters.

### Current Assessment System (TO BE REMOVED)
The current system makes multiple LLM calls:
- Code review analysis (`gemini-3-flash-preview`)
- Screenshot analysis per segment (`gemini-3-flash-preview`)
- Video evaluation (`gemini-3-pro-preview`)
- Narrative feedback generation (`gemini-3-flash-preview`)
- Recommendations generation (`gemini-3-flash-preview`)

### New Assessment System
**Single LLM call**: Video evaluation using `gemini-3-pro-preview`

**8 Skills to Evaluate** (from video-evaluation.ts):
1. Communication - Verbal & written clarity
2. Problem Solving - Analytical approach
3. Technical Knowledge - Domain expertise
4. Collaboration - Working with others
5. Adaptability - Response to changes
6. Leadership - Initiative & direction
7. Creativity - Novel approaches
8. Time Management - Prioritization & efficiency

**Output Per Skill:**
- Score (1-5)
- Rationale (why this score, with evidence)
- Green flags (positive signals observed)
- Red flags (concerns observed)

**Overall Hiring Section:**
- Overall green flags (top 3-5 strengths)
- Overall red flags (top 3-5 concerns)
- Hiring recommendation: `hire` | `maybe` | `no_hire`
- Recommendation rationale

### Files to Delete
- `src/lib/analysis/code-review.ts`
- `src/lib/analysis/recording-analysis.ts`
- `src/lib/analysis/assessment-aggregation.ts`
- `src/prompts/analysis/code-review.ts`
- `src/prompts/analysis/recording.ts`
- `src/prompts/analysis/assessment.ts`

### Files to Modify
- `src/lib/analysis/video-evaluation.ts` - Add hiring signals to output
- `src/prompts/analysis/video-evaluation.ts` - Extend prompt for hiring signals
- `src/app/api/assessment/report/route.ts` - Simplify to just call video evaluation
- `src/app/assessment/[id]/results/client.tsx` - Display new data structure

### New Output Schema
```typescript
interface AssessmentReport {
  evaluationVersion: string;
  overallScore: number; // 1.0-5.0
  skills: {
    dimension: string;
    score: number;
    rationale: string;
    greenFlags: string[];
    redFlags: string[];
    timestamps: string[];
  }[];
  hiringSignals: {
    overallGreenFlags: string[];
    overallRedFlags: string[];
    recommendation: 'hire' | 'maybe' | 'no_hire';
    recommendationRationale: string;
  };
  evaluationConfidence: 'high' | 'medium' | 'low';
  insufficientEvidenceNotes?: string;
}
```

### Assessment Simplification Issue Order
1. **RF-022: Delete unused analysis files** (#190) - Remove code-review.ts, recording-analysis.ts, assessment-aggregation.ts
2. **RF-023: Update video evaluation prompt** (#191) - Add hiring signals output schema
3. **RF-024: Simplify report API** (#192) - Remove multi-source aggregation, just call video evaluation
4. **RF-025: Update results page** (#193) - Display new simplified data structure

---

## Authentication Changes

### Separate Signup Pages
- `/sign-up` - Keep for candidates (or redirect to marketing)
- `/sign-up/recruiter` - New page for recruiter signup

### Recruiter Signup
- Same fields as regular signup
- Sets `role: RECRUITER` on user creation
- Redirects to `/recruiter/dashboard` after signup

### Candidate Signup
- Happens on `/join/[scenarioId]` page
- Sets `role: USER` (default)
- Redirects to Welcome page after signup

---

## Testing Infrastructure

### Required Test Data (extend prisma/seed.ts)

**Test Recruiter:**
- Email: `recruiter@test.com`
- Password: `testpassword123`
- Role: RECRUITER

**Test Candidate:**
- Email: `candidate@test.com`
- Password: `testpassword123`
- Role: USER

**Test Scenario (owned by test recruiter):**
- ID: `test-scenario-recruiter`
- Company: "Test Company"
- Published/active
- Has coworkers configured

**Test Assessment (for resume testing):**
- ID: `test-assessment-resume`
- Status: WORKING
- Linked to test candidate and test scenario

### Environment Flags
- `NEXT_PUBLIC_SKIP_SCREEN_RECORDING=true` - Skip screen recording in tests
- Tests should set this flag to avoid permission prompts

### Agent Browser Test Patterns
Each issue should include E2E tests using agent-browser that:
1. Navigate to the relevant page
2. Perform the user actions
3. Verify expected outcomes
4. Take screenshots for verification

---

## File Reference

### Key Files to Modify

**Prisma Schema:**
- `prisma/schema.prisma` - All database changes

**Middleware:**
- `src/middleware.ts` - Add recruiter route protection

**Auth:**
- `src/app/sign-up/recruiter/page.tsx` - New file
- `src/app/api/auth/register/route.ts` - Support recruiter role

**Recruiter Dashboard:**
- `src/app/recruiter/` - All new files

**Join Flow:**
- `src/app/join/[scenarioId]/page.tsx` - New file

**Welcome Page:**
- `src/app/assessment/[id]/welcome/page.tsx` - Repurpose existing

**Chat/Slack:**
- `src/app/assessment/[id]/chat/client.tsx` - PR detection, defense flow
- `src/components/chat/` - Call handling modifications

**Seed Data:**
- `prisma/seed.ts` - Test data for new flow

---

## Issue Execution Order

Issues should be executed in this order to maintain working state:

1. **Testing Infrastructure** - Set up test data and flags first
2. **Database Schema Changes** - Update Prisma schema
3. **Remove Old Pages/Routes** - Clean up deprecated code
4. **Recruiter Auth & Routes** - Add recruiter signup and dashboard
5. **Join Page** - Create candidate entry point
6. **Welcome Page** - Create consent/onboarding page
7. **Slack Modifications** - PR detection and defense call flow
8. **Results Integration** - Handle new status flow
9. **End-to-End Testing** - Full flow verification

---

## Success Criteria

The redesign is complete when:

1. Recruiters can:
   - Sign up at `/sign-up/recruiter`
   - Access dashboard at `/recruiter/dashboard`
   - Create scenarios using the builder
   - Copy shareable links for their scenarios
   - See candidates who completed assessments

2. Candidates can:
   - Open `/join/[scenarioId]` link
   - See scenario info and sign up/login
   - View welcome page with consent checkbox
   - Enter Slack and receive manager message
   - Work on task, chat with coworkers
   - Submit PR link in chat
   - Call manager for defense
   - See results after hanging up

3. Old flow is removed:
   - No CV upload
   - No HR interview
   - No separate kickoff/defense pages
   - Database cleaned of removed fields/models

4. All E2E tests pass using agent-browser
