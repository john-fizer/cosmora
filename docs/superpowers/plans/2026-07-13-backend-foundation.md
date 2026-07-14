# Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Supabase as Cosmora's first server layer — two-tier consent (private sync + anonymized research corpus), magic-link/Google auth, offline-first sync engine.

**Architecture:** localStorage stays the source of truth; `src/lib/sync/` pushes debounced changes and pulls on login with last-write-wins by `updatedAt`. Tier-2 research signals are stripped client-side (no narratives/names/locations/birth data) and inserted into an RLS-locked `research_signals` table keyed by a client-random contributor UUID. Spec: `docs/superpowers/specs/2026-07-12-backend-foundation-design.md`.

**Tech Stack:** `@supabase/supabase-js` v2, Supabase Auth (magic link + Google), Postgres with RLS, Next.js 16 App Router client components.

## Global Constraints

- localStorage remains offline-first primary; the app must work fully signed-out and with NO Supabase env vars set (all sync code no-ops gracefully)
- Tier-2 rows NEVER contain: narrative, title, names, people, location, birth data, or the event's own date (only `date_precision`)
- Contributor UUID: random, generated client-side, stored ONLY in localStorage key `cosmora_research_contributor`, never sent alongside auth identity in the same table
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (in `.env.local`, never committed; also set in Vercel later)
- `calculateChart` / `computeSkyState` are SYNCHRONOUS
- Commit convention: `feat(sync): ...`
- Verification: `npx tsx scripts/verify-sync.ts` then `npm run build`

## Phase 0 — Interactive setup (controller + John, NOT a subagent task)

Done in the main session before Task 1: create Supabase project (John confirms cost — free tier), apply the migration below via the Supabase connector, enable Google provider (John supplies Google OAuth client ID/secret; magic link works out of the box), fetch project URL + anon key into `.env.local`, and `npm install @supabase/supabase-js`.

**Migration SQL (apply as `backend_foundation_v1`):**

```sql
create table birth_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_profile_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null,
  created_at timestamptz default now(),
  unique (user_id, local_profile_id)
);
create table chronicle_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_event_id text not null,
  local_profile_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null,
  created_at timestamptz default now(),
  deleted_at timestamptz,
  unique (user_id, local_event_id)
);
create table chronicle_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_person_id text not null,
  local_profile_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null,
  created_at timestamptz default now(),
  deleted_at timestamptz,
  unique (user_id, local_person_id)
);
create table research_signals (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null,
  event_type text not null,
  signature jsonb not null,
  encoder_version int not null,
  valence_bucket text not null check (valence_bucket in ('negative','mixed','positive')),
  intensity_bucket text not null check (intensity_bucket in ('low','medium','high')),
  date_precision text not null,
  outcome text check (outcome in ('confirmed','partially','did_not_happen')),
  created_at timestamptz default now()
);
create table consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  research_opt_in boolean not null default false,
  consent_text_version text not null,
  updated_at timestamptz not null
);

alter table birth_profiles enable row level security;
alter table chronicle_events enable row level security;
alter table chronicle_people enable row level security;
alter table research_signals enable row level security;
alter table consents enable row level security;

create policy "own profiles" on birth_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own events" on chronicle_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own people" on chronicle_people for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own consent" on consents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "insert signals" on research_signals for insert to authenticated with check (true);
-- no select/update/delete policy on research_signals: clients cannot read the corpus
```

## Existing Interfaces (verified — consume, do not redefine)

```typescript
// @/lib/storage
getActiveProfileId(): string | null;  getProfile(id): StoredProfile | null;  listProfiles(): StoredProfile[]
saveProfile(profile: StoredProfile): void;  getCachedChart(id): ChartData | null;  generateId(): string
// StoredProfile has: id, name, birthDate, birthTime, birthPlace, latitude, longitude, timezone, houseSystem, ...

// @/lib/chronicle/storage
getChronicle(profileId): ChronicleData          // { schemaVersion: 1, events: LifeEvent[], people: Person[] }
saveChronicle(profileId, data): void
// @/lib/chronicle/types — LifeEvent has updatedAt: string, reflections: Reflection[] (outcomeConfirmation?)
// @/lib/chronicle/sky-state
computeSkyState(chart, profile, date, precision?): SkyState   // .signature: string[], .encoderVersion: 1
```

## File Map

