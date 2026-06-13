import type { Config } from "tailwindcss"

/**
 * Zoom Clone — Tailwind theme extension (light theme only).
 *
 * This config maps Tailwind utilities to the CSS variables defined in
 * `globals.css` (HSL channels), so `bg-primary`, `text-muted-foreground`,
 * `bg-meeting`, etc. all work and stay in sync with your tokens.
 *
 * Works with Tailwind CSS v3. If you use shadcn/ui, this is fully compatible.
 * (For Tailwind v4, see HOW_TO_USE.md — tokens live in globals.css via @theme.)
 */
const config: Config = {
  darkMode: ["class"], // not used (light only) but kept for shadcn compatibility
  content: [
    "./app/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          hover: "hsl(var(--danger-hover))",
          foreground: "hsl(var(--danger-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },

        // Meeting-room specific surfaces (dark stage even in light app)
        meeting: {
          DEFAULT: "hsl(var(--meeting-bg))",
          foreground: "hsl(var(--meeting-foreground))",
        },
        "video-tile": "hsl(var(--video-tile-bg))",
        "control-bar": "hsl(var(--control-bar-bg))",
      },

      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },

      fontSize: {
        // [size, lineHeight]
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.4rem" }],
        base: ["1rem", { lineHeight: "1.6rem" }],
        lg: ["1.125rem", { lineHeight: "1.6rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.75rem", { lineHeight: "2.1rem" }],
        "3xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },

      spacing: {
        navbar: "4rem", // 64px navbar height
        panel: "20rem", // 320px side panel width
        control: "5rem", // control bar height
        tile: "7rem", // action tile size
      },

      borderRadius: {
        lg: "var(--radius)", // 0.5rem / 8px — buttons, inputs
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)", // 12px — cards, panels
        "2xl": "calc(var(--radius) + 8px)", // 16px — modals, control bar
      },

      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 12px rgba(16, 24, 40, 0.06)",
        overlay: "0 8px 24px rgba(16, 24, 40, 0.12), 0 2px 6px rgba(16, 24, 40, 0.08)",
        control: "0 -4px 16px rgba(0, 0, 0, 0.18)",
        tile: "0 2px 8px rgba(0, 0, 0, 0.3)",
        focus: "0 0 0 3px hsl(var(--ring) / 0.4)",
      },

      zIndex: {
        base: "0",
        nav: "30",
        controlbar: "40",
        panel: "50",
        overlay: "60",
        modal: "70",
        toast: "80",
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(12px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-ring": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.5)" },
          "50%": { boxShadow: "0 0 0 6px hsl(var(--primary) / 0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "slide-in-right": "slide-in-right 220ms ease-out",
        "slide-up": "slide-up 200ms ease-out",
        shimmer: "shimmer 1.5s infinite",
        "pulse-ring": "pulse-ring 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
