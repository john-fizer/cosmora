import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { GlowButton } from "@/components/ui/primitives";
import { FONT, COLOR, SOLAR } from "@/lib/design/tokens";

export const END_CARD_SCENE_DURATION = 150; // 5s @ 30fps

export function EndCardScene() {
  const frame = useCurrentFrame();
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logoScale = interpolate(frame, [0, 20], [0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [15, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ctaOpacity = interpolate(frame, [32, 48], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const urlOpacity = interpolate(frame, [42, 58], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ width: "100%", height: "100%", background: COLOR.void, position: "relative", overflow: "hidden" }}>
      <DashboardBg />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
            width: 84,
            height: 84,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg, #C8A55B, #A8852B)",
            boxShadow: "0 0 60px rgba(200,165,91,0.35)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#08080F" strokeWidth="1.6" style={{ width: 42, height: 42 }}>
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>

        <span style={{ fontFamily: FONT.data, fontSize: 16, letterSpacing: "0.42em", color: COLOR.text1, opacity: logoOpacity }}>
          COSMORA
        </span>

        <span
          style={{
            fontFamily: FONT.display,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 30,
            color: SOLAR(0.95),
            opacity: taglineOpacity,
            textAlign: "center",
            padding: "0 40px",
          }}
        >
          Your cosmic intelligence.
        </span>

        <div style={{ opacity: ctaOpacity, marginTop: 10 }}>
          <GlowButton size="lg">Enter Cosmora →</GlowButton>
        </div>

        <span
          style={{
            fontFamily: FONT.data,
            fontSize: 12,
            letterSpacing: "0.26em",
            color: COLOR.text2,
            opacity: urlOpacity,
            marginTop: 4,
          }}
        >
          COSMORA.APP
        </span>
      </div>
    </div>
  );
}
