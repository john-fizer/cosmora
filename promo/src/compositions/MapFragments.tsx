import React from "react";
import { AbsoluteFill } from "remotion";
import { SOLAR, ORACLE } from "@/lib/design/tokens";
import { FragmentShot } from "./FragmentShot";
import { KineticStamp } from "./KineticStamp";

// 3s @ 30fps — matches this beat's real compressed usage inside FullReel's
// fast montage (see TransitsFragments.tsx for the same note).
export const MAP_FRAGMENTS_DURATION = 90;

export function MapFragments() {
  return (
    <AbsoluteFill style={{ background: "#05050B" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 35%, ${SOLAR(0.18)} 0%, ${ORACLE(0.06)} 40%, transparent 70%)`,
        }}
      />

      <FragmentShot src="promo-fragments/map-energyline.png" enter={4} width={560} top={260} left={260} holdExitAt={58} />
      <KineticStamp lines={["WHERE YOU'RE", "POWERFUL."]} enter={14} exitAt={70} top={940} align="left" size={72} />
    </AbsoluteFill>
  );
}
