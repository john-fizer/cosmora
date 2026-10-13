import React, { useEffect } from "react";
import { delayRender, continueRender } from "remotion";
import TransitsPage from "@/app/dashboard/transits/page";
import { FixtureSeeder } from "../mocks/FixtureSeeder";
import { ZoomFrame } from "./ZoomFrame";
import { ViewportFix } from "./ViewportFix";

export const TRANSITS_SCENE_DURATION = 180; // 6s @ 30fps

// This page's real data flow is two effects deep (load natal from storage,
// THEN fetch transits for it) before it finishes its first real paint — a
// direct `remotion still` capture of an early frame can land before that
// settles. Holding briefly avoids capturing the loading/empty flash.
function useSettle(ms: number) {
  useEffect(() => {
    const handle = delayRender("transits-settle");
    const t = setTimeout(() => continueRender(handle), ms);
    return () => clearTimeout(t);
  }, [ms]);
}

export function TransitsScene() {
  useSettle(600);
  return (
    <FixtureSeeder>
      <ViewportFix />
      <ZoomFrame scale={[1.0, 1.08]}>
        <TransitsPage />
      </ZoomFrame>
    </FixtureSeeder>
  );
}
