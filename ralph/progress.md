# Ralph Progress

Learnings from autonomous issue resolution.

## Issue #98: REF-008 - Create Test Factory Pattern

### What was implemented
- Created `src/test/factories/` with factory functions for Assessment, User, and Scenario
- Created `src/test/mocks/` with reusable mocks for MediaRecorder, AudioContext, Gemini, and Prisma
- Created `src/test/utils.tsx` with `renderWithProviders()` helper
- Expanded `src/test/setup.tsx` with global mock configuration for Next.js and browser APIs
- Added `src/test/CLAUDE.md` documenting test patterns
- Added 3 example component tests using the new factories

### Files changed
- `src/test/factories/assessment.ts` - `createMockAssessment(overrides?)`
- `src/test/factories/user.ts` - `createMockUser(overrides?)`
- `src/test/factories/scenario.ts` - `createMockScenario(overrides?)`
- `src/test/factories/index.ts` - Re-exports
- `src/test/mocks/media.ts` - MediaRecorder, AudioContext, MediaStream mocks
- `src/test/mocks/gemini.ts` - Gemini session mock
- `src/test/mocks/prisma.ts` - Prisma client mock
- `src/test/mocks/index.ts` - Re-exports
- `src/test/utils.tsx` - `renderWithProviders()`, re-exports testing-library
- `src/test/setup.tsx` - Extended global setup with Next.js mocks
- `src/test/CLAUDE.md` - Test patterns documentation
- `src/components/error-display.test.tsx` - Example using factory pattern
- `src/components/pr-link-modal.test.tsx` - Example with form testing
- `src/components/coworker-sidebar.test.tsx` - Example with interaction testing
- `vitest.config.ts` - Updated setup file path

### Learnings for future iterations

1. **Vitest Mock Types**: When using `vi.fn()` return values as callable functions, TypeScript may complain about `Mock<Procedure | Constructable>` not being callable. Cast to specific function signature: `(mock.fn as Mock<() => void>)()`

2. **JSX in Test Files**: Test files with JSX must use `.tsx` extension, not `.ts`. This applies to setup files, utils, and test files themselves.

3. **Global Mock Classes**: For browser APIs that need to work as constructors (like `MediaRecorder`, `AudioContext`), use actual class definitions instead of `vi.fn().mockImplementation()`:
   ```typescript
   class MockMediaRecorderClass {
     static isTypeSupported = vi.fn().mockReturnValue(true);
     start = vi.fn();
     // ...
   }
   global.MediaRecorder = MockMediaRecorderClass as unknown as typeof MediaRecorder;
   ```

4. **Factory Pattern**: All factories should:
   - Return complete objects with all required fields
   - Use `test-` prefixed IDs for easy identification
   - Accept partial overrides that spread last
   - Use realistic default values

5. **TDD for Test Infrastructure**: Even test utilities benefit from TDD. Write tests for factories first, watch them fail, then implement.

6. **Button States**: When testing forms, be aware of disabled button states. If a button is disabled when input is empty, clicking it won't trigger validation - adjust tests accordingly.

## Issue #95: REF-005 - Add API Route Validation Layer

### What was implemented
- Created `src/lib/api-validation.ts` with `validateRequest<T>(request, schema)` helper
- Created `src/lib/schemas/api.ts` with Zod schemas for API request validation
- Created `src/lib/schemas/index.ts` for schema re-exports
- Migrated 5 routes to use the validation helper:
  - `src/app/api/chat/route.ts` - chat POST endpoint
  - `src/app/api/call/token/route.ts` - coworker call token endpoint
  - `src/app/api/kickoff/token/route.ts` - manager kickoff token endpoint
  - `src/app/api/defense/token/route.ts` - defense call token endpoint
  - `src/app/api/recording/route.ts` - recording upload (POST) and metadata (GET) endpoints
- Updated `src/app/api/CLAUDE.md` with validation pattern documentation
- Added tests for the validation helper (`src/lib/api-validation.test.ts`)
- Updated existing route tests to expect standardized response format

### Files changed
- `src/lib/api-validation.ts` - New validation helper
- `src/lib/api-validation.test.ts` - Tests for validation helper
- `src/lib/schemas/api.ts` - Zod schemas for request bodies
- `src/lib/schemas/index.ts` - Re-exports
- `src/app/api/chat/route.ts` - Uses validateRequest
- `src/app/api/call/token/route.ts` - Uses validateRequest + standardized responses
- `src/app/api/kickoff/token/route.ts` - Uses validateRequest + standardized responses
- `src/app/api/defense/token/route.ts` - Uses validateRequest + standardized responses
- `src/app/api/recording/route.ts` - Uses standardized responses (FormData, not JSON)
- `src/app/api/CLAUDE.md` - Added validation documentation
- `src/app/api/call/token/route.test.ts` - Updated expectations
- `src/app/api/kickoff/token/route.test.ts` - Updated expectations
- `src/app/api/defense/token/route.test.ts` - Updated expectations
- `src/app/api/recording/route.test.ts` - Updated expectations

### Learnings for future iterations

1. **FormData vs JSON validation**: The `validateRequest` helper is designed for JSON bodies. Routes using FormData (like recording/upload with file uploads) need manual validation but should still use the standardized response helpers.

