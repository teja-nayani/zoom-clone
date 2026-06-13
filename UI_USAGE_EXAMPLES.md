# UI Usage Examples (class-name snippets)

Small, copy-paste **class-name** recipes — not full components. Pair with shadcn/ui primitives and `lucide-react` icons. All use the semantic tokens from `globals.css` / `tailwind.config.ts`.

> Convention: `[icon]` = a 20px lucide icon, `[16]`/`[20]`/`[24]` = icon size in px.

---

## Buttons

**Primary**
```
inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5
text-sm font-medium text-primary-foreground transition-colors
hover:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none
```

**Secondary**
```
inline-flex items-center justify-center gap-2 rounded-lg border border-border
bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground
transition-colors hover:bg-muted
```

**Ghost**
```
inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2
text-sm font-medium text-muted-foreground transition-colors
hover:bg-muted hover:text-foreground
```

**Danger**
```
inline-flex items-center justify-center gap-2 rounded-lg bg-danger px-4 py-2.5
text-sm font-medium text-danger-foreground transition-colors hover:bg-danger-hover
```

---

## Dashboard Card
```
group rounded-xl border border-border bg-card p-6 shadow-card transition-shadow
hover:shadow-overlay
```
Title: `text-base font-medium text-foreground`
Meta: `text-xs text-muted-foreground`

**Action tile (New Meeting / Join / Schedule)**
```
flex w-tile flex-col items-center justify-center gap-2 rounded-xl border border-border
bg-card p-4 text-sm font-medium shadow-card transition-all
hover:-translate-y-0.5 hover:shadow-overlay
```
Icon wrap (blue): `flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground`

---

## Meeting Card (upcoming / recent)
```
flex items-center justify-between gap-4 rounded-xl border border-border bg-card
p-5 shadow-card transition-colors hover:bg-muted/40
```
Title row: `text-base font-medium text-foreground`
Date/time: `text-sm text-muted-foreground`
Meeting ID: `meeting-id text-sm text-muted-foreground`
Trailing actions: `flex items-center gap-2` (Start = primary, Copy = ghost)

---

## Join Meeting Form
```
mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card
```
Label: `mb-1.5 block text-sm font-medium text-foreground`
Input: `w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm
        placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring`
Invalid input: `border-danger focus-visible:ring-danger`
Error text: `mt-1.5 text-xs text-danger`
Submit: use **Primary** button, full width: add `w-full`

---

## Schedule Meeting Form
```
mx-auto w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-card
```
Textarea: `min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm`
Duration segmented group:
```
inline-flex rounded-lg border border-border bg-muted p-1
```
Segment (selected): `rounded-md bg-card px-3 py-1.5 text-sm font-medium shadow-card`
Segment (idle): `rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground`
Generated link box: `flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm`
Success banner: `flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success`

---

## Video Tile
```
relative aspect-video overflow-hidden rounded-xl bg-video-tile shadow-tile
```
Active speaker: add `ring-speaker`
Empty-camera avatar (centered):
```
absolute inset-0 flex items-center justify-center
```
Avatar circle: `flex h-16 w-16 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground`
Name label: `absolute bottom-0 left-0 right-0 tile-scrim px-3 py-2`
Name text: `text-sm font-medium text-white`
Muted badge: `absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-danger text-danger-foreground`

**Video grid wrapper**
```
grid flex-1 gap-3 p-3
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
```

---

## Control Bar
```
glass-dark fixed inset-x-0 bottom-0 z-controlbar flex h-control items-center
justify-center gap-2 px-4 shadow-control
md:bottom-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:rounded-2xl md:px-3
```

**Meeting control button (toggle)** — idle:
```
flex h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-lg px-3
text-xs font-medium text-meeting-foreground transition-colors hover:bg-white/10
```
Active/"off" state (muted mic, camera off): add
```
bg-danger text-danger-foreground hover:bg-danger-hover
```
Unread/count badge: `absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground`

**Leave button** (always red, set apart): use **Danger** button + `ml-2`.

---

## Participants Panel
```
animate-slide-in-right fixed right-0 top-0 z-panel flex h-full w-full flex-col
border-l border-border bg-card sm:w-panel
```
Header: `flex items-center justify-between border-b border-border px-4 py-3`
Header title: `text-sm font-semibold`
List: `flex-1 overflow-y-auto no-scrollbar`
Row:
```
flex items-center gap-3 px-4 py-2.5 hover:bg-muted
```
Avatar: `flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium`
Name: `text-sm font-medium text-foreground`
"You" tag: `text-xs text-muted-foreground`
Host badge: `rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary`
Mute All (footer): use **Secondary** button, full width.
Remove action: ghost button with `text-danger hover:bg-danger/10`

---

## Chat Panel
```
animate-slide-in-right fixed right-0 top-0 z-panel flex h-full w-full flex-col
border-l border-border bg-card sm:w-panel
```
Messages: `flex-1 space-y-3 overflow-y-auto no-scrollbar p-4`
Message (incoming):
```
max-w-[85%] rounded-xl rounded-tl-sm bg-muted px-3 py-2
```
Message (own, right-aligned): wrapper `flex justify-end`, bubble:
```
max-w-[85%] rounded-xl rounded-tr-sm bg-primary/10 px-3 py-2
```
Sender + time row: `mb-0.5 flex items-center gap-2 text-xs text-muted-foreground`
Body: `text-sm text-foreground`
Empty state: `flex h-full flex-col items-center justify-center text-sm text-muted-foreground`
Input area:
```
flex items-center gap-2 border-t border-border p-3
```
Input: `flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm`
Send: **Primary** icon button, `disabled:opacity-50`

---

## Modal (invite / meeting info)
Overlay:
```
fixed inset-0 z-overlay bg-foreground/40 backdrop-blur-sm animate-fade-in
```
Content:
```
fixed left-1/2 top-1/2 z-modal w-full max-w-md -translate-x-1/2 -translate-y-1/2
rounded-2xl border border-border bg-card p-6 shadow-overlay animate-slide-up
```
Title: `text-lg font-semibold`
Meeting ID display: `meeting-id text-xl font-semibold tracking-wide`
Invite link row: `flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm`
Copy button: **Secondary**; on success swap label to `text-success` "Copied ✓".

---

## Loading / Skeleton states
Full-screen spinner wrap: `flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground`
Spinner: `h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary`
Skeleton meeting card: `skeleton h-20 w-full rounded-xl`
Skeleton video tile: `skeleton aspect-video w-full rounded-xl`
"Starting your meeting…" text: `text-sm text-muted-foreground animate-fade-in`
