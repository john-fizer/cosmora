import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { FONT, SOLAR } from "@/lib/design/tokens";

/**
 * The brief's "kinetic text (2-5 words)" requirement, layered over each real
 * mounted page in FullReel without touching the already-approved scene
 * files/stills. A self-contained pill chip (not raw floating text) so it
 * reads clearly regardless of what real UI happens to sit behind it, and a
 * very high z-index so it isn't lost under a page's own sticky header —
 * real dashboard chrome commonly uses z-40/z-50 for sticky nav bars, which
 * otherwise paints above anything with a lower z-index (see GlowWipe.tsx).
 */
export function SceneCaption({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, 46, 58], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, 14], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        top: 56,
        left: 40,
        opacity,
        transform: `translateY(${y}px)`,
        zIndex: 999999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "rgba(8,8,15,0.78)",
          border: `1px solid ${SOLAR(0.4)}`,
          borderRadius: 999,
          padding: "11px 22px",
          boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
        }}
      >
        <span
          style={{
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 26,
            letterSpacing: "-0.01em",
            color: SOLAR(0.95),
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
}
