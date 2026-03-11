# Skillvee Promo Video Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a 90-second animated promo video for Skillvee using Remotion, showcasing the CV upload → HR interview → Slack collaboration → PR submission → Results flow.

**Architecture:** Separate Remotion project in `/remotion` folder. Each scene is its own component, sequenced together using `<Series>`. Reusable UI components (buttons, avatars, chat bubbles) shared across scenes. Neo-brutalist design system (0px radius, 2px black borders, gold accents).

**Tech Stack:** Remotion 4.x, React, TypeScript, @remotion/google-fonts (DM Sans, Space Mono), @remotion/transitions, @remotion/media

---

## Task 1: Initialize Remotion Project

**Files:**

- Create: `remotion/` directory with full Remotion setup

**Step 1: Create Remotion project**

```bash
cd /Users/matiashoyl/Proyectos/simulator && npx create-video@latest remotion --template blank
```

When prompted:

- Package manager: npm
- TypeScript: Yes

**Step 2: Verify project structure**

```bash
ls -la remotion/src/
```

Expected: `Root.tsx`, `index.ts` files exist

**Step 3: Test Remotion studio runs**

```bash
cd remotion && npm start
```

Expected: Browser opens with Remotion Studio

**Step 4: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion && git commit -m "chore: initialize Remotion project for promo video"
```

---

## Task 2: Install Dependencies and Configure

**Files:**

- Modify: `remotion/package.json`
- Modify: `remotion/remotion.config.ts`

**Step 1: Install required Remotion packages**

```bash
cd remotion && npm install @remotion/google-fonts @remotion/transitions @remotion/media
```

**Step 2: Update remotion.config.ts for 1080p 30fps**

```typescript
// remotion/remotion.config.ts
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
```

**Step 3: Verify packages installed**

```bash
cd remotion && npm list @remotion/google-fonts @remotion/transitions @remotion/media
```

Expected: All three packages listed

**Step 4: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion && git commit -m "chore: add Remotion dependencies (google-fonts, transitions, media)"
```

---

## Task 3: Set Up Design System Constants

**Files:**

- Create: `remotion/src/lib/design-system.ts`
- Create: `remotion/src/lib/fonts.ts`

**Step 1: Create design system constants**

```typescript
// remotion/src/lib/design-system.ts
export const colors = {
  background: "#FFFFFF",
  text: "#000000",
  accent: "#f7da50",
  border: "#000000",
  success: "#22c55e",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borders = {
  width: 2,
  radius: 0,
} as const;

// Animation configs for consistent feel
export const animations = {
  snappy: { damping: 20, stiffness: 200 },
  bouncy: { damping: 8 },
  smooth: { damping: 200 },
} as const;

// Timing (in seconds, convert to frames with fps)
export const timing = {
  textPunchDuration: 2,
  fadeInDuration: 0.5,
  typewriterCharFrames: 2,
} as const;
```

**Step 2: Create fonts loader**

```typescript
// remotion/src/lib/fonts.ts
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadSpaceMono } from "@remotion/google-fonts/SpaceMono";

const dmSans = loadDMSans("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

const spaceMono = loadSpaceMono("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

export const fonts = {
  heading: dmSans.fontFamily,
  mono: spaceMono.fontFamily,
} as const;
```

**Step 3: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion/src/lib && git commit -m "feat: add design system constants and font loaders"
```

---

## Task 4: Create TextPunch Component

**Files:**

- Create: `remotion/src/components/TextPunch.tsx`

**Step 1: Create the TextPunch component**

This is the bold text callout that punches in synced to beats.

```tsx
// remotion/src/components/TextPunch.tsx
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, animations } from "../lib/design-system";
import { fonts } from "../lib/fonts";

type TextPunchProps = {
  text: string;
  fontSize?: number;
  color?: string;
};

