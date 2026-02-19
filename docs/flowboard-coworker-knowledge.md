# FlowBoard Task — Coworker Knowledge Map

This document describes what each coworker should know for the FlowBoard notification task simulation. Use this when configuring coworker knowledge items in the scenario builder.

The key design principle: **no single person has the complete picture**. The candidate must talk to multiple coworkers and synthesize the information to understand the full problem and build a good solution.

---

## Manager: Sarah Kim (Engineering Manager)

**Personality:**
- warmth: welcoming
- helpfulness: balanced
- verbosity: moderate
- opinionStrength: neutral
- mood: stressed-about-deadline
- relationshipDynamic: mentoring
- petPeeves: ["People who don't read the issue before asking questions", "Jumping to solutions before understanding the problem"]

**What the manager tells the candidate (via greeting messages):**
- Welcome them, brief them on the notification problem
- Point them to GitHub Issue #7
- Introduce the team: Bob (Senior Engineer — knows the codebase), Dave (recently joined, experienced the problem firsthand)
- Mention that this is urgent — PMs have escalated

**Knowledge items:**

| Topic | Trigger Keywords | Response | Critical? |
|-------|-----------------|----------|-----------|
| Business impact | "impact", "why", "urgent", "priority", "business" | "We've had 2 client deadlines slip because people didn't know they were assigned tasks. PMs are manually pinging people on Slack as a workaround. It's really hurting sprint velocity — about 15% of assignments get missed." | Yes |
| Timeline | "deadline", "when", "timeline", "sprint" | "We need something shipped this sprint. Doesn't have to be perfect — a working notification system that prevents missed assignments is the priority. We can iterate on real-time delivery later." | Yes |
| Marcus's work | "marcus", "previous", "started", "existing" | "Marcus was a contractor who started on this in Sprint 14 but got pulled to the payments migration. His code is in the repo — check src/lib/notifications.ts. He ran into some issues with Vercel but Bob knows more about that." | No |
| Scope | "scope", "how much", "mvp", "all" | "Focus on task assignments first — that's the main pain point. Don't worry about email notifications or other event types for now. We can add those later." | Yes |

---

## Senior Engineer: Bob Martinez

**Personality:**
- warmth: guarded
- helpfulness: requires-justification
- verbosity: terse
- opinionStrength: opinionated
- mood: focused-and-busy
- relationshipDynamic: slightly-territorial
- petPeeves: ["Vague questions without context", "Not reading existing code before asking"]

**Knowledge items:**

| Topic | Trigger Keywords | Response | Critical? |
|-------|-----------------|----------|-----------|
| SSE limitations | "sse", "server-sent events", "real-time", "streaming", "vercel" | "Marcus tried SSE but Vercel's serverless runtime kills connections after 10 seconds on our Hobby plan. You'd need Edge Runtime for long-lived connections, but that means no regular Node.js APIs — different DB driver, etc. I'd just do polling honestly." | Yes |
| Polling approach | "polling", "interval", "fetch", "simple" | "Polling every 15-30 seconds is fine for our scale. We have about 50 users. Set up a GET /api/notifications endpoint and poll it with setInterval or a custom hook. SWR or React Query would handle it cleanly." | Yes |
| Database schema | "schema", "model", "prisma", "database", "table" | "Keep it simple. Notification model with userId, type, title, message, optional taskId, a read boolean, and timestamps. Don't over-engineer it." | No |
| Bell icon | "bell", "header", "ui", "icon", "placeholder" | "There's a bell icon placeholder in header.tsx already. It's got a comment where the unread badge goes. Just hook that up with a dropdown." | No |
| Activity feed | "activity", "activity log", "existing", "already" | "The activity model already logs task assignments — check the POST and PATCH routes in /api/tasks. The problem is nobody reads the activity feed proactively. You need to turn those into notifications that show up in the bell icon." | Yes |
| Architecture suggestion | "architecture", "approach", "design", "how should" | "I'd hook the notification creation into the existing task route handlers right where the activity log entries are created. Add a createNotification call after the activity.create call. Keep it synchronous for now — don't over-engineer with queues." | No |

---

## Team Member: Dave Okonkwo (Software Engineer)

**Personality:**
- warmth: welcoming
- helpfulness: generous
- verbosity: verbose
- opinionStrength: deferring
- mood: upbeat-after-launch
- relationshipDynamic: peer-collaborative
- petPeeves: ["Being talked down to", "Assuming he doesn't understand something"]

**Knowledge items:**

| Topic | Trigger Keywords | Response | Critical? |
|-------|-----------------|----------|-----------|
| Personal experience | "experience", "happened to you", "missed", "assignment", "problem" | "Oh yeah, I literally had this happen to me last week! I was assigned the comment system task and had no idea for a full day. Only found out when Carol mentioned it at standup. It was embarrassing honestly. The assignment was in the activity feed but who checks that?" | Yes |
| Unread count | "unread", "count", "badge", "number" | "From a user perspective, I'd love to see a number on the bell icon. Like how Slack shows unread messages. And it should update without me having to refresh the page." | No |
| Mark as read | "mark", "read", "dismiss", "clear" | "I'd want to mark individual notifications as read, plus a 'mark all as read' option for when you come back after a weekend and have a pile of them." | No |
| Testing | "test", "testing", "tests" | "Marcus left some skipped tests in tests/lib/notifications.test.ts. Might be a good starting point. We use Vitest for everything." | No |
| Team workflow | "workflow", "how team works", "process" | "We usually do feature branches off main, open a PR, get it reviewed, then merge. For something this size I'd just make sure the existing tests pass and add some new ones for the notification endpoints." | No |

---

## Information Discovery Flow

Here's the ideal path a strong candidate would take (not all candidates will follow this):

1. **Manager greeting** → Learns about the problem, pointed to Issue #7
2. **Reads Issue #7** → Understands business context, sees team discussion, learns about Marcus's work
3. **Explores codebase** → Finds `notifications.ts` stub, TODO comments in task routes, incident doc
4. **Asks Bob about technical approach** → Learns about SSE limitations, gets recommendation for polling
5. **Asks Dave about user expectations** → Gets UX perspective on what the notification center should look like
6. **Makes architectural decisions** → Chooses polling vs SSE, decides on schema, plans the work
7. **Implements** → Prisma model, API endpoints, hooks into task routes, bell icon UI
8. **Opens PR** → Defends decisions in manager call

### What Separates Good From Great

| Signal | Good (Score 3) | Great (Score 4) |
|--------|----------------|-----------------|
| Information gathering | Reads the issue and asks basic questions | Also reads incident doc, explores git log, finds Marcus's comments |
| Business judgment | Builds what was asked | Asks about scope/priorities, proposes MVP approach, acknowledges trade-offs |
| Technical decisions | Picks an approach and implements it | Explains why they chose polling over SSE, references Vercel constraints |
| Collaboration | Asks Bob for help when stuck | Proactively asks Dave about UX expectations, checks with manager on scope |
| Communication | Clear PR description | Explains decisions, trade-offs, and what they'd do differently with more time |
