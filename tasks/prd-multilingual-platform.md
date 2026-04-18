# PRD: Multilingual Platform (Spanish First, End-to-End Consistent)

## Overview

Skillvee is today 100% English: no i18n library, no translation files, no language fields in the database, prompts hardcoded in English. This PRD introduces full multilingual support with neutral Latin American Spanish as the first shipping non-English locale. The architecture must support additional languages (Portuguese, French, Russian) added as one-entry-one-file changes.

**Guiding principle**: one locale per experience, anchored to the scenario. Inside an assessment, the scenario's language is law — UI chrome, dynamic AI content, voice, reports, and emails all match. Outside an assessment, user preference wins. No mixing between English/Spanish within a single user journey.

## Goals

- **End-to-end language consistency**: from invite email → welcome → chat → voice → resources → results → report email, all in a single language.
- **N-language architecture**: ship with EN + ES; adding a third language requires one entry in `LANGUAGES` config and one `messages/*.json` file, with zero prompt refactoring.
- **AI content generated natively in target language** (not translated after).
- **Voice quality parity** for Spanish via mandatory `speechConfig.languageCode`.
- **No hidden language settings**: header language switcher visible on every non-assessment page.
- **Automated prevention of language mixing** via CI coverage test + scenario-forced redirect.
- **Full scope**: candidate flow + recruiter flow + marketing/landing pages.

## Core Architecture

### Two-Locale Model

| Concept | Stored on | Used for | Mutable? |
|---|---|---|---|
| `contentLocale` | `Scenario.language` | Generated task/resources/coworker/report narrative | **Immutable after scenario creation** |
| `uiLocale` | URL prefix `/es/`, `/en/` | UI chrome, static strings | Per-navigation |
| User preference | `User.preferredLanguage` (authenticated) or `locale` cookie (anonymous) | Default `uiLocale` outside assessments | Always mutable via header switcher |

### Resolution Rule (Anti-Mixing Guarantee)

```
Inside /assessments/[id]/*, /invite/[scenarioId]/*   → uiLocale = scenario.language (forced redirect)
Everywhere else                                       → URL > user.preferredLanguage > cookie > Accept-Language > "en"
```

Enforced by `redirect()` in `src/app/[locale]/assessments/[id]/layout.tsx` and `src/app/[locale]/invite/[scenarioId]/layout.tsx`.

### Immutability

`Scenario.language` is chosen once at scenario creation and cannot be changed. To produce a scenario in another language, the recruiter clones the existing scenario, which regenerates all AI-generated content (task, resources, coworker personas) in the new language.

### N-Language Config

A single `LANGUAGES` map keyed by ISO 639-1 code holds everything language-specific: instruction string, voice rules, speech languageCode, fillers, date locale. Adding Portuguese requires one entry + one JSON file. No ternaries like `lang === "es" ? X : ""` allowed in generator/prompt code.

## User Stories

### Sprint 1 — Foundation

#### US-001: Add language fields to Prisma schema

**Description**: As a developer, I want language fields on Scenario, User, Task, Resource, and AssessmentReport models so that language can be anchored and carried through every artifact.

**Acceptance Criteria**:
- [ ] Add `language String @default("en")` to `Scenario` model
- [ ] Add `preferredLanguage String @default("en")` to `User` model
- [ ] Add `language String @default("en")` to `Task` model
- [ ] Add `language String @default("en")` to `Resource` model
- [ ] Add `language String @default("en")` to `AssessmentReport` model
- [ ] Run `npx prisma migrate dev --name add_language_fields` — migration applies cleanly with existing data defaulting to `"en"`
- [ ] Run `npx prisma generate` — types are emitted
- [ ] Existing seed data (`prisma/seed.ts`) continues to work; no scenario/user/task broken
- [ ] Tests pass
- [ ] Typecheck passes

**Test Scenarios**:
- Run `npx tsx prisma/seed.ts`; verify test users and scenarios still created successfully with `language: "en"` default.
- Manual DB check: `psql` or Prisma Studio shows new columns populated with `"en"` on all existing rows.

**Dependencies**: None. This is P0 and must land before any other work.

---

#### US-002: Install next-intl and create i18n routing config

**Description**: As a developer, I want next-intl installed and routing configured so that the app can serve locale-prefixed URLs.

**Acceptance Criteria**:
- [ ] Run `npm install next-intl`
- [ ] Create `src/i18n/routing.ts` — export `routing` with `locales: ["en", "es"]`, `defaultLocale: "en"`, `localePrefix: "always"`
- [ ] Create `src/i18n/request.ts` — server-side locale resolver using `getRequestConfig` from `next-intl/server`
- [ ] Create `src/messages/en.json` and `src/messages/es.json` as empty `{}` (will be filled in Sprint 5)
- [ ] Update `next.config.ts` to include `createNextIntlPlugin("./src/i18n/request.ts")`
- [ ] Build succeeds (`npm run build`)
- [ ] Typecheck passes

**Test Scenarios**:
- Use `preview_start` to spin up the dev server; verify no runtime error on boot.
- Use `preview_console_logs` to confirm no warnings about missing next-intl config.

**Dependencies**: US-001.

---

#### US-003: Restructure app to use [locale] dynamic segment

**Description**: As a developer, I want all pages moved under `src/app/[locale]/` so that URL-based locale routing works.

