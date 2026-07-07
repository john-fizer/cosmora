# Chronicle — Life Event Graph & Sky-State Encoder (Design Spec)

**Date:** 2026-07-06
**Status:** Approved for planning
**Sub-project:** A of 5 (A: Chronicle → B: Pattern/Prediction → C: Observatory → D: Cinema → E: Council)
**Alignment:** Schema aligned with `cosmos-engine-mtds-v1/` docs (02-Canonical-Ontology, 09-Event-Ingestion, schemas/event.schema.json, schemas/postgres-core.sql). Cosmora is Cosmos Engine v0 — one project, staged evolution, no fork until real users/server-side compute demand it.

## 1. Vision Context

Chronicle is the substrate of the whole system: an Obsidian-like living memory graph where every life event is a node — timestamped, geolocated, emotionally tagged, astrologically encoded. The framing: natal chart = base model weights, transits = inference-time activations, life events = labeled training examples, reflection = reinforcement signal. Chronicle collects the labeled examples. The Pattern Engine (B), Observatory (C), Cinema (D), and eventual cross-chart deep learning all consume what Chronicle produces.

**Not fortune-telling. Personal cosmological pattern intelligence.**

## 2. Locked Decisions

| Decision | Choice | Why |
|---|---|---|
| First slice | Chronicle (life timeline + Reality Engine) | Every other room feeds off this data; ML moat |
| Storage | localStorage + JSON export/import | Zero-backend pattern holds; schema Postgres-ready for migration |
| Intake | Both: structured quick-add form AND AI story extraction | Form = reliable backbone; AI = signature moment |
| AI depth | Astro overlay auto-computed + "Ask the Oracle" `?q=` button per event | AI on demand, zero cost until clicked |
| Astrology overlay | Compute-on-view, NEVER snapshotted | Encoder will evolve; all events must be re-encodable (mandatory given ML plans) |
| Extraction API | Dedicated `/api/chronicle/extract`, non-streaming strict JSON | Extraction needs parseable structure, not SSE prose |
| Room name | Chronicle, at `/dashboard/chronicle` | Complements the existing symbolic `timeline` page (which stays untouched) |

## 3. Data Model

Stored under localStorage key `cosmora_chronicle_<profileId>` as `{ schemaVersion, events, people }`. All types live in `src/lib/chronicle/types.ts`.

```typescript
type ChronicleEventType =
  // union of Cosmora + MTDS ontologies
  | "birth" | "death" | "family" | "parenting"
  | "relationship_start" | "relationship_end" | "conflict" | "reconciliation"
  | "career_start" | "career_end" | "promotion" | "money" | "legal"
  | "move" | "travel" | "education"
  | "health" | "recovery" | "loss"
  | "creative" | "achievement" | "decision" | "identity_shift"
  | "spiritual_awakening" | "dream" | "synchronicity" | "song" | "repeated_pattern"
  | "other";

type EdgeType = "echoes" | "follows" | "caused_by" | "part_of";

interface EventLink { eventId: string; type: EdgeType; }

interface Provenance {
  source: "manual" | "ai_extracted" | "import";
  sourceRef?: string;        // e.g. extraction batch id
  confidence: number;        // MTDS ladder: 1.0 exact / 0.8 date-no-time / 0.6 month-year / 0.4 life period / 0.2 symbolic memory
}

interface LifeEvent {
  id: string;
  schemaVersion: 1;
  title: string;
  eventType: ChronicleEventType;
  startsAt: string;          // ISO date
  endsAt?: string;           // optional — events can be periods (relationship, job, illness→recovery)
  datePrecision: "exact" | "month" | "year" | "period";
  location?: { name: string; lat?: number; lon?: number };
  domains: string[];         // family, identity, career, love, health, money, spirit…
  emotionalTone: string[];   // human-readable chips: love, grief, liberation, pressure…
  emotionalValence: number;  // -1..1 (derived from positive/negative/mixed toggle)
  emotionalIntensity: number;// 0..1 (derived from 5-dot UI scale)
  narrative: string;         // user's own words, verbatim — never overwritten by AI
  people: string[];          // Person ids
  links: EventLink[];        // typed event→event edges
  reflections: Reflection[]; // append-only; never mutates the event
  provenance: Provenance;
  createdAt: string;
  updatedAt: string;
}

interface Person {
  id: string;
  name: string;
  relationshipType: string;  // partner, parent, child, friend, rival, mentor…
  birthDate?: string;        // future synastry hook
}

interface Reflection {
  id: string;
  date: string;
  text: string;
  outcomeConfirmation?: "confirmed" | "partially" | "did_not_happen";
}
```

