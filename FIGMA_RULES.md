# Figma MCP Integration Rules — Cosmora

Rules for implementing Figma designs into this codebase and generating designs from code. Read before any design↔code sync task.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript 5, strict |
| Styling | Global CSS (`globals.css`) + Tailwind v4 utilities + inline `style={{}}` props |
| Animation | Framer Motion v12 (all motion), GSAP v3 (scroll/canvas), Three.js/R3F (3D) |
| Icons | **Inline SVGs only** — no icon library |
| Build | `next dev` / `next build` — no separate bundler config |

---

## Design Tokens

All tokens live in `src/app/globals.css` `:root`. **Always use CSS variables, never raw hex.** The skin system (5 themes) overrides these same variable names.

### v4 Canonical Names (use these in new code)

```css
/* Backgrounds */
--void:      #08080F   /* primary page background */
--surface:   #0E0E1A   /* cards, panels */
--elevated:  #14142A   /* hover states, nested panels */

/* Borders */
--border:    rgba(255,255,255,0.07)   /* default hairline */
--border-md: rgba(255,255,255,0.12)  /* interactive */
--border-hi: rgba(255,255,255,0.22)  /* focus/active */

/* Accent palette */
--solar:   #C8A55B   /* Sun, gold, CTAs, premium */
--oracle:  #7B6FD4   /* violet, AI states */
--data:    #4ECDC4   /* teal, technical readouts */
--mars-r:  #E05C6B   /* red, warnings, Mars */
--lunar:   #A8B4D0   /* soft blue-white, Moon */

/* Text */
--text-1:  #EAE6F4   /* primary */
--text-2:  #7A7690   /* secondary */
--text-3:  #3A3650   /* subtle/disabled */
```

### Legacy Aliases (existing pages use these — they map to v4 values)

```
--bg-void / --void-black       → #08080F
--bg-deep / --deep-space       → #0E0E1A
--bg-space / --cosmic-purple   → #14142A
--neon-gold / --solar-gold     → #C8A55B
--neon-violet / --neon-purple / --electric-violet → #7B6FD4
--neon-cyan / --plasma-cyan    → #4ECDC4
--neon-pink / --mars-red       → #E05C6B
--starlight-blue               → #A8B4D0
--text-primary                 → #EAE6F4
--text-secondary               → #7A7690
--text-muted                   → #3A3650
```

### Sidebar / Nav Tokens

```css
--sidebar-bg:        rgba(8,8,15,0.96)
--sidebar-border:    rgba(255,255,255,0.07)
--nav-active-bg:     rgba(123,111,212,0.10)
--nav-active-border: rgba(123,111,212,0.24)
--nav-active-text:   #EAE6F4
--nav-inactive-text: rgba(122,118,144,0.7)
--logo-gradient:     linear-gradient(135deg, #C8A55B, #A8852B)
--hud-corner-a:      #C8A55B
--hud-corner-b:      #7B6FD4
```

### Glow Tokens

```css
--glow-violet: 0 0 30px rgba(123,111,212,0.22), 0 0 80px rgba(123,111,212,0.08)
--glow-cyan:   0 0 20px rgba(78,205,196,0.22),  0 0 60px rgba(78,205,196,0.08)
--glow-gold:   0 0 20px rgba(200,165,91,0.35),  0 0 50px rgba(200,165,91,0.12)
```

---

## Typography

Three fonts, loaded via Google Fonts in both `src/app/globals.css` (@import) and `src/app/layout.tsx` (<link> tags).

| Font | CSS class | font-family value | Use for |
|---|---|---|---|
| Cormorant Garamond | `.font-display` / `.font-title` | `'Cormorant Garamond', Georgia, serif` | Headings, display, section labels |
| Outfit | `.font-body` (default body) | `'Outfit', sans-serif` | Body text, UI labels, buttons |
| Fragment Mono | `.font-mono` / `.font-hud` | `'Fragment Mono', 'Fira Code', monospace` | Degrees, coordinates, data values, nav labels |

**Weights loaded:** Cormorant 400/500/600/700 (normal + italic), Outfit 300/400/500/600, Fragment Mono 400.

**Google Fonts import string:**
```
https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Fragment+Mono&family=Outfit:wght@300;400;500;600&display=swap
```

---

## Component Patterns

### Cards

```tsx
// Standard card
style={{
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: "20px 24px",
}}

// Interactive card (hover lift — never scale)
className="glass-card-hover"  // translateY(-2px) on hover
// OR via Framer Motion:
whileHover={{ y: -2 }} transition={{ duration: 0.2 }}
```

### Buttons

```tsx
// Primary (solar gold)
className="btn-solar"
// or inline:
style={{ background: "linear-gradient(135deg, #C8A55B, #A8852B)", color: "#08080F", fontWeight: 600 }}

// Secondary
className="btn-secondary"
// or inline:
style={{ background: "var(--surface)", border: "1px solid var(--border-md)", color: "var(--text-1)" }}
```

### HUD Panels (chart panel + LiquidMetalOrb ONLY)

```tsx
className="hud-panel"
// Adds Solar gold top-left corner + Oracle violet bottom-right corner via ::before/::after
// DO NOT apply to regular cards — only main chart panel and the orb
```

### Data Labels