export const TextPunch: React.FC<TextPunchProps> = ({
  text,
  fontSize = 80,
  color = colors.text,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scale up from 0 with overshoot
  const scale = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  // Slight rotation for punch effect
  const rotation = interpolate(
    spring({ frame, fps, config: animations.snappy }),
    [0, 1],
    [-3, 0]
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
      }}
    >
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize,
          fontWeight: 700,
          color,
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          textAlign: "center",
          padding: 40,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
```

**Step 2: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion/src/components && git commit -m "feat: add TextPunch component for beat-synced callouts"
```

---

## Task 5: Create Typewriter Component

**Files:**

- Create: `remotion/src/components/Typewriter.tsx`

**Step 1: Create the Typewriter component**

```tsx
// remotion/src/components/Typewriter.tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../lib/design-system";
import { fonts } from "../lib/fonts";

type TypewriterProps = {
  text: string;
  fontSize?: number;
  charFrames?: number;
  showCursor?: boolean;
  fontFamily?: string;
};

export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  fontSize = 16,
  charFrames = 2,
  showCursor = true,
  fontFamily = fonts.mono,
}) => {
  const frame = useCurrentFrame();

  const typedChars = Math.min(text.length, Math.floor(frame / charFrames));
  const typedText = text.slice(0, typedChars);

  // Blinking cursor
  const cursorOpacity = showCursor
    ? interpolate(frame % 16, [0, 8, 16], [1, 0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <span
      style={{
        fontFamily,
        fontSize,
        color: colors.text,
      }}
    >
      {typedText}
      {showCursor && <span style={{ opacity: cursorOpacity }}>▌</span>}
    </span>
  );
};
```

**Step 2: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion/src/components && git commit -m "feat: add Typewriter component for typing effects"
```

---

## Task 6: Create Avatar Component

**Files:**

- Create: `remotion/src/components/Avatar.tsx`

**Step 1: Create the Avatar component**

```tsx
// remotion/src/components/Avatar.tsx
import { colors, borders } from "../lib/design-system";
import { fonts } from "../lib/fonts";

type AvatarProps = {
  initials: string;
  name: string;
  role?: string;
  size?: number;
  showStatus?: boolean;
  backgroundColor?: string;
};

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  name,
  role,
  size = 40,
  showStatus = true,
  backgroundColor = colors.accent,
}) => {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ position: "relative" }}>
        <div
          style={{
            width: size,
            height: size,
            backgroundColor,
            border: `${borders.width}px solid ${colors.border}`,
            borderRadius: borders.radius,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontFamily: fonts.mono,
            fontSize: size * 0.35,
            fontWeight: 700,
            color: colors.text,
          }}
        >
          {initials}
        </div>
        {showStatus && (
          <div
            style={{
              position: "absolute",
              bottom: -2,
              left: -2,
              width: 10,
              height: 10,
              backgroundColor: colors.success,
              border: `${borders.width}px solid ${colors.border}`,
              borderRadius: borders.radius,
            }}
          />
        )}
      </div>
      {(name || role) && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {name && (
            <span
              style={{
                fontFamily: fonts.heading,
                fontSize: 14,
                fontWeight: 700,
                color: colors.text,
              }}
            >
              {name}
            </span>
          )}
          {role && (
            <span
              style={{
                fontFamily: fonts.heading,
                fontSize: 12,
                color: "#666",
              }}
            >
              {role}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
```

**Step 2: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion/src/components && git commit -m "feat: add Avatar component with status indicator"
```

---

## Task 7: Create ChatBubble Component

**Files:**

- Create: `remotion/src/components/ChatBubble.tsx`

**Step 1: Create the ChatBubble component**

```tsx
// remotion/src/components/ChatBubble.tsx
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, borders, animations } from "../lib/design-system";
import { fonts } from "../lib/fonts";

type ChatBubbleProps = {
  message: string;
  isUser?: boolean;
  delay?: number;
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isUser = false,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slide in from right with spring
  const entrance = spring({
    frame: frame - delay,
    fps,
    config: animations.snappy,
  });

  const translateX = (1 - entrance) * (isUser ? 100 : -100);
  const opacity = entrance;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
        opacity,
        transform: `translateX(${translateX}px)`,
      }}
    >
      <div
        style={{
          maxWidth: "70%",
          padding: "12px 16px",
          backgroundColor: isUser ? colors.accent : colors.background,
          border: `${borders.width}px solid ${colors.border}`,
          borderRadius: borders.radius,
          fontFamily: fonts.heading,
          fontSize: 14,
          color: colors.text,
        }}
      >
        {message}
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion/src/components && git commit -m "feat: add ChatBubble component with slide-in animation"
```

---

## Task 8: Create Button Component

**Files:**

- Create: `remotion/src/components/Button.tsx`

**Step 1: Create the Button component**

```tsx
// remotion/src/components/Button.tsx
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, borders, animations } from "../lib/design-system";
import { fonts } from "../lib/fonts";

type ButtonProps = {
  label: string;
  variant?: "primary" | "secondary";
  delay?: number;
  pressed?: boolean;
};

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = "primary",
  delay = 0,
  pressed = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: animations.snappy,
  });

  const scale = entrance * (pressed ? 0.95 : 1);

  const isPrimary = variant === "primary";

  return (
    <div
      style={{
        display: "inline-block",
        padding: "12px 24px",
        backgroundColor: isPrimary ? colors.text : colors.background,
        border: `${borders.width}px solid ${colors.border}`,
        borderRadius: borders.radius,
        fontFamily: fonts.heading,
        fontSize: 16,
        fontWeight: 700,
        color: isPrimary ? colors.background : colors.text,
        transform: `scale(${scale})`,
        cursor: "pointer",
      }}
    >
      {label}
    </div>
  );
};
```

**Step 2: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion/src/components && git commit -m "feat: add Button component with variants"
```

---

## Task 9: Create Waveform Component

**Files:**

- Create: `remotion/src/components/Waveform.tsx`

**Step 1: Create the Waveform component for voice visualization**

```tsx
// remotion/src/components/Waveform.tsx
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { colors, borders } from "../lib/design-system";

type WaveformProps = {
  bars?: number;
  width?: number;
  height?: number;
  active?: boolean;
};

export const Waveform: React.FC<WaveformProps> = ({
  bars = 5,
  width = 60,
  height = 40,
  active = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const barWidth = (width - (bars - 1) * 4) / bars;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        height,
      }}
    >
      {Array.from({ length: bars }).map((_, i) => {
        // Each bar animates at different phase
        const phase = (frame + i * 8) % 30;
        const barHeight = active
          ? interpolate(phase, [0, 15, 30], [0.3, 1, 0.3]) * height
          : height * 0.2;

        return (
          <div
            key={i}
            style={{
              width: barWidth,
              height: barHeight,
              backgroundColor: colors.accent,
              border: `${borders.width}px solid ${colors.border}`,
              borderRadius: borders.radius,
              transition: "height 0.1s",
            }}
          />
        );
      })}
    </div>
  );
};
```

**Step 2: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion/src/components && git commit -m "feat: add Waveform component for voice visualization"
```

---

## Task 10: Create ProgressBar Component

**Files:**

- Create: `remotion/src/components/ProgressBar.tsx`

**Step 1: Create the ProgressBar component for score animations**

```tsx
// remotion/src/components/ProgressBar.tsx
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, borders, animations } from "../lib/design-system";
import { fonts } from "../lib/fonts";

type ProgressBarProps = {
  label: string;
  value: number; // 0-100
  delay?: number;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  value,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: animations.smooth,
  });

  const currentValue = Math.round(progress * value);
  const barWidth = progress * value;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          fontFamily: fonts.heading,
          fontSize: 14,
          color: colors.text,
        }}
      >
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{currentValue}</span>
      </div>
      <div
        style={{
          width: "100%",
          height: 24,
          backgroundColor: colors.background,
          border: `${borders.width}px solid ${colors.border}`,
          borderRadius: borders.radius,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: "100%",
            backgroundColor: colors.accent,
          }}
        />
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion/src/components && git commit -m "feat: add ProgressBar component for score animations"
```

---

## Task 11: Create Scene1Opening Component

**Files:**

- Create: `remotion/src/scenes/Scene1Opening.tsx`

**Step 1: Create the opening scene with LeetCode problem → glitch → "There's a better way"**

```tsx
// remotion/src/scenes/Scene1Opening.tsx
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { colors, animations } from "../lib/design-system";
import { fonts } from "../lib/fonts";

export const Scene1Opening: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene timing (8 seconds total = 240 frames at 30fps)
  const leetcodeEnd = 3 * fps; // 0-3s: LeetCode problem
  const glitchEnd = 4 * fps; // 3-4s: Glitch
  const message1End = 6 * fps; // 4-6s: "This isn't how real work looks"
  // 6-8s: "There's a better way" + gold wipe

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* LeetCode problem (0-3s) */}
      <Sequence from={0} durationInFrames={leetcodeEnd} premountFor={fps}>
        <LeetCodeProblem />
      </Sequence>

      {/* Glitch effect (3-4s) */}
      <Sequence from={leetcodeEnd} durationInFrames={fps} premountFor={fps}>
        <GlitchEffect />
      </Sequence>

      {/* "This isn't how real work looks" (4-6s) */}
      <Sequence from={glitchEnd} durationInFrames={2 * fps} premountFor={fps}>
        <MessageOne />
      </Sequence>

      {/* "There's a better way" + gold wipe (6-8s) */}
      <Sequence from={message1End} durationInFrames={2 * fps} premountFor={fps}>
        <MessageTwo />
      </Sequence>
    </AbsoluteFill>
  );
};

const LeetCodeProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1e1e1e",
        padding: 60,
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: fonts.mono,
          color: "#d4d4d4",
          fontSize: 14,
        }}
      >
        <div style={{ color: "#569cd6", marginBottom: 20 }}>
          // Problem #2847: Reverse Linked List
        </div>
        <div style={{ marginBottom: 10, color: "#6a9955" }}>/**</div>
        <div style={{ color: "#6a9955", marginLeft: 4 }}>
          * Given the head of a singly linked list,
        </div>
        <div style={{ color: "#6a9955", marginLeft: 4 }}>
          * reverse the list, and return the reversed list.
        </div>
        <div style={{ color: "#6a9955", marginLeft: 4 }}>
          * Time complexity must be O(n).
        </div>
        <div style={{ color: "#6a9955", marginBottom: 20 }}>*/</div>
        <div>
          <span style={{ color: "#c586c0" }}>function</span>{" "}
          <span style={{ color: "#dcdcaa" }}>reverseList</span>
          <span style={{ color: "#ffd700" }}>(</span>
          <span style={{ color: "#9cdcfe" }}>head</span>
          <span style={{ color: "#ffd700" }}>)</span>{" "}
          <span style={{ color: "#ffd700" }}>{"{"}</span>
        </div>
        <div style={{ marginLeft: 20, color: "#6a9955" }}>
          // Your code here...
        </div>
        <div>
          <span style={{ color: "#ffd700" }}>{"}"}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const GlitchEffect: React.FC = () => {
  const frame = useCurrentFrame();

  // Random glitch bars
  const glitchIntensity = interpolate(frame, [0, 15, 30], [0, 1, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#1e1e1e" }}>
      {/* Glitch bars */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${(i * 10 + frame * 3) % 100}%`,
            height: 20 + (frame % 10),
            backgroundColor:
              i % 2 === 0 ? colors.accent : "rgba(255,255,255,0.3)",
            opacity: glitchIntensity * 0.8,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const MessageOne: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.text,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: 64,
          fontWeight: 700,
          color: colors.background,
          transform: `scale(${scale})`,
          textAlign: "center",
          padding: 40,
        }}
      >
        This isn't how
        <br />
        real work looks.
      </div>
    </AbsoluteFill>
  );
};

