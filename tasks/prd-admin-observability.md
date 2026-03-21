# PRD: Admin Observability & Error Tracing System

## Overview

A comprehensive observability layer for the Skillvee simulator that captures, stores, and surfaces all errors, Gemini API calls, conversation transcripts, and candidate interactions during assessments. When something breaks during an assessment, admins can trace the full chain of events end-to-end from the admin panel.

## Goals

- Capture 100% of client-side errors (console.error, console.warn, console.log, unhandled exceptions, React crashes) with assessment context
- Log every Gemini API interaction (text + voice) with full request/response data, including failures
- Enable end-to-end tracing from user action → API call → Gemini → response → UI
- Provide admin UI to search, filter, and drill into any assessment's full history
- Surface systemic error patterns across all assessments
- Auto-purge observability data after 30 days

## User Stories

### US-001: Client-Side Error Capture — Database Schema

**Description**: As a developer, I want a `ClientError` table so that client-side errors have a persistent storage location.

**Acceptance Criteria**:
- [ ] Add `ClientError` model to Prisma schema with fields: `id` (cuid), `assessmentId` (optional FK to Assessment), `userId` (optional FK to User), `errorType` (enum: UNHANDLED_EXCEPTION, CONSOLE_ERROR, CONSOLE_WARN, CONSOLE_LOG, REACT_BOUNDARY), `message` (String), `stackTrace` (String, optional), `componentName` (String, optional), `url` (String), `timestamp` (DateTime), `metadata` (Json, optional — browser info, React component tree, etc.)
- [ ] Add index on `(assessmentId, timestamp)` and `(errorType, timestamp)`
- [ ] Run `npx prisma migrate dev` to generate and apply migration
- [ ] Add `ClientError` to the Assessment relation (optional, one-to-many)

### US-002: Client-Side Error Capture — API Endpoint

**Description**: As a frontend component, I want a POST `/api/errors` endpoint so that client errors can be shipped to the database.

**Acceptance Criteria**:
- [ ] Create `src/app/api/errors/route.ts` with POST handler
- [ ] Accept JSON body: `{ assessmentId?, userId?, errorType, message, stackTrace?, componentName?, url, metadata? }`
- [ ] Validate required fields (errorType, message, url) and return 400 if missing
- [ ] Write to `ClientError` table via Prisma
- [ ] Return 201 on success
- [ ] Rate-limit: max 50 errors per assessment per minute (drop excess with 429)
- [ ] No auth required (errors may occur before/during auth failures), but extract userId from session if available

### US-003: Client-Side Error Capture — Global Error Handler

**Description**: As an admin, I want all browser console output and unhandled exceptions captured automatically so that no error goes unrecorded.

**Acceptance Criteria**:
- [ ] Create `src/components/error-capture-provider.tsx` — a client component that wraps the app
- [ ] On mount, monkey-patch `console.error`, `console.warn`, and `console.log` to also POST to `/api/errors` with the original arguments stringified
- [ ] Add `window.onerror` handler that POSTs unhandled exceptions with stack trace
- [ ] Add `window.onunhandledrejection` handler that POSTs promise rejections
- [ ] Include `assessmentId` from URL params or React context when available
- [ ] Debounce/batch: buffer errors for 1 second, send as batch to reduce network calls
- [ ] Preserve original console behavior (still log to browser console)
- [ ] Add provider to root layout (`src/app/layout.tsx`)

### US-004: Client-Side Error Capture — React Error Boundaries

**Description**: As an admin, I want React rendering crashes captured and logged so that component failures are traceable.

**Acceptance Criteria**:
- [ ] Create `src/app/error.tsx` (root error boundary) — shows user-friendly error message, logs to `/api/errors` with errorType `REACT_BOUNDARY`
- [ ] Create `src/app/assessments/[id]/work/error.tsx` — assessment-specific error boundary, includes assessmentId in error report
- [ ] Create `src/app/admin/error.tsx` — admin error boundary
- [ ] Each error boundary renders a "Something went wrong" UI with a "Try again" button (calls `reset()`)
- [ ] Each boundary POSTs error details including component stack trace to `/api/errors`

