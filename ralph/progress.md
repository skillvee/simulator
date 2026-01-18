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