const MessageTwo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  // Gold wipe from left
  const wipeProgress = interpolate(frame, [fps, 2 * fps], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.text }}>
      {/* Text */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 72,
            fontWeight: 700,
            color: colors.accent,
            transform: `scale(${scale})`,
          }}
        >
          There's a better way.
        </div>
      </AbsoluteFill>

      {/* Gold wipe overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${wipeProgress}%`,
          height: "100%",
          backgroundColor: colors.accent,
        }}
      />
    </AbsoluteFill>
  );
};
```

**Step 2: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion/src/scenes && git commit -m "feat: add Scene1Opening with LeetCode problem and glitch transition"
```

---

## Task 12: Create Scene2CVUpload Component

**Files:**

- Create: `remotion/src/scenes/Scene2CVUpload.tsx`

**Step 1: Create the CV upload scene**

```tsx
// remotion/src/scenes/Scene2CVUpload.tsx
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { colors, borders, animations } from "../lib/design-system";
import { fonts } from "../lib/fonts";
import { TextPunch } from "../components/TextPunch";

export const Scene2CVUpload: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (12 seconds = 360 frames at 30fps)
  const textPunchEnd = 2 * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* "YOUR EXPERIENCE MATTERS" (0-2s) */}
      <Sequence from={0} durationInFrames={textPunchEnd} premountFor={fps}>
        <TextPunch text="YOUR EXPERIENCE MATTERS." fontSize={72} />
      </Sequence>

      {/* Upload UI (2-12s) */}
      <Sequence
        from={textPunchEnd}
        durationInFrames={10 * fps}
        premountFor={fps}
      >
        <UploadInterface />
      </Sequence>
    </AbsoluteFill>
  );
};

