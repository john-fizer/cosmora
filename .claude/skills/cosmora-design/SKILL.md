---
name: cosmora-design
description: Design and redesign Cosmora UI — components, pages, animations. Use when implementing new UI, redesigning existing screens, adding Motion animations, or enforcing the v4 design system. Invokes 21st.dev Magic for component inspiration.
---

# Cosmora Design System — v4

This skill governs all UI work in Cosmora. Read this before writing any component, page, or style.

## Design System

### Fonts (load from Google Fonts in layout.tsx)
```
Cormorant Garamond — display/headings (weights 400, 500, 600, 700)
Outfit — body text (weights 300, 400, 500, 600)
Fragment Mono — data, degrees, coordinates (weights 400, 500)
```

Import string:
```
https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Fragment+Mono&family=Outfit:wght@300;400;500;600&display=swap
```

### Color Tokens (globals.css :root)
```css
--void:      #08080F   /* primary background */
--surface:   #0E0E1A   /* cards, panels */
--elevated:  #14142A   /* hover states */
--border:    rgba(255,255,255,0.07)    /* hairline default */
--border-md: rgba(255,255,255,0.12)   /* interactive border */
--border-hi: rgba(255,255,255,0.22)   /* focus/active border */

--solar:     #C8A55B   /* Sun, gold, premium, CTAs */
--oracle:    #7B6FD4   /* violet, AI states, oracle */
--data:      #4ECDC4   /* teal, technical data */
--mars-r:    #E05C6B   /* red, Mars, warnings */
--lunar:     #A8B4D0   /* soft blue-white, Moon */

--text-1:    #EAE6F4   /* primary text */
--text-2:    #7A7690   /* secondary */
--text-3:    #3A3650   /* subtle/disabled */
```

### Motion (always use Framer Motion)
```tsx
// Page-level stagger reveal
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25,0.1,0.25,1] } } };

// Scroll reveal — use useInView from framer-motion
const { ref, inView } = useInView({ once: true, margin: "-60px" });

// Hover lift (cards only, never nav items)
whileHover={{ y: -2 }} transition={{ duration: 0.2 }}
```

### Component Patterns
- **Cards**: `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: 16px`, `padding: 20–28px`
- **Active/Focus borders**: `var(--border-hi)` — never colored glows on borders except intentional accent states
- **HUD corners**: Only on the LiquidMetalOrb and main chart panel — not on every card
- **Buttons primary**: Solar gold gradient `linear-gradient(135deg, #C8A55B, #A8852B)`, dark text `#08080F`
- **Buttons secondary**: Surface background + border-md border
- **Labels**: Fragment Mono, 8–10px, letter-spacing 1.5–2px, `var(--text-2)`
- **Data values**: Fragment Mono, sized by importance (10–16px)
- **Section headers**: Cormorant Garamond, 13–16px, light weight, spaced letters

### What NOT to Do
- No `Space Grotesk` — replaced by Outfit
- No `Share Tech Mono` — replaced by Fragment Mono
- No neon glow on every border
- No `rgba(124,58,237,...)` everywhere — oracle/violet is a *state*, not a default
- No emoji in data contexts
- No generic fade-up on everything — use stagger reveals at the section level
- No `scale` hover on data cards — use `y: -2` lift or border brightening only

## Using 21st.dev Magic
When building new components, call `mcp__magic__21st_magic_component_builder` with:
- `message`: what you need
- `searchQuery`: 2–4 word component type
- `absolutePathToCurrentFile`: the file you'll put it in
- `absolutePathToProjectDirectory`: `C:\Users\John\Desktop\cosmora`
- `standaloneRequestQuery`: specific context about Cosmora's dark theme

Then integrate the returned snippet and adapt to Cosmora's design tokens.

## Reference Files
- Brand brief: `BRAND_BRIEF.md`
- Design tokens: `src/app/globals.css`
- Fonts: `src/app/layout.tsx`
- Sidebar: `src/components/dashboard/Sidebar.tsx`