```
src/lib/sync/supabase.ts   — client init; null when env missing (Task 1)
src/lib/sync/auth.ts       — magic link, Google, signOut, session helpers (Task 1)
src/lib/sync/engine.ts     — pure LWW merge + push/pull + scheduleSync (Task 2)
src/lib/sync/research.ts   — contributor id, consent, stripper, contributeSignals (Task 3)
scripts/verify-sync.ts     — pure-function assertions, no network (Tasks 2–3)
src/components/dashboard/CosmicAccount.tsx — settings section component (Task 4)
src/app/dashboard/settings/page.tsx        — mount CosmicAccount (Task 4, modify)
src/app/dashboard/chronicle/page.tsx       — sync + research triggers (Task 5, modify)
```

---

### Task 1: Supabase client + auth helpers

**Files:**
- Create: `src/lib/sync/supabase.ts`
- Create: `src/lib/sync/auth.ts`

**Produces:** `getSupabase(): SupabaseClient | null`, `isSyncConfigured(): boolean`, `sendMagicLink(email): Promise<{error?: string}>`, `signInWithGoogle(): Promise<{error?: string}>`, `signOut(): Promise<void>`, `getSession(): Promise<Session | null>`, `onAuthChange(cb: (userId: string | null) => void): () => void`

- [ ] **Step 1: Create `src/lib/sync/supabase.ts`**

```typescript
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function isSyncConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Singleton Supabase client; null when env vars are absent so the whole app degrades gracefully. */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!isSyncConfigured() || typeof window === "undefined") { client = null; return client; }
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true } },
  );
  return client;
}
```

- [ ] **Step 2: Create `src/lib/sync/auth.ts`**

```typescript
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export async function sendMagicLink(email: string): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: "Sync is not configured" };
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/dashboard/settings` },
  });
  return error ? { error: error.message } : {};
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: "Sync is not configured" };
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/dashboard/settings` },
  });
  return error ? { error: error.message } : {};
}

export async function signOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

/** Subscribe to auth changes; returns unsubscribe. Callback gets the user id or null. */
export function onAuthChange(cb: (userId: string | null) => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_evt, session) => cb(session?.user?.id ?? null));
  return () => data.subscription.unsubscribe();
}
```

- [ ] **Step 3: Build** — `npm run build` — Expected: clean (`@supabase/supabase-js` installed in Phase 0)
- [ ] **Step 4: Commit**

```bash
git add src/lib/sync/supabase.ts src/lib/sync/auth.ts
git commit -m "feat(sync): Supabase client + auth helpers (magic link, Google), graceful no-op when unconfigured"
```

---

### Task 2: Sync engine (LWW merge + push/pull)

**Files:**
- Create: `src/lib/sync/engine.ts`
- Create: `scripts/verify-sync.ts`

**Produces:**
```typescript
export interface SyncItem { localId: string; updatedAt: string; deleted?: boolean; payload: unknown; }
export function mergeLWW(local: SyncItem[], remote: SyncItem[]): { winners: SyncItem[]; toPush: SyncItem[]; toDeleteLocally: string[] }
export function scheduleSync(profileId: string): void          // debounced ~3s, no-op when signed out/unconfigured
export async function syncNow(profileId: string): Promise<{ pushed: number; pulled: number } | null>
export async function pullAll(profileId: string): Promise<boolean>  // true if anything changed locally
export async function deleteCloudData(): Promise<{ error?: string }>
```

- [ ] **Step 1: Create `src/lib/sync/engine.ts`**