const UploadInterface: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // UI fade in
  const uiOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  // PDF drop animation (starts at 3s into this sequence = frame 90)
  const dropStart = 3 * fps;
  const dropProgress = spring({
    frame: frame - dropStart,
    fps,
    config: animations.bouncy,
  });

  // Profile card build (starts at 6s = frame 180)
  const profileStart = 6 * fps;
  const profileProgress = spring({
    frame: frame - profileStart,
    fps,
    config: animations.snappy,
  });

  const pdfY = interpolate(dropProgress, [0, 1], [-200, 0]);
  const pdfOpacity = frame > dropStart ? 1 : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        padding: 60,
        opacity: uiOpacity,
      }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: 14,
          fontWeight: 500,
          color: colors.text,
          marginBottom: 40,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontWeight: 700 }}>Skillvee</span>
        <span style={{ color: "#666" }}>/</span>
        <span>Secure Payments Gateway Implementation</span>
      </div>

      {/* Progress steps */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginBottom: 60,
        }}
      >
        {[
          "CV Upload",
          "HR Interview",
          "Manager Kickoff",
          "Coding Task",
          "PR Defense",
        ].map((step, i) => (
          <div
            key={step}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: fonts.heading,
              fontSize: 12,
              color: i === 0 ? colors.text : "#999",
              fontWeight: i === 0 ? 700 : 400,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                border: `${borders.width}px solid ${i === 0 ? colors.text : "#ccc"}`,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontFamily: fonts.mono,
                fontSize: 10,
                backgroundColor: i === 0 ? colors.accent : "transparent",
              }}
            >
              {i + 1}
            </div>
            {step}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ display: "flex", gap: 60 }}>
        {/* Upload zone */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 32,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            Upload Your CV
          </div>
          <div
            style={{
              border: `2px dashed ${colors.border}`,
              padding: 60,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 200,
              position: "relative",
              backgroundColor:
                frame > dropStart ? "rgba(247, 218, 80, 0.1)" : "transparent",
            }}
          >
            {/* PDF icon dropping */}
            {frame > dropStart && (
              <div
                style={{
                  transform: `translateY(${pdfY}px)`,
                  opacity: pdfOpacity,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 80,
                    backgroundColor: "#ff4444",
                    border: `${borders.width}px solid ${colors.border}`,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  PDF
                </div>
                <div
                  style={{
                    marginTop: 12,
                    fontFamily: fonts.mono,
                    fontSize: 12,
                  }}
                >
                  resume.pdf
                </div>
              </div>
            )}
            {frame <= dropStart && (
              <>
                <div style={{ fontSize: 32, marginBottom: 12 }}>+</div>
                <div style={{ fontFamily: fonts.heading, fontSize: 14 }}>
                  Upload your CV
                </div>
              </>
            )}
          </div>
        </div>

        {/* Profile card */}
        {frame > profileStart && (
          <div
            style={{
              flex: 1,
              border: `${borders.width}px solid ${colors.border}`,
              padding: 24,
              transform: `scale(${profileProgress})`,
              transformOrigin: "top left",
            }}
          >
            <div
              style={{
                fontFamily: fonts.heading,
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              Alex Johnson
            </div>
            <div
              style={{
                fontFamily: fonts.heading,
                fontSize: 14,
                color: "#666",
                marginBottom: 24,
              }}
            >
              Senior Software Engineer
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["React", "TypeScript", "Node.js", "PostgreSQL", "AWS"].map(
                (skill, i) => {
                  const tagDelay = profileStart + i * 5;
                  const tagProgress = spring({
                    frame: frame - tagDelay,
                    fps: 30,
                    config: animations.snappy,
                  });
                  return (
                    <div
                      key={skill}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: colors.accent,
                        border: `${borders.width}px solid ${colors.border}`,
                        fontFamily: fonts.mono,
                        fontSize: 12,
                        transform: `scale(${tagProgress})`,
                      }}
                    >
                      {skill}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
```

**Step 2: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion/src/scenes && git commit -m "feat: add Scene2CVUpload with PDF drop and profile parsing animation"
```

---

## Task 13: Create Scene3HRInterview Component

**Files:**

- Create: `remotion/src/scenes/Scene3HRInterview.tsx`

**Step 1: Create the HR interview scene**

```tsx
// remotion/src/scenes/Scene3HRInterview.tsx
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { colors, borders, animations } from "../lib/design-system";
import { fonts } from "../lib/fonts";
import { TextPunch } from "../components/TextPunch";
import { Avatar } from "../components/Avatar";
import { Waveform } from "../components/Waveform";
import { ChatBubble } from "../components/ChatBubble";

export const Scene3HRInterview: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (18 seconds = 540 frames at 30fps)
  const textPunchEnd = 2 * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* "REAL CONVERSATIONS" (0-2s) */}
      <Sequence from={0} durationInFrames={textPunchEnd} premountFor={fps}>
        <TextPunch text="REAL CONVERSATIONS." fontSize={72} />
      </Sequence>

      {/* Interview UI (2-18s) */}
      <Sequence
        from={textPunchEnd}
        durationInFrames={16 * fps}
        premountFor={fps}
      >
        <InterviewInterface />
      </Sequence>
    </AbsoluteFill>
  );
};

const InterviewInterface: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // UI entrance
  const uiProgress = spring({
    frame,
    fps,
    config: animations.smooth,
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        padding: 60,
        opacity: uiProgress,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar
            initials="HR"
            name="Sarah Mitchell"
            role="HR Recruiter"
            size={50}
            backgroundColor={colors.accent}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: fonts.mono,
            fontSize: 12,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              backgroundColor: "#22c55e",
              borderRadius: 0,
            }}
          />
          In Call
        </div>
      </div>

      {/* Main interview area */}
      <div
        style={{
          display: "flex",
          gap: 40,
          height: "70%",
        }}
      >
        {/* Avatar with waveform */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: `${borders.width}px solid ${colors.border}`,
            padding: 40,
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              backgroundColor: colors.accent,
              border: `${borders.width}px solid ${colors.border}`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontFamily: fonts.mono,
              fontSize: 36,
              fontWeight: 700,
              marginBottom: 24,
            }}
          >
            HR
          </div>
          <Waveform bars={7} width={100} height={50} active={true} />
          <div
            style={{
              marginTop: 16,
              fontFamily: fonts.heading,
              fontSize: 14,
              color: "#666",
            }}
          >
            Sarah is speaking...
          </div>
        </div>

        {/* Chat transcript */}
        <div
          style={{
            flex: 1,
            border: `${borders.width}px solid ${colors.border}`,
            padding: 24,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 16,
              color: "#666",
            }}
          >
            TRANSCRIPT
          </div>
          <ChatBubble
            message="Tell me about your experience with distributed systems."
            isUser={false}
            delay={fps}
          />
          <ChatBubble
            message="I've worked extensively with microservices architectures at my previous company..."
            isUser={true}
            delay={4 * fps}
          />
          <ChatBubble
            message="Interesting! Can you describe a challenging debugging scenario?"
            isUser={false}
            delay={8 * fps}
          />
        </div>
      </div>

      {/* Checkmark at the end */}
      <Sequence from={14 * fps} durationInFrames={2 * fps} premountFor={fps}>
        <CheckmarkOverlay />
      </Sequence>
    </AbsoluteFill>
  );
};

const CheckmarkOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: animations.bouncy,
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.9)",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          backgroundColor: colors.success,
          border: `${borders.width}px solid ${colors.border}`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          transform: `scale(${scale})`,
        }}
      >
        <span style={{ fontSize: 40, color: "white" }}>✓</span>
      </div>
    </AbsoluteFill>
  );
};
```

**Step 2: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion/src/scenes && git commit -m "feat: add Scene3HRInterview with waveform and chat bubbles"
```

---

## Task 14: Create Scene4SlackCollab Component

**Files:**

- Create: `remotion/src/scenes/Scene4SlackCollab.tsx`

**Step 1: Create the Slack collaboration scene (longest scene at 22s)**

```tsx
// remotion/src/scenes/Scene4SlackCollab.tsx
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { colors, borders, animations } from "../lib/design-system";
import { fonts } from "../lib/fonts";
import { TextPunch } from "../components/TextPunch";
import { Avatar } from "../components/Avatar";
import { Waveform } from "../components/Waveform";
import { ChatBubble } from "../components/ChatBubble";

const TEAM_MEMBERS = [
  { initials: "AC", name: "Alex Chen", role: "Engineering Manager" },
  { initials: "MG", name: "Maria Garcia", role: "Product Manager" },
  { initials: "ML", name: "Marcus Lee", role: "Frontend Engineer" },
  { initials: "PS", name: "Priya Sharma", role: "DevOps Engineer" },
  { initials: "JO", name: "James O'Brien", role: "Backend Engineer" },
];

export const Scene4SlackCollab: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (22 seconds = 660 frames at 30fps)
  const textPunchEnd = 2 * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* "REAL TEAMWORK" (0-2s) */}
      <Sequence from={0} durationInFrames={textPunchEnd} premountFor={fps}>
        <TextPunch text="REAL TEAMWORK." fontSize={72} />
      </Sequence>

      {/* Slack UI (2-22s) */}
      <Sequence
        from={textPunchEnd}
        durationInFrames={20 * fps}
        premountFor={fps}
      >
        <SlackInterface />
      </Sequence>
    </AbsoluteFill>
  );
};

const SlackInterface: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Sidebar slide in
  const sidebarProgress = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  const sidebarX = interpolate(sidebarProgress, [0, 1], [-250, 0]);

  // Selected team member changes over time
  const selectedIndex =
    frame < 4 * fps
      ? 0 // Alex (welcome)
      : frame < 8 * fps
        ? 1 // Maria (requirements)
        : frame < 12 * fps
          ? 2 // Marcus (code)
          : 0; // Back to Alex (call)

  const showCall = frame >= 12 * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Sidebar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 250,
          backgroundColor: colors.background,
          borderRight: `${borders.width}px solid ${colors.border}`,
          padding: 16,
          transform: `translateX(${sidebarX}px)`,
        }}
      >
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 12,
            fontWeight: 700,
            color: "#666",
            marginBottom: 16,
          }}
        >
          TEAM
        </div>
        {TEAM_MEMBERS.map((member, i) => {
          const memberDelay = i * 10;
          const memberProgress = spring({
            frame: frame - memberDelay,
            fps,
            config: animations.snappy,
          });

          const isSelected = i === selectedIndex;

          return (
            <div
              key={member.initials}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 8px",
                marginBottom: 4,
                backgroundColor: isSelected ? colors.accent : "transparent",
                border: isSelected
                  ? `${borders.width}px solid ${colors.border}`
                  : "none",
                opacity: memberProgress,
                transform: `translateX(${(1 - memberProgress) * -50}px)`,
              }}
            >
              <Avatar
                initials={member.initials}
                name=""
                size={32}
                backgroundColor={isSelected ? colors.background : colors.accent}
              />
              <div>
                <div
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 500,
                  }}
                >
                  {member.name}
                </div>
                <div
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 11,
                    color: "#666",
                  }}
                >
                  {member.role}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main chat area */}
      <div
        style={{
          position: "absolute",
          left: 250,
          top: 0,
          right: 0,
          bottom: 0,
          padding: 24,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 16,
            borderBottom: `${borders.width}px solid ${colors.border}`,
            marginBottom: 24,
          }}
        >
          <Avatar
            initials={TEAM_MEMBERS[selectedIndex].initials}
            name={TEAM_MEMBERS[selectedIndex].name}
            role={TEAM_MEMBERS[selectedIndex].role}
            size={40}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              backgroundColor: colors.accent,
              border: `${borders.width}px solid ${colors.border}`,
              fontFamily: fonts.heading,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            🎧 Call
          </div>
        </div>

        {/* Messages based on selected person */}
        <div style={{ height: "60%", overflow: "hidden" }}>
          {selectedIndex === 0 && frame < 4 * fps && (
            <>
              <ChatBubble
                message="Welcome to the team! 🎉 Your task is in the GitHub repo."
                isUser={false}
                delay={fps}
              />
              <ChatBubble
                message="Thanks! Looking forward to getting started."
                isUser={true}
                delay={2 * fps}
              />
            </>
          )}
          {selectedIndex === 1 && (
            <>
              <ChatBubble
                message="The payments integration needs to handle both Stripe and PayPal."
                isUser={false}
                delay={0}
              />
              <ChatBubble
                message="Got it. Any specific error handling requirements?"
                isUser={true}
                delay={fps}
              />
            </>
          )}
          {selectedIndex === 2 && (
            <>
              <ChatBubble
                message="Here's how we handle the payment form validation:"
                isUser={false}
                delay={0}
              />
              <div
                style={{
                  backgroundColor: "#1e1e1e",
                  padding: 16,
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  color: "#d4d4d4",
                  border: `${borders.width}px solid ${colors.border}`,
                  marginLeft: 0,
                  marginBottom: 12,
                  maxWidth: "70%",
                }}
              >
                const validateCard = (num: string) =&gt; {"{"}
                <br />
                &nbsp;&nbsp;return luhnCheck(num);
                <br />
                {"}"};
              </div>
            </>
          )}
        </div>

        {/* Call UI overlay */}
        {showCall && (
          <Sequence from={0} durationInFrames={8 * fps} premountFor={fps}>
            <CallOverlay />
          </Sequence>
        )}
      </div>
    </AbsoluteFill>
  );
};

const CallOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideUp = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  const y = interpolate(slideUp, [0, 1], [300, 0]);

  // Call ends with checkmark at frame 6*fps
  const showCheckmark = frame >= 6 * fps;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: 24,
        right: 24,
        height: 200,
        backgroundColor: colors.background,
        border: `${borders.width}px solid ${colors.border}`,
        transform: `translateY(${y}px)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
      }}
    >
      {!showCheckmark ? (
        <>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 80,
                height: 80,
                backgroundColor: colors.accent,
                border: `${borders.width}px solid ${colors.border}`,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontFamily: fonts.mono,
                fontSize: 24,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              AC
            </div>
            <div
              style={{
                fontFamily: fonts.heading,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Alex Chen
            </div>
          </div>
          <Waveform bars={7} width={100} height={60} active={true} />
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 14,
              color: "#666",
            }}
          >
            Call in progress...
          </div>
        </>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              backgroundColor: colors.success,
              border: `${borders.width}px solid ${colors.border}`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 30, color: "white" }}>✓</span>
          </div>
          <div
            style={{ fontFamily: fonts.heading, fontSize: 16, fontWeight: 700 }}
          >
            Call ended
          </div>
        </div>
      )}
    </div>
  );
};
```

**Step 2: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion/src/scenes && git commit -m "feat: add Scene4SlackCollab with team sidebar and call overlay"
```

---

## Task 15: Create Scene5SubmitPR Component

**Files:**

- Create: `remotion/src/scenes/Scene5SubmitPR.tsx`

**Step 1: Create the PR submission scene**

```tsx
// remotion/src/scenes/Scene5SubmitPR.tsx
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { colors, borders, animations } from "../lib/design-system";
import { fonts } from "../lib/fonts";
import { TextPunch } from "../components/TextPunch";
import { Avatar } from "../components/Avatar";
import { Typewriter } from "../components/Typewriter";

