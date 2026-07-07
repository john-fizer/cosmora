// localStorage polyfill so storage.ts runs under Node/tsx
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
} as Storage;

import { confidenceForPrecision, validateEvent, EVENT_TYPE_META } from "../src/lib/chronicle/types";
import type { LifeEvent } from "../src/lib/chronicle/types";
import { getChronicle, upsertEvent, deleteEvent, upsertPerson, exportChronicle, importChronicle } from "../src/lib/chronicle/storage";
import type { StoredProfile } from "../src/lib/storage";

let failures = 0;
function assert(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ok  ${name}`);
  else { failures++; console.log(`FAIL  ${name}  ${detail}`); }
}

const PID = "test-profile";
function makeEvent(id: string, overrides: Partial<LifeEvent> = {}): LifeEvent {
  return {
    id, schemaVersion: 1, title: `Event ${id}`, eventType: "decision",
    startsAt: "2020-12-16", datePrecision: "exact",
    domains: ["identity"], emotionalTone: ["awe"],
    emotionalValence: 0.5, emotionalIntensity: 0.8,
    narrative: "test narrative", people: [], links: [], reflections: [],
    provenance: { source: "manual", confidence: 1.0 },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// --- confidence ladder ---
assert("confidence exact = 1.0",  confidenceForPrecision("exact") === 1.0);
assert("confidence month = 0.6",  confidenceForPrecision("month") === 0.6);
assert("confidence year = 0.4",   confidenceForPrecision("year") === 0.4);
assert("confidence period = 0.4", confidenceForPrecision("period") === 0.4);

// --- validateEvent ---
const ids = new Set(["e1", "e2"]);
assert("valid event passes", validateEvent(makeEvent("e1"), ids).length === 0);
assert("bad valence caught", validateEvent(makeEvent("e1", { emotionalValence: 2 }), ids).length === 1);
assert("bad date caught", validateEvent(makeEvent("e1", { startsAt: "Dec 2020" }), ids).length === 1);
assert("ends before starts caught", validateEvent(makeEvent("e1", { endsAt: "2019-01-01" }), ids).length === 1);
assert("dangling link caught", validateEvent(makeEvent("e1", { links: [{ eventId: "missing", type: "echoes" }] }), ids).length === 1);

// --- EVENT_TYPE_META completeness ---
assert("29 event types have meta", Object.keys(EVENT_TYPE_META).length === 29);

// --- storage round-trip ---
upsertEvent(PID, makeEvent("e1"));
upsertEvent(PID, makeEvent("e2", { links: [{ eventId: "e1", type: "echoes" }] }));
upsertPerson(PID, { id: "p1", name: "Partner", relationshipType: "partner" });
assert("2 events saved", getChronicle(PID).events.length === 2);
assert("1 person saved", getChronicle(PID).people.length === 1);
upsertEvent(PID, makeEvent("e1", { title: "Renamed" }));
assert("upsert updates not duplicates", getChronicle(PID).events.length === 2);
assert("upsert applied", getChronicle(PID).events.find(e => e.id === "e1")!.title === "Renamed");
deleteEvent(PID, "e1");
assert("delete removes event", getChronicle(PID).events.length === 1);
assert("delete cleans dangling links", getChronicle(PID).events[0].links.length === 0);

// --- export / import ---
const profile = {
  id: PID, name: "Test", birthDate: "1990-06-15", birthTime: "08:30:00", birthPlace: "LA",
  latitude: 34.05, longitude: -118.24, timezone: "America/Los_Angeles",
  birthTimeConfidence: "exact", houseSystem: "whole_sign", astrologyMode: "western", createdAt: "",
} as StoredProfile;
const exported = exportChronicle(PID, profile);
assert("export has events", exported.events.length === 1);
assert("export has birth data", exported.profile.birthDate === "1990-06-15");
const r1 = importChronicle(PID, exported, "keep_local");
assert("re-import all conflicts, none added", r1.added === 0 && r1.conflicts === 2); // 1 event + 1 person
const r2 = importChronicle(PID, { ...exported, events: [makeEvent("e9")], people: [] }, "keep_local");
assert("new event imported", r2.added === 1 && getChronicle(PID).events.some(e => e.id === "e9"));

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