```typescript
import { getSupabase } from "./supabase";
import { getSession } from "./auth";
import { getChronicle, saveChronicle } from "@/lib/chronicle/storage";
import { getProfile } from "@/lib/storage";
import type { LifeEvent, Person, ChronicleData } from "@/lib/chronicle/types";

export interface SyncItem {
  localId: string;
  updatedAt: string;   // ISO
  deleted?: boolean;
  payload: unknown;
}

/**
 * Last-write-wins merge. Winners = the union view both sides should converge to.
 * toPush = items where local is newer (or remote missing). toDeleteLocally = remote tombstones newer than local.
 */
export function mergeLWW(local: SyncItem[], remote: SyncItem[]): {
  winners: SyncItem[]; toPush: SyncItem[]; toDeleteLocally: string[];
} {
  const byId = new Map<string, { l?: SyncItem; r?: SyncItem }>();
  for (const l of local) byId.set(l.localId, { l });
  for (const r of remote) byId.set(r.localId, { ...(byId.get(r.localId) ?? {}), r });

  const winners: SyncItem[] = [];
  const toPush: SyncItem[] = [];
  const toDeleteLocally: string[] = [];

  for (const [id, { l, r }] of byId) {
    if (l && !r) { winners.push(l); toPush.push(l); continue; }
    if (r && !l) {
      // remote-only: tombstone means it was deleted elsewhere; live row should be pulled
      if (!r.deleted) winners.push(r);
      continue;
    }
    if (!l || !r) continue;
    const localNewer = l.updatedAt > r.updatedAt;
    if (localNewer) { winners.push(l); toPush.push(l); }
    else if (r.deleted) { toDeleteLocally.push(id); }
    else { winners.push(r); }
  }
  return { winners, toPush, toDeleteLocally };
}

const eventToItem = (e: LifeEvent): SyncItem => ({ localId: e.id, updatedAt: e.updatedAt, payload: e });
const personToItem = (p: Person): SyncItem => ({ localId: p.id, updatedAt: new Date(0).toISOString(), payload: p });

async function userId(): Promise<string | null> {
  const s = await getSession();
  return s?.user?.id ?? null;
}

export async function syncNow(profileId: string): Promise<{ pushed: number; pulled: number } | null> {
  const sb = getSupabase();
  const uid = await userId();
  if (!sb || !uid) return null;

  const localData = getChronicle(profileId);

  // ── events ──
  const { data: remoteEventsRaw } = await sb.from("chronicle_events")
    .select("local_event_id, payload, updated_at, deleted_at")
    .eq("local_profile_id", profileId);
  const remoteEvents: SyncItem[] = (remoteEventsRaw ?? []).map(r => ({
    localId: r.local_event_id as string,
    updatedAt: new Date(r.updated_at as string).toISOString(),
    deleted: r.deleted_at != null,
    payload: r.payload,
  }));
  const ev = mergeLWW(localData.events.map(eventToItem), remoteEvents);

  // ── people (no per-item updatedAt in schema; treat local as authoritative, push all, pull missing) ──
  const { data: remotePeopleRaw } = await sb.from("chronicle_people")
    .select("local_person_id, payload")
    .eq("local_profile_id", profileId)
    .is("deleted_at", null);
  const remotePeople = (remotePeopleRaw ?? []).map(r => r.payload as Person);
  const localPeopleIds = new Set(localData.people.map(p => p.id));
  const pulledPeople = remotePeople.filter(p => !localPeopleIds.has(p.id));

  // apply pulls locally
  const localEventIds = new Set(localData.events.map(e => e.id));
  const pulledEvents = ev.winners
    .filter(w => !localEventIds.has(w.localId) || localData.events.some(e => e.id === w.localId && e.updatedAt < w.updatedAt))
    .filter(w => !ev.toPush.includes(w))
    .map(w => w.payload as LifeEvent);
  const merged: ChronicleData = {
    schemaVersion: 1,
    events: [
      ...localData.events.filter(e => !ev.toDeleteLocally.includes(e.id) && !pulledEvents.some(p => p.id === e.id)),
      ...pulledEvents,
    ],
    people: [...localData.people, ...pulledPeople],
  };
  saveChronicle(profileId, merged);

  // push local winners
  if (ev.toPush.length > 0) {
    await sb.from("chronicle_events").upsert(
      ev.toPush.map(i => ({
        user_id: uid, local_event_id: i.localId, local_profile_id: profileId,
        payload: i.payload, updated_at: i.updatedAt, deleted_at: null,
      })),
      { onConflict: "user_id,local_event_id" },
    );
  }
  if (localData.people.length > 0) {
    await sb.from("chronicle_people").upsert(
      localData.people.map(p => ({
        user_id: uid, local_person_id: p.id, local_profile_id: profileId,
        payload: p, updated_at: new Date().toISOString(), deleted_at: null,
      })),
      { onConflict: "user_id,local_person_id" },
    );
  }

  // profile snapshot
  const profile = getProfile(profileId);
  if (profile) {
    await sb.from("birth_profiles").upsert(
      [{ user_id: uid, local_profile_id: profileId, payload: profile, updated_at: new Date().toISOString() }],
      { onConflict: "user_id,local_profile_id" },
    );
  }

  return { pushed: ev.toPush.length, pulled: pulledEvents.length + pulledPeople.length };
}

let timer: ReturnType<typeof setTimeout> | null = null;
export function scheduleSync(profileId: string): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { void syncNow(profileId); }, 3000);
}

export async function pullAll(profileId: string): Promise<boolean> {
  const result = await syncNow(profileId);
  return (result?.pulled ?? 0) > 0;
}

export async function deleteCloudData(): Promise<{ error?: string }> {
  const sb = getSupabase();
  const uid = await userId();
  if (!sb || !uid) return { error: "Not signed in" };
  const tables = ["chronicle_events", "chronicle_people", "birth_profiles", "consents"];
  for (const t of tables) {
    const { error } = await sb.from(t).delete().eq("user_id", uid);
    if (error) return { error: `${t}: ${error.message}` };
  }
  return {};
}
```