**Acceptance Criteria**:
- [ ] Move `src/app/layout.tsx` contents to `src/app/[locale]/layout.tsx`; the `[locale]` layout accepts `params.locale` and passes messages via `NextIntlClientProvider`
- [ ] Move all page directories (`welcome/`, `work/`, `results/`, `invite/`, `sign-in/`, `sign-up/`, `candidate/`, `recruiter/`, landing page `page.tsx`) into `src/app/[locale]/`
- [ ] API routes (`src/app/api/**`) stay at their current location — language flows via scenario.language or request body, not URL
- [ ] Root `src/app/layout.tsx` is kept as a minimal pass-through OR deleted if next-intl guidance says so
- [ ] All navigation hrefs that used hardcoded paths (`/assessments/...`) are updated to use next-intl `Link` from `@/i18n/routing` for automatic locale prefixing
- [ ] Build succeeds
- [ ] Running dev server: visiting `/` redirects to `/en` (default locale)
- [ ] Visiting `/es` renders the landing page (blank but structurally correct)
- [ ] Tests pass
- [ ] Typecheck passes

**Test Scenarios**:
- `preview_start` then navigate to `/`; confirm redirect to `/en`.
- Navigate to `/es`; use `preview_snapshot` to confirm page renders.
- Navigate to `/en/sign-in`; confirm page renders.
- `preview_console_logs` — no 404s or routing errors.

**Dependencies**: US-002.

---

#### US-004: Create LANGUAGES config and language utility

**Description**: As a developer, I want a single `LANGUAGES` config map as the source of truth for every language-specific parameter so that adding a language requires zero prompt or generator refactoring.

**Acceptance Criteria**:
- [ ] Create `src/lib/core/language.ts`
- [ ] Export `LANGUAGES` const: `{ en: {...}, es: {...} }`; each entry has `code`, `speechLanguageCode`, `instruction`, `voiceRules`, `fillers`, `dateLocale`
- [ ] `LANGUAGES.en.instruction = ""`
- [ ] `LANGUAGES.es.instruction` is a concrete string: "Respond entirely in neutral Latin American Spanish. Code identifiers, API names, JSON keys, and variable names stay in English. Use tú (not usted). Avoid Spain-specific vocabulary (vale, tío, ordenador, móvil). Use Latin American equivalents (ok, amigo, computadora, celular)."
- [ ] `LANGUAGES.es.speechLanguageCode = "es-US"` (confirm Gemini Live accepts this in US-019; upgrade to `"es-419"` if supported)
- [ ] Export `SupportedLanguage` type, `SUPPORTED_LANGUAGES` tuple, `DEFAULT_LANGUAGE`
- [ ] Export `isSupportedLanguage(v: string): v is SupportedLanguage`
- [ ] Export `resolveUiLocale(opts: { urlLocale?; userPref?; cookieLocale?; acceptLanguage? }): SupportedLanguage` with documented precedence
- [ ] Export `buildLanguageInstruction(lang: SupportedLanguage): string` — returns `LANGUAGES[lang].instruction`
- [ ] Unit tests cover: every field defined for both locales, `resolveUiLocale` precedence, `isSupportedLanguage` rejects unknown codes
- [ ] No `lang === "es"` ternaries anywhere in the file
- [ ] Typecheck passes
- [ ] Tests pass

**Test Scenarios**:
- Unit: `resolveUiLocale({ urlLocale: "es" }) === "es"`
- Unit: `resolveUiLocale({ userPref: "es", acceptLanguage: "en-US" }) === "es"` (userPref beats Accept-Language)
- Unit: `resolveUiLocale({}) === "en"` (falls back to default)
- Unit: `isSupportedLanguage("fr") === false`
- Unit: `buildLanguageInstruction("en") === ""`
- Unit: `buildLanguageInstruction("es")` contains "Latin American Spanish"

**Dependencies**: US-001.

---

#### US-005: Update middleware to chain next-intl with auth

**Description**: As a developer, I want `src/middleware.ts` to apply next-intl locale resolution before the existing auth check so that locale routing works for authenticated and public pages.

**Acceptance Criteria**:
- [ ] `src/middleware.ts` imports `createMiddleware` from `next-intl/middleware` and chains it with existing auth/redirect logic
- [ ] Public page matchers updated to allow locale prefixes (e.g., `/en/invite/[...]`, `/es/invite/[...]`)
- [ ] Redirect-for-open-redirect check (`url.startsWith("/")` before `url.startsWith(baseUrl)`) still applies — per CLAUDE.md security note
- [ ] Visiting `/` redirects to `/en`
- [ ] Visiting `/es/sign-in` renders sign-in (not redirected to `/en`)
- [ ] Authenticated user visiting `/es/candidate/dashboard` after login stays on `/es/...`, does not get bounced to `/en/...`
- [ ] Typecheck passes
- [ ] Tests pass

**Test Scenarios**:
- `preview_start`; navigate to `/`, confirm 307 redirect to `/en`.
- Navigate to `/es`, confirm page renders at `/es` (no redirect to `/en`).
- Navigate to `/es/sign-in`, sign in, confirm post-sign-in destination preserves `/es/` prefix.
- `preview_console_logs` — no middleware errors.

**Dependencies**: US-002, US-003.

---

#### US-006: Scenario-forced redirect layouts

**Description**: As a user, I want URLs under `/assessments/[id]/*` and `/invite/[scenarioId]/*` to always reflect the scenario's language so that the UI can never mix with the AI content language.

**Acceptance Criteria**:
- [ ] Create `src/app/[locale]/assessments/[id]/layout.tsx` — fetches `scenario.language` via Prisma, compares with `params.locale`; if mismatch, `redirect(\`/${scenario.language}${restOfPath}\`)`
- [ ] Create `src/app/[locale]/invite/[scenarioId]/layout.tsx` — same logic using `scenarioId` from params
- [ ] Redirect uses Next.js `redirect()` (not `router.push`) so it's server-side and happens before any UI renders
- [ ] If scenario not found, render a 404 via `notFound()`
- [ ] Integration test: create a scenario with `language: "es"`, visit `/en/assessments/<id>/welcome`, assert response is a 307/308 redirect to `/es/assessments/<id>/welcome`
- [ ] Integration test: same scenario, visit `/es/assessments/<id>/welcome`, assert response is 200 (no redirect loop)
- [ ] Typecheck passes
- [ ] Tests pass

