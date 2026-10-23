import React from "react";
import { AbsoluteFill } from "remotion";
import { SOLAR, ORACLE } from "@/lib/design/tokens";
import { FragmentShot } from "./FragmentShot";
import { KineticStamp } from "./KineticStamp";

export const CHART_FRAGMENTS_DURATION = 180; // 6s @ 30fps — demo cut for the new direction

/**
 * Demo rebuild of the Chart beat using the reference reel's technique:
 * isolated real-UI fragments (flat crops, not a live full-page mount)
 * cascading in with glow, paired with bold kinetic type — instead of one
 * static zoom on the full page (ChartScene.tsx, untouched). Standalone
 * composition so it can be previewed/rendered on its own before touching
 * FullReel or the other six scenes.
 */
export function ChartFragments() {
  return (
    <AbsoluteFill style={{ background: "#05050B" }}>
      {/* ambient depth glow, static */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 38%, ${SOLAR(0.14)} 0%, ${ORACLE(0.08)} 35%, transparent 70%)`,
        }}
      />

      <FragmentShot src="promo-fragments/chart-orrery.png" enter={6} width={920} top={300} left={80} holdExitAt={92} />
      <KineticStamp lines={["YOUR EXACT", "SKY."]} enter={20} exitAt={90} top={1310} align="left" size={76} />

      <FragmentShot src="promo-fragments/chart-wheel.png" enter={98} width={620} top={330} left={230} holdExitAt={170} />
      <KineticStamp lines={["EVERY PLACEMENT,", "PRECISE."]} enter={112} exitAt={172} top={1040} align="left" size={64} />
    </AbsoluteFill>
  );
}
