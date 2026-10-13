import React from "react";
import PressurePage from "@/app/dashboard/pressure/page";
import { FixtureSeeder } from "../mocks/FixtureSeeder";
import { useFrameAction, clickByText } from "./PageFrame";
import { ZoomFrame } from "./ZoomFrame";
import { ViewportFix } from "./ViewportFix";

export const PRESSURE_SCENE_DURATION = 180; // 6s @ 30fps

export function PressureScene() {
  useFrameAction(20, async () => {
    // Let PressurePage's own mount effect (ready/profile/chart) flush & repaint first.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    clickByText("Read the windows");
    await new Promise((r) => setTimeout(r, 1100)); // matches fetchMock's /api/pressure delay
  });

  return (
    <FixtureSeeder>
      <ViewportFix />
      <ZoomFrame scale={[1.08, 1.0]}>
        <PressurePage />
      </ZoomFrame>
    </FixtureSeeder>
  );
}