2. **Error variable naming**: When using the `error()` helper from `api-response.ts`, rename catch block error variables to `err` to avoid shadowing:
   ```typescript
   } catch (err) {
     console.error("Error:", err);
     return error("Failed to process", 500);
   }
   ```

3. **Test updates for standardized responses**: When migrating routes to use `success()` helper, update tests to check `json.success === true` and access data via `json.data.field` instead of `json.field`.

4. **Validation error format**: The standardized validation errors include:
   - `error`: "Validation failed"
   - `code`: "VALIDATION_ERROR"
   - `details`: Array of `{ path, message }` objects for each field error

5. **Schema location**: Keep Zod schemas in `src/lib/schemas/api.ts` and re-export from `src/lib/schemas/index.ts`. Each schema should export both the schema and the inferred TypeScript type.

6. **TDD for helpers**: Writing tests first for utility functions (like `validateRequest`) ensures the API contract is well-defined before implementation.

## Issue #96: REF-006 - Create API Client Wrapper

### What was implemented
- Created `src/lib/api-client.ts` with typed `api<T>(endpoint, options)` function
- Created `src/lib/api-client.test.ts` with 14 comprehensive tests
- Handles Content-Type headers automatically for JSON bodies
- Parses response JSON and throws typed `ApiClientError` on failure
- Supports all HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Migrated 5 client-side fetch calls to use the new api client:
  - `src/components/chat.tsx` - GET chat history, POST send message
  - `src/components/data-deletion-section.tsx` - POST request deletion, DELETE cancel request
  - `src/app/candidate_search/client.tsx` - POST entity extraction

### Files changed
- `src/lib/api-client.ts` - New API client wrapper
- `src/lib/api-client.test.ts` - Tests for API client
- `src/components/chat.tsx` - Uses api client for chat operations
- `src/components/data-deletion-section.tsx` - Uses api client for deletion requests
- `src/app/candidate_search/client.tsx` - Uses api client for entity extraction

### Learnings for future iterations

1. **Standardized vs Legacy responses**: The api client handles both standardized responses (`{ success: true, data: T }`) and legacy responses (direct JSON). It extracts `data` from standardized responses automatically.

2. **ApiClientError for typed errors**: Using a custom error class (`ApiClientError`) with `code` and `status` properties makes error handling more precise:
   ```typescript
   try {
     await api('/api/endpoint');
   } catch (err) {
     if (err instanceof ApiClientError) {
       console.log(err.message, err.code, err.status);
     }
   }
   ```

3. **Mock reuse in tests**: When a test needs to call the same endpoint multiple times (e.g., to check both `toThrow` and `toMatchObject`), use `mockResolvedValue` instead of `mockResolvedValueOnce` to avoid the mock being consumed.

4. **Type inference with generics**: The `api<T>()` generic pattern allows callers to specify expected response types, improving type safety across the codebase.

5. **Body handling**: The api client automatically stringifies object bodies and sets Content-Type header, simplifying call sites from verbose fetch patterns.

## Issue #97: REF-007 - Extract Server-Side Data Fetching Utilities

### What was implemented
- Created `src/server/queries/` directory for reusable server-side data fetching
- Created `assessment.ts` with specialized query functions for different page needs
- Added `CLAUDE.md` documenting available queries and usage patterns
- Migrated 3 assessment pages to use new utilities

### Files changed
- `src/server/queries/assessment.ts` - Query functions:
  - `getAssessmentWithContext()` - basic assessment + scenario + user
  - `getAssessmentForHRInterview()` - HR page with conversation transcript
  - `getAssessmentForChat()` - chat page with coworkers
  - `getAssessmentForDefense()` - defense page with manager coworker
  - `getAssessmentForWelcome()` - welcome page with HR assessment
  - `getAssessmentForResults()` - results page with scenario and user
  - `getAssessmentBasic()` - verification only
- `src/server/queries/index.ts` - Re-exports all query functions
- `src/server/queries/CLAUDE.md` - Documentation for query usage
- `src/app/assessment/[id]/hr-interview/page.tsx` - Uses getAssessmentForHRInterview
- `src/app/assessment/[id]/chat/page.tsx` - Uses getAssessmentForChat
- `src/app/assessment/[id]/defense/page.tsx` - Uses getAssessmentForDefense

### Learnings for future iterations

1. **Query function naming**: Use pattern `getAssessmentFor<Purpose>(id, userId)` to clearly indicate what data is included for which page/use case.

2. **Ownership verification patterns**: Two approaches exist:
   - `findFirst({ where: { id, userId } })` - filters in query, returns null if not owner
   - `findUnique({ where: { id } })` + manual `userId !== userId` check - separate verification
   Both are valid; use `findFirst` for simpler code when ownership is the primary concern.

3. **Include vs Select**: Use `select` when you only need specific scalar fields to reduce data transfer. Use `include` when you need related models with all their fields.

4. **Query composition**: Keep queries purpose-specific rather than creating generic "fetch everything" functions. This ensures each page gets only the data it needs.

5. **Documentation location**: Add CLAUDE.md to directories with reusable utilities to guide future usage and additions.