### US-005: Gemini Logging — Fix Chat Route Error Logging

**Description**: As an admin, I want Gemini chat stream failures logged to the database so that API errors are traceable (not just console.error'd).

**Acceptance Criteria**:
- [ ] In `src/app/api/chat/route.ts`, when the Gemini `generateContentStream` call fails, write to `AssessmentApiCall` via `logAICall` with `errorMessage` and `stackTrace`
- [ ] When stream produces empty/malformed response, log with a descriptive error message
- [ ] When rate-limited (429 from Gemini), log with errorMessage "RATE_LIMITED"
- [ ] Ensure the `logAICall` tracker's `.fail()` method is called on all error paths
- [ ] Existing console.error calls can remain but must be supplemented with DB logging

### US-006: Gemini Logging — Voice Session Logging Schema & Endpoint

**Description**: As an admin, I want voice call data (transcripts, connection events, errors) persisted so that voice failures are debuggable.

**Acceptance Criteria**:
- [ ] Add `VoiceSession` model to Prisma schema: `id` (cuid), `assessmentId` (FK), `coworkerId` (String), `startTime` (DateTime), `endTime` (DateTime, optional), `transcript` (Json — array of `{ role, text, timestamp }`), `connectionEvents` (Json — array of `{ event, timestamp, details? }`), `tokenName` (String, optional), `errorMessage` (String, optional), `durationMs` (Int, optional)
- [ ] Add index on `(assessmentId, startTime)`
- [ ] Create `src/app/api/call/log/route.ts` with POST handler
- [ ] Accept JSON body matching VoiceSession fields, validate assessmentId exists
- [ ] Return 201 on success
- [ ] Require valid session (auth check)

### US-007: Gemini Logging — Client Voice Session Reporting

**Description**: As a frontend developer, I want the voice hooks to report session data to the server so that voice calls are logged.

**Acceptance Criteria**:
- [ ] In `src/hooks/voice/use-voice-base.ts` (or appropriate voice hook), track: session start time, connection events (connect, disconnect, reconnect, error), and accumulated transcript
- [ ] On session end (hangup or error), POST accumulated data to `/api/call/log`
- [ ] Include connection drop events with timestamps
- [ ] Include any error messages from the Live API
- [ ] Fire-and-forget — don't block UI on the logging call

### US-008: Request Tracing — Schema Changes

**Description**: As a developer, I want traceId columns and an ApiRequestLog table so that requests can be traced end-to-end.

**Acceptance Criteria**:
- [ ] Add `traceId` (String, optional) column to `AssessmentApiCall` table
- [ ] Add `traceId` (String, optional) column to `AssessmentLog` table
- [ ] Add `ApiRequestLog` model: `id` (cuid), `method` (String), `path` (String), `statusCode` (Int), `durationMs` (Int), `assessmentId` (optional FK), `userId` (optional FK), `traceId` (String, optional), `errorMessage` (String, optional), `requestBody` (Json, optional — sanitized, no passwords/tokens), `timestamp` (DateTime)
- [ ] Add index on `(traceId)` for ApiRequestLog, AssessmentApiCall, and AssessmentLog
- [ ] Add index on `(assessmentId, timestamp)` for ApiRequestLog
- [ ] Run migration

### US-009: Request Tracing — Middleware & Trace Propagation

**Description**: As an admin, I want every API request logged with a trace ID so that I can follow a request through the system.

**Acceptance Criteria**:
- [ ] Create `src/lib/tracing/trace.ts` with `generateTraceId()` (returns nanoid or uuid) and `getTraceId(request)` (reads `x-trace-id` header or generates new one)
- [ ] Create `src/lib/tracing/request-logger.ts` with a helper that logs to `ApiRequestLog` table — called at the start and end of API route handlers
- [ ] Add `x-trace-id` response header to all API responses via Next.js middleware (`src/middleware.ts`)
- [ ] Update `logAICall` in `src/lib/analysis/assessment-logging.ts` to accept and store `traceId`
- [ ] Client-side: generate traceId per user action (send message, start call), pass as `x-trace-id` header

### US-010: Candidate Event Logging — Schema & Endpoint

**Description**: As an admin, I want candidate interactions logged so that I can see what the candidate was doing when errors occurred.

**Acceptance Criteria**:
- [ ] Add `CandidateEvent` model to Prisma schema: `id` (cuid), `assessmentId` (FK), `eventType` (String — e.g. "TAB_SWITCH", "PASTE", "IDLE_START", "IDLE_END", "FILE_OPEN", "COPY", "FOCUS_LOST", "FOCUS_GAINED"), `timestamp` (DateTime), `metadata` (Json, optional — e.g. `{ targetTab, pasteLength, fileName }`)
- [ ] Add index on `(assessmentId, timestamp)`
- [ ] Create `src/app/api/events/route.ts` with POST handler accepting batch of events: `{ assessmentId, events: [{ eventType, timestamp, metadata? }] }`
- [ ] Validate assessmentId exists, return 201
- [ ] Require auth

### US-011: Candidate Event Logging — Client Tracker

**Description**: As a developer, I want a hook that captures candidate interactions automatically during assessments.

**Acceptance Criteria**:
- [ ] Create `src/hooks/use-candidate-events.ts` hook
- [ ] Track: `visibilitychange` events (tab switches / focus lost/gained), `paste` events (with paste length, no content), `copy` events, idle detection (no mouse/keyboard for 60 seconds → IDLE_START, resume → IDLE_END)
- [ ] Accept `assessmentId` as parameter
- [ ] Buffer events for 5 seconds, then batch-POST to `/api/events`
- [ ] Flush buffer on `beforeunload`
- [ ] Add hook to the assessment work page (`src/app/assessments/[id]/work/client.tsx`)

### US-012: Admin Panel — Assessment Conversation Viewer

**Description**: As an admin, I want to see full conversation transcripts for each coworker in an assessment so that I can replay what was said.

**Acceptance Criteria**:
- [ ] Add "Conversations" tab to the assessment detail page (`src/app/admin/assessments/[id]/page.tsx`)
- [ ] Fetch all `Conversation` records for the assessment
- [ ] Render each conversation grouped by coworker, showing: coworker name, conversation type (text/voice), message count
- [ ] Display messages in chat bubble format: user messages on right (blue), model messages on left (gray), with timestamps
- [ ] For voice sessions (from `VoiceSession` table), show transcript + connection events inline
- [ ] Show total message count and conversation duration

### US-013: Admin Panel — Assessment Error Tab

**Description**: As an admin, I want a dedicated error view per assessment so that I can see everything that went wrong.

**Acceptance Criteria**:
- [ ] Add "Errors" tab to assessment detail page
- [ ] Fetch `ClientError` records + `AssessmentApiCall` records where `errorMessage IS NOT NULL` for this assessment
- [ ] Display in chronological order with: timestamp, error type badge (client/API/Gemini), message, stack trace (expandable)
- [ ] For API errors, show: endpoint, status code, model version, prompt type
- [ ] For client errors, show: component name, URL, browser metadata
- [ ] Show total error count in the tab badge
- [ ] If zero errors, show "No errors recorded" empty state

### US-014: Admin Panel — Gemini Call Inspector

**Description**: As an admin, I want to inspect the full prompt and response of any Gemini API call so that I can debug AI behavior.

**Acceptance Criteria**:
- [ ] Add "API Calls" tab to assessment detail page (upgrade existing API call list)
- [ ] Show table: timestamp, endpoint/prompt type, model, status code, duration, token count (prompt + response)
- [ ] Click any row to expand inline detail view showing:
  - Left panel: full prompt text (syntax-highlighted, scrollable)
  - Right panel: full response text (syntax-highlighted, scrollable)
  - Metadata bar: model version, prompt version, traceId, total tokens
- [ ] For failed calls: show error message and stack trace prominently in red
- [ ] Add copy-to-clipboard buttons for prompt and response text

### US-015: Admin Panel — Assessment Timeline View

**Description**: As an admin, I want a visual timeline of everything that happened during an assessment so that I can see the full picture at a glance.

**Acceptance Criteria**:
- [ ] Add "Timeline" tab to assessment detail page
- [ ] Render a vertical timeline showing all events in chronological order: assessment start, conversation messages (grouped), API calls, client errors, candidate events (tab switches, idle periods), assessment completion
- [ ] Color-code by type: blue for conversations, orange for API calls, red for errors, gray for candidate events, green for milestones (start/complete)
- [ ] Each timeline entry shows: timestamp, type icon, brief description, duration (if applicable)
- [ ] Clicking an entry links to the relevant detail (conversation viewer, API call inspector, error detail)
- [ ] Show elapsed time markers (e.g., "5 min", "10 min") along the timeline axis

### US-016: Admin Panel — Global Error Dashboard

**Description**: As an admin, I want a global error dashboard so that I can spot systemic issues across all assessments.

**Acceptance Criteria**:
- [ ] Create `/admin/errors/page.tsx` and add navigation link in admin sidebar/header
- [ ] Show summary cards at top: total errors (24h), error rate trend (up/down vs prior 24h), most common error, most affected assessment
- [ ] Filterable error list below: date range picker, error type dropdown (CONSOLE_ERROR, CONSOLE_WARN, CONSOLE_LOG, UNHANDLED_EXCEPTION, REACT_BOUNDARY, API_ERROR), assessment dropdown, user dropdown
- [ ] Each error row shows: timestamp, type badge, message (truncated), assessment link, user
- [ ] Error grouping toggle: group by error message signature, show count + "last seen" + affected assessment count
- [ ] Pagination: 50 errors per page

### US-017: Admin Panel — Gemini Health Dashboard

**Description**: As an admin, I want to see Gemini API health metrics so that I can detect API degradation.

**Acceptance Criteria**:
- [ ] Add "Gemini Health" section to the global error dashboard (`/admin/errors`)
- [ ] Show per-model stats (Flash, Pro, Live): total calls (24h), success rate %, average latency, error count
- [ ] Show simple bar chart or table of error rate by hour for last 24 hours
- [ ] Highlight any model with success rate below 95% in red
- [ ] Data sourced from `AssessmentApiCall` table aggregations

### US-018: Admin Panel — Assessment List Improvements

**Description**: As an admin, I want to search, filter, and sort assessments so that I can quickly find problematic ones.

**Acceptance Criteria**:
- [ ] Add search bar to `/admin/assessments` — search by user email or name
- [ ] Add filter dropdowns: status (WELCOME, WORKING, COMPLETED), date range, scenario, has-errors (boolean)
- [ ] "Has errors" filter checks for: any ClientError records OR any AssessmentApiCall with errorMessage
- [ ] Show red error badge on assessment rows that have errors (with count)
- [ ] Sortable columns: date, duration, error count, status (click column header to sort)
- [ ] Paginate: 25 assessments per page with next/previous controls
- [ ] Preserve filter state in URL search params

### US-019: Admin Panel — Recording Playback with Timeline Sync

**Description**: As an admin, I want to watch assessment recordings alongside the event timeline so that I can see exactly what happened on screen when errors occurred.

**Acceptance Criteria**:
- [ ] Add "Recording" tab to assessment detail page
- [ ] Embed video player for screen recording (from Recording/RecordingSegment storage URLs)
- [ ] Show mini-timeline below video with markers for: errors (red dots), conversation messages (blue dots), API calls (orange dots)
- [ ] Clicking a marker seeks the video to that timestamp
- [ ] Show current-time indicator synced with video playback
- [ ] If no recording exists, show "No recording available" empty state

### US-020: Data Retention — Auto-Purge

**Description**: As a system operator, I want observability data auto-purged after 30 days so that storage stays manageable.

**Acceptance Criteria**:
- [ ] Create `src/lib/maintenance/data-retention.ts` with `purgeOldObservabilityData()` function
- [ ] Delete records older than 30 days from: `ClientError`, `VoiceSession`, `ApiRequestLog`, `CandidateEvent`
- [ ] Do NOT purge: `AssessmentApiCall`, `AssessmentLog`, `Conversation` (these are assessment artifacts, not just observability)
- [ ] Create API route `/api/admin/maintenance/purge` (admin-only) that triggers purge manually
- [ ] Log number of records deleted per table
- [ ] Add note in admin dashboard about 30-day retention policy for observability data

## Functional Requirements

1. All client-side console output (error, warn, log) and unhandled exceptions must be captured and stored with assessment context
2. Every Gemini API call (text chat, voice, video evaluation) must have a database record with full request/response text
3. Voice sessions must log transcripts, connection lifecycle events, and errors
4. Every API route hit must be logged with method, path, status, duration, and optional trace ID
5. Trace IDs must propagate from client action through API routes to Gemini calls
6. Candidate interactions (tab switches, paste, copy, idle, file opens) must be logged with timestamps
7. Admin assessment detail page must have tabs: Overview, Conversations, Errors, API Calls, Timeline, Recording
8. Global error dashboard must support filtering by date, type, assessment, and user
9. Assessment list must support search, filters, sorting, pagination, and error indicators
10. Observability-specific data (ClientError, VoiceSession, ApiRequestLog, CandidateEvent) must be auto-purged after 30 days
11. All new endpoints and pages require admin role check except `/api/errors` (must work pre-auth)
12. Error capture must not degrade assessment performance — use fire-and-forget, batching, and debouncing

## Non-Goals

- External error tracking integration (Sentry, Datadog) — may add later but not in this scope
- Real-time error dashboard (WebSocket/SSE) — manual refresh is sufficient for now
- Keystroke frequency or mouse movement tracking — too granular, not needed for debugging
- Alerting/notifications (email, Slack) when errors occur — future enhancement
- Custom retention periods per data type — 30 days flat for all observability data
- Public-facing error pages or status pages
- Log export to external systems (S3, BigQuery)

## Technical Considerations

- **Stack**: Next.js 15, Prisma (Supabase Postgres), shadcn/ui components
- **Existing patterns**: Follow `src/lib/analysis/assessment-logging.ts` for logging utilities, `src/app/admin/` for admin pages
- **Performance**: Error capture must be non-blocking. Use `Promise.allSettled` or fire-and-forget patterns. Batch client events.
- **Storage**: JSON columns for flexible metadata. Index on (assessmentId, timestamp) for all new tables.
- **Auth**: Reuse existing `requireAdmin()` pattern from admin pages. `/api/errors` endpoint is the exception (no auth required).
- **Migration order**: Schema changes (US-001, US-006, US-008, US-010) should be done first as other stories depend on them.

## Suggested Implementation Order

**Phase 1 — Schema & Capture (foundation)**
1. US-001 (ClientError schema)
2. US-006 (VoiceSession schema)
3. US-008 (ApiRequestLog schema + traceId columns)
4. US-010 (CandidateEvent schema)
5. US-002 (Error API endpoint)
6. US-003 (Global error handler)
7. US-004 (Error boundaries)
8. US-005 (Fix chat route logging)

**Phase 2 — Client reporting**
9. US-007 (Voice session reporting)
10. US-009 (Request tracing middleware)
11. US-011 (Candidate event tracker)

**Phase 3 — Admin UI**
12. US-018 (Assessment list improvements)
13. US-012 (Conversation viewer)
14. US-013 (Error tab)
15. US-014 (Gemini call inspector)
16. US-015 (Timeline view)
17. US-016 (Global error dashboard)
18. US-017 (Gemini health dashboard)
19. US-019 (Recording playback)

**Phase 4 — Maintenance**
20. US-020 (Data retention)

## Success Metrics

- 100% of client-side errors have a corresponding `ClientError` database record
- 100% of Gemini API calls (text, voice, video) have a corresponding `AssessmentApiCall` record with full prompt/response
- Admin can find any assessment within 10 seconds using search/filters
- Admin can trace any error back to the Gemini call and user action that caused it via traceId
- Zero performance regression on the candidate assessment experience (error capture is non-blocking)
- Observability tables stay within storage budget via 30-day auto-purge
