# Ralph Progress Log

## Issue #111: DS-001: Install shadcn/ui CLI and initialize configuration

### What was implemented
- Created `src/lib/utils.ts` with the `cn()` utility function for merging Tailwind classes
- Created `components.json` with shadcn/ui CLI configuration (paths, aliases, icon library)
- Updated `tailwind.config.ts` to use HSL CSS variables and shadcn-compatible border radius
- Updated `src/app/globals.css` with HSL-based CSS variables for light/dark themes
- New design tokens: primary #237CF1 (blue), radius 0.5rem

### Files changed
- `src/lib/utils.ts` (new) - cn() utility
- `components.json` (new) - shadcn CLI config
- `tailwind.config.ts` (modified) - HSL colors, radius, ES module import
- `src/app/globals.css` (modified) - HSL CSS variables, @layer base

### Pre-existing issues fixed (unrelated to this task)
- `src/components/chat/coworker-sidebar.test.tsx` - removed unused fireEvent import
- `src/lib/ai/coworker-persona.ts` - removed unused PersonalityStyle import
- `src/lib/analysis/ai-call-logging.ts` - prefixed unused endpoint variables with underscore
- `src/test/mocks/media.test.ts` - removed unused vi import
- `src/app/api/assessment/report/route.ts` - fixed ChatMessage import to use @/types
- `src/lib/analysis/assessment-aggregation.ts` - fixed ChatMessage import to use @/types

### Learnings for future iterations
1. The project already had several shadcn-related dependencies (`clsx`, `tailwind-merge`, `tailwindcss-animate`, Radix primitives) - this made the setup straightforward
2. The tailwind.config.ts was using `require()` which fails ESLint's no-require-imports rule - use ES module imports instead
3. shadcn/ui uses HSL values without the `hsl()` wrapper in CSS variables (e.g., `--primary: 214 93% 54%`), then wraps them in tailwind config (`hsl(var(--primary))`)
4. There were pre-existing lint/type errors in the codebase that needed fixing before the build could pass:
   - Unused imports in test files
   - Missing exports in barrel files (`ChatMessage` was removed from `@/lib/ai` but still imported)