- [ ] **Step 2: Create `scripts/verify-sync.ts` (pure-function tests, no network)**

```typescript
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
```

- [ ] **Step 3: Run** — `npx tsx scripts/verify-sync.ts` — Expected: `ALL PASS`
- [ ] **Step 4: Build** — `npm run build` — Expected: clean
- [ ] **Step 5: Commit**

```bash
git add src/lib/sync/engine.ts scripts/verify-sync.ts
git commit -m "feat(sync): LWW sync engine with tombstones, debounced push, verified merge semantics"
```

---

### Task 3: Research corpus pipeline

**Files:**
- Create: `src/lib/sync/research.ts`
- Modify: `scripts/verify-sync.ts` (append stripper assertions)

**Produces:**
```typescript
export function getContributorId(): string                       // stable random UUID in localStorage
export function valenceBucket(v: number): "negative" | "mixed" | "positive"
export function intensityBucket(i: number): "low" | "medium" | "high"
export interface ResearchSignal { contributor_id: string; event_type: string; signature: string[]; encoder_version: number; valence_bucket: string; intensity_bucket: string; date_precision: string; outcome: string | null; }
export function stripEvent(e: LifeEvent, chart: ChartData, profile: StoredProfile): ResearchSignal
export async function setResearchOptIn(optIn: boolean): Promise<{ error?: string }>
export async function getResearchOptIn(): Promise<boolean>
export async function contributeSignals(events: LifeEvent[], chart: ChartData, profile: StoredProfile): Promise<number>
```

- [ ] **Step 1: Create `src/lib/sync/research.ts`**

```typescript
import { getSupabase } from "./supabase";
import { getSession } from "./auth";
import { computeSkyState } from "@/lib/chronicle/sky-state";
import { generateId } from "@/lib/storage";
import type { LifeEvent } from "@/lib/chronicle/types";
import type { ChartData } from "@/lib/astrology/types";
import type { StoredProfile } from "@/lib/storage";

export const CONSENT_TEXT_VERSION = "2026-07-13.1";
const CONTRIBUTOR_KEY = "cosmora_research_contributor";

/** Random contributor id — stored locally only, never linked to the auth user in the corpus table. */
export function getContributorId(): string {
  let id = localStorage.getItem(CONTRIBUTOR_KEY);
  if (!id) {
    id = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : generateId();
    localStorage.setItem(CONTRIBUTOR_KEY, id);
  }
  return id;
}

export function valenceBucket(v: number): "negative" | "mixed" | "positive" {
  if (v <= -0.2) return "negative";
  if (v >= 0.2) return "positive";
  return "mixed";
}

export function intensityBucket(i: number): "low" | "medium" | "high" {
  if (i < 1 / 3) return "low";
  if (i < 2 / 3) return "medium";
  return "high";
}

export interface ResearchSignal {
  contributor_id: string;
  event_type: string;
  signature: string[];
  encoder_version: number;
  valence_bucket: string;
  intensity_bucket: string;
  date_precision: string;
  outcome: string | null;
}

/**
 * The anonymizer. Emits ONLY: type, signature tokens, encoder version, buckets, precision, outcome.
 * Never: narrative, title, names, people, location, dates, or birth data.
 */
export function stripEvent(e: LifeEvent, chart: ChartData, profile: StoredProfile): ResearchSignal {
  const state = computeSkyState(chart, profile, e.startsAt, e.datePrecision);
  const latestOutcome = [...e.reflections].reverse().find(r => r.outcomeConfirmation)?.outcomeConfirmation ?? null;
  return {
    contributor_id: getContributorId(),
    event_type: e.eventType,
    signature: state.signature,
    encoder_version: state.encoderVersion,
    valence_bucket: valenceBucket(e.emotionalValence),
    intensity_bucket: intensityBucket(e.emotionalIntensity),
    date_precision: e.datePrecision,
    outcome: latestOutcome,
  };
}

export async function setResearchOptIn(optIn: boolean): Promise<{ error?: string }> {
  const sb = getSupabase();
  const session = await getSession();
  if (!sb || !session) return { error: "Not signed in" };
  const { error } = await sb.from("consents").upsert([{
    user_id: session.user.id,
    research_opt_in: optIn,
    consent_text_version: CONSENT_TEXT_VERSION,
    updated_at: new Date().toISOString(),
  }]);
  return error ? { error: error.message } : {};
}

export async function getResearchOptIn(): Promise<boolean> {
  const sb = getSupabase();
  const session = await getSession();
  if (!sb || !session) return false;
  const { data } = await sb.from("consents").select("research_opt_in").eq("user_id", session.user.id).maybeSingle();
  return Boolean(data?.research_opt_in);
}

/** Contribute stripped signals for the given events. Returns rows inserted (0 on any failure — contribution is best-effort). */
export async function contributeSignals(events: LifeEvent[], chart: ChartData, profile: StoredProfile): Promise<number> {
  const sb = getSupabase();
  if (!sb || events.length === 0) return 0;
  if (!(await getResearchOptIn())) return 0;
  const rows = events.map(e => stripEvent(e, chart, profile));
  const { error } = await sb.from("research_signals").insert(rows);
  return error ? 0 : rows.length;
}
```

