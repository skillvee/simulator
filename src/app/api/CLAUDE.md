# src/app/api - API Routes

38 routes across 16 endpoints following Next.js 15 app router.

## Rules

- ONLY export HTTP methods - move constants/helpers to `src/lib/`
- Params are async: `const { id } = await params`
- Ephemeral token routes must enable transcription server-side (see `src/lib/gemini.ts`)
- **Use standardized API response helpers** - see below

## Standardized API Response Format

All routes should use helpers from `@/lib/api-response` for consistent response shapes:

```typescript
import { success, error, validationError } from "@/lib/api-response";

// Success response - wraps data in { success: true, data: T }
return success({ assessment });
return success({ created: true }, 201); // Custom status

// Error response - returns { success: false, error: string, code?: string }
return error("Not found", 404);
return error("Assessment not found", 404, "NOT_FOUND"); // With error code

// Validation error - for Zod validation failures
const result = schema.safeParse(body);
if (!result.success) {
  return validationError(result.error);
}
```

### Migration Pattern

**Before:**
```typescript
import { NextResponse } from "next/server";

// Error
return NextResponse.json({ error: "Not found" }, { status: 404 });

// Success
return NextResponse.json({ data });
```

**After:**
```typescript
import { success, error } from "@/lib/api-response";

// Error
return error("Not found", 404, "NOT_FOUND");

// Success
return success({ data });
```

### Response Shapes

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Error:**
```json
{ "success": false, "error": "message", "code": "ERROR_CODE" }
```

**Validation Error:**
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [{ "path": "email", "message": "Invalid email" }]
}
```

## Route Groups

- **Assessment flow:** interview/, kickoff/, call/, chat/, defense/, assessment/
- **Admin:** admin/\* (protected by `requireAdmin()`)

## Gotchas

- GitHub API can't DELETE PRs - use PATCH with `state: "closed"`
- Test redirects/notFound by mocking next/navigation and expecting throws
- Rename `error` variable in catch blocks to `err` to avoid conflict with `error` helper
