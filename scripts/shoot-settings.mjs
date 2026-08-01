// Seeds a profile, opens /dashboard/settings, screenshots the Cosmic Account panel.
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
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 2 });
page.on("console", m => { if (m.type() === "error") console.log("PAGE ERR:", m.text()); });
page.on("pageerror", e => console.log("PAGE EXCEPTION:", e.message));

await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.evaluate((p) => {
  localStorage.setItem("cosmora_profiles", JSON.stringify([p]));
  localStorage.setItem("cosmora_active_profile", p.id);
}, profile);

await page.goto(`${BASE}/dashboard/settings`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=COSMIC ACCOUNT", { timeout: 15000 });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/06-settings-cosmic-account.png` });
console.log("shot settings");

await browser.close();