Meaning-layer doctrine (from MTDS ontology): interpretation never overwrites primary source. `narrative` is the user's verbatim record; AI output lives only in ephemeral oracle chats (this slice) or future annotation layers (slice B+).

## 4. Sky-State Encoder

`src/lib/chronicle/sky-state.ts` — one pure function, reused by every future room:

```typescript
computeSkyState(chart: ChartData, profile: StoredProfile, date: string): SkyState

interface SkyState {
  encoderVersion: 1;
  approximate: boolean;              // true when datePrecision !== "exact"
  transitHits: TransitHit[];         // { transitingBody, aspect, natalPoint, orb, applying, natalHouse }
  dasha: { major: string; antar: string };
  firdaria: { major: string; sub: string };
  zrFortune: { l1Sign: string; l2Sign: string };
  profection: { year: number; house: number; lordOfYear: string };
  eclipseProximity?: { kind: "solar" | "lunar"; daysAway: number };
  signature: string[];               // canonical tokens, ordered + deduplicated
}
```

**Computation rules:**
- Transit positions via the existing chart calculator pointed at the event date (synchronous — never await).
- Major aspects only (conjunction, sextile, square, trine, opposition). Orbs: 3° for Jupiter–Pluto transiting, 5° for Sun–Mars transiting.
- Timing lords reuse existing engines: `buildVimshottariDasha`, `calculateFirdaria`, ZR logic from the releasing page, profection = age mod 12 from natal Ascendant.
- Eclipse proximity: no eclipse engine exists yet — implement `findNearbyEclipse(date)` in sky-state.ts: scan ±14 days for lunations (Sun–Moon conjunction = potential solar, opposition = potential lunar, found by sampling daily positions from the existing calculator and refining), and classify as an eclipse when the lunation falls within 18° of the mean lunar node. Approximation is acceptable (encoderVersion 1); exact Saros math is out of scope.

**Precision honesty:**
- `datePrecision: "exact"` → full SkyState.
- `"month"` → transits computed at mid-month with orbs widened +2°, `approximate: true`.
- `"year"` / `"period"` → timing lords only (they move slowly and remain valid), NO transit hits — fabricated orbs would poison pattern data.

**Signature token grammar** (the ML feature vocabulary):

```
T.<body>.<aspect>.<natalPoint>.H<house>   T.Saturn.square.Moon.H4
L.dasha.<major>[.<antar>]                 L.dasha.Rahu.Venus
L.firdaria.<major>                        L.firdaria.Mars
L.zr.<L1sign>[.L2.<L2sign>]               L.zr.Scorpio.L2.Cancer
L.prof.H<house>.lord<planet>              L.prof.H7.lordVenus
E.<kind>.<signedDaysAway>                 E.solar.-6
```

Two events share a pattern exactly when their token sets intersect. Pattern queries are string filters (`T.Mars.*.*.H7`), no AI required. `encoderVersion` bumps whenever grammar or computation changes; signatures are always derivable, never stored with events.

## 5. Reality Engine (Intake)

**Path 1 — Quick-add form.** Slide-over panel: title, start date + precision toggle (exact/month/year/period, period reveals end date), event type, intensity (5 dots), valence (positive/negative/mixed), domain + tone chips, optional location, optional people (create-or-pick), narrative textarea. Saves instantly, no AI.

**Path 2 — "Tell your story" AI intake.**
- Guided-biography prompt chips above the box (from MTDS 09): "Top 5 turning points", "Major relationships", "Career timeline", "Moves & homes", "Health & crisis points", "Spiritual shifts", "Creative milestones".
- POSTs to **`/api/chronicle/extract`** (new route, non-streaming). Claude is prompted with a strict JSON schema; returns `{ events: ExtractedEvent[], people: ExtractedPerson[] }` — each event carries the LifeEvent fields plus per-event `confidence` and the `sourceText` span it came from. One narrative may yield many events.
- **Confirmation table, not auto-save.** Each extracted row is editable (date, type, chips); confidence < 0.6 flagged amber; explicit confirm/discard per row. Confirmed events save with `provenance.source: "ai_extracted"`. Proposed Person nodes get the same confirm/edit/merge treatment.
- Original text preserved verbatim in each event's `narrative`.
- Failure mode: malformed JSON → one retry with the error appended → on second failure, UI reports extraction failed and offers quick-add; the user's text stays in the box.

