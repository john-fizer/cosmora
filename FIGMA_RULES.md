# Cosmora — Figma MCP Design System Rules

This document governs how Figma designs are created, read, and implemented for the Cosmora codebase. Read it before touching any Figma file or generating any UI code from a design.

---

## 1. Design Token Definitions

All design tokens are CSS custom properties defined in `src/app/globals.css` (`:root` block). There is no token-transformation system (no Style Dictionary, no Theo). Tokens map directly to CSS variables consumed as `var(--token-name)` or as literal hex/rgba values in inline `style` props.

### Color Tokens

```css
/* Backgrounds — always near-black, layered depth */
--bg-void:    #00000f      /* page root — deepest black */
--bg-deep:    #010110
--bg-space:   #020218
--bg-card:    rgba(4, 4, 28, 0.82)   /* glass card default */
--bg-card-hover: rgba(8, 8, 44, 0.9)

/* Borders */
--border-hud:    rgba(6, 182, 212, 0.22)   /* cyan HUD lines */
--border-violet: rgba(124, 58, 237, 0.35)
--border-subtle: rgba(255, 255, 255, 0.05)

/* Accent neons */
--neon-cyan:   #00e5ff
--neon-purple: #bf40ff
--neon-violet: #7c3aed
--neon-indigo: #4f46e5
--neon-pink:   #f72585
--neon-gold:   #ffd60a
--neon-green:  #00ff87

/* Text */
--text-primary:   #f0f4ff
--text-secondary: #94a3b8
--text-muted:     #3d4a60
--text-data:      #06b6d4   /* monospace data readouts */

/* Alias tokens (mapping spec names) */
--void-black:      #03040A
--deep-space:      #080D1F
--cosmic-purple:   #160A2E
--electric-violet: #A855F7
--plasma-cyan:     #22D3EE
--starlight-blue:  #3B82F6
--solar-gold:      #FACC15
--mars-red:        #F43F5E
--glass-white:     rgba(255,255,255,0.08)
--glass-border:    rgba(255,255,255,0.18)

/* Gradients */
--alien-glow:    radial-gradient(circle, #22D3EE 0%, #A855F7 45%, transparent 75%)
--liquid-metal:  linear-gradient(135deg, #0A0A0F, #1A1A2E, #7C3AED, #22D3EE)
--dark-orbit:    linear-gradient(180deg, #02030A, #0B1020, #120B24)

/* Glow box-shadows */
--glow-violet: 0 0 30px rgba(124,58,237,0.5), 0 0 80px rgba(124,58,237,0.2)
--glow-cyan:   0 0 20px rgba(0,229,255,0.4), 0 0 60px rgba(0,229,255,0.15)
--glow-purple: 0 0 40px rgba(191,64,255,0.4)
--glow-gold:   0 0 20px rgba(255,214,10,0.4)
```

### Planet Color Tokens (`src/lib/astrology/planetMeta.ts`)

Each planet has three color values used consistently across the entire app:

| Planet | `color` (primary) | `bgColor` (card bg) | `glowColor` (box-shadow alpha) |
|--------|-------------------|---------------------|-------------------------------|
| Sun | `#ffd700` | `#0e0600` | `rgba(255,215,0,0.18)` |
| Moon | `#c4b5fd` | `#06030f` | `rgba(196,181,253,0.18)` |
| Mercury | `#a78bfa` | `#05040e` | `rgba(167,139,250,0.18)` |
| Venus | `#f472b6` | `#0d0309` | `rgba(244,114,182,0.18)` |
| Mars | `#ef4444` | `#0e0202` | `rgba(239,68,68,0.20)` |
| Jupiter | `#f59e0b` | `#0a0700` | `rgba(245,158,11,0.18)` |
| Saturn | `#94a3b8` | `#04060c` | `rgba(148,163,184,0.15)` |
| Uranus | `#06b6d4` | `#00060c` | `rgba(6,182,212,0.18)` |
| Neptune | `#3b82f6` | `#020410` | `rgba(59,130,246,0.18)` |
| Pluto | `#8b5cf6` | `#05010c` | `rgba(139,92,246,0.20)` |

