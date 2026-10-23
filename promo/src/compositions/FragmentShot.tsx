import React from "react";
import { Img, Easing, interpolate, staticFile, useCurrentFrame } from "remotion";
import { SOLAR } from "@/lib/design/tokens";

const CELESTIAL = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * A single real-UI fragment (a flat PNG crop of an actual Cosmora screen,
 * not a live-mounted page) choreographed like the reference reel: cascades
 * in with a settle (scale + rise + fade), optionally rings itself with a
 * brand-colored glow. Flat images instead of the live app here deliberately
 * — it's what lets this cascade/scale/glow with a plain `transform` without
 * tripping the `position:fixed` containing-block issue every live-mounted
 * scene has to dodge (see ZoomFrame.tsx), and it's far cheaper to render
 * than mounting another real heavy page per shot.
 */
export function FragmentShot({
  src,
  enter,
  width,
  top,
  left,
  glow = true,
  holdExitAt,
}: {
  src: string;
  enter: number; // local frame this fragment starts cascading in
  width: number;
  top: number;
  left: number;
  glow?: boolean;
  holdExitAt?: number; // local frame to start fading out; omit to hold
}) {
  const frame = useCurrentFrame();
  const t = frame - enter;

  const settle = interpolate(t, [0, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: CELESTIAL });
  const scale = interpolate(settle, [0, 1], [0.82, 1]);
  const y = interpolate(settle, [0, 1], [48, 0]);
  let opacity = interpolate(t, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (holdExitAt !== undefined) {
    opacity *= interpolate(frame, [holdExitAt, holdExitAt + 14], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }

  const ringPulse = interpolate(t, [0, 22, 40], [0, 1, 0.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  if (t < 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width,
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
        transformOrigin: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: glow
            ? `0 0 ${18 + ringPulse * 26}px ${SOLAR(0.25 + ringPulse * 0.25)}, 0 24px 60px rgba(0,0,0,0.55)`
            : "0 24px 60px rgba(0,0,0,0.55)",
          border: glow ? `1px solid ${SOLAR(0.3 + ringPulse * 0.3)}` : "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Img src={staticFile(src)} style={{ display: "block", width: "100%", height: "auto" }} />
      </div>
    </div>
  );
}
