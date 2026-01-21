# Skillvee Promo Video Design

## Overview

A 90-second animated product demo showcasing Skillvee's main flow. Energetic, bold, neo-brutalist style with beat-synced text callouts and product sounds.

**Type:** Product Demo (animated mockups)
**Duration:** 90 seconds
**Aspect Ratio:** 16:9 (1920x1080)
**Tone:** Energetic & Bold

---

## Video Structure & Timing

| Segment | Duration | Content |
|---------|----------|---------|
| **Opening** | 8 sec | LeetCode problem flash → glitch/break → "There's a better way." |
| **CV Upload** | 12 sec | "Your experience matters." → PDF drops → profile parses |
| **HR Interview** | 18 sec | "REAL conversations." → voice waveform, interview questions animate |
| **Slack/Collab** | 22 sec | "REAL teamwork." → sidebar reveals team → messages fly → quick call snippet |
| **Submit PR** | 12 sec | "REAL code reviews." → send link to manager → manager replies → call UI appears |
| **Results + CTA** | 18 sec | Scores animate in → "See HOW you work." → "Start Practicing" button + URL |

---

## Visual Design System

**Colors:**
- Background: White (#FFFFFF)
- Text: Black (#000000)
- Accent: Gold (#f7da50)
- Borders: 2px solid black

**Typography:**
- Headings: DM Sans (bold)
- Code/Labels: Space Mono

**Shapes:**
- Border radius: 0px (sharp corners everywhere)
- No shadows
- 2px black borders on all UI elements

---

## Animation Principles

**Entrances:** Elements slam in from off-screen, slight overshoot then settle

**Text callouts:** Scale up from 0 with a punch, hold, then exit sharply

**Transitions:** Hard cuts synced to beat, occasional wipe with gold accent bar

**UI elements:** Snap into place (no slow fades), typing effects for messages

**Micro-interactions:** Buttons depress on click, checkmarks pop, progress bars fill with snap

---

## Scene-by-Scene Breakdown

### Scene 1: Opening (8 sec)

- **0-3s:** Sterile code editor appears with LeetCode-style problem: "Reverse a linked list in O(n) time..."
- **3-4s:** Glitch effect, screen cracks/shatters
- **4-6s:** Black screen, text slams in: "This isn't how real work looks."
- **6-8s:** Gold bar wipes across → "There's a better way." → transition

### Scene 2: CV Upload (12 sec)

- **0-2s:** "YOUR EXPERIENCE MATTERS." punches in center
- **2-5s:** Skillvee CV upload screen fades in, upload zone pulses
- **5-8s:** PDF icon drops into zone, dashed border animates to solid
- **8-12s:** Profile card builds out - name types, skills tags pop in one by one

### Scene 3: HR Interview (18 sec)

- **0-2s:** "REAL CONVERSATIONS." text punch
- **2-6s:** Interview UI appears - HR avatar on left, waveform bars animate (voice simulation)
- **6-12s:** Interview questions appear as chat bubbles: "Tell me about your experience with..." → response bubble typing
- **12-18s:** Waveform continues, checkmark appears, transition to next scene

### Scene 4: Slack/Collaboration (22 sec)

- **0-2s:** "REAL TEAMWORK." text punch
- **2-6s:** Slack-like UI builds - sidebar slides in from left, team members appear one by one with green status dots
- **6-10s:** Alex Chen (Engineering Manager) selected, chat area opens, welcome message types in
- **10-14s:** Quick montage - click Maria Garcia (PM), message flies in about requirements; click Marcus Lee (Frontend), code snippet shared
- **14-18s:** Headphone icon pulses on Alex Chen, click → call UI slides up with waveform
- **18-22s:** Call in progress, avatar bouncing slightly, waveform pulsing → call ends with checkmark

### Scene 5: Submit PR (12 sec)

- **0-2s:** "REAL CODE REVIEWS." text punch
- **2-6s:** Back in Alex Chen chat, candidate message types: "PR ready! github.com/repo/pull/42"
- **6-9s:** Message sends with whoosh, delivered checkmark
- **9-12s:** Alex replies (typing indicator → message): "Cool! Let's hop on a call to discuss." → call button pulses

### Scene 6: Results + CTA (18 sec)

- **0-4s:** Assessment complete screen, "See HOW you work." fades in
- **4-12s:** Skill categories appear in grid, scores animate up (Communication: 87, Problem Solving: 92, AI Leverage: 78, etc.)
- **12-15s:** Gold "Start Practicing" button scales up center screen
- **15-18s:** URL appears below (skillvee.com), optional QR code in corner, logo stinger

---

## Audio

### Music
- Energetic electronic/synth track, ~120-130 BPM
- Clear beat drops for scene transitions and text punches
- Source: Epidemic Sound, Artlist, or similar (royalty-free)

### Sound Effects (layered)
- Message send: soft whoosh
- Message receive: ping/notification sound
- Call connect: subtle ring → connect tone
- Typing: mechanical keyboard clicks (sparse)
- UI transitions: subtle whomp/snap sounds
- Score counters: soft tick as numbers climb

---

## Technical Specs

- **Resolution:** 1920x1080 (1080p)
- **Frame rate:** 30fps
- **Format:** MP4 (H.264)

### Remotion Project Structure

```
/remotion
  /src
    /components     # Reusable UI (Button, Avatar, ChatBubble, Waveform, etc.)
    /scenes         # Scene1Opening, Scene2CVUpload, Scene3HRInterview, etc.
    /assets         # Fonts, sounds, images
    Root.tsx        # Master composition that sequences all scenes
  package.json
  remotion.config.ts
```

---

## Text Callouts (beat-synced)

| Scene | Callout |
|-------|---------|
| Opening (problem) | "This isn't how real work looks." / "There's a better way." |
| CV Upload | "YOUR EXPERIENCE MATTERS." |
| HR Interview | "REAL CONVERSATIONS." |
| Slack/Collaboration | "REAL TEAMWORK." |
| Submit PR | "REAL CODE REVIEWS." |
| Results/CTA | "See HOW you work." / "Start Practicing" |
