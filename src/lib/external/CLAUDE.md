# src/lib/external - External Service Integrations

GitHub, email (Resend), Supabase (auth/storage), and PR URL validation.

## Key Files

| File | Purpose |
|------|---------|
| `supabase.ts` | Client-side (`supabase`) and server-side admin (`supabaseAdmin`) Supabase clients |
| `storage.ts` | File upload/delete/signed URLs for Supabase Storage buckets |
| `github.ts` | PR content fetching, CI/CD status, PR cleanup (close + snapshot) |
| `email.ts` | Transactional emails via Resend (assessment reports with skill bars) |
| `pr-validation.ts` | URL validation for GitHub, GitLab, and Bitbucket PR/MR patterns |

## Auth Patterns

| Service | Auth | Env Vars |
|---------|------|----------|
| Supabase | JWT (anon key client-side, service role server-side) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| GitHub | Bearer token | `GITHUB_TOKEN` |
| Resend | API key | `RESEND_API_KEY` |

## Patterns

**Storage paths** use `userId/timestamp.extension` to prevent collisions. Buckets: `RESUMES`, `RECORDINGS`, `SCREENSHOTS`, `AVATARS`.

**GitHub PR cleanup** preserves snapshot before closing:
```typescript
const snapshot = await fetchGitHubPrContent(prUrl);  // Preserve first
await closeGitHubPr(prUrl);                          // Then close
```

**Email graceful degradation**: Returns `{ success: false, error }` instead of throwing. Check `isEmailServiceConfigured()` before sending.

## Gotchas

- **GitHub API can't DELETE PRs** - only close them via PATCH with `state: "closed"`
- **Diff truncation**: GitHub diffs truncated at 500KB to prevent memory issues
- **CI test extraction**: Regex-based parsing of check output summaries (fragile, format-dependent)
- **Resend API key check**: Uses `startsWith("re_")` to detect production vs test keys; fallback sender `onboarding@resend.dev` in dev
- **Storage admin client**: Delete and signed URL operations require `supabaseAdmin` (server-side only)
- **PR URL patterns**: Supports GitHub (`/pull/`), GitLab (`/-/merge_requests/`), Bitbucket (`/pull-requests/`); must be HTTPS
