import { saveProfile, setActiveProfileId, setCachedChart, setGuideMode, pushChatMessage, clearChatHistory } from "@/lib/storage";
import { chartFixture, oracleAnswerFixture } from "./fetchMock";

export const DEMO_PROFILE_ID = "promo-demo-profile";

/**
 * Seeds localStorage through the REAL storage.ts API (not a mock of it) so
 * every mounted page reads exactly what it would for a real user — a
 * profile, its real computed chart, and (for the Oracle scene) one real
 * saved conversation turn.
 */
export function seedFixtures() {
  const p = chartFixture.profile;
  saveProfile({
    id: DEMO_PROFILE_ID,
    name: p.name,
    birthDate: p.birthDate,
    birthTime: p.birthTime,
    birthPlace: p.birthPlace,
    latitude: p.latitude,
    longitude: p.longitude,
    timezone: p.timezone,
    birthTimeConfidence: "exact",
    houseSystem: p.houseSystem,
    astrologyMode: "traditional",
    createdAt: new Date().toISOString(),
  });
  setActiveProfileId(DEMO_PROFILE_ID);
  setCachedChart(DEMO_PROFILE_ID, chartFixture.chart as never);
  setGuideMode("star");

  clearChatHistory(DEMO_PROFILE_ID);
  pushChatMessage(DEMO_PROFILE_ID, { role: "user", content: oracleAnswerFixture.question });
  pushChatMessage(DEMO_PROFILE_ID, { role: "assistant", content: oracleAnswerFixture.answer });
}