### Sign Colors (per-page accents, `src/app/dashboard/page.tsx`)

```ts
Aries: "#ef4444"    Taurus: "#22c55e"   Gemini: "#eab308"   Cancer: "#38bdf8"
Leo: "#f97316"      Virgo: "#4ade80"    Libra: "#facc15"    Scorpio: "#dc2626"
Sagittarius: "#f59e0b"  Capricorn: "#94a3b8"  Aquarius: "#06b6d4"  Pisces: "#8b5cf6"
```

### Aspect Colors

```ts
conjunction: "#a855f7"   opposition: "#ef4444"   trine: "#22c55e"
square: "#f59e0b"        sextile: "#06b6d4"       quincunx: "#64748b"
```

### Element Colors

```ts
Fire: "#ef4444"   Earth: "#22c55e"   Air: "#eab308"   Water: "#38bdf8"
```

---

## 2. Typography

### Font Stack

Three fonts, strictly separated by role:

| Font | Role | Class / Usage |
|------|------|---------------|
| **DM Sans** | Body text, UI copy | `font-family: 'DM Sans', sans-serif` — applied to `body` globally |
| **Space Grotesk** | Display headings, section titles, large numbers | `.font-title` class or `fontFamily: "'Space Grotesk', sans-serif"` inline |
| **Share Tech Mono** | HUD readouts, data labels, values, monospace data | `.font-hud`, `.data-label`, `.data-value` classes |

Loaded via Google Fonts CDN in `globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Share+Tech+Mono&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700&display=swap');
```

### Type Scale Patterns

```css
/* Display / hero headline */
fontSize: "clamp(2.5rem, 7vw, 5.5rem)"
letterSpacing: "-0.02em"
fontFamily: "'Space Grotesk', sans-serif"

/* Section header */
fontSize: "clamp(2rem, 4vw, 3rem)"
letterSpacing: "-0.02em"

/* HUD data label */
font-family: 'Share Tech Mono', monospace
font-size: 9px
letter-spacing: 0.15em
text-transform: uppercase
color: var(--text-muted)

/* HUD data value */
font-family: 'Share Tech Mono', monospace
font-size: 11px
color: var(--text-data)  /* #06b6d4 */

/* Eyebrow / section tag */
font-size: 10-12px
font-weight: 700
letter-spacing: 0.12–0.15em
text-transform: uppercase
```

### Gradient Text Classes

```css
.gradient-text        /* violet → indigo → cyan: #bf40ff → #7c3aed → #06b6d4 */
.gradient-text-gold   /* gold shimmer: #ffd60a → #f59e0b → #ffd60a */
.gradient-text-cyan   /* cyan: #00e5ff → #06b6d4 */
```

Applied in JSX as: `className="font-bold gradient-text"`

---

## 3. Component Library

All UI components live in `src/components/`. No Storybook.

### Directory Structure

```
src/components/
  ui/
    HolographicCard.tsx      — primary glass card container (used everywhere)
    LiquidMetalOrb.tsx       — animated Oracle orb (idle/thinking/speaking states)
    WarpTransition.tsx       — WebGL page transition + useWarpTo() hook
    CommandPalette.tsx       — ⌘K command palette
    DashboardBg.tsx          — animated starfield/nebula background
    StarField.tsx            — canvas-based particle star field
    InteractiveThermal.tsx   — cursor-reactive thermal/plasma shader background
    ScrollWarpTunnel.tsx     — scroll-triggered WebGL warp effect (landing page)
    CircleWrap.tsx           — circular text wrap utility
    ImageScanning.tsx        — HUD scan-line image treatment
    ParticlesSphere.tsx      — Three.js particle sphere
  dashboard/
    Sidebar.tsx              — 68px left sidebar (desktop) + bottom nav (mobile)
    ChatInput.tsx            — Oracle chat input with cosmic styling
    PlanetList.tsx           — scrollable planet position list
    ElementsBalance.tsx      — fire/earth/air/water balance bars
    InsightPanel.tsx         — AI insight card
  chart/
    ChartWheel.tsx           — SVG natal chart wheel
    AspectsTable.tsx         — aspect matrix display
    ChartSummaryBar.tsx      — compact chart summary
    HousesTable.tsx          — house positions table
    PositionsTable.tsx       — planet positions table
  three/
    SolarSystemOrrery.tsx    — Three.js 3D solar system
    CosmicScene.tsx          — Three.js scene wrapper
    HUDPanel.tsx             — 3D HUD panel component + ScanBar
```

