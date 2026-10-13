import React from "react";
import ChartPage from "@/app/dashboard/chart/page";
import { FixtureSeeder } from "../mocks/FixtureSeeder";
import { PageFrame, useFrameAction, clickByText } from "./PageFrame";

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
      <PageFrame move={{ scale: [1.0, 1.05], tiltX: [0.8, 0] }}>
        <ChartPage />
      </PageFrame>
    </FixtureSeeder>
  );
}