**Test Scenarios**:
- `preview_start`; create (via seed) a Spanish scenario; use `preview_eval` to `fetch('/en/assessments/<spanish-id>/welcome')` and inspect response — expect 307 Location to `/es/...`
- Use `preview_eval` to `window.location.href = '/en/assessments/<spanish-id>/welcome'` — browser URL bar should end up on `/es/assessments/<spanish-id>/welcome`
- `preview_snapshot` confirms welcome page rendered in Spanish locale
- English scenario + visit under `/en/assessments/<en-id>/welcome` — no redirect, page renders.

**Dependencies**: US-001, US-003.

---

#### US-007: Header language switcher component

**Description**: As a user, I want a visible language switcher in the global header so that if my browser-detected language is wrong, I can change it without digging into profile settings.

**Acceptance Criteria**:
- [ ] Create `src/components/layout/language-switcher.tsx` — dropdown using shadcn Select; options: "English", "Español"
- [ ] On change: if authenticated, PATCH `/api/user/preferences` with `{ preferredLanguage }`; otherwise set `locale` cookie (`Set-Cookie: locale=es; Path=/; Max-Age=31536000`)
- [ ] After setting preference, `router.replace()` swaps the URL locale segment (e.g., `/en/foo` → `/es/foo`)
- [ ] Added to the global navigation (`src/components/landing/navigation.tsx` and/or candidate/recruiter app headers)
- [ ] Hidden when current path matches `/assessments/[id]/*` or `/invite/[scenarioId]/*` (scenario-locked contexts)
- [ ] Styled per the modern blue theme; rounded corners, subtle shadow
- [ ] `src/app/api/user/preferences/route.ts` — PATCH endpoint, authenticated, validates `preferredLanguage` is in `SUPPORTED_LANGUAGES`, writes to `User.preferredLanguage`
- [ ] Typecheck passes
- [ ] Tests pass

**Test Scenarios**:
- `preview_start` and navigate to `/en` (landing); use `preview_snapshot` to confirm language switcher is visible in nav.
- `preview_click` on the switcher, select "Español"; confirm `window.location.pathname` changes from `/en/...` to `/es/...` via `preview_eval`.
- Navigate to an assessment URL `/es/assessments/<id>/welcome`; `preview_snapshot` confirms switcher is NOT visible (scenario-locked context).
- Anonymous: switch to Spanish, reload page; `preview_eval` confirms locale cookie persisted and page stays on `/es/`.
- Authenticated: switch to Spanish, sign out, sign back in; confirm dashboard loads on `/es/candidate/dashboard` (user preference persisted to DB).

**Dependencies**: US-004, US-005.

---

### Sprint 2 — AI Content Pipeline

#### US-008: Add language to buildAgentPrompt

**Description**: As a developer, I want `buildAgentPrompt` to accept a `language` parameter and inject the language instruction at the top of every prompt so that all downstream AI calls generate output in the target language.

**Acceptance Criteria**:
- [ ] `src/prompts/build-agent-prompt.ts` — add `language: SupportedLanguage` to `AgentPromptContext`
- [ ] Prepend `buildLanguageInstruction(context.language)` to the assembled system prompt (only when non-empty)
- [ ] All existing callers updated to pass `language` (from scenario/assessment context); default to `"en"` if not available
- [ ] Structural instructions (JSON schemas, response format) remain in English
- [ ] Unit test: prompt built with `language: "es"` contains the Spanish instruction string at or near the top
- [ ] Unit test: prompt built with `language: "en"` does not contain the Spanish instruction
- [ ] Unit test: no ternary on `lang === "es"` — the instruction is pulled from the `LANGUAGES` config
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-004.

---

#### US-009: Thread language through chat API routes

**Description**: As a developer, I want `/api/chat` and `/api/chat/manager-start` to fetch scenario language and pass it to `buildAgentPrompt` so that chat messages generate in the target language.

**Acceptance Criteria**:
- [ ] `src/app/api/chat/route.ts` — fetches `assessment.scenario.language`, passes to `buildAgentPrompt`
- [ ] `src/app/api/chat/manager-start/route.ts` — same
- [ ] Unit/integration test: POST to `/api/chat` with a Spanish-scenario assessmentId produces a response containing Spanish (spot-check by asserting presence of common Spanish words like "hola", "gracias", or use an LLM judge with a tolerance)
- [ ] Integration test: same with English scenario produces English response
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-008, US-001.

---

#### US-010: Thread language through voice/call token route

**Description**: As a developer, I want `/api/call/token` to fetch scenario language and pass it to the voice agent config so that Gemini Live voice conversations start in the target language.

**Acceptance Criteria**:
- [ ] `src/app/api/call/token/route.ts` — fetches `assessment.scenario.language` and passes to `buildAgentPrompt` for the voice session's system instruction
- [ ] Integration test: token response for Spanish scenario includes a system instruction string containing the Spanish language instruction
- [ ] Integration test: same for English scenario does not contain Spanish instruction
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-008, US-001.

---

#### US-011: Thread language through recruiter generation routes

**Description**: As a developer, I want recruiter-triggered generation endpoints to read the draft/scenario language and pass it to generators so that previews and saved artifacts are in the target language.

**Acceptance Criteria**:
- [ ] `src/app/api/recruiter/simulations/generate-task/route.ts` — threads language
- [ ] `src/app/api/recruiter/simulations/generate-resources/route.ts` — threads language
- [ ] `src/app/api/recruiter/simulations/builder/*` — threads language (multiple files; update all builder-chat endpoints)
- [ ] Integration test per route: Spanish draft produces Spanish-language output, English produces English
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-008, US-001.

---

#### US-012: Enforce immutable Scenario.language

