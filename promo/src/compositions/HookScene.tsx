import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { FONT, COLOR, SOLAR } from "@/lib/design/tokens";

export const HOOK_SCENE_DURATION = 90; // 3s @ 30fps

// 3 options per the brief; #1 selected (clear differentiation + a confident,
// falsifiable claim — the other two are moodier/softer and read more like
// the site's own marketing copy than a scroll-stopping ad hook).
export const HOOK_OPTIONS = [
  "Your astrology app is guessing.\nThis one calculates.",
  "The sky, computed\nto the arcsecond.",
  "Real astronomy.\nNot vibes.",
];
const HOOK_TEXT = HOOK_OPTIONS[0];

// The app's own particle/starfield background (DashboardBg, reused verbatim)
// behind our kinetic hook line — GlassHero's hero video was tried here first
// but produces flaky/partial paints on a single-frame still render (likely
// video-element load timing), so this uses the simpler, already-proven
// starfield component instead for a reliable "the app's own cosmic visual."
export function HookScene() {
  const frame = useCurrentFrame();
  const lines = HOOK_TEXT.split("\n");
  const opacity = interpolate(frame, [0, 12, 78, 90], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, 18], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, 90], [1, 1.06], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ width: "100%", height: "100%", background: COLOR.void, position: "relative", overflow: "hidden" }}>
      <div style={{ width: "100%", height: "100%", transform: `scale(${scale})` }}>
        <DashboardBg />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 56px",
          opacity,
          transform: `translateY(${y}px)`,
        }}
      >
        <span style={{ fontFamily: FONT.data, fontSize: 13, letterSpacing: "0.34em", color: SOLAR(0.85), marginBottom: 22 }}>
          COSMORA
        </span>
        {lines.map((line, i) => (
          <span
            key={i}
            style={{
              fontFamily: FONT.display,
              fontWeight: i === lines.length - 1 ? 500 : 400,
              fontStyle: i === lines.length - 1 ? "italic" : "normal",
              color: i === lines.length - 1 ? SOLAR(0.95) : COLOR.text1,
              fontSize: 64,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
            }}
          >
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}
