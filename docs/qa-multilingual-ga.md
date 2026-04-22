# QA Checklist: Multilingual GA (Spanish)

## Overview
This document provides a comprehensive QA checklist for verifying the multilingual platform's Spanish language implementation across all surfaces. QA engineers should run through this checklist before any multilingual release to ensure subjective quality factors meet standards.

## Voice Quality Checks

### 1. Voice Pronunciation
- [ ] **Proper Nouns**: Verify Spanish voice correctly pronounces:
  - Company names (e.g., "TechCorp", "FlowBoard")
  - Coworker names (especially non-Spanish names like "Alex Chen", "Hiroshi Yamada")
  - Product names mentioned in task context

- [ ] **Code Identifiers**: Verify English code identifiers remain in English pronunciation:
  - Function names (e.g., `getUserProfile`, `handleWebSocketConnection`)
  - API endpoints (e.g., `/api/auth/login`, `/api/chat`)
  - Variable names (e.g., `userId`, `sessionToken`)
  - Technical terms (e.g., "WebSocket", "Redux", "middleware")

- [ ] **Domain Terms**: Check mixed language handling for:
  - Technical terms that stay in English (database, cache, API, frontend, backend)
  - Business terms that should be Spanish (usuario, cliente, producto, servicio)
  - Hybrid constructs (e.g., "el API endpoint", "la database connection")

### 2. Spanish Regional Variants
- [ ] **Verify Latin American Spanish (no Spain-specific vocabulary)**:
  - ✅ Uses "está bien" (NOT "vale")
  - ✅ Uses "amigo/compañero" (NOT "tío")
  - ✅ Uses "computadora" (NOT "ordenador")
  - ✅ Uses "celular" (NOT "móvil")
  - ✅ Uses "aplicación" (NOT "app" when speaking Spanish)

- [ ] **Voice Fillers & Natural Speech**:
  - Verify use of Latin American fillers: "eh", "este", "bueno", "pues", "o sea"
  - NOT Spain fillers: "vale", "venga", "joder"
  - Check natural pausing and intonation patterns

- [ ] **Register & Formality**:
  - Verify consistent use of "tú" form (NOT "usted" unless role-specific)
  - Check informal professional tone appropriate for tech workplace
  - Verify no overly formal or academic Spanish

## Text Content Checks

### 3. Generated AI Content Language
- [ ] **Chat Messages**: Spanish coworkers generate messages in Spanish
- [ ] **Task Descriptions**: Spanish scenarios show task descriptions in Spanish
- [ ] **Resources**: READMEs and documentation generated in Spanish
- [ ] **Report Narratives**: Assessment reports generate Spanish narrative text
- [ ] **Coworker Knowledge**: Spanish coworkers share context in Spanish

### 4. Accent Character Rendering
Verify correct display of Spanish special characters across all fonts:

- [ ] **Accented Vowels**: á, é, í, ó, ú render correctly
- [ ] **Special Characters**: ñ, ¿, ¡ display properly
- [ ] **Test Surfaces**:
  - [ ] Candidate welcome flow text
  - [ ] Chat interface (both sent and received messages)
  - [ ] Work page UI chrome
  - [ ] Results page content
  - [ ] Dashboard cards and labels
  - [ ] Recruiter admin surfaces
  - [ ] Form inputs and validation messages
  - [ ] Toasts and error messages
  - [ ] Modal dialogs and confirmations

## UI/UX Language Consistency

### 5. Language Switcher Behavior
- [ ] **Visibility**:
  - ✅ Visible on landing page
  - ✅ Visible on sign-in/sign-up pages
  - ✅ Visible on candidate dashboard
  - ✅ Visible on recruiter dashboard
  - ✅ Visible on pricing, about, terms pages
  - ❌ Hidden on `/assessments/[id]/*` routes (scenario-locked)
  - ❌ Hidden on `/invite/[scenarioId]/*` routes (scenario-locked)

- [ ] **Functionality**:
  - [ ] Switching updates URL immediately (e.g., `/en/` → `/es/`)
  - [ ] Page content refreshes in new language without reload
  - [ ] Authenticated users: preference saved to database
  - [ ] Anonymous users: preference saved to cookie
  - [ ] Preference persists across sessions

### 6. Scenario-Forced Redirects
- [ ] **Assessment Pages**:
  - Spanish scenario accessed via `/en/assessments/[id]/welcome` → redirects to `/es/assessments/[id]/welcome`
  - English scenario accessed via `/es/assessments/[id]/welcome` → redirects to `/en/assessments/[id]/welcome`
  - No redirect loops when accessing correct locale

- [ ] **Invite Pages**:
  - Spanish scenario invite accessed via `/en/invite/[id]` → redirects to `/es/invite/[id]`
  - English scenario invite accessed via `/es/invite/[id]` → redirects to `/en/invite/[id]`

### 7. Mixed-Scenario Dashboard
Test behavior when a Spanish-preference user has both Spanish and English assessments:

- [ ] **Dashboard Chrome**: All UI labels in Spanish (user preference)
- [ ] **Assessment Cards**: Each shows its own scenario language
- [ ] **Navigation**: Clicking Spanish assessment → `/es/assessments/[id]/*`
- [ ] **Navigation**: Clicking English assessment → `/en/assessments/[id]/*`
- [ ] **Return Navigation**: Back to dashboard maintains Spanish UI preference