- [ ] **Step 2: Append stripper assertions to `scripts/verify-sync.ts`** (before final console.log)

```typescript
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
```

**Note:** the signature WILL contain house numbers and timing lords — that's the point; they're not identifying. The date-omission assertion (`2020-12-16`) passes because the signal carries tokens, not the date itself.

- [ ] **Step 3: Run** — `npx tsx scripts/verify-sync.ts` — Expected: `ALL PASS` (~27 assertions)
- [ ] **Step 4: Build** — `npm run build` — Expected: clean
- [ ] **Step 5: Commit**

```bash
git add src/lib/sync/research.ts scripts/verify-sync.ts
git commit -m "feat(sync): research corpus pipeline — anonymizing stripper, consent, contributor id; leak assertions"
```

---

### Task 4: Cosmic Account settings section

**Files:**
- Create: `src/components/dashboard/CosmicAccount.tsx`
- Modify: `src/app/dashboard/settings/page.tsx` (mount the component before the Profiles section, ~line 620)

**Consumes:** everything from Tasks 1–3 by exact name. Fonts/colors per global style (Fragment Mono `'Fragment Mono', monospace`, gold `#C8A55B`, border `1px solid rgba(40,60,100,0.3)`).

- [ ] **Step 1: Create `src/components/dashboard/CosmicAccount.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { isSyncConfigured } from "@/lib/sync/supabase";
import { sendMagicLink, signInWithGoogle, signOut, getSession, onAuthChange } from "@/lib/sync/auth";
import { syncNow, deleteCloudData } from "@/lib/sync/engine";
import { setResearchOptIn, getResearchOptIn } from "@/lib/sync/research";
import { getActiveProfileId } from "@/lib/storage";

const MONO = "'Fragment Mono', monospace";
const GOLD = "#C8A55B";
const BORDER = "1px solid rgba(40,60,100,0.3)";

const CONSENT_COPY =
  "Contribute anonymized pattern signals to Cosmora's research corpus: event type, astrological signature tokens, " +
  "emotional direction and strength (bucketed), date precision, and outcome confirmations. " +
  "Never included: your words, names, people, places, dates, or birth data. " +
  "Signals carry a random id that is not connected to your account — which also means already-contributed " +
  "signals cannot be individually retracted later. You can stop contributing at any time.";

export function CosmicAccount() {
  const [email, setEmail] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSession().then(s => { if (s) { setUserEmail(s.user.email ?? "signed in"); getResearchOptIn().then(setOptIn); } });
    return onAuthChange(uid => {
      if (!uid) { setUserEmail(null); setOptIn(false); return; }
      getSession().then(s => setUserEmail(s?.user.email ?? "signed in"));
      getResearchOptIn().then(setOptIn);
      const pid = getActiveProfileId();
      if (pid) { setStatus("Syncing…"); syncNow(pid).then(r => setStatus(r ? `Synced — ${r.pushed} up, ${r.pulled} down` : "")); }
    });
  }, []);

  if (!isSyncConfigured()) return null;

  const label = (t: string) => (
    <p style={{ color: "#445577", fontSize: 8, fontFamily: MONO, letterSpacing: "0.15em", marginBottom: 6 }}>{t}</p>
  );

  return (
    <div style={{ background: "rgba(10,15,35,0.6)", border: BORDER, borderRadius: 12, padding: 18, marginBottom: 20 }}>
      <p style={{ color: GOLD, fontSize: 9, fontFamily: MONO, letterSpacing: "0.18em", marginBottom: 10 }}>COSMIC ACCOUNT</p>

      {!userEmail ? (
        <>
          <p style={{ color: "#6677AA", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", marginBottom: 12 }}>
            Back up your chronicle. Sync across devices.
          </p>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@cosmos.com" type="email"
              style={{ flex: 1, padding: "8px 10px", background: "rgba(5,8,20,0.7)", border: BORDER, borderRadius: 8, color: "#C0D4FF", fontSize: 11, fontFamily: MONO, outline: "none" }} />
            <button disabled={busy || !email.includes("@")}
              onClick={async () => { setBusy(true); const r = await sendMagicLink(email); setStatus(r.error ?? "Magic link sent — check your email"); setBusy(false); }}
              style={{ padding: "0 14px", borderRadius: 8, cursor: "pointer", background: `${GOLD}15`, border: `1px solid ${GOLD}45`, color: GOLD, fontSize: 9, fontFamily: MONO }}>
              SEND LINK
            </button>
          </div>
          <button disabled={busy}
            onClick={async () => { setBusy(true); const r = await signInWithGoogle(); if (r.error) { setStatus(r.error); setBusy(false); } }}
            style={{ width: "100%", padding: "8px 0", borderRadius: 8, cursor: "pointer", background: "transparent", border: BORDER, color: "#8899BB", fontSize: 9, fontFamily: MONO, letterSpacing: "0.1em" }}>
            CONTINUE WITH GOOGLE
          </button>
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
            <span style={{ color: "#C0D4FF", fontSize: 11, fontFamily: MONO }}>{userEmail}</span>
            <button onClick={async () => { await signOut(); }}
              style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 6, cursor: "pointer", background: "transparent", border: BORDER, color: "#445577", fontSize: 8, fontFamily: MONO }}>
              SIGN OUT
            </button>
          </div>

          {label("SYNC")}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <button disabled={busy}
              onClick={async () => {
                const pid = getActiveProfileId(); if (!pid) return;
                setBusy(true); setStatus("Syncing…");
                const r = await syncNow(pid);
                setStatus(r ? `Synced — ${r.pushed} up, ${r.pulled} down` : "Sync failed");
                setBusy(false);
              }}
              style={{ padding: "6px 14px", borderRadius: 8, cursor: "pointer", background: `${GOLD}12`, border: `1px solid ${GOLD}40`, color: GOLD, fontSize: 9, fontFamily: MONO }}>
              SYNC NOW
            </button>
            <span style={{ color: "#445577", fontSize: 9, fontFamily: MONO }}>{status}</span>
          </div>

          {label("RESEARCH CONTRIBUTION")}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
            <button
              onClick={async () => {
                const next = !optIn;
                const r = await setResearchOptIn(next);
                if (!r.error) setOptIn(next);
              }}
              style={{
                width: 34, height: 18, borderRadius: 9, cursor: "pointer", flexShrink: 0, position: "relative",
                background: optIn ? "rgba(74,222,128,0.25)" : "rgba(40,60,100,0.4)", border: BORDER,
              }}>
              <div style={{ position: "absolute", top: 2, left: optIn ? 17 : 2, width: 12, height: 12, borderRadius: "50%", background: optIn ? "#4ade80" : "#445577", transition: "left 0.15s" }} />
            </button>
            <p style={{ color: "#556688", fontSize: 10, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", lineHeight: 1.55, margin: 0 }}>
              {CONSENT_COPY}
            </p>
          </div>

          {label("DANGER")}
          <button disabled={busy}
            onClick={async () => {
              if (!confirm("Delete all your cloud data? Your local data stays on this device.")) return;
              setBusy(true);
              const r = await deleteCloudData();
              setStatus(r.error ?? "Cloud data deleted");
              setBusy(false);
            }}
            style={{ padding: "6px 14px", borderRadius: 8, cursor: "pointer", background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 9, fontFamily: MONO }}>
            DELETE MY CLOUD DATA
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Mount in `src/app/dashboard/settings/page.tsx`**

Add import at top with the other imports:
```typescript
import { CosmicAccount } from "@/components/dashboard/CosmicAccount";
```
Insert `<CosmicAccount />` immediately BEFORE the `{/* Profiles section */}` comment (~line 620), as a sibling at the same JSX level.

- [ ] **Step 3: Build** — `npm run build` — Expected: clean
- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/CosmicAccount.tsx src/app/dashboard/settings/page.tsx
git commit -m "feat(sync): Cosmic Account settings section — sign in, sync status, research consent, cloud delete"
```

