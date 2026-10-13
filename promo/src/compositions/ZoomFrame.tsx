import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

/**
 * The standard camera wrapper for every scene that mounts a real dashboard
 * page. Every one of those pages renders `DashboardBg` (and some add their
 * own vignette layers) as `position: fixed` — and a CSS `transform` (or
 * `perspective`, or `filter`) on ANY ancestor makes that ancestor the
 * containing block for `position: fixed` descendants instead of the true
 * viewport (CSS spec). PageFrame's transform-based tilt silently corrupted
 * that fixed starfield into warped, oversized blobs once `ViewportFix` also
 * started giving these pages their real (not ~492px-capped) height — the
 * distortion was there all along, just subtle enough at ~492px to miss.
 * `zoom` doesn't trigger that containing-block rule, so fixed descendants
 * stay viewport-relative while still visually scaling. No tilt/pan support
 * (zoom doesn't give us that) — a push-in is enough; see PageFrame.tsx for
 * the interaction helpers (`useFrameAction`, `clickByText`), which are
 * independent of which camera wrapper is used.
 */
export function ZoomFrame({ children, scale = [1, 1] }: { children: React.ReactNode; scale?: [number, number] }) {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const z = interpolate(frame, [0, durationInFrames - 1], scale, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ width, height, overflow: "hidden", background: "#08080F" }}>
      <div style={{ width, height, zoom: z }}>{children}</div>
    </div>
  );
}
