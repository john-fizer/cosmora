import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { FONT, SOLAR, COLOR } from "@/lib/design/tokens";

const CELESTIAL = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * Bold full-bleed kinetic type stamped into negative space, replacing the
 * old pill caption (SceneCaption.tsx) for the fragment-based cut. Uses the
 * brand's body face (Outfit) at heavy weight rather than the display serif
 * (Cormorant) — Law 3 allows weight variation within a typeface, and a
 * serif italic reads elegant, not kinetic; the reference's impact comes
 * from a heavy grotesque, not from switching faces.
 */
export function KineticStamp({
  lines,
  enter,
  exitAt,
  top,
  accent = "solar",
  align = "left",
  size = 64,
}: {
  lines: string[];
  enter: number;
  exitAt: number;
  top: number;
  accent?: "solar" | "oracle" | "white";
  align?: "left" | "right";
  size?: number;
}) {
  const frame = useCurrentFrame();
  const t = frame - enter;
  if (t < -2) return null;

  const rise = interpolate(t, [0, 18], [26, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: CELESTIAL });
  const opacity =
    interpolate(t, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    interpolate(frame, [exitAt, exitAt + 12], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const color = accent === "solar" ? SOLAR(0.98) : accent === "oracle" ? "rgba(123,111,212,0.98)" : COLOR.text1;

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: align === "left" ? 48 : undefined,
        right: align === "right" ? 48 : undefined,
        opacity,
        transform: `translateY(${rise}px)`,
        textAlign: align,
        zIndex: 999998,
        pointerEvents: "none",
      }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: FONT.body,
            fontWeight: 800,
            fontSize: size,
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            color: i === lines.length - 1 ? color : COLOR.text1,
            textShadow: i === lines.length - 1 ? `0 0 28px ${SOLAR(0.4)}` : "0 4px 24px rgba(0,0,0,0.6)",
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}
