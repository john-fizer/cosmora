import React from "react";
import { useVideoConfig } from "remotion";

/**
 * Pages that use Tailwind's `h-screen` (height: 100vh) render that as only
 * ~492px tall inside Remotion's headless renderer, regardless of the actual
 * composition size or any wrapper transform — a Remotion/Chrome quirk where
 * `100vh` doesn't resolve to the real configured viewport height the way
 * `window.innerHeight` (and getBoundingClientRect on <body>) correctly does.
 * That silently caps any `h-screen` flex layout to a cramped ~492px, which
 * collapses/clips content designed to fill the real frame (Chart, Transits,
 * Oracle all use `h-screen` for their root). This forces those elements to
 * the real composition height via a scoped !important override — far more
 * reliable than fighting the root cause, and harmless on pages that don't
 * use the class.
 */
export function ViewportFix() {
  const { height } = useVideoConfig();
  return (
    <style>{`.h-screen, .min-h-screen { height: ${height}px !important; min-height: ${height}px !important; }`}</style>
  );
}
