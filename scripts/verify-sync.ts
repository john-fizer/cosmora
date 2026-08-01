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

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
