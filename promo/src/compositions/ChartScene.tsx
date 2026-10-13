import React from "react";
import ChartPage from "@/app/dashboard/chart/page";
import { FixtureSeeder } from "../mocks/FixtureSeeder";
import { useFrameAction, clickByText } from "./PageFrame";
import { ZoomFrame } from "./ZoomFrame";
import { ViewportFix } from "./ViewportFix";

export const CHART_SCENE_DURATION = 180; // 6s @ 30fps

const settle = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

export function ChartScene() {
  // Default tab is the real 3D orrery — opens there with zero clicks needed.
  useFrameAction(75, async () => {
    await settle();
    clickByText("Wheel");
  });
  useFrameAction(135, async () => {
    await settle();
    clickByText("Aspects");
  });

  return (
    <FixtureSeeder>
      <ViewportFix />
      <ZoomFrame scale={[1.0, 1.08]}>
        <ChartPage />
      </ZoomFrame>
    </FixtureSeeder>
  );
}