### HolographicCard — Primary Card Component

**File**: `src/components/ui/HolographicCard.tsx`

The universal container for any framed content block. Structure:
- Dark glass background (`rgba(4, 4, 28, 0.80)`)
- Subtle white border (`rgba(255,255,255,0.07)`) → on hover transitions to violet (`rgba(124,58,237,0.38)`)
- 24px `backdrop-filter: blur`
- 16px `border-radius`
- Corner bracket decorations in cyan (`rgba(6,182,212,0.55)`) — 14×14px, one at each corner
- Optional 28px grid overlay (`rgba(124,58,237,0.035)`)
- Optional scan line animation
- Framer Motion: `whileInView` fade-up on mount, `whileHover` lifts 5px

```tsx
<HolographicCard glowColor="rgba(124,58,237,0.28)" delay={0} scanLine={false}>
  {/* content */}
</HolographicCard>
```

**In Figma**: Glass fill at 80% opacity dark navy. Border 1px white 7% opacity. Corner brackets as 14×14 cyan L-shapes. Drop shadow matching `glowColor`. Inner 28px grid at 3.5% violet.

### LiquidMetalOrb — Oracle State Indicator

**File**: `src/components/ui/LiquidMetalOrb.tsx`

Three states:
- `idle` — slow violet pulse, 2.8s duration
- `thinking` — faster cyan pulse, 0.7s duration, cyan color scheme
- `speaking` — violet scheme + horizontal scan line sweeping across orb

Structure (outermost → center):
1. Ambient aura blur (size × 0.18 radius, `filter: blur(size × 0.12)`)
2. Outer orbit ring (cyan, `rgba(6,182,212,...)`) rotating
3. Inner orbit ring (violet dashed, counter-rotating)
4. Orb body with radial gradient + box-shadow glow
5. Liquid highlight (white ellipse, top-left)
6. Center core (radial gradient white/violet or cyan)

### Sidebar Layout

**File**: `src/components/dashboard/Sidebar.tsx`

- **Desktop**: Fixed 68px-wide left sidebar, `z-index: 50`
  - Background: `rgba(1,1,14,0.92)`, `border-right: 1px solid rgba(6,182,212,0.12)`, `backdrop-filter: blur(28px)`
  - Active nav item: `rgba(124,58,237,0.22)` bg, `rgba(168,85,247,0.4)` border, left glow bar (`linear-gradient(180deg, #a855f7, #06b6d4)`)
  - Animated scan line sweeps the right border edge
- **Mobile**: Fixed bottom bar, `border-top: 1px solid rgba(6,182,212,0.15)`, same glass background

---

## 4. Frameworks & Libraries

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 16.2.6** (App Router, RSC) |
| UI Library | **React 19.2.4** |
| Language | **TypeScript 5** (strict, zero-error policy) |
| Styling | **Tailwind CSS v4** + inline `style` props |
| Animation | **Framer Motion 12** (primary), **GSAP 3** (occasional) |
| 3D | **React Three Fiber 9** + **@react-three/drei** + **@react-three/postprocessing** |
| AI | **Anthropic SDK**, **OpenAI SDK**, **@google/generative-ai** |
| Astro engine | **astronomy-engine 2** (transit calculations) |
| DB | **better-sqlite3** (server-side only, via API routes) |
| Special effects | **metal-fx** (chromatic aberration on CTA buttons) |
| Utility | **clsx** + **tailwind-merge** via `cn()` in `src/lib/utils.ts` |
| Icons | Inline SVG in JSX — no icon library |

