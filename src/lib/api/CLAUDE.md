# src/lib/api - API Utilities

Typed fetch client, standardized response helpers, and Zod request validation.

## Key Files

| File | Purpose |
|------|---------|
| `client.ts` | `api<T>()` typed fetch wrapper with `ApiClientError` |
| `response.ts` | `success()`, `error()`, `validationError()` response builders |
| `validation.ts` | `validateRequest()` - Zod schema validation for request bodies |

## Usage

See `src/app/api/CLAUDE.md` for full examples of response helpers and validation patterns in route handlers.

**Client-side**:
```typescript
import { api, ApiClientError } from "@/lib/api";

try {
  const result = await api<MyType>("/api/endpoint", { method: "POST", body: { data } });
} catch (err) {
  if (err instanceof ApiClientError) console.log(err.message, err.code, err.status);
}
```

**Route handler**:
```typescript
import { success, error, validateRequest } from "@/lib/api";
import { MySchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const validated = await validateRequest(request, MySchema);
  if ("error" in validated) return validated.error;
  // ... use validated.data
  return success({ result });
}
```

## Gotchas

- **Backward-compatible client**: `api()` handles both standardized (`{ success, data }`) and legacy response formats; returns `data` if `success` field present, entire response otherwise
- **HTTP 200 + API error**: Client throws when `response.ok === true` but `data.success === false`
- **`validationError()` is not customizable**: Always returns status 400, message `"Validation failed"`, code `"VALIDATION_ERROR"`
- **Invalid JSON handling**: `validateRequest()` catches JSON parse errors separately (returns `INVALID_JSON` error code before Zod runs)
- **Rename `error` in catch blocks**: Import `error` helper conflicts with catch variable; use `err` in catch blocks
