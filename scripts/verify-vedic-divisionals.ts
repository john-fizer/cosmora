import { calculateChart } from "../src/lib/astrology/calculator";
import {
  lahiriAyanamsa,
  getDivisionalSign,
  buildDivisionalChart,
  buildCharaKarakas,
} from "../src/lib/astrology/sidereal";

let failures = 0;
function assert(name: string, cond: boolean, detail = "") {
  if (cond) { console.log(`  ok  ${name}`); }
  else { failures++; console.log(`FAIL  ${name}  ${detail}`); }
}

const chart = calculateChart({
  birthDate: "1990-06-15", birthTime: "08:30:00",
  latitude: 34.05, longitude: -118.24,
  timezone: "America/Los_Angeles", houseSystem: "whole_sign",
});
const ayanamsa = lahiriAyanamsa(new Date("1990-06-15T08:30:00Z"));

// --- D2 (Hora) ---
// Taurus(signIdx=1, even), 0° → Cancer(3)
assert("D2 Taurus 0° → Cancer(3)",    getDivisionalSign(30, 2) === 3, String(getDivisionalSign(30, 2)));
// Taurus(1, even), 15° → Leo(4)
assert("D2 Taurus 15° → Leo(4)",      getDivisionalSign(45, 2) === 4, String(getDivisionalSign(45, 2)));
// Aries(signIdx=0, odd), 0° → Leo(4)
assert("D2 Aries 0° → Leo(4)",        getDivisionalSign(0, 2) === 4, String(getDivisionalSign(0, 2)));
// Aries(0, odd), 15° → Cancer(3)
assert("D2 Aries 15° → Cancer(3)",    getDivisionalSign(15, 2) === 3, String(getDivisionalSign(15, 2)));

// --- D3 (Drekkana) ---
assert("D3 Aries 5° → Aries(0)",        getDivisionalSign(5, 3) === 0,  String(getDivisionalSign(5, 3)));
assert("D3 Aries 15° → Leo(4)",         getDivisionalSign(15, 3) === 4, String(getDivisionalSign(15, 3)));
assert("D3 Aries 25° → Sagittarius(8)", getDivisionalSign(25, 3) === 8, String(getDivisionalSign(25, 3)));

// --- D9 (Navamsha trikonastha) ---
// Aries(0, Fire→start=0), first division (0–3.33°) → Aries(0)
assert("D9 Aries 1° → Aries(0)",   getDivisionalSign(1, 9) === 0, String(getDivisionalSign(1, 9)));
// Aries(0, Fire), second division (3.33–6.66°) → Taurus(1)
assert("D9 Aries 4° → Taurus(1)",  getDivisionalSign(4, 9) === 1, String(getDivisionalSign(4, 9)));
// Cancer(3, Water→start=3), first division → Cancer(3)
assert("D9 Cancer 0° → Cancer(3)", getDivisionalSign(90, 9) === 3, String(getDivisionalSign(90, 9)));
// Capricorn(9, Earth→start=9), first division → Capricorn(9)
assert("D9 Capricorn 0° → Cap(9)", getDivisionalSign(270, 9) === 9, String(getDivisionalSign(270, 9)));

// --- D12 (general Parashari) ---
// Aries(0), 0° → division 0 → (0*12+0)%12 = 0 → Aries
assert("D12 Aries 0° → Aries(0)",  getDivisionalSign(0.1, 12) === 0, String(getDivisionalSign(0.1, 12)));
// Aries(0), 2.6° → division 1 → (0*12+1)%12 = 1 → Taurus
assert("D12 Aries 2.6° → Taurus(1)", getDivisionalSign(2.6, 12) === 1, String(getDivisionalSign(2.6, 12)));

// --- buildDivisionalChart ---
const d9 = buildDivisionalChart(chart, ayanamsa, 9);
assert("D9: planets count >= 10",    d9.planets.length >= 10);
assert("D9: lagna sign defined",     !!d9.lagna.sign);
assert("D9: label is Navamsha",      d9.label === "Navamsha");
assert("D9: lagna signIndex 0-11",   d9.lagna.signIndex >= 0 && d9.lagna.signIndex <= 11);
assert("D9: lagna signDegree 0-30",  d9.lagna.signDegree >= 0 && d9.lagna.signDegree < 30);

const d1 = buildDivisionalChart(chart, ayanamsa, 1);
assert("D1: Rashi label",            d1.label === "Rashi");

// --- buildCharaKarakas ---
const ck = buildCharaKarakas(chart, ayanamsa);
assert("CK: AK exists",              !!ck.ak?.planet);
assert("CK: 7 karakas total",        ck.all.length === 7);
assert("CK: all roles distinct",     new Set(ck.all.map(k => k.role)).size === 7);
assert("CK: roles in correct order", ck.all.map(k => k.role).join(",") === "AK,AmK,BK,MK,PK,GK,DK");
assert("CK: AK has highest deg",     ck.all.every(k => k.degInSign <= ck.ak.degInSign + 0.001));
assert("CK: DK has lowest deg",      ck.all.every(k => k.degInSign >= ck.dk.degInSign - 0.001));
assert("CK: AK roleLabel correct",   ck.ak.roleLabel === "Atmakaraka");
assert("CK: DK roleLabel correct",   ck.dk.roleLabel === "Darakaraka");
assert("CK: degrees in 0-30",        ck.all.every(k => k.degInSign >= 0 && k.degInSign <= 30));

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