**Description**: As a product owner, I want the scenario language to be chosen once at creation and never changed so that no mixed-language artifacts can exist within a scenario.

**Acceptance Criteria**:
- [ ] `src/app/api/recruiter/simulations/[id]/route.ts` (PATCH handler) — reject any request body that includes a `language` field different from the current value; respond with 400 and error body `{ error: "Scenario language is immutable. Clone the scenario to create a version in a different language." }`
- [ ] Recruiter settings UI — if language dropdown shown post-creation, render as read-only with explanatory tooltip; "Clone to another language" button visible
- [ ] Unit/integration test: PATCH `/api/recruiter/simulations/[id]` with `{ language: "es" }` on an English scenario returns 400
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-001.

---

#### US-013: Clone-to-translate scenario endpoint

**Description**: As a recruiter, I want a "Clone to another language" action that creates a new scenario with AI-generated content regenerated in the new language so that I can offer the same assessment in multiple locales.

**Acceptance Criteria**:
- [ ] Create `src/app/api/recruiter/simulations/[id]/clone/route.ts` — POST; accepts `{ language: SupportedLanguage }`; duplicates the source scenario with the new language; regenerates task, resources, and coworker personas in the new language; returns the new scenario id
- [ ] Cloned scenario is a fresh row in the DB (not a reference); all child records (tasks, resources, coworkers) are new rows with the new `language`
- [ ] Any recruiter customizations (custom task description, uploaded resources) are NOT carried over — regeneration overwrites; the UI warns before confirming
- [ ] Recruiter settings UI exposes a "Clone to another language" button that opens a modal with language selector, then calls this endpoint and navigates to the new scenario
- [ ] Integration test: clone an English scenario with `language: "es"`; new scenario exists with `language: "es"`; task/resources/coworkers all have `language: "es"`
- [ ] Typecheck passes
- [ ] Tests pass

**Test Scenarios**:
- `preview_start`; as a recruiter, navigate to a scenario settings page; `preview_click` "Clone to another language"; select Spanish; confirm modal; navigate to the new scenario; `preview_snapshot` confirms task/resource previews are in Spanish.
- `preview_network` inspects the clone API call — payload `{ language: "es" }`, response includes new scenario id.

**Dependencies**: US-001, US-011, US-014–017 (generators), US-012.

---

### Sprint 3 — Content Generators

#### US-014: Task generator accepts + persists language

**Description**: As a system, I want the task generator to produce task descriptions in the scenario's language and persist the language on the generated task so that the candidate always sees a task in their expected language.

**Acceptance Criteria**:
- [ ] `src/prompts/recruiter/task-generator.ts` — accepts `language: SupportedLanguage`; injects language instruction; instructs model to keep code identifiers in English
- [ ] Task creation pipeline sets `Task.language = scenario.language` on insert
- [ ] Integration test: generate a task for a Spanish scenario; task description contains Spanish; code snippets (if any) contain English identifiers; `Task.language === "es"` in DB
- [ ] Integration test: English scenario produces English task
- [ ] Typecheck passes
- [ ] Tests pass

**Test Scenarios**:
- `preview_start`; as recruiter, generate a task on a Spanish scenario draft; `preview_snapshot` of the preview shows Spanish prose; use `preview_eval` to check the persisted Task row's `language` column.

**Dependencies**: US-008, US-011.

---

#### US-015: Resource generator accepts + persists language

**Description**: As a system, I want resources (READMEs, PRDs, dashboards) to be generated with prose in the target language while code/JSON stays in English, and to persist the language on the resource row.

**Acceptance Criteria**:
- [ ] `src/prompts/recruiter/resource-generator.ts` — accepts language; instruction explicitly covers: markdown headings in target language, prose in target language, code fences and JSON keys in English
- [ ] Resource creation pipeline sets `Resource.language = scenario.language` on insert
- [ ] Integration test: generate resources for a Spanish scenario; verify markdown headings are Spanish, code identifiers English; `Resource.language === "es"` in DB
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-008, US-011.

---

#### US-016: Coworker generator accepts + persists language

**Description**: As a system, I want coworker personas and knowledge responses to be generated in the target language so that chat messages from coworkers match the candidate's experience language.

**Acceptance Criteria**:
- [ ] `src/lib/scenarios/coworker-generator.ts` — accepts language; instruction specifies persona bio, knowledge snippets, and conversational register all in target language
- [ ] Coworker row stores `language` (add to schema if not covered by US-001; if not, add here)
- [ ] Integration test: generate coworkers for a Spanish scenario; persona bios and seeded knowledge are in Spanish; language column is `"es"`
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-008, US-011. Note: if `Coworker.language` was not included in US-001, extend the schema here.

---

#### US-017: Report scoring generates narrative in target language

**Description**: As a candidate, I want my report narrative (overallSummary, strengths, areasForImprovement, recommendations) in my assessment's language so that my feedback is consistent with the rest of the experience.

