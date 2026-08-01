// Seeds a profile in localStorage, opens /dashboard/briefing, waits for the AI
// morning report to finish streaming, screenshots it. Used to verify the
// Strict-Mode double-fetch fix isn't producing interleaved duplicate text.
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = "scripts/shots";
import { mkdirSync } from "fs";
mkdirSync(OUT, { recursive: true });

const profile = {
  id: "demo", name: "Demo Native",
  birthDate: "1990-06-15", birthTime: "08:30",
  birthPlace: "Los Angeles, USA",
  latitude: 34.05, longitude: -118.24,
  timezone: "America/Los_Angeles", birthTimeConfidence: "exact",
  houseSystem: "placidus", astrologyMode: "tropical",
  createdAt: new Date().toISOString(),
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 2 });
page.on("console", m => { if (m.type() === "error") console.log("PAGE ERR:", m.text()); });

await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.evaluate((p) => {
  localStorage.setItem("cosmora_profiles", JSON.stringify([p]));
  localStorage.setItem("cosmora_active_profile", p.id);
}, profile);
// Reload /dashboard so it computes and caches the natal chart (briefing has no
// fallback fetch — it requires getCachedChart() to already be populated).
// networkidle never fires in Next dev (persistent HMR websocket), so use
// domcontentloaded + an explicit wait for the chart-compute fetch to land.
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);

await page.goto(`${BASE}/dashboard/briefing`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=MORNING COSMIC BRIEFING", { timeout: 20000 });

const briefingText = () => page.evaluate(() => {
  const heading = [...document.querySelectorAll("span")].find(s => s.textContent?.includes("MORNING COSMIC BRIEFING"));
  const card = heading?.closest("div.rounded-2xl");
  return card?.querySelector(".space-y-4")?.textContent ?? "(not found)";
});

// Wait for streaming to finish (REGENERATE button only appears once done),
// then hold a while longer — if a second phantom stream is still writing
// text in the background, this gives it time to show up as growth.
await page.waitForSelector("text=REGENERATE", { timeout: 60000 });
const atRegenerate = await briefingText();
await page.waitForTimeout(5000);
const afterWait = await briefingText();
console.log(`briefing text length: at REGENERATE=${atRegenerate.length}, after 5s more=${afterWait.length}`);
console.log("SAME:", atRegenerate === afterWait);

console.log("--- BRIEFING TEXT ---");
console.log(afterWait);
console.log("--- END ---");

await page.screenshot({ path: `${OUT}/05-briefing.png`, fullPage: true });
console.log("shot briefing");

await browser.close();
