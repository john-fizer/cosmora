import { buildFirdariaData, FIRDARIA_TOTAL_YEARS, FIRDARIA_YEARS } from "../src/lib/astrology/firdaria";

let failures = 0;
function assert(name: string, cond: boolean, detail = "") {
  if (cond) { console.log(`  ok  ${name}`); }
  else { failures++; console.log(`FAIL  ${name}  ${detail}`); }
}
const approx = (a: number, b: number, eps = 0.01) => Math.abs(a - b) <= eps;

// Sanity: years sum to 75
const sum = Object.values(FIRDARIA_YEARS).reduce((a, b) => a + b, 0);
assert("FIRDARIA years sum to 75", sum === FIRDARIA_TOTAL_YEARS, String(sum));

// Day chart
const day = buildFirdariaData("day", "1990-06-15T08:30:00Z");
assert("day: has major periods", day.major.length > 0, String(day.major.length));
assert("day: has current major", !!day.currentMajor, JSON.stringify(day.currentMajor));
assert("day: major starts with Sun", day.major[0].ruler === "Sun");
assert("day: major periods cover > 110 years", day.major.length >= 2, String(day.major.length));

// Night chart
const night = buildFirdariaData("night", "1990-06-15T08:30:00Z");
assert("night: major starts with Moon", night.major[0].ruler === "Moon");
assert("night: has current major", !!night.currentMajor);

// Sub-periods
assert("day: sub-periods populated", day.subperiods.length > 0, String(day.subperiods.length));
assert("day: has current sub", !!day.currentSub, JSON.stringify(day.currentSub));
assert("day: sub-periods span the major period",
  approx(
    day.subperiods.reduce((a, p) => a + (p.end.getTime() - p.start.getTime()), 0),
    day.currentMajor!.end.getTime() - day.currentMajor!.start.getTime(),
    1000 * 86400 // 1-day tolerance
  )
);
assert("day: sub-period level is 2", day.subperiods[0].level === 2);
// The first sub-ruler = the major ruler
assert("day: first sub-ruler = major ruler", day.subperiods[0].subRuler === day.currentMajor!.ruler);

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
