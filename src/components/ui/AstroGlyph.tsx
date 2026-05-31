"use client";

import { SIGN_SYMBOLS, PLANET_SYMBOLS } from "@/lib/astrology/types";
import type { ZodiacSign, PlanetName } from "@/lib/astrology/types";

interface SignGlyphProps {
  sign: ZodiacSign;
  size?: number | string;
  className?: string;
}

interface PlanetGlyphProps {
  planet: PlanetName;
  color?: string;
  size?: number | string;
  className?: string;
}

export function SignGlyph({ sign, size = 16, className = "" }: SignGlyphProps) {
  return (
    <span
      className={`glyph-sign ${className}`}
      style={{ fontSize: size }}
      aria-label={sign}
    >
      {SIGN_SYMBOLS[sign]}
    </span>
  );
}

export function PlanetGlyph({ planet, color, size = 16, className = "" }: PlanetGlyphProps) {
  return (
    <span
      className={`glyph-planet ${className}`}
      style={{ fontSize: size, color }}
      aria-label={planet}
    >
      {PLANET_SYMBOLS[planet]}
    </span>
  );
}
