import type { ChartData } from "../src/lib/astrology/types";
import { buildProgressionResult } from "../src/lib/astrology/progressions";
import { calculateChart } from "../src/lib/astrology/calculator";

let failures = 0;
function assert(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ok  ${name}`);
  else { failures++; console.log(`FAIL  ${name}  ${detail}`); }
}
const approx = (a: number, b: number, eps: number) => Math.abs(a - b) <= eps;

const birth = new Date("1990-06-15T08:30:00Z");
const ageYears = (new Date().getTime() - birth.getTime()) / (365.25 * 86400000);
const progDate = new Date(birth.getTime() + ageYears * 86400000);

const natal     = calculateChart({ birthDate: "1990-06-15", birthTime: "08:30:00", latitude: 34.05, longitude: -118.24, timezone: "America/Los_Angeles", houseSystem: "whole_sign" });
const progressed = calculateChart({
  birthDate: progDate.toISOString().split("T")[0],
  birthTime: progDate.toISOString().split("T")[1].slice(0, 8),
  latitude: 34.05, longitude: -118.24, timezone: "America/Los_Angeles", houseSystem: "whole_sign",
});

const result = buildProgressionResult(natal, progressed, ageYears, progDate.toISOString());

assert("ageYears > 30", result.ageYears > 30, String(result.ageYears));
assert("solarArc > 0", result.solarArc > 0, String(result.solarArc));
assert("solarArc < 90 (plausible for 36-year-old)", result.solarArc < 90, String(result.solarArc));
assert("progressed Sun is a planet", !!result.progressedSun.name, result.progressedSun.name);
assert("progressed Moon is a planet", !!result.progressedMoon.name, result.progressedMoon.name);
assert("allPlanets has entries", result.allPlanets.length >= 10, String(result.allPlanets.length));
assert("directedPlanets has entries", result.directedPlanets.length >= 10, String(result.directedPlanets.length));
// Solar arc applied correctly: directed Sun = natal Sun + solarArc (mod 360)
const natalSunLon = natal.planets.find(p => p.name === "Sun")!.longitude;
const expectedDirSunLon = ((natalSunLon + result.solarArc) % 360 + 360) % 360;
const dirSunLon = result.directedPlanets.find(p => p.name === "Sun")!.directedLon;
assert("directed Sun = natal Sun + solarArc", approx(dirSunLon, expectedDirSunLon, 0.01), `${dirSunLon} vs ${expectedDirSunLon}`);

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
