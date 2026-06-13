# AI Workflow — Zoom Clone

> A transparent record of the AI-assisted orchestration strategy used to build this project from zero to a working multi-party video conferencing platform in a single session.

---

## Overview

Three AI tools were used in a strict division-of-responsibility model to avoid the compounding errors that arise when a single model is asked to handle both architecture and implementation simultaneously.

```
Claude (Sonnet 4.5)          →   Architecture + reasoning
v0 by Vercel                 →   Design system + token generation
Cursor (Agent Mode)          →   Phased implementation + file execution
```

Each tool was given explicit boundaries. Cursor was never asked to "think" about architecture. Claude was never asked to write JSX. v0 was never asked to touch backend code. This separation is the single most important technique for preventing hallucinations in a complex full-stack build.

---

## Phase-by-Phase Execution Log

### Phase 1 — Scaffold

**Prompt strategy:** Claude was given the full technical architecture doc and asked to list the exact directory tree before writing a single file. This forced a complete plan before execution and surfaced ambiguities early (e.g., SQLite column naming, enum values) without wasted implementation cycles.

**Tools used:**
- Claude: database schema design, API surface planning, WebRTC architecture decision (mesh vs SFU)
- Cursor: file creation — `backend/`, `models.py`, `schemas.py`, `routers/`, `websocket/`, Next.js page shells

**Key boundary enforced:** Cursor was given the plan as an attached file and instructed: *"Do NOT edit the plan file itself. Mark todos as in_progress as you work."* This prevented Cursor from re-interpreting requirements mid-implementation.

---

### Phase 2 — Dashboard Logic & HTTP APIs

**Prompt strategy:** Two discrete tasks were issued as a single message to Cursor: (1) backend SQLAlchemy implementation, (2) frontend API wiring. Cursor was explicitly told which endpoints to implement and what the response schemas looked like — no guesswork.

**Hallucination prevention:** FastAPI route ordering was enforced explicitly in the prompt (`/upcoming` and `/recent` must be defined before `/{meeting_code}`) to prevent a common FastAPI path-shadowing bug that Cursor would not have caught on its own.

---

### Phase 3 & 4 — WebSocket Server + Media Hooks

**The WebRTC boundary rule (critical):**

> *"Cursor must never be asked to design the WebRTC signaling flow. It can implement a signaling flow that has been fully specified."*

The correct mental model (new joiner = offerer, existing participants = answerer, ICE candidate queuing, pending offer flush when media is not yet ready) was designed entirely in Claude before Cursor wrote a single line of `useWebRTC.ts`. When Cursor was given a vague prompt like "implement WebRTC", it would reliably hallucinate a broken symmetrical offer model that creates offer collisions on refresh.

**Tools used:**
- Claude: designed the exact state machine for `useWebRTC` — `pcsRef`, `pendingJoinOffersRef`, `pendingAnswersRef`, `earlyCandidatesRef`, `flushPendingJoinOffers`, `flushPendingAnswers`
- Cursor: typed the implementation verbatim from the spec

---

### Phase 5 — WebRTC Mesh Sync Bug Fix

**Root cause analysis (Claude):**

The one-way video bug on refresh was caused by two issues:
1. The backend was not sending the existing room snapshot to the **new joiner** — only to existing participants.
2. The frontend `participant-joined` handler was trying to be both offerer and answerer, creating an offer-collision race.

**Fix design (Claude):**
- Backend: snapshot participants *before* `connect()`, send `existing-participants` only to new joiner after connection
- Frontend: `participant-joined` caches names only; `existing-participants` triggers all offers from the new joiner; existing participants never initiate offers

**Why this pattern prevents collisions:** Only one side ever calls `createOffer` for any given pair. The new joiner is always the offerer. This is not the WebRTC spec's "perfect negotiation" pattern (which requires glare handling) — it is a simpler, collision-free design that works correctly for the join/refresh use case.

---

### Phase 6 — Screen Share

**Design decision (Claude):**

Screen share via `getDisplayMedia` involves replacing a track in two places:
1. The local `<video>` element (`removeTrack`/`addTrack` on the same `MediaStream` object — the browser re-renders automatically)
2. The outbound WebRTC sender (`RTCRtpSender.replaceTrack`) — transparent to the peer, no renegotiation required