export const Scene5SubmitPR: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (12 seconds = 360 frames at 30fps)
  const textPunchEnd = 2 * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* "REAL CODE REVIEWS" (0-2s) */}
      <Sequence from={0} durationInFrames={textPunchEnd} premountFor={fps}>
        <TextPunch text="REAL CODE REVIEWS." fontSize={72} />
      </Sequence>

      {/* Chat with manager (2-12s) */}
      <Sequence
        from={textPunchEnd}
        durationInFrames={10 * fps}
        premountFor={fps}
      >
        <PRSubmitChat />
      </Sequence>
    </AbsoluteFill>
  );
};

const PRSubmitChat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // UI entrance
  const uiProgress = spring({
    frame,
    fps,
    config: animations.smooth,
  });

  // Message timings
  const userMessageStart = fps; // 1s in
  const managerReplyStart = 5 * fps; // 5s in
  const callButtonPulse = 8 * fps; // 8s in

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        padding: 60,
        opacity: uiProgress,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: 24,
          borderBottom: `${borders.width}px solid ${colors.border}`,
          marginBottom: 40,
        }}
      >
        <Avatar
          initials="AC"
          name="Alex Chen"
          role="Engineering Manager"
          size={50}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: fonts.mono,
            fontSize: 12,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              backgroundColor: colors.success,
            }}
          />
          online
        </div>
      </div>

      {/* Chat messages */}
      <div style={{ flex: 1 }}>
        {/* User message: PR link */}
        {frame >= userMessageStart && (
          <UserPRMessage frame={frame - userMessageStart} />
        )}

        {/* Manager reply */}
        {frame >= managerReplyStart && (
          <ManagerReply frame={frame - managerReplyStart} />
        )}
      </div>

      {/* Call button pulsing */}
      {frame >= callButtonPulse && (
        <PulsingCallButton frame={frame - callButtonPulse} />
      )}
    </AbsoluteFill>
  );
};

