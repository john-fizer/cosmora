import React from "react";
import OraclePage from "@/app/dashboard/oracle/page";
import { FixtureSeeder } from "../mocks/FixtureSeeder";
import { ZoomFrame } from "./ZoomFrame";
import { ViewportFix } from "./ViewportFix";

export const ORACLE_SCENE_DURATION = 180; // 6s @ 30fps

// The real oracle page loads chat history from localStorage on mount
// (getChatHistory) — FixtureSeeder seeds a real question + the grounded
// answer there, so the full conversation is already on screen with no
// fetch/streaming simulation needed.
export function OracleScene() {
  return (
    <FixtureSeeder>
      <ViewportFix />
      <ZoomFrame scale={[1.0, 1.08]}>
        <OraclePage />
      </ZoomFrame>
    </FixtureSeeder>
  );
}