Exposing `activeVideoTrack` as React state and reacting to it in a `useEffect` (calling `replaceLocalVideoTrack`) creates a clean reactive data flow: the hook doesn't need to know about WebRTC, and the component doesn't need to know about `getDisplayMedia` internals.

---

### Phase 7 — Participants Panel, Chat, Host Controls

**Subscription architecture (Claude):**

`useWebSocket` exposes `subscribeToMessages` (a stable Set-based pub/sub). Both `useWebRTC` and `MeetingRoom` subscribe independently — `useWebRTC` handles signaling events, `MeetingRoom` handles UI events (`chat-message`, `participant-audio-updated`, `participant-video-updated`). This avoids "message routing" logic inside any single hook.

The `openPanelRef` pattern (a ref kept in sync with the `openPanel` state via `useEffect`) is used so that the message subscription closure (registered once with `useEffect([subscribeToMessages])`) can read the current panel state without being recreated on every render.

---

### Phase 8 — UI Layout Restructure

**Reference-driven prompting:**

Screenshots of the real Zoom Web Portal were passed directly to the agent with explicit structural constraints:
- *"DO NOT delete any existing API logic, state variables, or modal components"*
- *"Strictly restructure the JSX"*

This is a critical boundary for UI refactoring tasks. Without it, Cursor will silently remove business logic that is not visible in the target screenshot. The constraint forced a pure layout restructure while leaving all state, fetching, and modal logic untouched.

---

## Design Token Strategy (v0)

The Zoom brand color (`#0d6bde` → `hsl(212 89% 46%)`) and all semantic surface tokens (meeting room dark stage, control bar, video tile background, danger, success) were generated as HSL channel variables in `app/globals.css`:

```css
:root {
  --primary: 212 89% 46%;
  --meeting-bg: 240 6% 11%;
  --video-tile-bg: 240 6% 16%;
  --control-bar-bg: 240 5% 13%;
}
```

These are exposed to Tailwind via `@theme inline` as `--color-primary`, `--color-meeting`, etc., enabling opacity modifiers (`bg-primary/20`, `text-primary/60`) to work correctly without redefining every alpha variant.

**Why this matters for Cursor:** By giving Cursor a design token vocabulary (`bg-primary`, `bg-video-tile`, `text-meeting-foreground`) rather than hex codes or hardcoded HSL values, every component Cursor generated is automatically theme-consistent. If a token needs to change (e.g., a slightly different dark background), it changes in one place and the entire app updates.

---

## Lessons Learned

### What worked

| Technique | Outcome |
|---|---|
| Design the signaling state machine before writing a line of code | Zero WebRTC renegotiation bugs |
| Strict task boundaries per prompt (never mix architecture + implementation) | No hallucinated APIs or missing imports |
| Attach reference screenshots for UI restructure tasks | Correct layout without accidental logic deletion |
| Explicit route ordering constraints for FastAPI | No path-shadowing bugs |
| `useRef` for all mutable WebRTC state | No stale closure bugs in async offer/answer chains |

### What to avoid

| Anti-pattern | Why it fails |
|---|---|
| Asking Cursor to "implement WebRTC" without a spec | Produces a symmetrical offer model that breaks on refresh |
| Asking Claude to write JSX | Generates syntactically valid but semantically wrong component trees |
| Combining architecture questions with implementation requests in one message | Cursor optimises for speed; architectural shortcuts are silently baked in |
| Using `useState` for `RTCPeerConnection` objects | Triggers unnecessary re-renders during ICE negotiation, breaking the connection |
| Letting Cursor manage its own todo list without explicit completion checkpoints | Tasks are marked done before edge cases are handled |

---

## Reproducibility

To replicate this workflow on a different codebase:

1. **Claude** — provide the full requirements doc. Ask for a directory tree and architectural decisions **before** any code. Resolve all ambiguities at this stage.
2. **v0** — generate a `globals.css` with design tokens from the target app's brand palette. Export as CSS variables, not Tailwind config values.
3. **Cursor** — break the implementation into phases. Each phase prompt should reference exact file paths, function signatures, and event schemas. Never ask Cursor to design; only ask it to implement a design that already exists.
4. **Verification** — after each phase, run linting and a quick smoke-test before proceeding. Cursor's `ReadLints` tool is called after every substantive edit to catch regressions immediately.