---

### Task 5: Wire sync + research triggers into Chronicle

**Files:**
- Modify: `src/app/dashboard/chronicle/page.tsx`

**Consumes:** `scheduleSync`, `pullAll` from `@/lib/sync/engine`; `contributeSignals` from `@/lib/sync/research`.

- [ ] **Step 1: Add imports** to the existing import block in `src/app/dashboard/chronicle/page.tsx`:

```typescript
import { scheduleSync, pullAll } from "@/lib/sync/engine";
import { contributeSignals } from "@/lib/sync/research";
```

- [ ] **Step 2: Pull on mount.** In the initial `useEffect` (the one that loads profile/chart and calls `reload(id)`), after `reload(id);` add:

```typescript
    void pullAll(id).then(changed => { if (changed) reload(id); });
```

- [ ] **Step 3: Push after mutations.** In each of these handlers, add `scheduleSync(pid);` immediately after their existing `reload(pid);` call: `saveForm`, `confirmPendingEvent`, `addReflection`, `linkEvents`, the DELETE button's onClick (after `deleteEvent(pid, e.id); reload(pid);`), and `createPerson` (after `upsertPerson(pid, p); reload(pid);`).

- [ ] **Step 4: Research contribution on save and outcome.** In `saveForm`, after `upsertEvent(pid, ev); reload(pid);` add:

