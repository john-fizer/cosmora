import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { HAS_SCORE, SCORE_SRC } from "../audio";
import { HookScene } from "./HookScene";
import { ChartFragments } from "./ChartFragments";
import { OracleFragments } from "./OracleFragments";
import { PressureScene } from "./PressureScene";
import { TransitsScene } from "./TransitsScene";
import { MapScene } from "./MapScene";
import { EndCardScene } from "./EndCardScene";
import { GlowWipe } from "./GlowWipe";
import { SceneCaption } from "./SceneCaption";

// Scene order + durations per the brief's timing spec. Transits and Map are
// trimmed from their standalone 6s preview length (180f) to 3s each (90f) —
// together they're the brief's single "21-27s fast montage" beat, not two
// full 6s scenes back to back.
const HOOK = 90; // 0-3s
const CHART = 180; // 3-9s
const ORACLE = 180; // 9-15s
const PRESSURE = 180; // 15-21s
const TRANSITS = 90; // 21-24s
const MAP = 90; // 24-27s
const END_CARD = 150; // 27-32s

export const FULL_REEL_DURATION = HOOK + CHART + ORACLE + PRESSURE + TRANSITS + MAP + END_CARD; // 960f = 32s

const HOOK_FROM = 0;
const CHART_FROM = HOOK_FROM + HOOK;
const ORACLE_FROM = CHART_FROM + CHART;
const PRESSURE_FROM = ORACLE_FROM + ORACLE;
const TRANSITS_FROM = PRESSURE_FROM + PRESSURE;
const MAP_FROM = TRANSITS_FROM + TRANSITS;
const END_CARD_FROM = MAP_FROM + MAP;

const CUTS = [CHART_FROM, ORACLE_FROM, PRESSURE_FROM, TRANSITS_FROM, MAP_FROM, END_CARD_FROM];

// A soft volume swell under each cut ("hits on scene changes" per the brief)
// once a real score is dropped in — see ../audio.ts.
function scoreVolume(frame: number) {
  const nearest = CUTS.reduce((best, c) => (Math.abs(frame - c) < Math.abs(frame - best) ? c : best), CUTS[0]);
  const dist = Math.abs(frame - nearest);
  const hit = interpolate(dist, [0, 10], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return 0.55 + hit * 0.35;
}

export function FullReel() {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: "#08080F" }}>
      {HAS_SCORE && <Audio src={staticFile(SCORE_SRC)} volume={scoreVolume} />}
      <Sequence from={HOOK_FROM} durationInFrames={HOOK} name="Hook">
        <HookScene />
      </Sequence>

      <Sequence from={CHART_FROM} durationInFrames={CHART} name="Chart">
        <ChartFragments />
      </Sequence>

      <Sequence from={ORACLE_FROM} durationInFrames={ORACLE} name="Oracle">
        <OracleFragments />
      </Sequence>

      <Sequence from={PRESSURE_FROM} durationInFrames={PRESSURE} name="Pressure">
        <PressureScene />
        <SceneCaption text="Know what's coming" />
      </Sequence>

      <Sequence from={TRANSITS_FROM} durationInFrames={TRANSITS} name="Transits">
        <TransitsScene />
        <SceneCaption text="Live sky, tracked" />
      </Sequence>

      <Sequence from={MAP_FROM} durationInFrames={MAP} name="Map">
        <MapScene />
        <SceneCaption text="Where you're powerful" />
      </Sequence>

      <Sequence from={END_CARD_FROM} durationInFrames={END_CARD} name="EndCard">
        <EndCardScene />
      </Sequence>

      <GlowWipe frame={frame} cuts={CUTS} />
    </AbsoluteFill>
  );
}