const UserPRMessage: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: 16,
        opacity: entrance,
        transform: `translateX(${(1 - entrance) * 100}px)`,
      }}
    >
      <div
        style={{
          maxWidth: "70%",
          padding: 16,
          backgroundColor: colors.accent,
          border: `${borders.width}px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 14,
            marginBottom: 8,
          }}
        >
          PR ready! 🎉
        </div>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 12,
            color: "#0066cc",
            textDecoration: "underline",
          }}
        >
          <Typewriter
            text="github.com/fintech/payments/pull/42"
            charFrames={1}
            showCursor={false}
          />
        </div>
        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontFamily: fonts.mono,
            fontSize: 10,
            color: "#666",
          }}
        >
          ✓ Delivered
        </div>
      </div>
    </div>
  );
};

const ManagerReply: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();

  // Typing indicator first, then message
  const showTyping = frame < fps;
  const showMessage = frame >= fps;

  const messageEntrance = spring({
    frame: frame - fps,
    fps,
    config: animations.snappy,
  });

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
        marginBottom: 16,
      }}
    >
      {showTyping && (
        <div
          style={{
            padding: "12px 20px",
            backgroundColor: colors.background,
            border: `${borders.width}px solid ${colors.border}`,
            fontFamily: fonts.mono,
            fontSize: 14,
          }}
        >
          <TypingIndicator />
        </div>
      )}
      {showMessage && (
        <div
          style={{
            maxWidth: "70%",
            padding: 16,
            backgroundColor: colors.background,
            border: `${borders.width}px solid ${colors.border}`,
            opacity: messageEntrance,
            transform: `translateX(${(1 - messageEntrance) * -100}px)`,
          }}
        >
          <div style={{ fontFamily: fonts.heading, fontSize: 14 }}>
            Cool! Let's hop on a call to discuss. 📞
          </div>
        </div>
      )}
    </div>
  );
};

const TypingIndicator: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[0, 1, 2].map((i) => {
        const phase = (frame + i * 5) % 20;
        const y = phase < 10 ? -phase : phase - 20;
        return (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              backgroundColor: colors.border,
              transform: `translateY(${y / 2}px)`,
            }}
          />
        );
      })}
    </div>
  );
};

const PulsingCallButton: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();

  // Pulsing scale
  const pulse = 1 + Math.sin(frame * 0.2) * 0.05;

  const entrance = spring({
    frame,
    fps,
    config: animations.bouncy,
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        right: 60,
        padding: "16px 32px",
        backgroundColor: colors.accent,
        border: `${borders.width}px solid ${colors.border}`,
        fontFamily: fonts.heading,
        fontSize: 16,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: 8,
        transform: `scale(${entrance * pulse})`,
      }}
    >
      🎧 Start Call
    </div>
  );
};
```

**Step 2: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion/src/scenes && git commit -m "feat: add Scene5SubmitPR with PR link and manager reply"
```

---

## Task 16: Create Scene6Results Component

**Files:**

- Create: `remotion/src/scenes/Scene6Results.tsx`

**Step 1: Create the results and CTA scene**

```tsx
// remotion/src/scenes/Scene6Results.tsx
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { colors, borders, animations } from "../lib/design-system";
import { fonts } from "../lib/fonts";
import { ProgressBar } from "../components/ProgressBar";
import { Button } from "../components/Button";

const SKILL_SCORES = [
  { label: "Communication", value: 87 },
  { label: "Problem Solving", value: 92 },
  { label: "AI Leverage", value: 78 },
  { label: "Code Quality", value: 85 },
  { label: "Collaboration", value: 90 },
  { label: "Time Management", value: 82 },
];

export const Scene6Results: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene timing (18 seconds = 540 frames at 30fps)
  // 0-4s: "See HOW you work" + scores fade in
  // 4-12s: Scores animate
  // 12-15s: CTA button
  // 15-18s: URL + logo

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Title and scores (0-12s) */}
      <Sequence from={0} durationInFrames={12 * fps} premountFor={fps}>
        <ScoresDisplay />
      </Sequence>

      {/* CTA (12-18s) */}
      <Sequence from={12 * fps} durationInFrames={6 * fps} premountFor={fps}>
        <CTADisplay />
      </Sequence>
    </AbsoluteFill>
  );
};

const ScoresDisplay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title entrance
  const titleProgress = spring({
    frame,
    fps,
    config: animations.snappy,
  });

  return (
    <AbsoluteFill style={{ padding: 80 }}>
      {/* Title */}
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: 56,
          fontWeight: 700,
          textAlign: "center",
          marginBottom: 60,
          transform: `scale(${titleProgress})`,
        }}
      >
        See <span style={{ color: colors.accent }}>HOW</span> you work.
      </div>

      {/* Scores grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        {SKILL_SCORES.map((skill, i) => (
          <ProgressBar
            key={skill.label}
            label={skill.label}
            value={skill.value}
            delay={2 * fps + i * 15} // Staggered start
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const CTADisplay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Button entrance
  const buttonProgress = spring({
    frame,
    fps,
    config: animations.bouncy,
  });

  // URL fade in
  const urlOpacity = interpolate(frame, [2 * fps, 3 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: 48,
          fontWeight: 700,
          marginBottom: 40,
        }}
      >
        Skillvee
      </div>

      {/* CTA Button */}
      <div style={{ transform: `scale(${buttonProgress})` }}>
        <div
          style={{
            padding: "20px 48px",
            backgroundColor: colors.accent,
            border: `${borders.width}px solid ${colors.border}`,
            fontFamily: fonts.heading,
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          Start Practicing
        </div>
      </div>

      {/* URL */}
      <div
        style={{
          marginTop: 24,
          fontFamily: fonts.mono,
          fontSize: 18,
          opacity: urlOpacity,
        }}
      >
        skillvee.com
      </div>
    </AbsoluteFill>
  );
};
```

**Step 2: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion/src/scenes && git commit -m "feat: add Scene6Results with animated scores and CTA"
```

---

## Task 17: Wire Up Root.tsx with All Scenes

**Files:**

- Modify: `remotion/src/Root.tsx`

**Step 1: Update Root.tsx to compose all scenes**