```typescript
    if (chart && profile) void contributeSignals([ev], chart, profile);
```

In `confirmPendingEvent`, after its `upsertEvent(pid, ev); reload(pid);` add the same line. In `addReflection`, after `upsertEvent(pid, updated); reload(pid);` add:

```typescript
    if (chart && profile) void contributeSignals([updated], chart, profile);
```

(`contributeSignals` internally checks opt-in and signed-in state — safe to call unconditionally; it no-ops in seconds-not-minutes.)

- [ ] **Step 5: Build** — `npm run build` — Expected: clean
- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/chronicle/page.tsx
git commit -m "feat(sync): Chronicle pulls on mount, pushes on change, contributes research signals when opted in"
```

---

## Self-Review

**Spec coverage:** schema+RLS (Phase 0) ✅; graceful unconfigured no-op (Task 1 `getSupabase` null path, Task 4 `isSyncConfigured` gate) ✅; magic link + Google ✅; LWW + tombstones + debounce ✅ (Task 2); anonymizing stripper with leak assertions, contributor UUID, consent versioning, retroactive contribution note — retroactive contribution at opt-in is NOT wired in this plan (spec §4 mentions it with a count prompt); deliberately deferred to keep Task 4 focused — the toggle covers new events; retroactive backfill is a fast follow. Delete-cloud-data ✅. Testing per spec §6: stripper property test ✅, LWW ✅, bucketing ✅; live RLS check happens in Phase 0 verification.

**Placeholder scan:** clean.

**Type consistency:** `SyncItem`/`mergeLWW` defined Task 2, tested Task 2; `stripEvent(e, chart, profile)` defined Task 3, asserted Task 3; `syncNow`/`scheduleSync`/`pullAll`/`deleteCloudData` defined Task 2, consumed Tasks 4–5; `contributeSignals(events, chart, profile)` defined Task 3, consumed Task 5 with matching args; `isSyncConfigured` Task 1 → Task 4.

**Known deviation from spec:** retroactive signal backfill at opt-in deferred (documented above).
