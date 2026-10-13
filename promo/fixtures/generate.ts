/**
 * Generates the promo video's data fixtures using Cosmora's REAL astrology
 * engine (src/lib/astrology) — no fake placements. Run with `npm run fixtures`.
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { calculateChart } from "../../src/lib/astrology/calculator";
import { calculateAstroLines } from "../../src/lib/astrology/astrocartography";
import { calculateTransits } from "../../src/lib/astrology/transits";
import { detectPressure } from "../../src/lib/astrology/pressureWindows";
import { CITIES } from "../../src/lib/astrology/cities";
import { activeCities } from "../../src/lib/astrology/crossings";

const DEMO_PROFILE = {
  name: "Alex Rivera",
  birthDate: "1992-03-14",
  birthTime: "14:35:00",
  birthPlace: "Los Angeles, CA",
  latitude: 34.0522,
  longitude: -118.2437,
  timezone: "America/Los_Angeles",
  // whole_sign: traditional/Hellenistic houses (this app's emphasis per CLAUDE.md),
  // and sidesteps what looks like a real Placidus-cusp bug for this chart (house 2/8,
  // 3/9, 5/11, 6/12 cusps came out identical instead of 180° apart) — flagged to
  // John separately; not something to chase down on this branch.
  houseSystem: "whole_sign" as const,
};

const chart = calculateChart(DEMO_PROFILE);
const astroLines = calculateAstroLines(chart.birthDatetime);

// A fixed "now" so the render is reproducible across machines/days.
// 2026-10-04 is the real highest-convergence date found for this chart in an
// 8-year scan (score 27 — two independent systems agreeing; see fixtures/scan-tmp.ts).
const TRANSIT_DATE = new Date("2026-10-04T18:00:00Z");

const transits = calculateTransits(chart, TRANSIT_DATE);
const pressure = detectPressure(chart, chart.birthDatetime, TRANSIT_DATE);

const topSpots = activeCities(CITIES, astroLines, {});

const out = (file: string, data: unknown) =>
  writeFileSync(join(__dirname, file), JSON.stringify(data, null, 2));

out("chart.json", { profile: DEMO_PROFILE, chart });
out("astrocartography.json", { lines: astroLines, topSpots: topSpots.slice(0, 8) });
out("transits.json", transits);
out("pressure.json", pressure);

console.log("Fixtures written:");
console.log(`  chart.json            — ${chart.planets.length} planets, ${chart.aspects.length} aspects, Asc ${chart.ascendant.toFixed(2)}°`);
console.log(`  astrocartography.json — ${astroLines.length} lines, ${topSpots.length} top spots`);
console.log(`  transits.json         — ${transits.aspects?.length ?? 0} transit aspects`);
console.log(`  pressure.json         — level: ${pressure.level}, score: ${pressure.score}`);