```tsx
// remotion/src/Root.tsx
import { Composition, Series } from "remotion";
import { Scene1Opening } from "./scenes/Scene1Opening";
import { Scene2CVUpload } from "./scenes/Scene2CVUpload";
import { Scene3HRInterview } from "./scenes/Scene3HRInterview";
import { Scene4SlackCollab } from "./scenes/Scene4SlackCollab";
import { Scene5SubmitPR } from "./scenes/Scene5SubmitPR";
import { Scene6Results } from "./scenes/Scene6Results";

// Total: 90 seconds = 2700 frames at 30fps
const FPS = 30;
const DURATION = {
  scene1: 8 * FPS, // 240 frames
  scene2: 12 * FPS, // 360 frames
  scene3: 18 * FPS, // 540 frames
  scene4: 22 * FPS, // 660 frames
  scene5: 12 * FPS, // 360 frames
  scene6: 18 * FPS, // 540 frames
};

const TOTAL_DURATION =
  DURATION.scene1 +
  DURATION.scene2 +
  DURATION.scene3 +
  DURATION.scene4 +
  DURATION.scene5 +
  DURATION.scene6;

// Full promo video composition
const PromoVideo: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={DURATION.scene1}>
        <Scene1Opening />
      </Series.Sequence>
      <Series.Sequence durationInFrames={DURATION.scene2}>
        <Scene2CVUpload />
      </Series.Sequence>
      <Series.Sequence durationInFrames={DURATION.scene3}>
        <Scene3HRInterview />
      </Series.Sequence>
      <Series.Sequence durationInFrames={DURATION.scene4}>
        <Scene4SlackCollab />
      </Series.Sequence>
      <Series.Sequence durationInFrames={DURATION.scene5}>
        <Scene5SubmitPR />
      </Series.Sequence>
      <Series.Sequence durationInFrames={DURATION.scene6}>
        <Scene6Results />
      </Series.Sequence>
    </Series>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Full video */}
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* Individual scenes for preview/testing */}
      <Composition
        id="Scene1-Opening"
        component={Scene1Opening}
        durationInFrames={DURATION.scene1}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene2-CVUpload"
        component={Scene2CVUpload}
        durationInFrames={DURATION.scene2}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene3-HRInterview"
        component={Scene3HRInterview}
        durationInFrames={DURATION.scene3}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene4-SlackCollab"
        component={Scene4SlackCollab}
        durationInFrames={DURATION.scene4}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene5-SubmitPR"
        component={Scene5SubmitPR}
        durationInFrames={DURATION.scene5}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene6-Results"
        component={Scene6Results}
        durationInFrames={DURATION.scene6}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
```

**Step 2: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion/src && git commit -m "feat: wire up all scenes in Root.tsx with Series composition"
```

---

## Task 18: Create Component Index Files

**Files:**

- Create: `remotion/src/components/index.ts`
- Create: `remotion/src/scenes/index.ts`
- Create: `remotion/src/lib/index.ts`

**Step 1: Create barrel exports**

```typescript
// remotion/src/components/index.ts
export { Avatar } from "./Avatar";
export { Button } from "./Button";
export { ChatBubble } from "./ChatBubble";
export { ProgressBar } from "./ProgressBar";
export { TextPunch } from "./TextPunch";
export { Typewriter } from "./Typewriter";
export { Waveform } from "./Waveform";
```

```typescript
// remotion/src/scenes/index.ts
export { Scene1Opening } from "./Scene1Opening";
export { Scene2CVUpload } from "./Scene2CVUpload";
export { Scene3HRInterview } from "./Scene3HRInterview";
export { Scene4SlackCollab } from "./Scene4SlackCollab";
export { Scene5SubmitPR } from "./Scene5SubmitPR";
export { Scene6Results } from "./Scene6Results";
```

```typescript
// remotion/src/lib/index.ts
export { colors, spacing, borders, animations, timing } from "./design-system";
export { fonts } from "./fonts";
```

**Step 2: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion/src && git commit -m "chore: add barrel exports for components, scenes, and lib"
```

---

## Task 19: Test Full Video in Remotion Studio

**Step 1: Start Remotion Studio**

```bash
cd /Users/matiashoyl/Proyectos/simulator/remotion && npm start
```

**Step 2: Verify in browser**

- Open browser at http://localhost:3000
- Select "PromoVideo" composition
- Play through entire video
- Check each scene transition
- Verify animations are smooth

**Step 3: Fix any issues found**

If there are TypeScript errors or visual bugs, fix them and commit.

---

## Task 20: Add Audio Placeholder and Final Polish

**Files:**

- Create: `remotion/public/` directory for assets
- Modify: Root.tsx to add audio when ready

**Step 1: Create public directory for audio assets**

```bash
mkdir -p /Users/matiashoyl/Proyectos/simulator/remotion/public
```

**Step 2: Add a README for audio assets**

```markdown
<!-- remotion/public/README.md -->

# Audio Assets

Place audio files here:

- `music.mp3` - Background music track (~120-130 BPM, energetic)
- `ping.mp3` - Message notification sound
- `whoosh.mp3` - Message send sound
- `call-connect.mp3` - Call connection sound

Source from Epidemic Sound, Artlist, or similar royalty-free services.
```

**Step 3: Commit**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git add remotion/public && git commit -m "chore: add public directory for audio assets with README"
```

---

## Task 21: Final Commit and Summary

**Step 1: Verify all files committed**

```bash
cd /Users/matiashoyl/Proyectos/simulator && git status
```

Expected: working tree clean

**Step 2: Run final preview**

```bash
cd remotion && npm start
```

Verify the full "PromoVideo" composition plays correctly.

---

## Summary

The Remotion promo video project is now set up with:

- **6 scenes** matching the design document
- **7 reusable components** (Avatar, Button, ChatBubble, ProgressBar, TextPunch, Typewriter, Waveform)
- **Design system** with neo-brutalist constants
- **Google Fonts** (DM Sans, Space Mono) properly loaded
- **Series composition** for sequential scene playback
- **Individual scene compositions** for isolated testing

**Next steps to finish the video:**

1. Add background music (place in `remotion/public/music.mp3`)
2. Add sound effects (ping, whoosh, call sounds)
3. Fine-tune animation timing to sync with music beats
4. Render final video: `cd remotion && npx remotion render PromoVideo out/promo.mp4`
