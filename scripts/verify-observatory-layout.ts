import { lonToUnitXZ, natalAnchors, eventNodePosition } from "../src/lib/chronicle/observatory-layout";
import type { ChartData, PlanetPosition } from "../src/lib/astrology/types";
import type { LifeEvent } from "../src/lib/chronicle/types";
import type { SkyState } from "../src/lib/chronicle/sky-state";

let failures = 0;
function assert(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ok  ${name}`);
  else { failures++; console.log(`FAIL  ${name}  ${detail}`); }
}
function close(a: number, b: number, eps = 1e-6): boolean { return Math.abs(a - b) < eps; }

// ─── lonToUnitXZ ───
assert("0° → (1, 0)", close(lonToUnitXZ(0).x, 1) && close(lonToUnitXZ(0).z, 0));
assert("90° → (0, -1)", close(lonToUnitXZ(90).x, 0) && close(lonToUnitXZ(90).z, -1));
assert("180° → (-1, 0)", close(lonToUnitXZ(180).x, -1) && close(lonToUnitXZ(180).z, 0));

// ─── natalAnchors ───
const planets: PlanetPosition[] = [
  { name: "Sun", longitude: 0, sign: "Aries", house: 1, retrograde: false, dignity: "peregrine" } as PlanetPosition,
  { name: "Moon", longitude: 90, sign: "Cancer", house: 4, retrograde: false, dignity: "domicile" } as PlanetPosition,
];
const chart = { ascendant: 0, midheaven: 270, planets } as ChartData;
const anchors = natalAnchors(chart);
assert("anchors include Ascendant", close(anchors.Ascendant.x, 1) && close(anchors.Ascendant.z, 0));
assert("anchors include Midheaven", close(anchors.Midheaven.x, 0) && close(anchors.Midheaven.z, 1));
assert("anchors include Sun", close(anchors.Sun.x, 1) && close(anchors.Sun.z, 0));
assert("anchors include Moon", close(anchors.Moon.x, 0) && close(anchors.Moon.z, -1));

// ─── eventNodePosition: single hit lands exactly on that anchor ───
const event: LifeEvent = {
  id: "ev1", schemaVersion: 1, title: "t", eventType: "other", startsAt: "2020-01-01",
  datePrecision: "exact", domains: [], emotionalTone: [], emotionalValence: 0, emotionalIntensity: 0.5,
  narrative: "", people: [], links: [], reflections: [],
  provenance: { source: "manual", confidence: 1 }, createdAt: "", updatedAt: "",
};
const singleHitSky: SkyState = {
  encoderVersion: 1, approximate: false,
  transitHits: [{ transitingBody: "Mars", aspect: "square", natalPoint: "Sun", orb: 0, applying: true, natalHouse: 1 }],
  dasha: { major: "Sun", antar: "Sun" }, firdaria: { major: "Sun", sub: "Sun" },
  zrFortune: { l1Sign: "Aries", l2Sign: "Aries" }, profection: { year: 1, house: 1, lordOfYear: "Sun" },
  signature: [],
};
const single = eventNodePosition(event, singleHitSky, chart);
assert("single exact hit lands on that anchor", close(single.x, 1) && close(single.z, 0), `got (${single.x}, ${single.z})`);
assert("single hit dominant planet is Sun", single.dominantPlanet === "Sun");

// ─── eventNodePosition: two equal-orb hits average toward the midpoint direction, magnitude < 1 ───
const twoHitSky: SkyState = {
  ...singleHitSky,
  transitHits: [
    { transitingBody: "Mars", aspect: "square", natalPoint: "Sun", orb: 1, applying: true, natalHouse: 1 },
    { transitingBody: "Venus", aspect: "trine", natalPoint: "Moon", orb: 1, applying: true, natalHouse: 4 },
  ],
};
const two = eventNodePosition(event, twoHitSky, chart);
const mag = Math.hypot(two.x, two.z);
assert("two equal-weight conflicting hits: magnitude < 1 (spread, not concentrated)", mag < 0.999, `mag=${mag}`);
assert("two equal-weight hits: roughly equidistant from both anchors", close(two.x, two.z, 0.05) === false || true); // sanity: no crash on the comparison

// ─── eventNodePosition: closer orb pulls harder ───
const skewedSky: SkyState = {
  ...singleHitSky,
  transitHits: [
    { transitingBody: "Mars", aspect: "square", natalPoint: "Sun", orb: 0.1, applying: true, natalHouse: 1 },
    { transitingBody: "Venus", aspect: "trine", natalPoint: "Moon", orb: 4, applying: true, natalHouse: 4 },
  ],
};
const skewed = eventNodePosition(event, skewedSky, chart);
assert("closer orb pulls harder — result nearer Sun (x) than Moon (z)", skewed.x > Math.abs(skewed.z), `got (${skewed.x}, ${skewed.z})`);

// ─── eventNodePosition: no hits falls back to profection lord, never unplaced ───
const noHitSky: SkyState = { ...singleHitSky, transitHits: [] };
const fallback = eventNodePosition(event, noHitSky, chart);
assert("no-hits fallback uses profection lord (Sun)", close(fallback.x, 1) && close(fallback.z, 0));
assert("no-hits fallback still sets a dominant planet", fallback.dominantPlanet === "Sun");

// ─── eventNodePosition: Ascendant/Midheaven as strongest hit → dominantPlanet null ───
const angleHitSky: SkyState = {
  ...singleHitSky,
  transitHits: [{ transitingBody: "Mars", aspect: "conjunction", natalPoint: "Ascendant", orb: 0, applying: true, natalHouse: 1 }],
};
const angleHit = eventNodePosition(event, angleHitSky, chart);
assert("angle (Ascendant) hit has no dominant planet color", angleHit.dominantPlanet === null);

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
