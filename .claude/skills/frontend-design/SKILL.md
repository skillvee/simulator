---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

---

## PROJECT DESIGN SYSTEM (MANDATORY)

**This project uses a modern blue theme with shadcn/ui components. ALL frontend code MUST follow these rules.**

### Component Library

Use shadcn/ui components from `@/components/ui/`. Import like:

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
```

### Core Principles

| Rule           | Value                                | Rationale                                       |
| -------------- | ------------------------------------ | ----------------------------------------------- |
| Border radius  | `0.5rem` (default), `rounded-lg`     | Soft, modern corners. Never sharp 0px.          |
| Shadows        | Subtle elevation (`shadow-sm/md/lg`) | Depth through soft shadows, not hard borders.   |
| Primary color  | Blue `#237CF1` (HSL: 217 91% 54%)    | Professional, accessible, modern.               |
| Borders        | Soft 1px borders (`border-border`)   | Define containers subtly, not harshly.          |

### Typography

- **UI text**: `DM Sans` - clean, humanist sans-serif
- **Code/system/timestamps**: `Space Mono` - technical, monospace
- Never use: Inter, Roboto, Arial, system fonts, or other generic choices

### Color Palette

The design uses HSL CSS variables. Reference them via Tailwind classes.

```
Light mode:
- Background: hsl(0 0% 100%) - white
- Foreground: hsl(222.2 84% 4.9%) - near-black
- Primary: hsl(217 91% 54%) - #237CF1 blue
- Secondary: hsl(210 40% 96.1%) - light slate
- Accent: hsl(199 89% 94%) - sky-100
- Muted: hsl(210 40% 96.1%) - slate tones
- Border: hsl(214.3 31.8% 91.4%) - light border

Dark mode:
- Background: hsl(222.2 84% 4.9%) - near-black
- Foreground: hsl(210 40% 98%) - near-white
- Primary: hsl(217 91% 54%) - #237CF1 blue
- Secondary/Muted/Accent: hsl(217.2 32.6% 17.5%) - blue-slate
- Border: hsl(217.2 32.6% 17.5%) - dark border
```

### Visual Language

The design emphasizes:

- **Clean hierarchy**: Use spacing, typography weight, and subtle color to create structure
- **Soft elevation**: Cards and modals float with shadows, not harsh borders
- **Blue accents**: Primary actions and interactive elements use the blue palette
- **Rounded shapes**: All corners use border radius for a modern, approachable feel

### Interactions & Motion

Use smooth, professional animations:

- `animate-fade-in` - Gentle opacity entrance (200ms ease-out)
- `animate-slide-up` - Content sliding up from below (300ms ease-out)
- `animate-slide-down` - Content sliding down (300ms ease-out)
- `animate-scale-in` - Subtle scale entrance (200ms ease-out)
- `animate-accordion-down/up` - For collapsible content

Transitions should use `transition-colors`, `transition-all`, or specific properties with smooth easing.

### Border Radius Standards

| Element       | Class          | Value          |
| ------------- | -------------- | -------------- |
| Buttons       | `rounded-lg`   | var(--radius)  |
| Cards         | `rounded-xl`   | calc(var(--radius) + 4px) |
| Inputs        | `rounded-md`   | calc(var(--radius) - 2px) |
| Badges/chips  | `rounded-full` | 9999px         |
| Default       | `rounded-lg`   | 0.5rem         |

### Shadow Standards

| Purpose           | Class       | Use Case                          |
| ----------------- | ----------- | --------------------------------- |
| Cards             | `shadow-sm` | Default card elevation            |
| Elevated elements | `shadow-md` | Dropdowns, popovers, hover states |
| Modals/dialogs    | `shadow-lg` | Overlays, important focus areas   |
| Buttons (hover)   | `shadow-sm` | Subtle lift on interaction        |

### MANDATORY DO's

- ✅ Use shadcn/ui Button, Card, Input, and other components
- ✅ Use blue (#237CF1) as the primary accent color
- ✅ Use rounded corners (`rounded-lg` minimum for containers)
- ✅ Use subtle shadows for elevation (`shadow-sm`, `shadow-md`)
- ✅ Use smooth transitions (`transition-colors`, `transition-all`)
- ✅ Use CSS variables from globals.css via Tailwind classes
- ✅ Use DM Sans for body, Space Mono for code
- ✅ Use animation utilities for entrances (`animate-fade-in`, etc.)

### MANDATORY DON'Ts

- ❌ No 0px border radius (sharp corners are deprecated)
- ❌ No 2px black borders as the primary styling method
- ❌ No gold (#f7da50) color - this is deprecated
- ❌ No `transition-none` - always allow smooth transitions
- ❌ No custom buttons when shadcn Button component works
- ❌ No generic fonts (Inter, Roboto, Arial)
- ❌ No colors outside the CSS variable palette

### Example: Common Tailwind Patterns

```tsx
// Card with proper styling
<Card className="rounded-xl shadow-sm border-border">
  <CardHeader>
    <CardTitle className="text-lg font-semibold">Title</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>

// Primary button
<Button className="rounded-lg shadow-sm hover:shadow-md transition-shadow">
  Click me
</Button>

// Input field
<Input className="rounded-md border-border focus:ring-primary" />

// Animated entrance
<div className="animate-fade-in">
  Content that fades in
</div>

// Card with hover elevation
<Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
  Hoverable card
</Card>
```

---

## General Design Thinking

Beyond the mandatory project rules above, consider:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What detail will make this memorable within the design system?

Implement working code (HTML/CSS/JS, React, Vue, etc.) that is:

- Production-grade and functional
- Visually polished with attention to detail
- Cohesive with the established design system
- Meticulously refined in every detail

## Frontend Implementation Guidelines

Focus on:

- **Typography**: Use DM Sans and Space Mono as specified. Create hierarchy through weight, size, and spacing—not font variety.
- **Color & Theme**: Use CSS variables via Tailwind. The blue palette with slate accents is the standard.
- **Motion**: Use the provided animation utilities. Smooth, professional transitions enhance user experience. Avoid jarring instant changes.
- **Spatial Composition**: Use clean layouts with appropriate negative space. Let content breathe.
- **Elevation**: Use shadows to create depth and visual hierarchy. Cards float, modals rise above content.

**IMPORTANT**: This is a modern, professional aesthetic. Elegance comes from clean lines, subtle shadows, and smooth interactions. Quality is in the details—consistent spacing, proper elevation, and cohesive color usage.

Remember: The design system provides the foundation. Build upon it with care for accessibility, usability, and visual polish.
