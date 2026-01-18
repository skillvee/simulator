# Skillvee Simulator

Developer assessment platform simulating a realistic "day at work." Candidates experience HR interview → manager kickoff → coding task → PR defense, all via AI-powered conversations while screen is recorded.

## Quick Start

1. **Clone and install dependencies**
   ```bash
   git clone <repo-url>
   cd simulator
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values (see Environment Variables section)
   ```

3. **Set up the database**
   ```bash
   npm run db:generate    # Generate Prisma client
   npm run db:push        # Push schema to database
   npm run db:seed        # (Optional) Seed with sample data
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

```
src/
├── app/           # Next.js pages and API routes (App Router)
├── components/    # React components (Neo-brutalist design)
├── hooks/         # Custom React hooks (voice conversations, screen recording)
├── lib/           # Utilities (Gemini AI, storage, analytics, etc.)
├── prompts/       # AI prompt templates organized by domain
├── contexts/      # React contexts (screen recording state)
├── server/        # Database client
└── types/         # Centralized TypeScript type definitions

prisma/            # Database schema and seed data
tests/e2e/         # End-to-end tests using agent-browser
ralph/             # Autonomous GitHub Issues runner
docs/              # Documentation and PRDs
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run check` | Run both lint and typecheck |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting (CI) |
| `npm run test` | Run unit tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema changes to database |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:migrate` | Deploy database migrations |
| `npm run db:seed` | Seed database with sample data |

## Database

This project uses **Prisma** as the ORM with **Supabase** (PostgreSQL) as the database.

### Setup

1. Create a [Supabase](https://supabase.com) project
2. Copy the connection strings to your `.env` file:
   - `DATABASE_URL` - Pooled connection (for queries)
   - `DIRECT_URL` - Direct connection (for migrations)
3. Run `npm run db:push` to create tables
4. (Optional) Run `npm run db:seed` to add sample data

### Key Models

- **User** - Candidates and admins
- **Scenario** - Assessment configurations
- **Coworker** - AI personas for the simulation
- **Assessment** - Individual assessment sessions
- **VideoAssessment** - Screen recording analysis
- **DimensionScore** - Scoring across 8 competency dimensions

See `prisma/schema.prisma` for the full schema.

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
# Database (Supabase)
DATABASE_URL=           # Pooled connection string
DIRECT_URL=             # Direct connection string

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
AUTH_SECRET=            # Generate with: openssl rand -base64 32
AUTH_URL=               # http://localhost:3000 for dev

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Gemini AI
GEMINI_API_KEY=

# GitHub (optional, for PR operations)
GITHUB_TOKEN=
```

## Documentation

- **[Product Requirements](docs/prd.md)** - Detailed feature specifications and requirements
- **CLAUDE.md files** - AI-specific context and patterns (found in root and key directories)
- **[ralph/progress.md](ralph/progress.md)** - Learnings from 90+ automated issues

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19, Tailwind CSS, Radix UI
- **Database:** Supabase (PostgreSQL) + Prisma ORM
- **AI:** Google Gemini (Live for voice, Flash for text)
- **Auth:** NextAuth.js v5 with Google OAuth
- **Testing:** Vitest (unit), agent-browser (E2E)
- **Deployment:** Vercel

## Design System

Neo-brutalist aesthetic:
- No rounded corners (0px radius)
- No shadows
- 2px black borders
- Gold accent color (#f7da50)
- DM Sans (text) + Space Mono (labels/code)
