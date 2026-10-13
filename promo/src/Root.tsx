import React from "react";
import { Composition } from "remotion";
import "../../src/app/globals.css";
import { PressureScene, PRESSURE_SCENE_DURATION } from "./compositions/PressureScene";
import { OracleScene, ORACLE_SCENE_DURATION } from "./compositions/OracleScene";
import { ChartScene, CHART_SCENE_DURATION } from "./compositions/ChartScene";
import { TransitsScene, TRANSITS_SCENE_DURATION } from "./compositions/TransitsScene";
import { MapScene, MAP_SCENE_DURATION } from "./compositions/MapScene";
import { HookScene, HOOK_SCENE_DURATION } from "./compositions/HookScene";
import { EndCardScene, END_CARD_SCENE_DURATION } from "./compositions/EndCardScene";

const W = 1080;
const H = 1920;
const FPS = 30;

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="PressureScene"
        component={PressureScene}
        width={W}
        height={H}
        fps={FPS}
        durationInFrames={PRESSURE_SCENE_DURATION}
      />
      <Composition
        id="OracleScene"
        component={OracleScene}
        width={W}
        height={H}
        fps={FPS}
        durationInFrames={ORACLE_SCENE_DURATION}
      />
      <Composition
        id="ChartScene"
        component={ChartScene}
        width={W}
        height={H}
        fps={FPS}
        durationInFrames={CHART_SCENE_DURATION}
      />
      <Composition
        id="TransitsScene"
        component={TransitsScene}
        width={W}
        height={H}
        fps={FPS}
        durationInFrames={TRANSITS_SCENE_DURATION}
      />
      <Composition
        id="MapScene"
        component={MapScene}
        width={W}
        height={H}
        fps={FPS}
        durationInFrames={MAP_SCENE_DURATION}
      />
      <Composition
        id="HookScene"
        component={HookScene}
        width={W}
        height={H}
        fps={FPS}
        durationInFrames={HOOK_SCENE_DURATION}
      />
      <Composition
        id="EndCardScene"
        component={EndCardScene}
        width={W}
        height={H}
        fps={FPS}
        durationInFrames={END_CARD_SCENE_DURATION}
      />
    </>
  );
}
