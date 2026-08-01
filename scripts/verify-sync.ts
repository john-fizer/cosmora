const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
} as Storage;

import { mergeLWW } from "../src/lib/sync/engine";
import type { SyncItem } from "../src/lib/sync/engine";

let failures = 0;
function assert(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ok  ${name}`);
  else { failures++; console.log(`FAIL  ${name}  ${detail}`); }
}

const item = (id: string, t: string, deleted = false): SyncItem =>
  ({ localId: id, updatedAt: t, deleted, payload: { id } });

// local-only → push
let r = mergeLWW([item("a", "2026-01-02")], []);
assert("local-only pushed", r.toPush.length === 1 && r.winners.length === 1);
// remote-only live → pulled into winners, not pushed
r = mergeLWW([], [item("b", "2026-01-02")]);
assert("remote-only wins, no push", r.winners.length === 1 && r.toPush.length === 0);
// remote-only tombstone → ignored (never existed locally)
r = mergeLWW([], [item("c", "2026-01-02", true)]);
assert("remote tombstone ignored when no local", r.winners.length === 0 && r.toDeleteLocally.length === 0);
// local newer → local wins + push
r = mergeLWW([item("d", "2026-01-03")], [item("d", "2026-01-02")]);
assert("local newer wins", r.winners[0].updatedAt === "2026-01-03" && r.toPush.length === 1);
// remote newer → remote wins, no push
r = mergeLWW([item("e", "2026-01-01")], [item("e", "2026-01-05")]);
assert("remote newer wins", r.winners[0].updatedAt === "2026-01-05" && r.toPush.length === 0);
// remote newer tombstone → delete locally
r = mergeLWW([item("f", "2026-01-01")], [item("f", "2026-01-05", true)]);
assert("remote tombstone deletes local", r.toDeleteLocally.includes("f") && r.winners.length === 0);
// local newer than remote tombstone → local resurrects + push
r = mergeLWW([item("g", "2026-01-06")], [item("g", "2026-01-05", true)]);
assert("local newer than tombstone resurrects", r.toPush.length === 1 && r.toDeleteLocally.length === 0);
// equal timestamps → remote wins (no churn)
r = mergeLWW([item("h", "2026-01-05")], [item("h", "2026-01-05")]);
assert("equal timestamp: remote wins, no push", r.toPush.length === 0 && r.winners.length === 1);

// ─── Research stripper ───
import { stripEvent, valenceBucket, intensityBucket } from "../src/lib/sync/research";
import { calculateChart } from "../src/lib/astrology/calculator";
import type { LifeEvent } from "../src/lib/chronicle/types";
import type { StoredProfile } from "../src/lib/storage";

const profile = {
  id: "p1", name: "SECRETNAME", birthDate: "1990-06-15", birthTime: "08:30:00", birthPlace: "SECRETPLACE",
  latitude: 34.05, longitude: -118.24, timezone: "America/Los_Angeles",
  birthTimeConfidence: "exact", houseSystem: "whole_sign", astrologyMode: "western", createdAt: "",
} as StoredProfile;
const chart = calculateChart({
  birthDate: "1990-06-15", birthTime: "08:30:00", latitude: 34.05, longitude: -118.24,
  timezone: "America/Los_Angeles", houseSystem: "whole_sign",
});
const secretEvent: LifeEvent = {
  id: "ev1", schemaVersion: 1, title: "SECRETTITLE", eventType: "relationship_start",
  startsAt: "2020-12-16", datePrecision: "exact",
  location: { name: "SECRETCITY", lat: 1, lon: 2 },
  domains: ["love"], emotionalTone: ["love"],
  emotionalValence: 0.9, emotionalIntensity: 0.9,
  narrative: "SECRETNARRATIVE about SECRETPERSON", people: ["person-1"],
  links: [], reflections: [
    { id: "r1", date: "2021-01-01", text: "SECRETREFLECTION", outcomeConfirmation: "confirmed" },
  ],
  provenance: { source: "manual", confidence: 1 },
  createdAt: "2020-12-16T00:00:00Z", updatedAt: "2020-12-16T00:00:00Z",
};

const signal = stripEvent(secretEvent, chart, profile);
const json = JSON.stringify(signal);
for (const secret of ["SECRETTITLE", "SECRETNARRATIVE", "SECRETPERSON", "SECRETCITY", "SECRETNAME", "SECRETPLACE", "SECRETREFLECTION", "person-1", "1990-06-15", "2020-12-16", "08:30"]) {
  assert(`stripper omits ${secret}`, !json.includes(secret));
}
assert("stripper keeps event_type", signal.event_type === "relationship_start");
assert("stripper keeps signature tokens", signal.signature.length > 0 && signal.signature.every(t => typeof t === "string"));
assert("stripper carries encoder version", signal.encoder_version === 1);
assert("stripper buckets valence", signal.valence_bucket === "positive");
assert("stripper buckets intensity", signal.intensity_bucket === "high");
assert("stripper takes latest outcome", signal.outcome === "confirmed");
assert("valence bucket boundaries", valenceBucket(-0.2) === "negative" && valenceBucket(0) === "mixed" && valenceBucket(0.2) === "positive");
assert("intensity bucket boundaries", intensityBucket(0) === "low" && intensityBucket(0.5) === "medium" && intensityBucket(0.9) === "high");

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