```tsx
// Fragment Mono, 8–10px, spaced
style={{ fontFamily: "'Fragment Mono', monospace", fontSize: 9, letterSpacing: "0.15em", color: "var(--text-2)" }}
```

### Section Headers

```tsx
// Cormorant Garamond, 13–16px, spaced
style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 14, fontWeight: 400, letterSpacing: "0.1em" }}
```

---

## Motion Rules

Always use Framer Motion. Never use CSS `transition` for interactive states that Framer can handle.

```tsx
// Page stagger — use at section level, not on every element
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25,0.1,0.25,1] as [number,number,number,number] } }
};

// Hover lift (cards only — not nav items)
whileHover={{ y: -2 }} transition={{ duration: 0.2 }}

// Nav stagger (sidebar)
const stagger = { show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } } };
const navItem = {
  hidden: { opacity: 0, x: -8 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.25,0.1,0.25,1] as [number,number,number,number] } }
};

// NEVER animate x/y on position:fixed elements — causes layout shift
// Use opacity-only entrance for fixed sidebar:
initial={{ opacity: 0 }} animate={{ opacity: 1 }}
```

**TypeScript note:** Bezier ease arrays must be cast: `[0.25,0.1,0.25,1] as [number,number,number,number]`

---

## Project Structure

```
src/
  app/
    globals.css              ← all tokens, skins, utility classes
    layout.tsx               ← font loading, theme loader script
    page.tsx                 ← landing page
    dashboard/
      layout.tsx             ← sidebar mount, md:ml-[64px] offset
      page.tsx               ← dashboard home
      [feature]/page.tsx     ← briefing, chart, transits, insights, etc.
    onboarding/page.tsx
    api/                     ← route handlers (AI, TTS, ephemeris)
  components/
    dashboard/
      Sidebar.tsx            ← fixed left nav, 64px wide
    chart/                   ← ChartWheel, PositionsTable, etc.
    oracle/                  ← VoiceOracle, InsightPlayer
    three/                   ← CosmicScene, SolarSystemOrrery, HUDPanel
    ui/                      ← LiquidMetalOrb, CommandPalette, ThemeSwitcher, etc.
    providers.tsx            ← context providers
  lib/                       ← ephemeris calculations, DB helpers
```

### Routing

- All pages: Next.js App Router, `src/app/` directory
- All interactive components: `"use client"` at top
- Dashboard layout: `src/app/dashboard/layout.tsx` wraps all `/dashboard/*` routes

### Sidebar Offset

Dashboard pages offset their content with `md:ml-[64px]` (sidebar is 64px wide). Mobile uses bottom nav — no left offset needed on mobile.

---

## Icons

**No icon library.** All icons are inline SVGs with these conventions:

```tsx
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
  {/* paths */}
</svg>

// Logo icon only — uses dark stroke on gold background:
<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="#08080F" strokeWidth="1.8">
```

When implementing a Figma icon: export as SVG, strip IDs and fill attributes, use `stroke="currentColor"` and `strokeWidth="1.5"`.

---

## Skin System

Five themes override CSS variables via `data-theme` attribute on `<html>`:

| Theme | Key color |
|---|---|
| *(default)* | Solar gold `#C8A55B` + Oracle violet `#7B6FD4` |
| `matrix` | Green `#00ff41` |
| `cyberpunk` | Hot pink `#ff0090` + yellow `#f7df1e` |
| `alien` | Teal `#00ffcc` + green `#39ff14` |
| `blood-moon` | Red `#ff4444` |
| `solar` | Orange `#f97316` + amber `#fbbf24` |

Theme persisted in `localStorage` key `'cosmora-theme'`, applied by inline script in `layout.tsx` before React hydrates.

**Rule:** All skin-aware colors must reference a CSS variable — never hardcode raw hex that should be theme-aware.

---

## CSS Methodology

- **Global CSS** (`globals.css`): tokens, utility classes, animations
- **Tailwind v4 utilities**: layout, spacing, responsive (`md:`, `lg:`), flex/grid
- **Inline `style={{}}`**: component-specific colors and sizes referencing CSS variables
- **No** CSS Modules, Styled Components, or emotion

Tailwind v4 import syntax is `@import "tailwindcss"` — not the v3 `@tailwind base/components/utilities` directives.

---

## Figma → Code

1. Map Figma color styles to nearest CSS variable (see token tables above).
2. Map Figma text styles: display → Cormorant Garamond, body → Outfit, data/mono → Fragment Mono.
3. Use `var(--surface)` for card backgrounds; `var(--border)` for hairlines.
4. Wrap interactive components in `"use client"`.
5. Hover on cards: `whileHover={{ y: -2 }}` — never `scale`.
6. `hud-panel` class only on the main chart wheel panel and LiquidMetalOrb.
7. Icons: inline SVG, `stroke="currentColor"`, `strokeWidth="1.5"`.

## Code → Figma

1. Use exact hex values from the token table for Figma color styles.
2. Font names match exactly: `Cormorant Garamond`, `Outfit`, `Fragment Mono`.
3. Solar CTA: `linear-gradient(135deg, #C8A55B, #A8852B)` fill, text `#08080F`.
4. Card radius: 16px. Border: 1px `rgba(255,255,255,0.07)` default / `rgba(255,255,255,0.12)` interactive.
5. Sidebar: 64px wide, `rgba(8,8,15,0.96)` background, fixed left.