**Acceptance Criteria**:
- [ ] `src/lib/analysis/report-scoring.ts` — accepts language (from assessment's scenario); instruction applies to narrative fields only; internal rubric/scoring prompt stays English
- [ ] `AssessmentReport.language` is set at generation time
- [ ] Integration test: Spanish scenario report generation → narrative fields in Spanish; numeric scores identical to English baseline (language shouldn't change scoring)
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-008, US-001.

---

### Sprint 4 — Voice

#### US-018: Gemini Live speechConfig.languageCode (mandatory)

**Description**: As a candidate in a Spanish assessment, I want the voice model to recognize my Spanish speech accurately and respond with correct Spanish pronunciation so that voice conversations feel natural.

**Acceptance Criteria**:
- [ ] `src/lib/ai/gemini.ts` — Gemini Live session config includes `speechConfig.languageCode` pulled from `LANGUAGES[language].speechLanguageCode`
- [ ] Verify Gemini Live API's accepted language code format (`es-US`, `es-419`, or `es-ES`); document choice in code comment
- [ ] If Gemini Live rejects `es-419`, fall back to `es-US` and update `LANGUAGES.es.speechLanguageCode`
- [ ] Integration test: voice session for Spanish scenario includes `languageCode: "es-US"` (or agreed variant) in sent config
- [ ] Voice session for English scenario includes `languageCode: "en-US"`
- [ ] Typecheck passes
- [ ] Tests pass

**Test Scenarios**:
- Manual: `preview_start`; initiate a voice call on a Spanish scenario; speak Spanish; observe transcript captures Spanish words correctly (not garbled).
- Manual: listen for natural Spanish pronunciation of proper nouns and code identifiers.

**Dependencies**: US-004.

---

#### US-019: Voice selection per language

**Description**: As a product owner, I want Gemini voices benchmarked for Spanish pronunciation quality so that the default Spanish voice sounds natural.

**Acceptance Criteria**:
- [ ] Benchmark at least 4 Gemini Live prebuilt voices (Aoede, Puck, Charon, Kore, etc.) reading the same Spanish reference script
- [ ] Document scoring in a short comment or markdown note (pronunciation accuracy, naturalness, casual register fit)
- [ ] Update `VOICE_BY_LANGUAGE` map in `src/lib/ai/gemini.ts` with best default per language
- [ ] Manager and coworker default voices are overridable per scenario as before
- [ ] Tests pass
- [ ] Typecheck passes

**Test Scenarios**:
- Use `preview_start` and a test page or script that plays each voice reading the reference script; capture the audio or manually listen and record scores.

**Dependencies**: US-018.

---

#### US-020: Spanish voice rules and fillers

**Description**: As a candidate, I want AI coworkers speaking Spanish to use natural Spanish conversational fillers and register so that the conversation feels authentic.

**Acceptance Criteria**:
- [ ] `src/prompts/coworker/persona.ts` — define `VOICE_RULES_EN` (existing content, renamed/wrapped if needed) and `VOICE_RULES_ES`
- [ ] `VOICE_RULES_ES` includes: neutral Latin American Spanish, tú by default, natural fillers (eh, bueno, a ver, sabes, claro), no Spain idioms, code identifiers stay English, casual tone
- [ ] `LANGUAGES[lang].voiceRules` in `src/lib/core/language.ts` points to the correct rules (wire-up)
- [ ] `buildAgentPrompt` injects voice rules when the agent type is voice
- [ ] Unit test: voice prompt for `language: "es"` includes Spanish fillers
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-004, US-008.

---

#### US-021: Thread language through voice hooks

**Description**: As a frontend, I want voice hooks to read the assessment's language and pass it to the token endpoint so that voice sessions are initialized correctly.

**Acceptance Criteria**:
- [ ] `src/hooks/voice/use-voice-base.ts` and `use-defense-call.ts` — accept/derive language from assessment context; pass to `/api/call/token` request body
- [ ] Unit test: hooks invoked with a Spanish scenario assessment send `language: "es"` to the token endpoint
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-010.

---

### Sprint 5 — Static UI Translation

#### US-022: i18n coverage test framework in CI

**Description**: As a developer, I want an automated coverage test that renders every candidate + recruiter + marketing route with a Spanish scenario and fails if English words leak through so that language mixing is caught before it ships.

**Acceptance Criteria**:
- [ ] Create `tests/i18n-coverage.test.ts` — enumerates routes for each locale (a test fixture scenario for Spanish, one for English); renders the page via Next.js test server (or Playwright if easier)
- [ ] For each rendered page, extract visible text nodes; scan for English stopwords (the, and, you, with, for, of, to, is, are, was, were, etc.)
- [ ] Use an allowlist for technical terms that legitimately stay English (brand name "Skillvee", code identifiers)
- [ ] Failing output names the route, the detected English phrase, and a suggested translation key
- [ ] Runs in CI on every PR; fails CI if any leak found
- [ ] Also run the test manually: `npx tsx scripts/run-i18n-coverage.ts` or equivalent
- [ ] Typecheck passes
- [ ] Tests pass

**Test Scenarios**:
- Intentionally introduce an untranslated English string in `welcome/client.tsx`; run the coverage test; verify it fails with a clear message pointing to that file/string.
- Revert; confirm it passes.

**Dependencies**: US-003. Runs before other Sprint 5 stories to give them a signal.

---

#### US-023: Translate candidate welcome flow

**Description**: As a Spanish-speaking candidate, I want the welcome flow (all 4 steps) in Spanish so that my onboarding is consistent with the rest of the experience.

**Acceptance Criteria**:
- [ ] All hardcoded strings in `src/app/[locale]/assessments/[id]/welcome/client.tsx` and `page.tsx` replaced with `useTranslations("welcome")` keys
- [ ] Add keys to both `messages/en.json` and `messages/es.json` under the `welcome` namespace
- [ ] Every step's title, subtitle, body copy, button labels, and informational callouts are translatable
- [ ] `preview_start`; navigate to `/es/assessments/<spanish-id>/welcome`; `preview_snapshot` shows all 4 steps in Spanish
- [ ] Navigate to `/en/assessments/<english-id>/welcome`; `preview_snapshot` shows English
- [ ] Coverage test (US-022) passes for the welcome route
- [ ] Typecheck passes
- [ ] Tests pass

**Test Scenarios**:
- `preview_start`; `preview_click` through all 4 welcome steps on both English and Spanish scenarios; `preview_snapshot` each step.
- `preview_console_logs` — no missing-translation warnings in dev.
- `preview_inspect` text elements to ensure fonts render Spanish accents (á, é, í, ó, ú, ñ) correctly.

**Dependencies**: US-003, US-022.

---

#### US-024: Translate candidate work flow (chat UI + floating call bar + slack layout)

**Description**: As a Spanish-speaking candidate, I want the work page UI chrome (chat input placeholder, send button, call controls, coworker names labels) in Spanish so that nothing jars when I'm doing the task.

**Acceptance Criteria**:
- [ ] `src/app/[locale]/assessments/[id]/work/client.tsx` strings extracted
- [ ] `src/components/chat/chat.tsx`, `slack-layout.tsx`, `floating-call-bar.tsx` strings extracted
- [ ] Chat input placeholder, send/attach/voice buttons, "typing..." indicator, error toasts all translated
- [ ] Typing indicator text ("X is typing…") uses next-intl interpolation
- [ ] Coverage test passes for the work route
- [ ] `preview_start`; navigate to `/es/assessments/<spanish-id>/work`; `preview_snapshot` shows UI chrome in Spanish
- [ ] Chat messages (dynamic AI content) are already Spanish from US-009
- [ ] Typecheck passes
- [ ] Tests pass

**Test Scenarios**:
- `preview_click` the call bar to start a call; `preview_snapshot` call controls labels in Spanish.
- `preview_fill` chat input; confirm placeholder → Spanish text; send; message appears; `preview_snapshot` confirms layout holds with Spanish accented characters.

**Dependencies**: US-003, US-022, US-009.

---

#### US-025: Translate candidate results page

**Description**: As a Spanish-speaking candidate, I want my results page in Spanish so that dimension labels, performance tiers, and summary callouts match the report narrative language.

**Acceptance Criteria**:
- [ ] `src/app/[locale]/assessments/[id]/results/**` strings extracted
- [ ] Dimension labels (8 dimensions) and performance level labels (5 levels) pulled from `messages/*.json` under `assessment.dimensions.*` and `assessment.levels.*`
- [ ] Section headings, summary card labels, CTAs translated
- [ ] The report narrative is already in the right language from US-017 and is displayed as-is
- [ ] Coverage test passes for results route
- [ ] Typecheck passes
- [ ] Tests pass

**Test Scenarios**:
- `preview_start`; navigate to a completed Spanish scenario's results page; `preview_snapshot` confirms Spanish labels + Spanish narrative; no language mixing.

**Dependencies**: US-003, US-022, US-017.

---

#### US-026: Translate invite page

**Description**: As a candidate clicking an invite link, I want the invite landing page in the scenario's language so that my first touchpoint is already in the right language.

**Acceptance Criteria**:
- [ ] `src/app/[locale]/invite/[scenarioId]/client.tsx` and `page.tsx` strings extracted
- [ ] Scenario-forced redirect (US-006) ensures the locale matches scenario; this story only handles the strings
- [ ] Coverage test passes for invite route
- [ ] Typecheck passes
- [ ] Tests pass

**Test Scenarios**:
- `preview_start`; navigate to `/en/invite/<spanish-scenario-id>`; expect redirect to `/es/invite/...` (from US-006); `preview_snapshot` of landed page in Spanish.

**Dependencies**: US-003, US-022, US-006.

---

#### US-027: Translate sign-in and sign-up pages

**Description**: As a Spanish-speaking user, I want authentication pages in Spanish so that I can onboard in my language.

**Acceptance Criteria**:
- [ ] `src/app/[locale]/sign-in/**` and `sign-up/**` strings extracted (labels, placeholders, buttons, error messages, social login labels)
- [ ] Password validation messages translated
- [ ] Coverage test passes
- [ ] Typecheck passes
- [ ] Tests pass

**Test Scenarios**:
- `preview_start`; navigate to `/es/sign-up`; `preview_fill` the form with invalid password; `preview_snapshot` shows Spanish validation error.
- Sign up successfully; `preview_snapshot` confirm redirect post-signup lands on `/es/...` destination.

**Dependencies**: US-003, US-022.

---

#### US-028: Translate candidate dashboard

**Description**: As a Spanish-speaking candidate, I want the dashboard (list of my assessments, status, CTAs) in Spanish so that the landing area after sign-in is in my preferred language.

**Acceptance Criteria**:
- [ ] `src/app/[locale]/candidate/dashboard/**` strings extracted
- [ ] Assessment status labels ("In Progress", "Completed", "Scheduled") translated
- [ ] Empty state copy translated
- [ ] Coverage test passes
- [ ] Typecheck passes
- [ ] Tests pass

**Test Scenarios**:
- `preview_start`; sign in as a Spanish-preference user with assessments in both Spanish and English; `preview_snapshot` confirms dashboard chrome in Spanish, each assessment card navigating to its own locale.

**Dependencies**: US-003, US-022.

---

#### US-029: Translate common components (errors, toasts, loading, confirm dialogs)

**Description**: As a Spanish-speaking user, I want shared UI primitives in Spanish so that toasts, error states, and loading spinners never leak English.

**Acceptance Criteria**:
- [ ] Audit `src/components/ui/`, `src/components/common/`, and any shared toast/error/loading components
- [ ] Extract strings to `messages/*.json` under `common.*`
- [ ] Translate standard messages: "Loading…", "Something went wrong", "Try again", "Cancel", "Save", "Delete", "Confirm", "Close"
- [ ] Coverage test passes against pages that render these components
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-003, US-022.

---

#### US-030: Translate recruiter simulation builder + previews

**Description**: As a Spanish-speaking recruiter, I want the simulation builder UI (form labels, chat, preview panels) in Spanish so that I can author scenarios in my language.

**Acceptance Criteria**:
- [ ] `src/app/[locale]/recruiter/simulations/new/client.tsx` strings extracted; includes language dropdown with bilingual option names
- [ ] `src/app/[locale]/recruiter/simulations/[id]/settings/client.tsx` strings extracted (scenario language shown read-only with "Clone to another language" CTA per US-013)
- [ ] Builder chat UI strings extracted
- [ ] Task preview and resource preview panel labels extracted (the generated content is already in the target language from US-014/015)
- [ ] Coverage test passes
- [ ] Typecheck passes
- [ ] Tests pass

**Test Scenarios**:
- `preview_start`; as recruiter on `/es/recruiter/simulations/new`; `preview_snapshot` shows Spanish form + language dropdown labeled "Idioma"; select Spanish; `preview_fill` required fields; generate a task; preview panel labels in Spanish; content itself in Spanish (from US-014).

**Dependencies**: US-003, US-022, US-013.

---

#### US-031: Translate recruiter admin pages (assessments list, candidate compare, settings)

**Description**: As a Spanish-speaking recruiter, I want the admin surfaces I use daily (assessment list, candidate compare, scenario settings) in Spanish so that my whole workflow is in my language.

**Acceptance Criteria**:
- [ ] `src/app/[locale]/recruiter/assessments/**` strings extracted
- [ ] `src/app/[locale]/recruiter/candidates/**` strings extracted
- [ ] Filter chips, status labels, column headers, action buttons all translated
- [ ] Coverage test passes
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-003, US-022.

---

#### US-032: Translate landing + marketing pages

**Description**: As a prospective Spanish-speaking customer, I want the landing page, pricing, about, and legal pages in Spanish so that SEO and first impressions are native.

**Acceptance Criteria**:
- [ ] Landing (`src/app/[locale]/page.tsx`), pricing, about, privacy, terms — all strings extracted
- [ ] Meta tags (title, description, og:title, og:description) per-locale via next-intl's `generateMetadata`
- [ ] Coverage test passes
- [ ] Typecheck passes
- [ ] Tests pass

**Test Scenarios**:
- `preview_start`; navigate to `/es`; `preview_snapshot` shows Spanish landing; `preview_eval` document.title shows Spanish title.

**Dependencies**: US-003, US-022.

---

#### US-033: Translate error boundaries, 404, and 500 pages

**Description**: As any user, I want error pages in my UI language so that even error states don't break the single-language experience.

**Acceptance Criteria**:
- [ ] Global error boundary (`src/app/[locale]/error.tsx`), 404 (`not-found.tsx`), 500 pages translated
- [ ] Assessment-specific error boundary translated
- [ ] Coverage test passes (trigger a 404 by visiting an unknown route and verify Spanish content)
- [ ] Typecheck passes
- [ ] Tests pass

**Test Scenarios**:
- `preview_start`; navigate to `/es/this-route-does-not-exist`; `preview_snapshot` confirms 404 page in Spanish.
- Trigger a deliberate server error in a test route; confirm error boundary renders Spanish message.

**Dependencies**: US-003, US-022.

---

#### US-034: Configure missing-key fallback behavior

**Description**: As a developer, I want missing translation keys to throw in dev/CI and silently fall back to English in prod so that regressions are caught early but never crash a user.

**Acceptance Criteria**:
- [ ] `src/i18n/request.ts` — configure `onError` handler; in `process.env.NODE_ENV !== "production"` throw; in production, call `console.warn` and fall back to English
- [ ] `getMessageFallback` returns the English message when a Spanish key is missing (pulled from `messages/en.json`)
- [ ] Unit test: simulating a missing key in test env throws
- [ ] Coverage test (US-022) catches missing keys before a PR merges
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-002.

---

### Sprint 6 — Emails, Reports, Labels

#### US-035: Migrate email templates to next-intl

**Description**: As a developer, I want all email templates to render using next-intl translations so that emails follow the same translation infrastructure as the UI.

**Acceptance Criteria**:
- [ ] `src/lib/external/email.ts` — `sendReportEmail`, `sendInviteEmail`, `sendAssessmentCompleteEmail`, and any other user-facing email helpers accept `language` and call `getTranslations({ locale: language, namespace: "email.<key>" })`
- [ ] Remove any bespoke English-only template strings from these files
- [ ] Subject lines, body copy, CTAs, footer pulled from `messages/*.json` under `email.<template>.*`
- [ ] Unit test per email helper: rendering with `language: "es"` produces Spanish subject + body
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-002, US-022.

---

#### US-036: Thread report.language through email rendering

**Description**: As a candidate, I want the email that delivers my report to match the report's narrative language so that the email wrapper is never English while the narrative is Spanish (or vice versa).

**Acceptance Criteria**:
- [ ] Report email sender reads `AssessmentReport.language` (set in US-017) and passes it to `sendReportEmail`
- [ ] Integration test: generate a Spanish report, trigger the email, inspect the rendered email — subject, body, and narrative all Spanish
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-017, US-035.

---

#### US-037: Dimension and performance level translation keys

**Description**: As a candidate, I want the 8 assessment dimensions and 5 performance levels shown in my language across the report page, email, and admin views.

**Acceptance Criteria**:
- [ ] `messages/en.json` and `messages/es.json` under `assessment.dimensions.<key>` (all 8) and `assessment.levels.<key>` (all 5)
- [ ] Create a helper in `src/lib/analysis/` (e.g., `getDimensionLabel(dim, locale)`) that resolves via next-intl at call time
- [ ] Helper used in results page, email report, admin surfaces wherever dimension/level labels are shown
- [ ] Unit test: `getDimensionLabel(AssessmentDimension.COMMUNICATION, "es")` returns the Spanish label
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-002.

---

### Sprint 7 — Evals

#### US-038: Add Spanish chat eval scenarios

**Description**: As a prompt engineer, I want Spanish counterparts to the 15 chat eval scenarios so that I can measure Spanish output quality against the same situations as English.

**Acceptance Criteria**:
- [ ] Add 15 Spanish chat scenarios to the eval suite, mirroring the English set (same situations, Spanish candidate utterances, Spanish expected behavior cues)
- [ ] Each scenario tagged with `language: "es"`
- [ ] `scripts/run-evals.ts` accepts `--language es` to filter
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-008.

---

#### US-039: Add Spanish voice eval scenarios

**Description**: As a prompt engineer, I want Spanish counterparts to the 8 voice multi-turn eval scenarios so that voice naturalness can be compared across languages.

**Acceptance Criteria**:
- [ ] Add 8 Spanish voice scenarios (simulated Spanish-speaking candidate)
- [ ] Each scenario tagged `language: "es"`
- [ ] `scripts/run-evals.ts --category voice --language es` runs only these
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-008, US-020.

---

#### US-040: Spanish-calibrated eval judges

**Description**: As a prompt engineer, I want the 3 Gemini 2.5 Pro judges to be calibrated for Spanish output so that Spanish eval scores are comparable to English baselines.

**Acceptance Criteria**:
- [ ] Judge prompts (in `src/lib/evals/`) accept a `language` parameter and, for Spanish, append a calibration note: don't penalize Spanish conversational fillers (eh, bueno, a ver), don't flag English technical terms as code-switching errors, naturalness should be judged against Spanish native speaker register
- [ ] Unit test: judge prompt for `language: "es"` contains the calibration note; for `"en"` it does not
- [ ] Typecheck passes
- [ ] Tests pass

**Dependencies**: US-008.

---

#### US-041: Run Spanish baseline and tune

**Description**: As a prompt engineer, I want to run the Spanish eval suite, record the baseline, and iterate on the Spanish instruction + voice rules until scores are within 0.2 of the English baseline so that the Spanish experience ships at comparable quality.

**Acceptance Criteria**:
- [ ] Run `npx tsx scripts/run-evals.ts --language es --name "es-ga-baseline"`
- [ ] Record scores for all 6 dimensions (naturalness, persona consistency, brevity, conversational flow, info discipline, AI-isms)
- [ ] If any dimension is below English baseline - 0.2, iterate: refine `LANGUAGES.es.instruction`, refine `VOICE_RULES_ES`, rerun evals
- [ ] Final Spanish baseline documented in a comment in `src/lib/core/language.ts` or a `docs/multilingual-evals.md` note (include date and score)
- [ ] Tests pass
- [ ] Typecheck passes

**Dependencies**: US-038, US-039, US-040, all Sprint 2–4 work.

---

### Sprint 8 — QA and Integration

#### US-042: E2E test — full Spanish candidate journey

**Description**: As a developer, I want an automated E2E test covering the complete Spanish candidate path so that regressions across routes, API, voice, and email are caught before ship.

**Acceptance Criteria**:
- [ ] Create a Playwright or agent-browser test under `tests/` that:
  - Seeds a Spanish scenario
  - Opens the invite link
  - Signs up / signs in as a Spanish-preference candidate
  - Navigates welcome (all 4 steps), work page, starts a call (voice), sends a chat message
  - Completes the assessment
  - Views the results page
  - Inspects the report email (or its rendering)
- [ ] Assertions check language consistency at every step: UI chrome in Spanish, AI messages in Spanish, voice system instruction contains Spanish instruction, results page Spanish, email Spanish
- [ ] Test is stable and runs in CI
- [ ] Tests pass

**Test Scenarios**:
- Use `preview_start` and Playwright-style interactions to run through the flow.
- Use `preview_snapshot` at each step to visually confirm Spanish rendering.
- Use `preview_network` to inspect API payloads and confirm `language: "es"` is sent to relevant endpoints.

**Dependencies**: All prior stories.

---

#### US-043: Integration test — scenario-forced redirect + clone flow

**Description**: As a developer, I want integration tests that specifically exercise the anti-mixing redirect rule and the clone-to-translate flow so that those guarantees are regression-proof.

**Acceptance Criteria**:
- [ ] Test 1: fetch `/en/assessments/<spanish-scenario-id>/welcome` → expect 307 redirect with Location header `/es/assessments/<spanish-scenario-id>/welcome`
- [ ] Test 2: fetch `/es/assessments/<spanish-scenario-id>/welcome` → expect 200 (no redirect loop)
- [ ] Test 3: fetch `/en/invite/<spanish-scenario-id>` → expect 307 to `/es/invite/...`
- [ ] Test 4: POST to `/api/recruiter/simulations/<english-scenario-id>/clone` with `{ language: "es" }` → returns new scenario id; new scenario has `language: "es"`; new task/resources/coworkers have `language: "es"`
- [ ] Test 5: PATCH to `/api/recruiter/simulations/<id>` with `{ language: "es" }` on a previously-English scenario → 400 with correct error message
- [ ] All tests pass
- [ ] Typecheck passes

**Dependencies**: US-006, US-012, US-013.

---

#### US-044: Manual QA sweep and regional voice tuning

**Description**: As a QA engineer, I want a documented QA sweep covering non-automated Spanish experience factors (voice pronunciation, register, visual regression) so that the subjective quality of the release is verified.

**Acceptance Criteria**:
- [ ] QA checklist file (`docs/qa-multilingual-ga.md`) listing:
  - Voice pronunciation on proper nouns, code identifiers, domain terms
  - Absence of Spain-specific vocabulary (vale, tío, ordenador, móvil) in generated content and voice
  - Accent rendering (á, é, í, ó, ú, ñ, ¡, ¿) across all fonts on candidate + recruiter surfaces
  - Header language switcher visible and functional on every non-assessment page
  - Language switcher hidden on scenario-locked routes
  - Mixed-scenario dashboard behavior (Spanish pref + one English scenario + one Spanish scenario)
  - Email rendering in Gmail, Apple Mail, Outlook (check accent rendering)
- [ ] Sweep executed; findings logged; blocker-level issues fixed; merged
- [ ] Tests pass

**Dependencies**: All prior stories.
