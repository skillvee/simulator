# src/lib/schemas - Zod Validation Schemas

Shared Zod schemas for API request validation. Each schema exports both the validator and an inferred TypeScript type.

## Schemas

| Schema | Route | Key Validations |
|--------|-------|-----------------|
| `ChatRequestSchema` | POST /api/chat | `assessmentId`, `coworkerId`, `message` (all required strings) |
| `CallTokenRequestSchema` | POST /api/call/token | `assessmentId`, `coworkerId` (required strings) |
| `RegisterRequestSchema` | POST /api/auth/register | `email` (valid format), `password` (min 8), `role` (optional: "USER" \| "RECRUITER") |
| `ScenarioCreateSchema` | POST /api/admin/scenarios | `name`, `companyName`, `taskDescription`, `archetypeId` (required); `repoUrl` (optional, auto-provisioned), `targetLevel` (default "mid") |
| `ScenarioUpdateSchema` | PUT /api/admin/scenarios/[id] | All fields optional (partial update); `archetypeId` nullable |

## Usage

```typescript
import { ChatRequestSchema } from "@/lib/schemas";
import { validateRequest } from "@/lib/api";

const validated = await validateRequest(request, ChatRequestSchema);
if ("error" in validated) return validated.error;
const { assessmentId, coworkerId, message } = validated.data;
```

## Adding New Schemas

Add to `api.ts` following the pattern:
```typescript
export const MyRouteRequestSchema = z.object({
  requiredField: z.string().min(1, "Required"),
  optionalField: z.string().optional(),
});
export type MyRouteRequest = z.infer<typeof MyRouteRequestSchema>;
```

## Gotchas

- **ADMIN role excluded from signup**: `RegisterRequestSchema` only allows "USER" or "RECRUITER"
- **`repoUrl` is optional**: System auto-provisions repos when not provided
- **Target level values**: "junior", "mid", "senior", "staff" (defaults to "mid")
- **Defense schemas removed** (RF-006): Defense calls now use call token API via Slack interface
