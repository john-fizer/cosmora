/**
 * COSMORA DESIGN CONSTITUTION
 * The single source of truth. Pages compose from these tokens and the
 * primitives in components/ui/primitives.tsx — nothing else.
 *
 * Law 1: UI chrome uses ONLY the brand palette below.
 * Law 2: Planet/sign colors are DATA colors — they may color data points,
 *        glyphs, and chart lines, never buttons, borders, panels, or accents.
 * Law 3: Three typefaces. Display = Cormorant Garamond. Body = Outfit.
 *        Data = Fragment Mono. No exceptions.
 * Law 4: Motion is celestial — slow, gravitational, eased like orbits.
 */

// ─── Palette ──────────────────────────────────────────────────────────────────

export const COLOR = {
  // Foundations
  void:       "#08080F",
  surface:    "#0E0E1A",
  surfaceUp:  "#14142400",   // gradient stop helper

  // Brand accents — the ONLY two chrome accents in the product
  solar:      "#C8A55B",     // primary: gold — action, identity, headlines
  oracle:     "#7B6FD4",     // secondary: violet — intelligence, AI, secondary glow

  // Text
  text1:      "#EAE6F4",
  text2:      "rgba(234,230,244,0.62)",
  text3:      "rgba(234,230,244,0.38)",

  // Semantic (used sparingly — alerts and live states only)
  caution:    "#E8A33D",
  danger:     "#D4564E",
  positive:   "#5BB98C",

  // Hairlines & glass
  border:     "rgba(234,230,244,0.08)",
  borderGold: "rgba(200,165,91,0.28)",
  glass:      "rgba(255,255,255,0.035)",
} as const;

// Alpha helpers for the two accents (consistent glow recipes)
export const SOLAR = (a: number) => `rgba(200,165,91,${a})`;
export const ORACLE = (a: number) => `rgba(123,111,212,${a})`;

// ─── Data colors (Law 2 — data only, never chrome) ───────────────────────────

export const PLANET_DATA_COLORS: Record<string, string> = {
  Sun: "#E8C572", Moon: "#C9D4E8", Mercury: "#A89FE0", Venus: "#E0A9C5",
  Mars: "#D4564E", Jupiter: "#D9A954", Saturn: "#9BA8BC", Uranus: "#7FBFCC",
  Neptune: "#7C95D4", Pluto: "#9C8AC4", NorthNode: "#8A93A8", Chiron: "#9A8FD0",
};

export const ELEMENT_DATA_COLORS = {
  fire:  "#D4775E",
  earth: "#A8B07A",
  air:   "#9FB8CC",
  water: "#7C9FD4",
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

export const FONT = {
  display: "'Cormorant Garamond', Georgia, serif",
  body:    "'Outfit', system-ui, sans-serif",
  data:    "'Fragment Mono', monospace",
} as const;

// Data-readout text style (the HUD voice) — spread into style props
export const DATA_TEXT = {
  fontFamily: FONT.data,
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
};

// ─── Motion grammar ───────────────────────────────────────────────────────────

export const EASE_CELESTIAL = [0.16, 1, 0.3, 1] as const;   // primary ease — gravitational settle
export const EASE_DRIFT     = [0.45, 0, 0.15, 1] as const;  // long ambient drifts

export const DURATION = {
  fast:   0.25,   // micro feedback
  base:   0.6,    // standard entrance
  slow:   1.1,    // section reveals
  drift:  2.4,    // ambient/background
} as const;

export const STAGGER = 0.07;

// ─── Spacing rhythm ───────────────────────────────────────────────────────────

export const RADIUS = { sm: 10, md: 16, lg: 24, xl: 32 } as const;

// ─── Glow recipes ─────────────────────────────────────────────────────────────

export const GLOW = {
  solarSoft:  `0 0 24px ${SOLAR(0.18)}`,
  solarStrong:`0 0 14px ${SOLAR(0.45)}, 0 0 48px ${SOLAR(0.15)}`,
  oracleSoft: `0 0 24px ${ORACLE(0.20)}`,
  textSolar:  `0 0 12px ${SOLAR(0.6)}`,
} as const;
