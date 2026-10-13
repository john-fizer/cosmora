import React from "react";
import OraclePage from "@/app/dashboard/oracle/page";
import { FixtureSeeder } from "../mocks/FixtureSeeder";
import { PageFrame } from "./PageFrame";

export const ORACLE_SCENE_DURATION = 180; // 6s @ 30fps

// The real oracle page loads chat history from localStorage on mount
// (getChatHistory) — FixtureSeeder seeds a real question + the grounded
// answer there, so the full conversation is already on screen with no
// fetch/streaming simulation needed.
export function OracleScene() {
  return (
    <FixtureSeeder>
      <PageFrame move={{ scale: [1.05, 1.1], tiltX: [1.5, 0] }}>
        <OraclePage />
      </PageFrame>
    </FixtureSeeder>
  );
}