**Tailwind v4 note**: No `tailwind.config.js`. Config is handled via `@import "tailwindcss"` in `globals.css`. Utility classes supplement inline styles — most complex visual styling is done via `style={}` props for dynamic values.

---

## 5. Styling Approach

### Dual-layer styling: Tailwind utilities + inline `style` props

The codebase uses both, with a clear division:

- **Tailwind utilities**: Layout, flexbox, grid, spacing, responsive breakpoints, basic text sizing
- **Inline `style` props**: All dynamic values (colors from data, glow shadows, gradients, blur), complex multi-property overrides, animation parameters

```tsx
// Typical pattern — Tailwind for layout, style for visuals
<div
  className="flex items-center gap-3 px-4 py-3 rounded-xl"
  style={{
    background: "rgba(124,58,237,0.15)",
    border: "1px solid rgba(124,58,237,0.35)",
    boxShadow: "0 0 20px rgba(124,58,237,0.2)",
    backdropFilter: "blur(12px)",
  }}
>
```

### Global CSS Classes (from `globals.css`)

Use these before creating new styles:

```
.glass-card           — backdrop-blur card with HUD border
.glass-card-hover     — glass-card + hover violet glow
.hud-panel            — glass-card + CSS corner bracket pseudo-elements
.hud-scan-bar::after  — animated horizontal scan sweep
.gradient-text        — violet→cyan gradient text
.gradient-text-gold   — gold shimmer gradient text
.gradient-text-cyan   — cyan gradient text
.glow-violet/cyan/purple/gold  — box-shadow glow classes
.glow-text            — violet text-shadow glow
.glow-text-cyan       — cyan text-shadow glow
.data-label           — Share Tech Mono, 9px, uppercase, muted
.data-value           — Share Tech Mono, 11px, cyan (#06b6d4)
.cosmic-input         — form input with HUD border + violet focus ring
.starfield            — full-screen radial gradient cosmic background
.chart-glow           — drop-shadow filter for SVG chart wheel
.animate-float        — 7s vertical float loop
.animate-rotate-slow  — 60s clockwise rotation
.animate-rotate-reverse — 40s counter-rotation
.animate-pulse-glow   — 3s opacity pulse
.animate-flicker      — 8s realistic flicker
```

### No CSS Modules, No Styled Components

Zero. Everything is globals + Tailwind + inline `style`.

### Responsive Strategy

- Mobile: `md:hidden` / `hidden md:flex` pattern (breakpoint: 768px)
- Dashboard: Desktop = sidebar left + content; Mobile = content full-width + bottom nav
- Mobile bottom nav pad: `.mobile-nav-pad { padding-bottom: 72px }`
- Mobile-safe area: `padding-bottom: max(8px, env(safe-area-inset-bottom))`
- Font sizes use `clamp()` for fluid scaling: `clamp(min, viewport, max)`

---

## 6. Asset Management

### Images
No image assets in the current codebase. All "imagery" is procedurally generated:
- WebGL shaders (warp tunnel, thermal interactive background)
- Three.js 3D scenes (orrery, particle sphere)
- CSS radial gradients (nebula orbs, glow effects)
- SVG (chart wheel, icons)

### Fonts
Loaded externally from Google Fonts CDN (see Typography section). No local font files.

### No CDN configuration. No asset optimization pipeline beyond Next.js defaults.

---

## 7. Icon System

**No icon library.** All icons are:

1. **Inline SVG in JSX** — used for navigation and UI icons
2. **Unicode astrological glyphs** — used for planetary and zodiacal symbols
3. **Single-character symbols** — used as decorative markers

