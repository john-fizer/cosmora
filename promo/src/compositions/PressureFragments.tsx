import React from "react";
import { AbsoluteFill } from "remotion";
import { SOLAR, ORACLE } from "@/lib/design/tokens";
import { FragmentShot } from "./FragmentShot";
import { KineticStamp } from "./KineticStamp";

export const PRESSURE_FRAGMENTS_DURATION = 180; // 6s @ 30fps — matches the other fragment scenes

/**
 * Pressure beat rebuilt with the fragment technique (see ChartFragments): the
 * gauge establishes the live read, then the signals list proves it's not a
 * mood ring — three independent timing systems (transits, profection,
 * releasing) converging on the same window.
 */
export function PressureFragments() {
  return (
    <AbsoluteFill style={{ background: "#05050B" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 30%, ${SOLAR(0.16)} 0%, ${ORACLE(0.06)} 40%, transparent 70%)`,
        }}
      />

      <FragmentShot src="promo-fragments/pressure-gauge.png" enter={6} width={640} top={260} left={220} holdExitAt={92} />
      <KineticStamp lines={["KNOW WHAT'S", "COMING."]} enter={20} exitAt={90} top={1310} align="left" size={76} />

      <FragmentShot src="promo-fragments/pressure-signals.png" enter={98} width={820} top={560} left={130} holdExitAt={170} />
      <KineticStamp lines={["THREE SYSTEMS,", "ONE SIGNAL."]} enter={112} exitAt={172} top={990} align="left" size={58} />
    </AbsoluteFill>
  );
}
