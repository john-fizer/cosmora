import React from "react";
import { AbsoluteFill } from "remotion";
import { SOLAR, ORACLE } from "@/lib/design/tokens";
import { FragmentShot } from "./FragmentShot";
import { KineticStamp } from "./KineticStamp";

export const ORACLE_FRAGMENTS_DURATION = 180; // 6s @ 30fps — matches the other fragment scenes

/**
 * Oracle beat rebuilt with the fragment technique (see ChartFragments): the
 * orb identity shot establishes what the Oracle is, then a real Q&A crop
 * (an actual grounded answer from fixtures/oracle-answer.json, not placeholder
 * copy) proves it isn't generic — it reasons about specific placements.
 */
export function OracleFragments() {
  return (
    <AbsoluteFill style={{ background: "#05050B" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 30%, ${ORACLE(0.16)} 0%, ${SOLAR(0.06)} 40%, transparent 70%)`,
        }}
      />

      <FragmentShot src="promo-fragments/oracle-orb.png" enter={6} width={520} top={260} left={280} holdExitAt={92} />
      <KineticStamp lines={["ASK IT", "ANYTHING."]} enter={20} exitAt={90} top={1310} align="left" size={76} />

      <FragmentShot src="promo-fragments/oracle-chat.png" enter={98} width={880} top={540} left={100} holdExitAt={170} />
      <KineticStamp lines={["GROUNDED IN", "YOUR EXACT CHART."]} enter={112} exitAt={172} top={990} align="left" accent="oracle" size={58} />
    </AbsoluteFill>
  );
}