### Inline SVG Pattern (Sidebar nav icons)

```tsx
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
  {/* paths */}
</svg>
```
Size: always `w-5 h-5` (20×20px) in navigation, `w-6 h-6` in feature cards.
Color: inherited via `currentColor` — parent sets color.

### Planetary Glyphs (Unicode)

Defined in `src/lib/astrology/types.ts` as `PLANET_SYMBOLS`:

```ts
☉ Sun      ☽ Moon     ☿ Mercury   ♀ Venus    ♂ Mars
♃ Jupiter  ♄ Saturn   ♅ Uranus    ♆ Neptune  ♇ Pluto
☊ NorthNode
```

### Zodiac Sign Glyphs (`SIGN_SYMBOLS`)

```ts
♈ Aries  ♉ Taurus  ♊ Gemini  ♋ Cancer  ♌ Leo  ♍ Virgo
♎ Libra  ♏ Scorpio  ♐ Sagittarius  ♑ Capricorn  ♒ Aquarius  ♓ Pisces
```

### Aspect Glyphs

```ts
☌ conjunction  ☍ opposition  △ trine  □ square  ⚹ sextile  ⚻ quincunx
```

### Decorative Symbols

```
✦  — star/bullet (used as checkmark in lists, rating stars)
◎  — circle-dot (dashboard home icon)
◉  — filled circle (chart icon)
◈  — diamond-circle (insights)
⊕  — circled plus (add/onboarding)
```

### Naming Convention

No formal naming system. SVG icons are written inline; named by their nav label (`Home`, `Chart`, `Transits`, etc.). Planetary glyphs are referenced via `PLANET_SYMBOLS[planetName]`.

---

## 8. Project Structure

```
cosmora/
├── src/
│   ├── app/                          — Next.js App Router pages
│   │   ├── globals.css               — ALL design tokens + global classes
│   │   ├── layout.tsx                — Root layout (font, meta)
│   │   ├── page.tsx                  — Landing page
│   │   ├── onboarding/page.tsx       — Birth data form
│   │   ├── dashboard/
│   │   │   ├── layout.tsx            — WarpTransitionProvider + CommandPalette
│   │   │   ├── page.tsx              — Dashboard hub
│   │   │   ├── oracle/page.tsx       — AI Oracle chat
│   │   │   ├── report/page.tsx       — 8-chapter natal report
│   │   │   ├── transits/page.tsx     — Live transits
│   │   │   ├── chart/
│   │   │   │   ├── page.tsx          — Chart overview
│   │   │   │   ├── [planet]/page.tsx — Per-planet deep-dive
│   │   │   │   └── house/[n]/page.tsx — Per-house page
│   │   │   ├── briefing/page.tsx
│   │   │   ├── timeline/page.tsx
│   │   │   ├── electional/page.tsx
│   │   │   ├── solar-return/page.tsx
│   │   │   ├── compatibility/page.tsx
│   │   │   ├── insights/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── api/
│   │       ├── chat/route.ts         — SSE streaming Oracle (multi-model)
│   │       ├── suggest/route.ts      — A/B/C follow-up suggestions
│   │       ├── models/route.ts       — Model availability check
│   │       ├── chart/route.ts        — Chart calculation
│   │       ├── transits/route.ts     — Transit calculation
│   │       ├── geocode/route.ts      — Birth place geocoding
│   │       └── solar-return/route.ts
│   ├── components/
│   │   ├── ui/                       — Reusable visual primitives
│   │   ├── dashboard/                — Dashboard-specific components
│   │   ├── chart/                    — Chart display components
│   │   └── three/                    — Three.js / WebGL components
│   └── lib/
│       ├── astrology/
│       │   ├── types.ts              — ChartData, PlanetPosition, etc.
│       │   ├── planetMeta.ts         — Planet colors, glyphs, archetypes
│       │   ├── calculator.ts         — Swiss Ephemeris chart calc
│       │   ├── transits.ts           — Transit calculations
│       │   └── fixedStars.ts         — Fixed star data
│       ├── oracle/
│       │   ├── knowledge.ts          — RAG-lite doctrine database
│       │   └── models.ts             — AI model config (provider/tokens/colors)
│       ├── storage.ts                — localStorage read/write helpers
│       ├── skills.ts                 — Oracle skill selector
│       └── utils.ts                  — cn() (clsx + twMerge)
├── skills/                           — Claude Code Oracle skills (astrological)
├── .claude/skills/run-cosmora/       — Dev runner skill
├── CLAUDE.md → AGENTS.md             — Project instructions
└── cosmora.db                        — SQLite (server-side, not committed)
```

