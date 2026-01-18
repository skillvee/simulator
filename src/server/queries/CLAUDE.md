# Server Queries

Reusable server-side data fetching utilities for assessment pages.

## Available Functions

### `getAssessmentWithContext(id, userId)`
Basic assessment + scenario + user profile data. Use when you need full scenario and user info.

### `getAssessmentForHRInterview(id, userId)`
For HR interview page. Includes scenario (name, company), HR conversation transcript, and user CV URL.

### `getAssessmentForChat(id, userId)`
For chat page. Includes scenario with all coworkers for sidebar.

### `getAssessmentForDefense(id, userId)`
For PR defense page. Includes scenario with manager coworker (filtered by role).

### `getAssessmentForWelcome(id, userId)`
For welcome/onboarding page. Includes scenario with coworkers and HR assessment status.

### `getAssessmentForResults(id, userId)`
For results page. Includes scenario name/company and user name/email.

### `getAssessmentBasic(id, userId)`
Verification only. Use when you only need to check assessment exists and belongs to user.

## Usage Pattern

```typescript
import { getAssessmentForChat } from "@/server/queries/assessment";

const assessment = await getAssessmentForChat(id, session.user.id);
if (!assessment) {
  redirect("/profile");
}
```

## Adding New Queries

1. Add function to `assessment.ts` with clear JSDoc
2. Export from `index.ts`
3. Name pattern: `getAssessmentFor<Purpose>(id, userId)`
4. Always filter by both `id` and `userId` for security
5. Use `findFirst` with where clause or `findUnique` + ownership check
