# Ralph Progress Log

Learnings and insights from each iteration.

---

## Issue #1: US-001: Landing Page

**What was implemented:**
- Full landing page with neo-brutalist design
- Hero section with geometric decorations (triangles, parallelograms) following the tangram motif
- "DEVELOPER ASSESSMENT" badge + "Practice a Real Scenario" headline with gold accent
- Primary CTA "Start Practicing" → `/api/auth/signin`
- Secondary CTA "Learn More" → anchor to How It Works section
- 4-step How It Works section (HR Interview → Manager Kickoff → Coding Task → PR Defense)
- Value proposition section with inverted colors (black bg, white text)
- Simple footer

**Files changed:**
- `src/app/page.tsx` - Complete rewrite from minimal placeholder to full landing page

**Learnings:**
1. Design system is well-defined in `styles/theme.css` - use CSS variables directly
2. Tailwind config enforces 0px radius and no shadows - no need to override
3. Use `clipPath` CSS for geometric shapes (triangles, parallelograms)
4. `bg-secondary` = gold (#f7da50), perfect for hero accent
5. Build is fast (~2s), page bundle is small (3.45 kB)
6. NextAuth signin route is at `/api/auth/signin`

**Gotchas:**
- `--secondary` CSS variable was missing from `globals.css` and `tailwind.config.ts`, causing gold text to not render. Fixed by adding secondary color definitions.

**Verification completed:**
- All 6 acceptance criteria verified ✓
- Screenshots captured showing neo-brutalist design with gold accents
- Typecheck passes
- Build succeeds with 3.45 kB page bundle

---

## Issue #2: US-002: Authentication

**What was implemented:**
- Google OAuth provider with `allowDangerousEmailAccountLinking: true` for account linking flexibility
- Email/password registration via `/api/auth/register` endpoint with validation
- Email/password login via Credentials provider
- JWT session strategy for cross-refresh persistence
- SessionProvider wrapper in app layout
- Sign-in page (`/sign-in`) with neo-brutalist design, Google OAuth button, and credentials form
- Sign-up page (`/sign-up`) with registration form and auto-signin after registration
- Auth error page (`/auth-error`) for authentication failures
- Test infrastructure with Vitest (10 tests for registration endpoint)

**Files changed:**
- `src/auth.ts` - Switched to JWT strategy, added jwt callback for token enrichment
- `src/app/api/auth/register/route.ts` - New registration endpoint with email validation, password hashing (bcrypt 12 rounds), and role assignment
- `src/app/api/auth/register/route.test.ts` - 10 unit tests for registration
- `src/app/sign-in/page.tsx` - New sign-in page with Suspense boundary for useSearchParams
- `src/app/sign-up/page.tsx` - New sign-up page with registration form
- `src/app/auth-error/page.tsx` - New error page
- `src/app/layout.tsx` - Added SessionProvider via Providers component
- `src/app/page.tsx` - Updated CTA links from `/api/auth/signin` to `/sign-in`
- `src/components/providers.tsx` - New client-side providers wrapper
- `src/test/setup.ts` - Vitest setup with jest-dom matchers
- `vitest.config.ts` - Vitest configuration
- `package.json` - Added test scripts and testing dependencies

**Learnings:**
1. NextAuth v5 with Credentials provider requires JWT strategy (not database) for proper session handling
2. `useSearchParams()` requires Suspense boundary in Next.js 15 for static generation
3. Ported patterns from Skillvee: bcrypt 12 rounds, soft delete check, session enrichment with role
4. `allowDangerousEmailAccountLinking: true` enables same email across OAuth and credentials
5. Registration sets `emailVerified: new Date()` immediately for credentials users

**Gotchas:**
- Initial database session strategy didn't work with credentials provider - switched to JWT
- Build failed without Suspense boundary around useSearchParams - extracted form to separate component

**Verification completed:**
- All 8 acceptance criteria verified ✓
- Typecheck passes (exit 0)
- Tests pass (10/10)
- Build succeeds

---

## Issue #3: US-003: User Profile & Data Model

**What was implemented:**
- Profile page (`/profile`) showing user info and past assessments
- Storage utility (`src/lib/storage.ts`) for CV/resume uploads via Supabase storage
- Verified existing User and Assessment tables have all required fields

**Files changed:**
- `src/app/profile/page.tsx` - New protected profile page with user info, role badge, member since date, and assessments list
- `src/lib/storage.ts` - Storage utilities: `uploadResume`, `deleteResume`, `getSignedResumeUrl`

**Learnings:**
1. Data model was already implemented in Issue #2 - User table has id, email, name, role, createdAt
2. Assessment table already linked to user with `userId` foreign key and `cvUrl` field for CV storage
3. Supabase client already configured with both client-side (anon key) and server-side (service role) instances
4. Profile page uses server component with `auth()` for session and direct Prisma queries for data
5. Extended session user typing needs manual interface since no global `.d.ts` exists

**Gotchas:**
- None - existing infrastructure was well-designed for this feature

**Verification completed:**
- All 6 acceptance criteria verified ✓
- User table has: id, email, name, role, created_at ✓
- Assessment table linked to user ✓
- CV/resume storage utility created ✓
- Basic profile page showing past assessments ✓
- Typecheck passes (exit 0)
- Tests pass (10/10)
- Build succeeds