5. The design system migration uses new tokens: primary blue (#237CF1) instead of gold/black neo-brutalist, 0.5rem radius instead of 0

### Gotchas discovered
- Next.js build runs lint as part of the process, so pre-existing lint errors block the build
- The `@react-email/render` module warning is a known issue with resend package but doesn't block compilation

## Issue #112: DS-002: Configure blue theme CSS variables

### What was implemented
- Updated `:root` CSS variables with the new blue theme color palette
- Updated `.dark` CSS variables for dark mode with blue-slate tones
- Replaced gold accent (#f7da50) with blue (#60a5fa) in syntax highlighting
- Updated all gold-related comments to reference blue instead

### CSS Variable Changes

**Light mode (:root):**
- `--primary`: `217 91% 54%` (#237CF1 blue)
- `--secondary`: `210 40% 96.1%` (#f1f5f9)
- `--accent`: `199 89% 94%` (sky-100)
- `--muted`: `210 40% 96.1%` (slate tones)
- `--muted-foreground`: `215.4 16.3% 46.9%`
- `--foreground`: `222.2 84% 4.9%`
- `--border/input`: `214.3 31.8% 91.4%`
- `--ring`: `217 91% 54%` (matches primary)

**Dark mode (.dark):**
- `--background`: `222.2 84% 4.9%`
- `--foreground`: `210 40% 98%`
- `--secondary/muted/accent/border/input`: `217.2 32.6% 17.5%`
- `--muted-foreground`: `215 20.2% 65.1%`

**Syntax highlighting:**
- Light mode: #60a5fa (blue-400) replaces #f7da50 (gold)
- Dark mode: #2563eb (blue-600) replaces #8c6d00 (dark gold)

### Files changed
- `src/app/globals.css` (modified) - All CSS variable updates

### Learnings for future iterations
1. The issue specified exact HSL values to use - follow them precisely
2. Gold color (#f7da50) still exists in other files (email.ts, styles/theme.css, remotion, docs) - these are intentionally NOT migrated yet as components will adopt the new theme gradually
3. Syntax highlighting colors should complement the main theme (blue-400/blue-600 work well)
4. Dark mode uses slate-blue tones (hue ~217) instead of pure grays for cohesion with the blue theme

### Gotchas discovered
- Comments in the CSS still referenced "gold" and "neo-brutalist" - updated them to reflect the new theme
- The design system migration is incremental: globals.css provides new tokens, but components can still use old class patterns until individually migrated

## Issue #113: DS-003: Enable border radius and shadows in Tailwind

### What was implemented
**No changes needed** - All acceptance criteria were already satisfied by Issue #111 (DS-001).

### Current state (verified)
- `tailwind.config.ts` lines 59-63: Border radius already uses CSS variables
  ```typescript
  borderRadius: {
    lg: "var(--radius)",
    md: "calc(var(--radius) - 2px)",
    sm: "calc(var(--radius) - 4px)",
  }
  ```
- `globals.css` line 29: `--radius: 0.5rem` already exists
- No `boxShadow` overrides exist - Tailwind defaults are used

### Verification
- Build passes: `npm run build` exits 0
- Lint passes: `npm run lint` (only pre-existing warnings)

### Learnings for future iterations
1. **Check issue dependencies carefully** - DS-003 depended on DS-001, and DS-001 already implemented the border radius and CSS variable changes as part of shadcn/ui initialization
2. **Issue descriptions may reference outdated state** - The issue described "Current State (to remove)" with 0px overrides, but those never existed in the codebase (DS-001 went directly to the correct values)
3. **Verify before implementing** - Reading the actual files first prevented unnecessary duplicate work

### Gotchas discovered
- The neo-brutalist 0px radius overrides mentioned in the issue were from an older version of the codebase that was replaced before DS-001 was implemented
- Issues in a dependency chain may have overlapping scope - worth checking if the work was already done upstream

## Issue #114: DS-004: Add animation utilities and keyframes

### What was implemented
- Added CSS keyframes in `globals.css`: fadeIn, slideUp, slideDown, scaleIn, accordion-down, accordion-up
- Added corresponding Tailwind animation utilities in `tailwind.config.ts`: animate-fade-in, animate-slide-up, animate-slide-down, animate-scale-in, animate-accordion-down, animate-accordion-up
- Replaced `transition-none` with `transition-colors` in `markdown.tsx` link component

### Files changed
- `src/app/globals.css` (modified) - Added keyframes section at end of file
- `tailwind.config.ts` (modified) - Added keyframes and animation config in theme.extend
- `src/components/shared/markdown.tsx` (modified) - Changed `transition-none` to `transition-colors`

### Learnings for future iterations
1. **Issue said globals.css has transition:none overrides** - it didn't. The actual `transition-none` was in a component file (`markdown.tsx`), not in globals.css. Always grep the codebase to find actual occurrences.
2. **Keyframes need to be defined in both CSS and Tailwind** - The CSS keyframes provide the animation definition, while Tailwind config maps them to utility classes like `animate-fade-in`.
3. **Accordion animations use Radix UI CSS variables** - `var(--radix-accordion-content-height)` is set by Radix components at runtime, enabling dynamic height animations.

### Gotchas discovered
- The issue description mentioned "Remove `transition: none` overrides from buttons/links in globals.css" but the actual override was in markdown.tsx using the Tailwind class `transition-none`, not in globals.css

## Issue #115: DS-005: Update frontend-design skill documentation

### What was implemented
- Complete rewrite of `.claude/skills/frontend-design/SKILL.md` to reflect the new modern blue theme
- Updated `CLAUDE.md` to remove all neo-brutalist references

### Changes to SKILL.md
**Removed:**
- All neo-brutalist references (0px radius, no shadows, 2px borders)
- Gold (#f7da50) color references
- Geometric/tangram decoration patterns
- "Brutalist" terminology throughout
- Instant/sharp animation preferences

**Added:**
- Blue color palette documentation (#237CF1 primary, HSL values for all colors)
- Border radius standards table (rounded-lg for buttons, rounded-xl for cards, etc.)
- Shadow guidelines table (shadow-sm for cards, shadow-md for elevated, shadow-lg for modals)
- Animation patterns section (animate-fade-in, animate-slide-up, etc.)
- shadcn/ui component usage guidelines with import examples
- Example Tailwind patterns for common components (Card, Button, Input)
- Updated MANDATORY DO's and DON'Ts sections

### Changes to CLAUDE.md
- Updated "Design" line from "Neo-brutalist - 0px radius, no shadows, 2px black borders, gold (#f7da50)" to "Modern blue theme with shadcn/ui - rounded corners, subtle shadows, blue (#237CF1) primary"
- Updated components directory description from "Neo-brutalist design" to "Modern blue theme"
- Updated frontend-design skill description from "Neo-brutalist UI" to "Modern blue theme UI"

### Files changed
- `.claude/skills/frontend-design/SKILL.md` (complete rewrite)
- `CLAUDE.md` (3 line edits)

### Learnings for future iterations
1. **Documentation must match implementation** - The skill file is critical for Ralph and other agents. It must accurately reflect the current design system to prevent reverting to old patterns.
2. **Use concrete values from previous issues** - DS-001, DS-002, and DS-004 provided exact HSL values and animation names. Reference progress.md for these details.
3. **Update all references** - CLAUDE.md had 3 separate mentions of neo-brutalist that all needed updating.

### Gotchas discovered
- None - this was a straightforward documentation update

## Issue #116: DS-006: Add shadcn Button component

### What was implemented
- Installed the shadcn Button component via `npx shadcn@latest add button`
- The component automatically uses the blue theme via CSS variables configured in DS-001 and DS-002

### Files changed
- `src/components/ui/button.tsx` (new) - shadcn Button component with all variants and sizes

### Variants available
- **default**: Blue background (#237CF1 via `--primary`), white text
- **destructive**: Red background
- **outline**: Border with transparent background, hover shows accent
- **secondary**: Light gray background
- **ghost**: No background, hover shows accent
- **link**: Underlined text style with primary color

### Sizes available
- **sm**: `h-9 px-3`
- **default**: `h-10 px-4 py-2`
- **lg**: `h-11 px-8`
- **icon**: `h-10 w-10` (square)

### Learnings for future iterations
1. **No customization needed** - shadcn components use CSS variables from globals.css, so they automatically inherit the blue theme configured in DS-001/DS-002
2. **The `--yes` flag** - Using `npx shadcn@latest add button --yes` skips the confirmation prompt, useful for automated scripts
3. **Component uses cva** - The button uses `class-variance-authority` for variant management, which is already a project dependency

### Gotchas discovered
- None - this was a straightforward component installation

## Issue #117: DS-007: Add shadcn Card component

### What was implemented
- Installed the shadcn Card component via `npx shadcn@latest add card --yes`
- Updated Card to use `rounded-xl` instead of the default `rounded-lg` to match the acceptance criteria

### Files changed
- `src/components/ui/card.tsx` (new) - shadcn Card component with all sub-components

### Components available
- **Card** - Main container with `rounded-xl border bg-card text-card-foreground shadow-sm`
- **CardHeader** - Header section with padding and vertical spacing
- **CardTitle** - Title text with semibold weight and tight tracking
- **CardDescription** - Muted description text
- **CardContent** - Main content area with padding
- **CardFooter** - Footer section with flex alignment

### Learnings for future iterations
1. **Default rounded value may not match requirements** - shadcn Card uses `rounded-lg` by default, but the design system spec required `rounded-xl`. Always verify component styling against acceptance criteria.
2. **Card uses semantic colors** - Uses `bg-card` and `text-card-foreground` CSS variables, which can be customized separately from `--background` in globals.css if needed.
3. **Consistent pattern with Button** - Like Button (DS-006), the Card component automatically inherits the blue theme via CSS variables configured in DS-001/DS-002.

### Gotchas discovered
- The shadcn Card default border radius (`rounded-lg`) needed to be changed to `rounded-xl` to meet the acceptance criteria. This is a minor customization that maintains the component structure.

## Issue #118: DS-008: Add shadcn Input, Label, and Textarea components

### What was implemented
- Installed Input, Label, and Textarea components via `npx shadcn@latest add input label textarea --yes`
- All three components use the blue theme via CSS variables configured in DS-001 and DS-002

### Files changed
- `src/components/ui/input.tsx` (new) - shadcn Input component
- `src/components/ui/label.tsx` (new) - shadcn Label component with Radix UI primitive
- `src/components/ui/textarea.tsx` (new) - shadcn Textarea component

### Styling details

**Input component:**
- Blue focus ring via `focus-visible:ring-2 focus-visible:ring-ring` (ring uses `--ring` = #237CF1)
- Rounded corners: `rounded-md`
- Placeholder text: `placeholder:text-muted-foreground`
- Disabled states: `disabled:cursor-not-allowed disabled:opacity-50`
- File input styling for upload buttons

**Label component:**
- Uses Radix UI `@radix-ui/react-label` for accessibility (handles htmlFor automatically)
- Peer-disabled states: `peer-disabled:cursor-not-allowed peer-disabled:opacity-70`

**Textarea component:**
- Matches Input styling pattern exactly
- Min height: `min-h-[80px]`
- Same focus, placeholder, and disabled states as Input

### Learnings for future iterations
1. **Multiple components can be installed at once** - `npx shadcn@latest add input label textarea --yes` installs all three in one command
2. **No customization needed for these components** - Unlike Card (DS-007) which needed `rounded-xl`, the Input/Label/Textarea components meet acceptance criteria out of the box
3. **Label uses Radix UI primitive** - This provides accessibility features like proper `htmlFor` handling without additional code
4. **Consistent pattern across form components** - Input and Textarea share the same class structure for focus, placeholder, and disabled states

### Gotchas discovered
- None - this was a straightforward component installation with no modifications needed

## Issue #119: DS-009: Add shadcn Dialog component

### What was implemented
- Installed the shadcn Dialog component via `npx shadcn@latest add dialog --yes`
- Updated DialogContent to use `animate-scale-in` (our custom animation from DS-004) instead of the default `zoom-in-95`
- Updated DialogContent to use `rounded-lg` for rounded corners (consistent with design system)

### Files changed
- `src/components/ui/dialog.tsx` (new) - shadcn Dialog component with customized animations

### Components available
- **Dialog** - Root component that manages open/closed state
- **DialogTrigger** - Button/element that opens the dialog
- **DialogContent** - Main content container with scale-in animation and rounded corners
- **DialogHeader** - Header section for title and description
- **DialogTitle** - Title text with semibold weight
- **DialogDescription** - Muted description text
- **DialogFooter** - Footer section for action buttons
- **DialogClose** - Close button with X icon
- **DialogOverlay** - Background overlay with fade-in animation
- **DialogPortal** - Portal for rendering dialog outside DOM hierarchy

### Accessibility features (built-in via Radix UI)
- Focus trap: Dialog traps focus within content when open
- Escape key: Closes dialog on Escape keypress
- ARIA: Proper aria-* attributes from DialogPrimitive
- Screen reader: Close button has `sr-only` label

### Animation customization
The default shadcn Dialog uses `zoom-in-95` from tailwindcss-animate. This was changed to:
- `data-[state=open]:animate-scale-in` - Uses our custom scaleIn keyframe from DS-004 for enter animation
- `data-[state=closed]:zoom-out-95` - Keeps the default exit animation

### Learnings for future iterations
1. **shadcn animations vs custom animations** - shadcn components use tailwindcss-animate utilities by default (zoom-in-95, fade-in-0, etc.). When the acceptance criteria specifies using our custom animations (animate-scale-in from DS-004), the component needs to be modified.
2. **Radix UI provides accessibility** - The Dialog uses `@radix-ui/react-dialog` which handles focus trap, escape key, and ARIA attributes automatically. No additional accessibility work needed.
3. **Build can be flaky** - The Next.js build sometimes fails with transient `PageNotFoundError` errors. Clearing `.next` cache and rebuilding usually resolves this.
4. **Rounded corners applied without sm: prefix** - Changed `sm:rounded-lg` to `rounded-lg` so corners are rounded on all screen sizes

### Gotchas discovered
- The issue specified "Content has scale-in animation (uses animate-scale-in)" but the default shadcn Dialog uses `zoom-in-95`. These are similar but not identical - the custom `animate-scale-in` uses our design system's timing (0.2s ease-out) while zoom-in-95 comes from tailwindcss-animate.

## Issue #120: DS-010: Add shadcn Avatar component

### What was implemented
- Installed the shadcn Avatar component via `npx shadcn@latest add avatar --yes`
- Component provides Avatar container, AvatarImage, and AvatarFallback sub-components
- No customization needed - component meets all acceptance criteria out of the box

### Files changed
- `src/components/ui/avatar.tsx` (new) - shadcn Avatar component with all sub-components
- `package.json` (modified) - @radix-ui/react-avatar bumped from 1.1.10 to 1.1.11

### Components available
- **Avatar** - Root container with `rounded-full` and default `h-10 w-10` (customizable via className)
- **AvatarImage** - Image with aspect-square sizing, works with any image URL including DiceBear
- **AvatarFallback** - Displays content (e.g., initials) when image unavailable, uses `bg-muted` background

### Size customization
Sizes are applied via className on the Avatar component:
- `h-8 w-8` - small
- `h-10 w-10` - default (built-in)
- `h-16 w-16` - large
- `h-32 w-32` - extra large

### DiceBear compatibility
The existing `CoworkerAvatar` component uses DiceBear identicon URLs. The shadcn Avatar's `AvatarImage` uses the standard `img` element via Radix UI, so it works with any image URL including DiceBear.

### Learnings for future iterations
1. **No customization needed** - Unlike Card (DS-007) which needed `rounded-xl` and Dialog (DS-009) which needed custom animations, the Avatar component meets all acceptance criteria out of the box with `rounded-full` default.
2. **@radix-ui/react-avatar was already a dependency** - The project already had this package at version 1.1.10, so shadcn CLI just bumped the version to 1.1.11.
3. **Build flakiness continues** - Had to clear `.next` cache and rebuild due to transient `PageNotFoundError` (consistent with DS-009 learnings).

### Gotchas discovered
- None - this was a straightforward component installation with no modifications needed

## Issue #121: DS-011: Add shadcn Badge, Separator, and Tabs components

### What was implemented
- Installed Badge, Separator, and Tabs components via `npx shadcn@latest add badge separator tabs --yes`
- Customized TabsTrigger to use blue underline/highlight when active (changed `text-foreground` to `text-primary` and added `border-b-2 border-primary`)

### Files changed
- `src/components/ui/badge.tsx` (new) - shadcn Badge component with default, secondary, destructive, and outline variants
- `src/components/ui/separator.tsx` (new) - shadcn Separator component (horizontal and vertical)
- `src/components/ui/tabs.tsx` (new, customized) - shadcn Tabs component with blue active state

### Components available

**Badge variants:**
- **default**: Blue background (`bg-primary`), white text - uses #237CF1 via CSS variables
- **secondary**: Gray background (`bg-secondary`)
- **destructive**: Red background (`bg-destructive`)
- **outline**: Border only, no background

**Separator:**
- Works with `orientation="horizontal"` (default) or `orientation="vertical"`
- Uses `bg-border` for consistent styling with the theme

**Tabs components:**
- **Tabs** - Root component managing active tab state
- **TabsList** - Container for tab triggers with muted background
- **TabsTrigger** - Individual tab button; when active uses blue text (`text-primary`) and blue bottom border (`border-b-2 border-primary`)
- **TabsContent** - Content panel shown when corresponding tab is active

### Learnings for future iterations
1. **Badge already had rounded-full** - Unlike Card (DS-007) which needed customization, the shadcn Badge component comes with `rounded-full` by default.
2. **TabsTrigger needed blue active state** - The default shadcn Tabs uses white background highlight on active tabs. Changed to blue text color and blue underline to match design system.
3. **Multiple components can share dependencies** - All three components use Radix UI primitives which were already installed from previous issues.

### Gotchas discovered
- The issue specified "TabsTrigger uses blue underline/highlight when active" but the default shadcn implementation uses `data-[state=active]:text-foreground` (black text) and `data-[state=active]:bg-background` (white background). Changed to `text-primary` and added `border-b-2 border-primary` for the blue underline effect.

## Issue #146: BUG: Fix voice call API key error - token extraction from wrong response level

### What was implemented
- Fixed token extraction in `src/components/chat/floating-call-bar.tsx` line 260
- Fixed token extraction in `src/hooks/voice/use-voice-base.ts` lines 311-312

### Root cause
Token endpoints (kickoff, call, defense) return responses wrapped in the standard API format using the `success()` helper from `@/lib/api/response.ts`:
```json
{ "success": true, "data": { "token": "...", "assessmentId": "..." } }
```

But client code was extracting `token` from the **top level** instead of `response.data`:
```typescript
// Before (broken):
const { token } = await tokenResponse.json();  // token is undefined!

// After (fixed):
const response = await tokenResponse.json();
const { token } = response.data;
```

This resulted in `undefined` being passed to `new GoogleGenAI({ apiKey: undefined })`, causing the "API Key must be set when running in a browser" error.

### Files changed
- `src/components/chat/floating-call-bar.tsx` (modified) - Extract token from `response.data` instead of top level
- `src/hooks/voice/use-voice-base.ts` (modified) - Extract tokenData from `response.data` instead of top level

### Learnings for future iterations
1. **Consistency matters** - The API uses a standard `{ success: true, data: {...} }` wrapper (via `@/lib/api/response.ts`), but client code wasn't consistently unwrapping it
2. **Error messages can be misleading** - "API Key must be set when running in a browser" suggests a configuration issue, but the actual cause was `undefined` being passed from incorrect response parsing
3. **Check the actual API response format** - When debugging API integration issues, always verify the actual response structure by reading the API route handler code
4. **Follow the data flow** - The issue description accurately traced the problem: API returns wrapped response → client extracts from wrong level → `undefined` token → SDK error

### Gotchas discovered
- The `use-voice-base.ts` hook passes `tokenData` to an `onTokenResponse` callback, so it needed to be the unwrapped data object, not just the token string
- The existing error handling (`if (!tokenResponse.ok)`) was correctly extracting error data, but the success path was incorrectly extracting from the top level

## Issue #147: Fix duplicate voice calls in FloatingCallBar

### What was implemented
- Added `isConnectingRef` to prevent concurrent connection attempts in `FloatingCallBar`
- Added guard at start of `connect()` function to return early if already connecting
- Added cleanup of existing session before creating a new one
- Reset the connecting flag on both success and error paths

### Root cause
The `FloatingCallBar` component had an auto-connect `useEffect` with the `connect` callback as a dependency. The `connect` callback depends on 8 values including `handleServerMessage`, which changes when its dependencies change. When `connect` was recreated, the effect re-ran, and if `callState` was still `"idle"` (due to async state updates), a second call to `connect()` happened, creating two simultaneous Gemini Live sessions.

### Files changed
- `src/components/chat/floating-call-bar.tsx` (modified) - Added `isConnectingRef` and guards

### Code changes
1. Added `isConnectingRef = useRef(false)` after other refs (line 77)
2. Added guard at start of `connect()`: check `isConnectingRef.current` and return early if true
3. Set `isConnectingRef.current = true` before starting connection
4. Added cleanup of existing session before `sessionRef.current = session`
5. Reset `isConnectingRef.current = false` after successful audio capture initialization
6. Reset `isConnectingRef.current = false` in catch block before error handling

### Learnings for future iterations
1. **useCallback dependencies can cause re-execution** - When a callback depends on other callbacks or state, changes to those dependencies recreate the callback, which can trigger useEffect hooks that depend on it
2. **Refs for connection state** - Using a ref (`isConnectingRef`) instead of state for the "is connecting" flag is correct because:
   - State updates are async and may not be visible immediately
   - Refs provide synchronous, immediate updates that prevent race conditions
3. **Clean up before replace** - When assigning a new session, always close the existing one first to prevent orphaned connections
4. **Guard both entry and exit paths** - Reset the connecting flag in both success and error paths to ensure subsequent connection attempts can proceed

### Gotchas discovered
- The state-based guard (`callState !== "idle"`) wasn't sufficient because state updates are async - by the time the second `connect()` call checked `callState`, it might still be "idle" even though the first call had started
- The `connect` callback was in the dependency array of the auto-connect `useEffect`, which is correct for React's rules of hooks but caused the duplicate connection issue

## Issue #122: DS-012: Create ui/index.ts barrel export

### What was implemented
- Created `src/components/ui/index.ts` barrel export file that re-exports all UI components from DS-006 through DS-011

### Files changed
- `src/components/ui/index.ts` (new) - Barrel export file

### Exports included
- **Button**: `Button`, `buttonVariants` (DS-006)
- **Card**: `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardDescription`, `CardContent` (DS-007)
- **Input/Label/Textarea**: `Input`, `Label`, `Textarea` (DS-008)
- **Dialog**: `Dialog`, `DialogPortal`, `DialogOverlay`, `DialogClose`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription` (DS-009)
- **Avatar**: `Avatar`, `AvatarImage`, `AvatarFallback` (DS-010)
- **Badge/Separator/Tabs**: `Badge`, `badgeVariants`, `Separator`, `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (DS-011)

### Usage
```typescript
// Clean single import
import { Button, Card, Input } from "@/components/ui";

// Instead of multiple imports
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
```

### Learnings for future iterations
1. **Barrel exports simplify imports** - Instead of importing from individual files, consumers can use a single import path
2. **Check actual exports in source files** - The issue provided a template, but I verified the exact exports from each component file (e.g., Dialog has more exports than the template showed)
3. **No circular dependencies** - Using named re-exports (`export { X } from "./x"`) avoids circular dependency issues because we're just re-exporting, not importing and then exporting

### Gotchas discovered
- None - this was a straightforward barrel export file creation

## Issue #123: DS-013: Migrate shared/ components to modern design

### What was implemented
- Migrated `cv-upload.tsx` to use Card and Button components from `@/components/ui`
- Migrated `markdown.tsx` to use modern blue theme styling with rounded corners

### cv-upload.tsx changes
- Container: Changed from plain `<div>` with `border-2 border-dashed` to `<Card>` component with dashed border
- Dropzone: Added blue accent on drag-over (`border-primary bg-primary/5`) instead of secondary color
- Progress bar: Changed to rounded ends (`rounded-full`) with blue fill (`bg-primary`)
- Added "Browse files" `<Button variant="outline" size="sm">` for clearer CTA
- Error state: Uses `<Card>` with destructive styling instead of plain div
- Used `cn()` utility for cleaner conditional class composition
- Removed `font-mono` classes in favor of system fonts

### markdown.tsx changes
- Updated docstring from "Neo-brutalist" to "Modern styled with blue theme"
- Code blocks (`<pre>`): Added `rounded-lg` for rounded corners
- Inline code: Changed from gold (`bg-secondary/30`) to blue tint (`bg-primary/10 text-primary`) with `rounded`
- Lists: Changed from square bullets (`■`) to native disc/decimal bullets with blue markers (`marker:text-primary`)
- Links: Changed from gold underline to blue text with primary color decoration
- Blockquotes: Changed left border from secondary to primary (blue)
- Tables: Added `rounded-lg` wrapper, changed from inverted header to muted background
- Images: Added `rounded-lg` and softer border
- H1: Changed border from `border-b-2 border-foreground` to `border-b border-border`
- Horizontal rules: Softened from `border-t-2 border-foreground` to `border-t border-border`

### Files changed
- `src/components/shared/cv-upload.tsx` (modified) - Card, Button, rounded progress bar, blue accents
- `src/components/shared/markdown.tsx` (modified) - Rounded corners, blue theme, modern styling

### Learnings for future iterations
1. **Import from barrel exports** - ESLint rule `no-restricted-imports` enforces importing from `@/components/ui` instead of individual component files like `@/components/ui/card`
2. **Use `cn()` for conditional classes** - The `cn()` utility from `@/lib/utils` provides cleaner conditional class composition than template strings
3. **Blue theme uses primary color** - The design system uses `primary` (blue #237CF1) instead of `secondary` (which was gold in the old neo-brutalist theme)
4. **Consistent rounded corners** - Use `rounded-lg` for code blocks, tables, images; `rounded-full` for progress bars and badges

### Gotchas discovered
- The original cv-upload used `font-mono` extensively which gave a technical feel but doesn't match the modern design - removed in favor of system fonts
- List markers in markdown needed `marker:text-primary` Tailwind class to color the bullet points blue

## Issue #148: US-001: Create manager greeting generator utility

### What was implemented
- Created `src/lib/chat/greeting-generator.ts` with `generateManagerGreetings()` function
- Function accepts a `GreetingContext` parameter with userName, managerName, managerRole, companyName, repoUrl, taskDescription
- Returns an array of 6 `ChatMessage` objects matching the welcome page content
- Each message has `role: "model"`, `text`, and `timestamp` fields
- Timestamps are dynamically generated using the current time with realistic offsets (0, 1, 2 minutes)

### Files changed
- `src/lib/chat/greeting-generator.ts` (new) - Manager greeting generator utility

### Message sequence generated
1. Welcome to company + glad to have you
2. Manager introduction (name and role)
3. Kickoff call invitation
4. Repo link
5. Task preview (truncated to 200 chars with ellipsis if needed)
6. Ready to hop on call CTA

### Learnings for future iterations
1. **Use ChatMessage type from @/types** - The project has centralized types in `@/types/index.ts`, always import from there
2. **Dynamic timestamps** - Instead of hardcoded "10:01 AM" strings, the new utility generates timestamps based on current time with minute offsets for realism
3. **Export interface for context** - Exported `GreetingContext` interface so consumers can properly type their context objects

### Gotchas discovered
- The welcome page used a local `Message` type (from its own component) with `content` field, while `ChatMessage` uses `text` field - the utility correctly uses `ChatMessage` with `text`

## Issue #149: US-002: Update Chat API to generate greetings on first manager load

### What was implemented
- Updated Chat API GET endpoint to detect first manager load and generate greeting messages
- Added import for `generateManagerGreetings` from `@/lib/chat/greeting-generator`
- Added scenario include to assessment query for greeting context
- Added coworker lookup to check if the coworker is a manager
- Added greeting generation logic when: no conversation exists, coworker is manager, status is ONBOARDING or WORKING
- Added automatic status update from ONBOARDING to WORKING when greetings are generated

### Files changed
- `src/app/api/chat/route.ts` (modified) - GET endpoint with greeting generation logic

### Code changes
1. Added import for `generateManagerGreetings` at line 21
2. Added `include: { scenario: true }` to assessment query for greeting context
3. Added coworker lookup to verify coworker exists and check if it's a manager
4. Added greeting generation block after conversation lookup:
   - Checks `!conversation && isManager(coworker.role)`
   - Checks `assessment.status === ONBOARDING || WORKING`
   - Generates greetings using scenario context
   - Saves conversation to DB
   - Updates status to WORKING if ONBOARDING
   - Returns greeting messages

### Learnings for future iterations
1. **Reuse existing helper functions** - The `isManager()` helper was already defined in the file (line 26-28), so it was reused for the manager check
2. **Include scenario in query** - The assessment query needed `include: { scenario: true }` to access `repoUrl`, `taskDescription`, and `companyName` for greeting generation
3. **Status transition is one-way** - ONBOARDING → WORKING transition happens when greetings are generated; subsequent loads don't re-generate (conversation exists)
4. **Existing chat functionality unchanged** - If conversation exists, the flow returns the existing messages as before

### Gotchas discovered
- The GET endpoint previously didn't fetch the coworker - it was only fetched in POST. Added coworker lookup with proper scenarioId check for consistency with POST handler

## Issue #150: US-003: Update all redirects from /welcome to /chat

### What was implemented
- Updated all routes that redirected to `/welcome` to instead redirect to `/chat?coworkerId={managerId}`
- Converted welcome page to a redirect-only page for backwards compatibility
- Deleted the welcome client component (no longer needed)
- Updated start page tests to reflect new redirect behavior

### Files changed
- `src/app/assessment/[id]/congratulations/page.tsx` - Added coworkers to query, passes managerId to client
- `src/app/assessment/[id]/congratulations/client.tsx` - Updated redirects to `/chat?coworkerId={managerId}`
- `src/app/start/page.tsx` - Updated WORKING status redirect to include managerId
- `src/app/assessment/[id]/kickoff/page.tsx` - Redirects to `/chat?coworkerId={managerId}`
- `src/app/assessment/[id]/welcome/page.tsx` - Converted to redirect-only
- `src/app/assessment/[id]/welcome/client.tsx` - Deleted
- `src/app/start/page.test.tsx` - Updated tests for new redirect behavior

### Learnings for future iterations
1. **Manager detection is consistent** - All files use the same pattern: `coworkers.find(c => c.role.toLowerCase().includes("manager"))` to find the manager
2. **Fallback to welcome page** - When no manager is found, we fallback to the existing welcome page or profile to avoid breaking the flow
3. **Backwards compatibility via redirect** - Instead of deleting the welcome page entirely, it was converted to a redirect-only page to handle any existing links
4. **Tests need to include coworkers** - The start page tests needed `scenario.coworkers` in the mock data after the query was updated

### Gotchas discovered
- The congratulations client needed `managerId` passed as a prop since it's a client component and can't do server-side queries
- The start page's `getRedirectUrlForStatus` function needed a third parameter for managerId to handle WORKING status redirects properly

## Issue #151: Fix Gemini mock path in API token route tests

### What was implemented
- Updated mock paths in 4 test files to use `@/lib/ai/gemini` instead of `@/lib/ai`
- This ensures the mocks match the exact import paths used in the route implementations

### Root cause
The route implementations import directly from `@/lib/ai/gemini`:
```typescript
import { generateEphemeralToken } from "@/lib/ai/gemini";
import { gemini } from "@/lib/ai/gemini";
```

But the test files were mocking `@/lib/ai`:
```typescript
vi.mock("@/lib/ai", () => ({ ... }));
```

Vitest mocks must match the exact import path. When the mock path doesn't match, the real module is imported instead, causing "API key not valid" errors when tests try to call the real Gemini API.

### Files changed
- `src/app/api/interview/token/route.test.ts` - Mock path updated to `@/lib/ai/gemini`
- `src/app/api/kickoff/token/route.test.ts` - Mock path updated to `@/lib/ai/gemini`
- `src/app/api/interview/assessment/route.test.ts` - Mock path updated to `@/lib/ai/gemini`
- `src/app/api/admin/scenarios/builder/route.test.ts` - Mock path updated to `@/lib/ai/gemini`

### Learnings for future iterations
1. **Mock paths must match import paths exactly** - Vitest mocks work by intercepting specific module paths. If the route imports from `@/lib/ai/gemini`, the test must mock `@/lib/ai/gemini`, not `@/lib/ai`.
2. **Check the actual source file imports** - When tests fail with "API key not valid" or similar errors, verify that the mock path matches the exact import used in the module under test.
3. **Barrel exports don't help with mocking** - Even if `@/lib/ai/index.ts` re-exports from `@/lib/ai/gemini`, mocking `@/lib/ai` won't intercept imports that go directly to `@/lib/ai/gemini`.

### Gotchas discovered
- The `interview/token/route.test.ts` also had an unused mock export `HR_PERSONA_SYSTEM_PROMPT` that was removed since it's not needed.

## Issue #152: Fix candidate-search test mock type casting (6 failing tests)

### What was implemented
- Fixed mock path from `@/lib/embeddings` to `@/lib/candidate/embeddings`
- Fixed mock type casting from `ReturnType<typeof vi.fn>` to `Mock` from Vitest

### Root cause
Two issues were causing the 6 test failures:

1. **Wrong mock path**: The test was mocking `@/lib/embeddings` which doesn't exist. The actual module path is `@/lib/candidate/embeddings`. The test imports from `@/lib/candidate` (barrel export) which re-exports from `./embeddings`, so the mock needs to target the actual module file.

2. **Wrong type casting**: Using `ReturnType<typeof vi.fn>` doesn't preserve mock methods like `mockResolvedValue`. The correct type is `Mock` from Vitest.

### Files changed
- `src/lib/candidate/candidate-search.test.ts` - Fixed mock path and type casting

### Code changes
```typescript
// Before (broken):
vi.mock("@/lib/embeddings", () => ({...}));
const mockGenerateQueryEmbedding = generateQueryEmbedding as ReturnType<typeof vi.fn>;

// After (fixed):
vi.mock("@/lib/candidate/embeddings", () => ({...}));
const mockGenerateQueryEmbedding = generateQueryEmbedding as Mock;
```

### Learnings for future iterations
1. **Mock the actual module file, not a non-existent path** - Even though the test imports from `@/lib/candidate` (barrel), the mock must target the actual module `@/lib/candidate/embeddings` where the functions are defined.
2. **Use `Mock` type from Vitest for mock casting** - `ReturnType<typeof vi.fn>` loses the mock methods. Import `Mock` from vitest and cast to it directly.
3. **This is the same lesson as Issue #151** - Mock paths must match the actual import paths used by the module under test.

### Gotchas discovered
- The error message `mockResolvedValue is not a function` indicated a type casting issue, but the actual root cause was the mock not being applied at all (due to wrong path). Once the mock was applied, the `Mock` type cast then became necessary.

## Issue #153: Fix data-deletion test storage mock path (2 failing tests)

### What was implemented
- Fixed mock path from `./supabase` to `@/lib/external` in `data-deletion.test.ts`
- Added `STORAGE_BUCKETS` to the mock (required by the implementation)

### Root cause
The test was mocking `./supabase` (a relative path that doesn't match any import):
```typescript
vi.mock("./supabase", () => ({...}));
```

But the implementation imports from `@/lib/external`:
```typescript
import { supabaseAdmin, STORAGE_BUCKETS } from "@/lib/external";
```

Vitest mocks must match the exact import path. Since the mock wasn't applied, `mockStorageRemove` was never called, causing:
- "deletes storage files from all buckets" - expected 3 calls, got 0
- "continues deletion even if storage fails" - expected errors array to have length > 0

### Files changed
- `src/lib/core/data-deletion.test.ts` - Fixed mock path and added STORAGE_BUCKETS

### Code changes
```typescript
// Before (broken):
vi.mock("./supabase", () => ({
  supabaseAdmin: {...}
}));

// After (fixed):
vi.mock("@/lib/external", () => ({
  supabaseAdmin: {...},
  STORAGE_BUCKETS: {
    RESUMES: "resumes",
    RECORDINGS: "recordings",
    SCREENSHOTS: "screenshots",
  },
}));
```

### Learnings for future iterations
1. **This is the same lesson as Issues #151 and #152** - Mock paths must match the exact import paths used by the module under test
2. **Include all imports from the mocked module** - The implementation imports both `supabaseAdmin` and `STORAGE_BUCKETS` from `@/lib/external`, so both must be included in the mock
3. **Barrel exports matter** - Even though `supabaseAdmin` originates from `./supabase`, the implementation imports it via `@/lib/external` barrel, so that's what must be mocked

### Gotchas discovered
- The original mock path `./supabase` was likely a copy-paste error from another test file or an assumption about relative imports - always verify the actual import in the source file

## Issue #154: Fix user/delete route test mock path (2 failing tests)

### What was implemented
- Fixed mock path from `@/lib/core` to `@/lib/core/data-deletion` in `route.test.ts`

### Root cause
The test was mocking `@/lib/core`:
```typescript
vi.mock("@/lib/core", () => ({
  processImmediateDeletion: (userId: string) => mockProcessImmediateDeletion(userId),
}));
```

But the implementation imports from `@/lib/core/data-deletion`:
```typescript
import { processImmediateDeletion } from "@/lib/core/data-deletion";
```

Vitest mocks must match the exact import path. Since the mock wasn't applied, `mockProcessImmediateDeletion` was never called, causing:
- "executes deletion and returns success" - returned 500 instead of 200 (real function threw error)
- "returns 500 if deletion fails" - mock wasn't applied to test the failure case

### Files changed
- `src/app/api/user/delete/route.test.ts` - Fixed mock path

### Code changes
```typescript
// Before (broken):
vi.mock("@/lib/core", () => ({...}));

// After (fixed):
vi.mock("@/lib/core/data-deletion", () => ({...}));
```

### Learnings for future iterations
1. **This is the same lesson as Issues #151, #152, and #153** - Mock paths must match the exact import paths used by the module under test
2. **A pattern is emerging** - Four consecutive issues (151-154) all had the same root cause: mock path not matching import path. This is a common mistake when tests are written before implementations stabilize or when copy-pasting from other test files.
3. **Barrel export shorthand doesn't work for mocks** - Even if `@/lib/core/index.ts` re-exports from `./data-deletion`, mocking `@/lib/core` won't intercept imports that go directly to `@/lib/core/data-deletion`

### Gotchas discovered
- The test was likely written when the import path was different, or copy-pasted from a test that used the barrel export - always verify the actual import in the source file before writing mocks
