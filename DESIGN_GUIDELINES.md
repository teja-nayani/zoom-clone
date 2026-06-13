# Zoom Clone — Design Guidelines

A focused, Zoom-inspired UI/UX spec covering **only** the assignment flows. The goal is high visual fidelity to Zoom's web client: clean, calm, blue-accented, generous whitespace, restrained shadows, and confident interaction states. **Light theme only** (Zoom web has no theme toggle).

---

## 1. Design Principles

1. **Calm & professional** — Zoom is a productivity tool, not a marketing site. Avoid heavy gradients, decorative blobs, or playful motion. Use whitespace and hierarchy.
2. **Blue is the brand, not the page** — `#0d6bde` (Zoom blue) is reserved for primary actions, active states, links, and the logo. Surfaces stay white/neutral.
3. **One primary action per screen** — the dominant blue button (e.g. "New Meeting", "Join", "Schedule") is the visual anchor. Everything else is secondary/ghost.
4. **The meeting room inverts the theme** — dashboard is light (white surfaces, dark text); the meeting room is dark (near-black stage, white text, frosted control bar). This contrast is core to Zoom's identity.
5. **Predictable controls** — toggle buttons (mic/camera) show state through fill + icon, destructive actions (Leave, Remove, End) are always red.
6. **Accessible by default** — visible focus rings, 4.5:1 text contrast, ARIA labels on icon-only buttons, keyboard reachable.

---

## 2. Color Usage

| Token | Hex | Use |
|---|---|---|
| `--primary` | `#0d6bde` | Primary buttons, active toggles, links, logo, selected states |
| `--primary-hover` | `#0b5cbf` | Hover for primary |
| `--background` | `#ffffff` | App background |
| `--foreground` | `#1a1a1a` | Default text |
| `--card` | `#ffffff` | Cards, panels, modals |
| `--muted` | `#f5f7fa` | Subtle fills, hover rows, input backgrounds |
| `--muted-foreground` | `#6b7280` | Secondary text, metadata, timestamps |
| `--border` | `#e5e7eb` | Dividers, input borders, card borders |
| `--danger` | `#e02d2d` | Leave/End meeting, remove participant, errors |
| `--success` | `#16a34a` | Confirmation states, "copied", connected |
| `--meeting-bg` | `#1a1a1e` | Meeting room stage background |
| `--video-tile-bg` | `#26262b` | Empty/active video tile fill |
| `--control-bar-bg` | `#202024` | Bottom control bar surface |

**Rules**
- Never use blue for large surfaces — only for actions/accents.
- In the dark meeting room, neutral controls sit on `--control-bar-bg`; only the active toggle and Leave button get color.
- Avoid purple/violet entirely.

---

## 3. Typography

- **Font:** a clean grotesque/humanist sans — Zoom uses a Lato-like face. Use **Inter** (or Lato) for both UI and headings. One family, multiple weights.
- **Scale**
  - Page title (e.g. "Home"): `text-2xl` / 28px, `font-semibold`
  - Section heading ("Upcoming", "Recent"): `text-lg` / 18px, `font-semibold`
  - Card title: `text-base` / 16px, `font-medium`
  - Body: `text-sm` / 14px, `leading-relaxed`
  - Metadata/timestamp: `text-xs` / 12px, `text-muted-foreground`
- **Weights:** 400 body, 500 medium for labels/buttons, 600 semibold for headings. Avoid 700+ except numerals like Meeting ID.
- **Numerals:** Meeting IDs use `font-mono` or tabular figures, spaced in groups (e.g. `123 4567 8901`).

---

## 4. Spacing, Radius, Shadow

- **Spacing:** stick to the Tailwind scale (`gap-2/3/4/6`, `p-4/6`). Cards use `p-5`–`p-6`. Page gutters `px-6 md:px-8`.
- **Radius:** Zoom is moderately rounded. Buttons & inputs `rounded-lg` (8px), cards/panels `rounded-xl` (12px), modals `rounded-2xl` (16px), avatars/pills `rounded-full`.
- **Shadows:** subtle only. Cards `shadow-card` (soft, low spread). Modals/popovers `shadow-overlay`. The control bar uses `shadow-control` (upward). Never use harsh dark drop shadows on light surfaces.

---

## 5. Flow-by-Flow Guidelines

### 5.1 Landing Dashboard / Home
- **Layout:** top navbar + content area. Optional left rail on desktop; collapses on mobile.
- **Navbar:** left = Zoom-blue wordmark/logo; center optional; right = settings (gear) icon + avatar (initials circle) with dropdown placeholder. Height ~64px, white, bottom border `--border`.
- **Action row (the hero of Home):** four large square/rounded action tiles, Zoom-style:
  - **New Meeting** — orange/blue icon tile (Zoom uses orange `#f5631e` historically, but keep blue for consistency or a single warm accent). Primary emphasis.
  - **Join** — blue.
  - **Schedule** — blue.
  - **Share Screen** — optional, blue.
  Each tile: `~96–112px` square, icon top, label below, `rounded-xl`, white card with `shadow-card`, hover lifts slightly.
- **Upcoming meetings:** section heading + vertical list of meeting cards (title, date/time, Meeting ID, Join/Copy/Start actions). Empty state: muted illustration-less message "No upcoming meetings".
- **Recent meetings:** similar list, with "ended" metadata and a "Start again" / "Details" action.
- **Responsive:** action tiles wrap 2×2 on mobile, single row on desktop. Lists stack full-width on mobile.

