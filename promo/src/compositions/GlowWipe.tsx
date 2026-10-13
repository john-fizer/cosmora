import React from "react";
import { interpolate } from "remotion";
import { SOLAR, ORACLE } from "@/lib/design/tokens";

const HALF_WIDTH = 8; // frames on each side of a cut

/**
 * A brand-palette glow flash centered on each cut in `cuts` (global frame
 * numbers). Rendered once above every <Sequence>, driven by the FullReel's
 * own frame — not mounted per-scene, so it never risks double-mounting two
 * real dashboard pages at once (see ZoomFrame.tsx for why that's fragile).
 */
export function GlowWipe({ frame, cuts }: { frame: number; cuts: number[] }) {
  const nearest = cuts.reduce((best, c) => (Math.abs(frame - c) < Math.abs(frame - best) ? c : best), cuts[0]);
  const dist = Math.abs(frame - nearest);
  if (dist > HALF_WIDTH) return null;

  const t = 1 - dist / HALF_WIDTH; // 0 at the edges, 1 at the cut
  const opacity = interpolate(t, [0, 1], [0, 1], { extrapolateLeft: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity,
        zIndex: 999999, // must beat every real dashboard page's own sticky/header z-index
        background: `radial-gradient(circle at 50% 42%, ${SOLAR(0.95)} 0%, ${SOLAR(0.55)} 28%, ${ORACLE(0.35)} 55%, rgba(8,8,15,0.98) 78%)`,
      }}
    />
  );
}
