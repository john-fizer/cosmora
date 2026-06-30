import { AKASHIC_ENTRIES, ENTRIES_BY_SLUG } from "../src/lib/akashic/entries";
import { getEntryChartContext } from "../src/lib/akashic/chart-context";
import { calculateChart } from "../src/lib/astrology/calculator";
import { toSiderealChart, buildVimshottariDasha, buildCharaKarakas, lahiriAyanamsa } from "../src/lib/astrology/sidereal";

let failures = 0;
function assert(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ok  ${name}`);
  else { failures++; console.log(`FAIL  ${name}  ${detail}`); }
}

// Entry integrity
assert("entry count >= 60", AKASHIC_ENTRIES.length >= 60, String(AKASHIC_ENTRIES.length));

const slugs = new Set(AKASHIC_ENTRIES.map(e => e.slug));
assert("all slugs unique", slugs.size === AKASHIC_ENTRIES.length);

for (const e of AKASHIC_ENTRIES) {
  assert(`entry ${e.slug}: has title`, e.title.length > 0);
  assert(`entry ${e.slug}: has summary`, e.summary.length > 40);
  assert(`entry ${e.slug}: has promptHint`, e.promptHint.length > 10);
  for (const rel of e.relatedSlugs) {
    assert(`entry ${e.slug}: relatedSlug '${rel}' exists`, slugs.has(rel), `missing: ${rel}`);
  }
}

assert("ENTRIES_BY_SLUG planet-sun", !!ENTRIES_BY_SLUG["planet-sun"]);
assert("ENTRIES_BY_SLUG house-10th", !!ENTRIES_BY_SLUG["house-10th"]);
assert("ENTRIES_BY_SLUG vedic-nakshatra", !!ENTRIES_BY_SLUG["vedic-nakshatra"]);

// Chart context
const chart = calculateChart({
  birthDate: "1990-06-15", birthTime: "08:30:00",
  latitude: 34.05, longitude: -118.24,
  timezone: "America/Los_Angeles", houseSystem: "whole_sign",
});
const birthDatetime = "1990-06-15T08:30:00Z";
const sidereal = toSiderealChart(chart, birthDatetime);
const ayanamsa = lahiriAyanamsa(new Date(birthDatetime));
const moonP = chart.planets.find(p => p.name === "Moon")!;
const moonSidereal = ((moonP.longitude - sidereal.ayanamsa) % 360 + 360) % 360;
const dasha = buildVimshottariDasha(moonSidereal, birthDatetime);
const karakas = buildCharaKarakas(chart, ayanamsa);

const sunEntry = ENTRIES_BY_SLUG["planet-sun"];
const sunCtx = getEntryChartContext(sunEntry, chart, sidereal, dasha, karakas);
assert("sun entry: hasRelevance", sunCtx.hasRelevance);
assert("sun entry: has 1 placement", sunCtx.placements.length === 1, String(sunCtx.placements.length));
assert("sun entry: placement has sign", sunCtx.placements[0].detail.includes("House"));

const ariesEntry = ENTRIES_BY_SLUG["sign-aries"];
const ariesCtx = getEntryChartContext(ariesEntry, chart, sidereal, dasha, karakas);
assert("aries sign entry: runs without crash", true);

const h10Entry = ENTRIES_BY_SLUG["house-10th"];
const h10Ctx = getEntryChartContext(h10Entry, chart, sidereal, dasha, karakas);
assert("10th house entry: has placements or house sign", h10Ctx.placements.length >= 1);

const dashaEntry = ENTRIES_BY_SLUG["vedic-vimshottari-dasha"];
const dashaCtx = getEntryChartContext(dashaEntry, chart, sidereal, dasha, karakas);
assert("dasha entry: currentDasha placement", dashaCtx.hasRelevance && dashaCtx.placements[0].label === "Current Dasha");

const akEntry = ENTRIES_BY_SLUG["vedic-atmakaraka"];
const akCtx = getEntryChartContext(akEntry, chart, sidereal, dasha, karakas);
assert("AK entry: hasRelevance", akCtx.hasRelevance);

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
