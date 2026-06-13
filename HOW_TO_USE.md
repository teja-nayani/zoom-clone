# How to Use These Files

A drop-in styling foundation for a Zoom-inspired Next.js + Tailwind + shadcn/ui project. **Light theme only.**

---

## 1. File Placement

Assuming a fresh Next.js (App Router) project:

```
your-app/
├─ app/
│  ├─ globals.css        ← put globals.css here (replace the default)
│  └─ layout.tsx         ← import globals.css + set up the font
├─ tailwind.config.ts    ← put tailwind.config.ts at the project root
├─ DESIGN_GUIDELINES.md  ← reference doc (anywhere, e.g. /docs)
├─ HOW_TO_USE.md         ← this file
└─ UI_USAGE_EXAMPLES.md  ← class-name cheatsheet
```

> Using the `src/` directory? Place `globals.css` in `src/app/` and keep `tailwind.config.ts` at the root. The `content` globs already include `./src/**`.

---

## 2. Install Dependencies

```bash
# Tailwind v3 + the animation plugin used by shadcn and this config
npm install -D tailwindcss@3 postcss autoprefixer tailwindcss-animate
npx tailwindcss init -p   # only if you don't already have postcss config

# shadcn/ui
npx shadcn@latest init
```

When `shadcn init` asks, point it at `app/globals.css` and `tailwind.config.ts`. Then add components as needed:

```bash
npx shadcn@latest add button input dialog calendar avatar dropdown-menu scroll-area textarea select
```

---

## 3. Merge the Tailwind Config

If you already have a `tailwind.config.ts`, **merge** rather than overwrite:

- Copy everything under `theme.extend` (colors, fontFamily, fontSize, spacing, borderRadius, boxShadow, zIndex, keyframes, animation).
- Keep `darkMode: ["class"]` for shadcn compatibility — we simply never add the `dark` class, so the app stays light.
- Ensure `tailwindcss-animate` is in `plugins`.
- Make sure your `content` globs cover where your components live.

---

## 4. Import globals.css & Set the Font

In `app/layout.tsx`:

```tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans", // matches the token in globals.css / tailwind config
})

export const metadata: Metadata = {
  title: "Zoom Clone",
  description: "A Zoom-inspired meetings app",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} bg-background`}>
      <body className="font-sans text-foreground antialiased">{children}</body>
    </html>
  )
}
```

> The font family is wired through the `--font-sans` CSS variable, which both `globals.css` and `tailwind.config.ts` reference. Use the `font-sans` / `font-mono` utility classes in your markup — don't hardcode font names.

### Tailwind v4 note
If you prefer Tailwind v4 (no JS config), move the tokens into `globals.css` using `@theme inline { --color-primary: hsl(var(--primary)); ... }` and `@import "tailwindcss";`. The token names here are designed to translate 1:1. For the assignment, **Tailwind v3 + this `tailwind.config.ts` is the simplest path** and is what shadcn defaults to.

---

## 5. Using the Tokens

Always prefer semantic tokens over raw colors:

| Need | Use | Avoid |
|---|---|---|
| Page/app bg | `bg-background` | `bg-white` |
| Body text | `text-foreground` | `text-black` |
| Primary action | `bg-primary text-primary-foreground hover:bg-primary-hover` | `bg-blue-600` |
| Secondary text | `text-muted-foreground` | `text-gray-500` |
| Card | `bg-card border border-border rounded-xl shadow-card` | ad-hoc shadows |
| Destructive | `bg-danger text-danger-foreground` | `bg-red-600` |
| Meeting stage | `bg-meeting text-meeting-foreground` | `bg-zinc-900` |
| Video tile | `bg-video-tile` | `bg-zinc-800` |
| Control bar | `bg-control-bar` or `.glass-dark` | `bg-black/90` |
| Focus | handled globally via `:focus-visible` + `ring-ring` | none |

Opacity modifiers work because tokens are HSL channels: `bg-primary/10`, `ring-primary/40`, etc.

Custom utilities available: `.meeting-id`, `.tile-scrim`, `.ring-speaker`, `.glass-dark`, `.no-scrollbar`, `.skeleton`.

Custom spacing/sizing: `h-navbar`, `w-panel`, `h-control`, `w-tile`, plus shadows `shadow-card`/`shadow-overlay`/`shadow-control`, and animations `animate-fade-in`, `animate-slide-in-right`, `animate-slide-up`, `animate-shimmer`.

---

## 6. Maintaining Zoom-like Consistency

- **Blue is for actions only.** Surfaces stay white/neutral; the meeting room stays dark.
- **One primary button per view.** Everything else is secondary/ghost.
- **Destructive = red.** Leave, End, Remove, and error states use `danger`.
- **Cards are uniform.** Reuse the same `bg-card border-border rounded-xl shadow-card` recipe for dashboard, meeting, and scheduled cards.
- **Side panels share one shell.** Participants and Chat use the same width (`w-panel`), border, slide-in animation, and header layout.
- **Icons from one set.** Use `lucide-react` (ships with shadcn). Never use emojis as icons.
- **Type scale is fixed.** Use the sizes in `DESIGN_GUIDELINES.md §3` — don't invent new ones.

---

## 7. Common Mistakes to Avoid

- ❌ Overwriting an existing `tailwind.config.ts` instead of merging.
- ❌ Forgetting `tailwindcss-animate` → animations/`animate-*` silently do nothing.
- ❌ Hardcoding `bg-white`/`text-black`/`bg-blue-600` instead of tokens.
- ❌ Adding a `dark` class or theme toggle (this build is light-only).
- ❌ Making the meeting room light — it must use `bg-meeting`.
- ❌ Not setting `--font-sans` via `next/font` → falls back to system font.
- ❌ Using single-color hex in tokens — they must be **HSL channels** (`212 89% 46%`, not `#0d6bde`) for `hsl(var(--x))` and opacity modifiers to work.
- ❌ Skipping `aria-label` on icon-only buttons (mic, camera, leave).

---

## 8. Quick Verification

After setup, drop this on a page to confirm tokens resolve:

```tsx
<div className="p-6 space-y-3">
  <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary-hover">Primary</button>
  <div className="rounded-xl border border-border bg-card p-5 shadow-card">Card</div>
  <p className="meeting-id text-lg">123 4567 8901</p>
  <div className="rounded-xl bg-meeting p-6 text-meeting-foreground">Meeting stage</div>
</div>
```

If the button is Zoom blue, the card has a soft shadow, the ID is monospaced, and the stage is near-black — you're wired up correctly.