### 5.2 Instant Meeting Creation
- Triggered by **New Meeting**. Show a **modal or transitional screen**, not a hard navigation.
- Display: generated **Meeting ID** (mono, grouped digits), **Invite link** with a **Copy** button that flips to "Copied ✓" (success color) for ~2s.
- **Loading/redirect state:** spinner + "Starting your meeting…" while transitioning into the room. Keep it brief and centered.
- Provide a clear primary "Start Meeting" and secondary "Copy invite".

### 5.3 Join Meeting
- **Form:** single centered card. Fields:
  - Meeting ID **or** invite link (one input that accepts both).
  - **Display name** input.
  - Primary "Join" button (disabled until valid).
- **States:**
  - **Invalid meeting:** inline red helper text + red input border (`--danger`), e.g. "Meeting ID not found".
  - **Loading/waiting:** button shows spinner + "Joining…"; optionally a "Waiting for host to start this meeting" waiting screen with a calm centered spinner.
- Keyboard: Enter submits. Autofocus the ID field.

### 5.4 Schedule Meeting
- **Form card** with: Title (required), Description (textarea), **Date & time picker** (use shadcn `Calendar` + time select; style with `--border`, blue selected day), **Duration** selector (segmented or dropdown: 15/30/45/60/90 min).
- On submit show **auto-generated meeting link** + **confirmation/success state** (green check, "Meeting scheduled", summary card).
- The newly scheduled item should visually match the **Upcoming meeting card** so users recognize it.

### 5.5 Meeting Room
- **Stage:** full-bleed dark (`--meeting-bg`). Video grid centered.
- **Video grid:** responsive CSS grid — 1 tile = full stage; 2 = side by side; 3–4 = 2×2; 5–9 = 3×3. Tiles `--video-tile-bg`, `rounded-xl`, aspect ~16:9.
- **Empty camera tile:** centered avatar circle with initials + name label bottom-left. Muted mic shows a small red mic-off badge.
- **Active speaker:** highlighted with a 2px `--primary` ring/border; in speaker view one large tile + filmstrip of small tiles.
- **Screen share layout:** shared content large (left/center), participant filmstrip docked right or bottom.
- **Bottom control bar:** centered, frosted/`--control-bar-bg`, `rounded-2xl` floating or full-width docked. Icon + label buttons:
  - **Mute/Unmute** — icon swaps mic/mic-off; muted = red icon/fill; label toggles.
  - **Start/Stop Video** — camera/camera-off; off = red.
  - **Participants** — count badge; opens right panel.
  - **Chat** — unread badge; opens right panel.
  - **Share** — share screen.
  - **Leave** — **red** button, always rightmost, set apart.
- **Meeting info / invite modal:** opened from an "i" or meeting title; shows Meeting ID, passcode placeholder, invite link + copy.
- Name label on each tile bottom-left with subtle dark scrim for legibility.

### 5.6 Participants & Host Controls
- **Right side panel** (slides in, `--card`, left border, ~320px desktop, full-width sheet on mobile).
- Header: "Participants (n)" + close.
- **List rows:** avatar, name, **(You)** indicator for current user, **Host badge** (small blue pill), mic/camera status icons. Hover reveals host actions.
- **Host controls:** "Mute All" button at top/bottom; per-row kebab → "Mute", **"Remove"** (red, destructive, confirm).
- Current user always visible/distinct.

### 5.7 Chat Panel
- **Right side panel**, same shell as participants (only one panel open at a time on mobile).
- Header "Chat" + close.
- **Message bubbles:** sender name (small, `--muted-foreground`) + timestamp `text-xs`, message body. Own messages can right-align with subtle blue-tinted bubble; others left-align neutral.
- **Empty state:** centered muted message "No messages yet. Say hello 👋" (text only, no emoji-as-icon).
- **Input area:** sticky bottom, text input + send button (blue, disabled when empty), Enter to send.

### 5.8 Responsive Design
- **Mobile (<640px):** action tiles 2×2; side panels become full-screen sheets; control bar full-width docked at bottom with icon-only buttons; video grid max 1–2 tiles visible with the rest in a scrollable strip.
- **Tablet (640–1024px):** 2-up action row, panels overlay at ~360px, 2×2 video grid.
- **Desktop (>1024px):** full action row, panels push/overlay, up to 3×3 grid, control bar floating centered.
- Touch targets ≥ 44px. Respect safe-area insets on mobile for the control bar.

---

## 6. Interaction & Motion
- **Transitions:** 150–200ms ease for hover/state; panel slide-in 200–250ms ease-out.
- **Loading:** centered spinner for full-screen waits; **shimmer/skeleton** for meeting lists and video tiles while loading.
- **Copy feedback:** button label/icon swaps to success "Copied ✓" for ~2s.
- **Hover:** cards lift (`shadow-card` → slightly larger) and/or `--muted` row background.
- No bouncy/spring motion — keep it crisp and professional.

---

## 7. Accessibility Checklist
- All icon-only buttons have `aria-label` (e.g. "Mute microphone").
- Toggle states expose `aria-pressed`.
- Visible focus ring (`--primary` outline) on every interactive element.
- Text contrast ≥ 4.5:1 (note `--muted-foreground` on white passes; verify on `--muted`).
- Panels are dialogs/regions with focus trap + Esc to close.
- Meeting-room dark surfaces keep white text ≥ 7:1.

---

## 8. Common Pitfalls to Avoid
- ❌ Using blue for backgrounds/large fills.
- ❌ Making the meeting room light — it must be dark.
- ❌ Multiple competing primary buttons on one screen.
- ❌ Emojis as icons (use a real icon set, e.g. lucide-react).
- ❌ Harsh shadows or gradients.
- ❌ Forgetting the red treatment for Leave/Remove/End.
- ❌ Tiny tap targets in the control bar on mobile.
