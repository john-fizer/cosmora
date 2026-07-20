// Seeds a profile in localStorage, opens /dashboard/map, screenshots globe + flat + filtered.
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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
page.on("console", m => { if (m.type() === "error") console.log("PAGE ERR:", m.text()); });

// Set localStorage on the app origin first.
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.evaluate((p) => {
  localStorage.setItem("cosmora_profiles", JSON.stringify([p]));
  localStorage.setItem("cosmora_active_profile", p.id);
}, profile);

await page.goto(`${BASE}/dashboard/map`, { waitUntil: "networkidle" });
// Let lines fetch + skylines rise.
await page.waitForSelector("canvas", { timeout: 30000 });
await page.waitForTimeout(7000);
await page.screenshot({ path: `${OUT}/01-globe.png` });
console.log("shot globe");

// Zoomed detail to show recognizable skyline silhouettes.
const canvas = page.locator("canvas").first();
const box = await canvas.boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
await page.mouse.move(cx, cy);
for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -300); await page.waitForTimeout(110); }
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/02-globe-detail.png` });
console.log("shot detail");

// Switch to flat earth.
const flat = page.getByText("FLAT EARTH", { exact: true });
if (await flat.count()) { await flat.first().click(); await page.waitForTimeout(5000); await page.screenshot({ path: `${OUT}/03-flat.png` }); console.log("shot flat"); }

// Back to globe, isolate a single category (Wealth) to show de-cluttering.
const globeBtn = page.getByText("GLOBE", { exact: true });
if (await globeBtn.count()) { await globeBtn.first().click(); await page.waitForTimeout(3500); }
// Category bar has its own ALL/NONE (2nd in DOM after the planet bar's).
const catNone = page.locator("button", { hasText: /^NONE$/ }).nth(1);
if (await catNone.count()) { await catNone.click(); await page.waitForTimeout(600); }  // clear all categories
const wealth = page.getByText("WEALTH", { exact: true });
if (await wealth.count()) { await wealth.first().click(); await page.waitForTimeout(4000); }
await page.screenshot({ path: `${OUT}/04-globe-wealth.png` });
console.log("shot wealth-filtered");

await browser.close();
console.log("done");