## Email Rendering

### 8. Email Client Compatibility
Test Spanish email rendering with accent characters in:

- [ ] **Gmail** (Web & Mobile):
  - Subject line accents render correctly
  - Body content accents display properly
  - HTML formatting preserved
  - Links work correctly

- [ ] **Apple Mail** (macOS & iOS):
  - Subject line encoding correct
  - Spanish characters in sender name
  - Preview text shows accents
  - Full content renders properly

- [ ] **Outlook** (Web & Desktop):
  - No mojibake or encoding issues
  - Accents in both plain text and HTML parts
  - Spanish formatting preserved
  - Call-to-action buttons work

### 9. Email Content Consistency
- [ ] **Invite Emails**: Full Spanish when scenario language is Spanish
- [ ] **Report Emails**: Spanish wrapper text matches Spanish report narrative
- [ ] **Completion Emails**: Spanish confirmation and next steps
- [ ] **Reminder Emails**: Spanish for Spanish scenarios

## End-to-End Journey Verification

### 10. Complete Spanish Journey
Walk through the entire candidate experience:

1. [ ] **Invite Email**: Received in Spanish, accents render correctly
2. [ ] **Landing Page**: Clicking invite link shows Spanish content
3. [ ] **Sign-Up**: Form labels, validation messages in Spanish
4. [ ] **Welcome Flow**: All 4 steps fully in Spanish
5. [ ] **Work Page**:
   - Chat placeholder text in Spanish
   - Send button label in Spanish
   - Coworker names and roles in Spanish context
   - Voice call controls in Spanish
6. [ ] **Chat Interaction**:
   - Send Spanish message → receive Spanish response
   - Code snippets keep English identifiers
   - Natural Spanish conversation flow
7. [ ] **Voice Call**:
   - Spanish greeting from coworker
   - Spanish conversation throughout
   - Natural pronunciation and fillers
8. [ ] **Assessment Completion**: Spanish confirmation messages
9. [ ] **Results Page**:
   - Dimension labels in Spanish
   - Performance levels in Spanish
   - Narrative text in Spanish
10. [ ] **Report Email**: Spanish subject, body, and narrative

## Regression Testing

### 11. English Experience Unaffected
Verify English assessments still work correctly:

- [ ] English scenarios generate English content
- [ ] English voice calls use English pronunciation
- [ ] No Spanish text leaking into English assessments
- [ ] Language switcher works bidirectionally

### 12. Performance & Loading
- [ ] Language switching is instant (<500ms)
- [ ] No flickering during locale changes
- [ ] Spanish fonts load correctly
- [ ] No performance degradation with Spanish content

## Known Issues & Edge Cases

### 13. Special Scenarios to Test

- [ ] **Browser Language Detection**:
  - Spanish browser → defaults to Spanish
  - English browser → defaults to English
  - Unsupported language → defaults to English

- [ ] **Direct URL Access**:
  - Accessing `/es` directly shows Spanish
  - Accessing `/en` directly shows English
  - Root `/` redirects based on detection

- [ ] **Session Handoff**:
  - Sign out in Spanish → stay on Spanish pages
  - Sign in from Spanish page → redirect maintains Spanish

## Test Data

### Standard Test Accounts
- **Spanish User**: `spanish@test.com` / `testpassword123` (preferredLanguage: "es")
- **English User**: `user@test.com` / `testpassword123` (preferredLanguage: "en")
- **Admin**: `admin@test.com` / `testpassword123`

### Test Scenarios
- **Spanish Scenario**: Available at `/assessments/test-assessment-spanish/work`
- **English Scenario**: Available at `/assessments/test-assessment-chat/work`

## Sign-Off Criteria

Before marking QA complete:
1. [ ] All voice quality checks pass
2. [ ] No Spain-specific vocabulary found
3. [ ] Accent characters render correctly everywhere
4. [ ] Language switcher behaves correctly
5. [ ] Scenario-forced redirects work
6. [ ] Mixed-scenario dashboard works correctly
7. [ ] Emails render correctly in all major clients
8. [ ] Complete Spanish journey flows smoothly
9. [ ] English experience remains unaffected
10. [ ] No critical performance issues

## Issue Logging

Log any issues found using this format:
```
ISSUE: [Brief description]
SEVERITY: Blocker | Critical | Major | Minor
SURFACE: [Where found - e.g., "Voice call", "Welcome page", "Email"]
REPRO: [Steps to reproduce]
EXPECTED: [What should happen]
ACTUAL: [What actually happened]
```

## Appendix: Common Spanish QA Phrases

For reference when testing Spanish content:

### Professional Greetings
- "Hola, ¿cómo estás?" - Hello, how are you?
- "Buenos días" - Good morning
- "Buenas tardes" - Good afternoon

### Technical Context
- "el código" - the code
- "la base de datos" - the database
- "el servidor" - the server
- "la aplicación" - the application
- "el usuario" - the user

### Common UI Labels
- "Enviar" - Send
- "Cancelar" - Cancel
- "Guardar" - Save
- "Siguiente" - Next
- "Anterior" - Previous
- "Completar" - Complete
- "Continuar" - Continue

---

*Last Updated: April 2026*
*Version: 1.0.0*