import React from "react";
import AstrocartographyPage from "@/app/dashboard/map/page";
import { FixtureSeeder } from "../mocks/FixtureSeeder";
import { ZoomFrame } from "./ZoomFrame";
import { ViewportFix } from "./ViewportFix";

export const MAP_SCENE_DURATION = 180; // 6s @ 30fps

// This page roots itself with `fixed inset-0` — PageFrame's transform wrapper
// made that collapse to a tiny box (a CSS transform/perspective on an
// ancestor changes the containing block for position:fixed elements per
// spec). ZoomFrame uses `zoom` instead, which doesn't trigger that.
export function MapScene() {
  return (
    <FixtureSeeder>
      <ViewportFix />
      <ZoomFrame scale={[1, 1.08]}>
        <AstrocartographyPage />
      </ZoomFrame>
    </FixtureSeeder>
  );
}
