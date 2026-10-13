import React from "react";
import AstrocartographyPage from "@/app/dashboard/map/page";
import { FixtureSeeder } from "../mocks/FixtureSeeder";
import { PageFrame } from "./PageFrame";

export const MAP_SCENE_DURATION = 180; // 6s @ 30fps

export function MapScene() {
  return (
    <FixtureSeeder>
      {/* NOTE: the real map panel renders small here (likely sized for a
          desktop sibling layout we don't mount) — framing is a known rough
          edge to revisit after the overall cut is approved. */}
      <PageFrame origin="0% 0%" move={{ scale: [1.6, 1.75] }}>
        <AstrocartographyPage />
      </PageFrame>
    </FixtureSeeder>
  );
}