### Data Flow Pattern

All chart data flows through localStorage → React state → API calls:
1. `getProfile()` / `getActiveProfileId()` → reads birth data from localStorage
2. `getCachedChart()` → reads computed ChartData from localStorage
3. API routes compute chart server-side, write cache via `setCachedChart()`
4. Dashboard pages read cached chart on mount, pass to child components as props

### Page Layout Pattern (Dashboard pages)

Every dashboard page follows this shell:

```tsx
"use client";

export default function PageName() {
  const warpTo = useWarpTo();
  // chart data from localStorage
  
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-void)" }}>
      <Sidebar />
      <main style={{ marginLeft: 68, padding: "24px" }}>  {/* 68px = sidebar width */}
        {/* content */}
      </main>
    </div>
  );
}
```

Mobile: `marginLeft: 0`, `paddingBottom: 72px` (bottom nav clearance).

---

## 9. Figma Integration Rules

### When generating Figma designs from code

1. **Background**: Always `#00000f` or `#03040A` page fill. Never white, never light grey.
2. **Cards**: Glass fill effect — `rgba(4,4,28,0.82)`, border `rgba(255,255,255,0.07)`, blur 24. Corner brackets in cyan at 55% opacity.
3. **Color accent**: Default to violet (`#7c3aed` / `#a855f7`). Cyan (`#06b6d4`) for data/active state. Gold (`#ffd60a`) for profection year highlights.
4. **Gradients on interactive elements**: Buttons always use `linear-gradient(135deg, #7c3aed, #4f46e5)`. Never flat fills for primary CTAs.
5. **Text**: Primary = `#f0f4ff`. Secondary = `#94a3b8`. Muted = `#3d4a60`. Data = `#06b6d4`.
6. **Borders**: Never solid black or grey — always neon at low opacity (8–35%).
7. **Planetary colors**: Use the exact hex values from the planet token table above. Do not approximate.
8. **Typography**: Space Grotesk for headings (letter-spacing tight: -0.02em). DM Sans for body. Share Tech Mono for all HUD/data labels.
9. **Glow**: Important UI elements have box-shadows. Represent as blur/spread in Figma using the glow token values.
10. **Corner brackets**: The HolographicCard corner bracket pattern is the signature element — 14px L-shaped corners in cyan at top-left and bottom-right.

### When implementing designs from Figma into code

1. **Check existing components first** — `HolographicCard`, `LiquidMetalOrb`, sidebar, `cosmic-input` classes cover most patterns.
2. **Use inline `style` for all color/shadow/gradient values** — do not extend Tailwind config.
3. **All new dashboard pages** must include `<Sidebar />` and use `marginLeft: 68` on the main content.
4. **Use `useWarpTo()`** for all programmatic navigation from the dashboard — never `router.push()` directly.
5. **Animation**: Use Framer Motion. Follow existing patterns: `initial={{ opacity: 0, y: 20 }}`, `whileInView={{ opacity: 1, y: 0 }}`, `viewport={{ once: true }}`.
6. **`"use client"`** directive on every interactive or animated component.
7. **Three.js components**: Always wrap in `dynamic(..., { ssr: false })`.
8. **TypeScript zero errors**: Run `npx tsc --noEmit` before marking any implementation complete.
