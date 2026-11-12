import React from "react";
import { AbsoluteFill } from "remotion";
import { SOLAR, ORACLE } from "@/lib/design/tokens";
import { FragmentShot } from "./FragmentShot";
import { KineticStamp } from "./KineticStamp";

// 3s @ 30fps — this beat only ever plays compressed inside FullReel's fast
// montage (Transits+Map together = the brief's single 21-27s beat), so the
// standalone duration matches that real usage instead of the other fragment
// scenes' full 6s, and the internal timing below is a single quick hit
// rather than the two-beat cascade Chart/Oracle/Pressure use.
export const TRANSITS_FRAGMENTS_DURATION = 90;

export function TransitsFragments() {
  return (
    <AbsoluteFill style={{ background: "#05050B" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 45%, ${ORACLE(0.16)} 0%, ${SOLAR(0.06)} 40%, transparent 70%)`,
        }}
      />

      <FragmentShot src="promo-fragments/transits-skynow.png" enter={4} width={820} top={740} left={130} holdExitAt={58} />
      <KineticStamp lines={["LIVE SKY,", "TRACKED."]} enter={14} exitAt={70} top={990} align="left" size={76} />
    </AbsoluteFill>
  );
}
