// Standalone sanity checks for the crossing/gating logic (no test runner installed).
// Run: npx tsx scripts/verify-crossings.ts
import { distanceToSegmentDeg, nearestCrossing, activeCities } from "../src/lib/astrology/crossings";
import { calculateAstroLines } from "../src/lib/astrology/astrocartography";
import { CITIES } from "../src/lib/astrology/cities";

let failures = 0;
function assert(name: string, cond: boolean, detail = "") {
  if (cond) { console.log(`  ok  ${name}`); }
  else { failures++; console.log(`FAIL  ${name}  ${detail}`); }
}
const approx = (a: number, b: number, eps = 0.05) => Math.abs(a - b) <= eps;

console.log("distanceToSegmentDeg:");
// Point on a meridian segment → ~0
assert("on-segment ≈ 0", approx(distanceToSegmentDeg(10, 0, 0, 0, 20, 0), 0, 0.01));
// 5° east of a N–S meridian at the equator → ~5°
assert("perpendicular 5°", approx(distanceToSegmentDeg(10, 5, 0, 0, 20, 0), 5, 0.2),
  String(distanceToSegmentDeg(10, 5, 0, 0, 20, 0)));
// Beyond the segment end → falls back to endpoint distance (>= along-arc gap)
assert("past-end uses endpoint", distanceToSegmentDeg(40, 0, 0, 0, 20, 0) >= 19.9,
  String(distanceToSegmentDeg(40, 0, 0, 0, 20, 0)));
// Symmetry across the line
assert("symmetric E/W",
  approx(distanceToSegmentDeg(10, 5, 0, 0, 20, 0), distanceToSegmentDeg(10, -5, 0, 0, 20, 0), 0.001));

console.log("\nlive chart gating:");
const lines = calculateAstroLines("1990-06-15T08:30:00Z");
assert("lines computed", lines.length > 0, String(lines.length));

const near = nearestCrossing(lines, 51.51, -0.13);
assert("London has a nearest line", !!near && near.distanceDeg < 90, JSON.stringify(near));

// Loose threshold lights up more cities than a tight one; both within cap.
const tight = activeCities(CITIES, lines, { thresholdDeg: 1.0, cap: 30 });
const loose = activeCities(CITIES, lines, { thresholdDeg: 3.0, cap: 30 });
assert("tighter gate ≤ looser gate", tight.length <= loose.length, `${tight.length} vs ${loose.length}`);
assert("some cities activate", loose.length > 0, String(loose.length));

// Every active city actually has a line within the threshold.
const within = activeCities(CITIES, lines, { thresholdDeg: 1.6, cap: 50 });
const allClose = within.every(c => (c.nearestDeg ?? 99) <= 1.6 + 1e-6);
assert("all active cities are genuinely close", allClose);

// De-clutter spacing respected.
const sep = 7;
const clustered = activeCities(CITIES, lines, { thresholdDeg: 5, minSepDeg: sep, cap: 50 });
let tooClose = false;
for (let i = 0; i < clustered.length; i++)
  for (let j = i + 1; j < clustered.length; j++) {
    const dLat = clustered[i].lat - clustered[j].lat;
    let dLon = Math.abs(clustered[i].lon - clustered[j].lon); if (dLon > 180) dLon = 360 - dLon;
    const d = Math.hypot(dLat, dLon * Math.cos((clustered[j].lat * Math.PI) / 180));
    if (d < sep - 1e-6) tooClose = true;
  }
assert("no two kept cities closer than minSep", !tooClose);

// Category filter narrows results.
const careerOnly = activeCities(CITIES, lines, { thresholdDeg: 5, categories: new Set(["Career"]), cap: 50 });
assert("category filter keeps only that category",
  careerOnly.every(c => c.category === "Career"), JSON.stringify(careerOnly.map(c => c.category)));

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
