import React from "react";
import TransitsPage from "@/app/dashboard/transits/page";
import { FixtureSeeder } from "../mocks/FixtureSeeder";
import { PageFrame } from "./PageFrame";

export const TRANSITS_SCENE_DURATION = 180; // 6s @ 30fps

// Real list view + sky strip — this page is laid out for a desktop monitor
// (~900px tall), so a tighter push-in reads better in a 1920-tall frame than
// showing the whole page with empty space below.
export function TransitsScene() {
  return (
    <FixtureSeeder>
      <PageFrame move={{ scale: [1.6, 1.75] }}>
        <TransitsPage />
      </PageFrame>
    </FixtureSeeder>
  );
}
