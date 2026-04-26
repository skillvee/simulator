# src/lib/external/

Integration layer for email, GitHub, Supabase, and storage services.

## Modules

### supabase.ts — Client factory (both client & server)
- Exports `supabase` (anon key, client-side) and `supabaseAdmin` (service role, lazy Proxy).
- `supabaseAdmin` is a **Proxy** — the service role client only materializes on first property access. This prevents the key from leaking into browser bundles, but won't error if accidentally imported client-side until runtime access.

### supabase-admin.ts — Server-only admin client
- Also exports `supabaseAdmin`, but with `import "server-only"` guard (build-time error if imported client-side).
- Direct instantiation (not Proxy). Use this import path when you need the build-time safety check.

### storage.ts — Resume & deliverable uploads
- `STORAGE_BUCKETS` — bucket name constants: RESUMES, RECORDINGS, SCREENSHOTS, AVATARS, DELIVERABLES.
- Resume path: `${userId}/${timestamp}.${extension}` with 1-hour cache.
- Deliverable upload goes through `/api/assessment/deliverable` route (not direct Supabase) so the server can persist the reference.
- Uses anon client for uploads, admin client for deletes/signed URLs.

### scenario-data-storage.ts — v2 pipeline artifact storage
- Private `scenario-data` bucket for generated CSVs/MD/JSON.
- **Allowed extensions whitelist:** `.csv`, `.md`, `.json` only — enforced at runtime.
- `upsert: true` — overwrites existing files at the same path.
- Signed URLs are always generated on-demand, never persisted.
- Deletion is best-effort (logs warnings, never throws).

### email.ts — Transactional email via Resend
- Graceful degradation: returns `{ success: false }` if `RESEND_API_KEY` is missing (no throw).
- Sender fallback: uses `noreply@skillvee.com` for production keys (starts with "re_"), otherwise Resend's test sender `onboarding@resend.dev`.
- Report emails are fully translated via `next-intl/server` (`"email.report"` namespace).

### github/ — GitHub API helpers
- `parseGitHubPrUrl(url)` — returns `{ owner, repo, pullNumber }` or `null` (defensive, never throws).
- `formatCiStatusForPrompt(ciStatus)` — formats CI status for AI prompt context.
- API version pinned to `2022-11-28`.

## Environment variables

| Variable | Used by |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | supabase, storage, scenario-data-storage |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | supabase (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | supabase-admin, storage (deletes), scenario-data-storage |
| `RESEND_API_KEY` | email (optional — degrades gracefully) |
| `GITHUB_TOKEN` | github/client (optional) |

## Non-obvious rules

- **Barrel export (`index.ts`) excludes** `scenario-data-storage` and `supabase-admin` — import those directly.
- **Two `supabaseAdmin` exports exist** (supabase.ts and supabase-admin.ts). Prefer `supabase-admin.ts` in server-only code for the build-time guard.
- **Resend dev constraint:** during development, Resend only delivers to verified emails or test addresses.