## 6. The Chronicle Room (UI)

**Route:** `/dashboard/chronicle`. Sidebar item after Akashic: label "Chronicle", hint "life events". Standard shell: `"use client"`, `DashboardBg`, scroll container `left: 64`, `scrollbarWidth: "none"`, bg `#010810`, Fragment Mono / Cormorant Garamond, category-consistent accent colors.

**Layout — vertical life timeline:**
- Events ordered by `startsAt`, grouped by year with year markers on the left spine. Period events show a duration bar.
- Collapsed card: type glyph + color, title, date (`~` prefix when approximate), intensity dots, valence tint, domain/tone chips, people chips, and a **signature strip** — the 3 strongest activation tokens as small chips (e.g. `♄ □ ☽ H4`).
- Expanded card: full sky state via live `computeSkyState` — all transit hits with orbs, dasha/firdaria/ZR/profection lords, eclipse proximity. Plus actions:
  - **Ask the Oracle** — `?q=` handoff pre-seeded with narrative + top signature tokens (pattern already proven in Akashic).
  - **Add reflection** — appends dated `Reflection` with optional outcome tag.
  - **Link event** — picks another event + edge type (echoes/follows/caused_by/part_of).
  - **Edit / Delete.**
- Header: event count, **+ ADD EVENT**, **✦ TELL YOUR STORY**, filters (type, domain, person) and a signature search box (`Mars H7` matches token sets).
- Empty state: invitation copy ("Your chart is the source code. Your life is the evidence. Add the first ten events and watch the sky line up.") + both intake buttons + guided-biography chips.

## 7. Export / Import

Header overflow menu:
- **Export** → `cosmora-chronicle-<profile>-<date>.json`: `{ schemaVersion, exportedAt, profile: { birthData }, events, people, signatures? }`. Signatures optional, marked derived with their `encoderVersion`. This file is the Postgres-migration payload and ML corpus seed; MTDS server-side fields (tenant_id, visibility) get defaults at migration time.
- **Import** → merges by id; conflicts prompt (keep local / take imported).

## 8. File Map

```
src/lib/chronicle/
  types.ts          — all interfaces above
  storage.ts        — localStorage CRUD + export/import (mirrors src/lib/storage.ts patterns)
  sky-state.ts      — computeSkyState + signature grammar
src/app/api/chronicle/extract/route.ts   — Reality Engine extraction endpoint
src/app/dashboard/chronicle/page.tsx     — the room
src/components/dashboard/Sidebar.tsx     — nav item (modify)
scripts/verify-chronicle.ts              — assertions (see §9)
```

## 9. Testing

`npx tsx scripts/verify-chronicle.ts` asserts at minimum:
- Storage round-trip: save/load/delete events + people; export → import identity.
- Encoder: known date fixtures produce expected transit hits and timing lords; token grammar canonical form (ordering, dedup); precision rules (year-precision events have zero transit hits; month-precision flagged approximate with widened orbs).
- Confidence ladder mapping from datePrecision.
- Schema guards: valence in [-1,1], intensity in [0,1], links reference existing event ids.

Build gate: `npm run build` clean. Extraction route tested manually (requires API key at runtime).

## 10. Out of Scope (this slice)

- Pattern mining/aggregation across events (slice B — but signature tokens make it a query when it arrives).
- Prediction windows, confidence scoring, forecast objects (B).
- 3D visualization of events (C).
- Auto-generated readings per event, scripts, trailers (D).
- Multi-agent council (E).
- Person detail pages (people exist as chips + filters only).
- Server storage, auth, tenancy, sync (fork-trigger territory).
- Media attachments (photos/voice) on events.
- Midpoints, fixed stars, antiscia in the encoder (encoderVersion 2+ candidates).
