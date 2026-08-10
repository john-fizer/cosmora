# Historical Figures Chart Backlog + Correlation Engine — Design

## Goal

Build a curated, Supabase-backed reference corpus of public figures' birth charts
and documented life events, plus a correlation engine that ranks which
astrological techniques (transits, Zodiacal Releasing, firdaria, profections,
dignities, etc.) most consistently show up around real, dated, public events —
album releases, film roles, historic acts — across that corpus. This validates
which techniques matter before any personal-data correlation work is attempted,
per the Kazmora vision doc's own "Test Bed / Prototype Data" framing.

## Non-goals

- **No trained deep learning model in this phase.** The seed corpus (~40–50
  figures) is orders of magnitude too small for a neural network to generalize —
  it would memorize noise, not learn signal. A trained model is an explicit,
  documented future phase, gated on the corpus growing to hundreds+ of verified
  figures/events, not something architected now.
- No Python service — the correlation engine reuses Cosmora's existing TypeScript
  astrology engine (`src/lib/astrology/`) directly. No duplicate chart-math
  implementation, no cross-language calls.
- No crowdsourced submission UI for v1 — figures and events are added via a
  server-side seed script, not a public "add a figure" flow.
- No connection to a specific user's own Chronicle/chart data — this is a
  standalone shared reference corpus. (A future Observatory overlay showing a
  historical figure's chart alongside the user's own is plausible later, but not
  part of this design.)

## Data model

Two new Supabase tables, applied via migration, separate from the private,
per-user `birth_profiles` / `chronicle_events` tables from Backend Foundation —
this is shared reference data, not owned by any one user.

```sql
create table reference_figures (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birth_date date not null,
  birth_time time,                    -- nullable: some historical figures only have a date, not a time
  birth_time_confidence text not null check (birth_time_confidence in ('documented', 'rectified', 'unknown')),
  birth_place text not null,
  latitude double precision not null,
  longitude double precision not null,
  timezone text not null,
  source_note text,                   -- citation / provenance for the birth data
  bio text,
  created_at timestamptz default now()
);

create table reference_life_events (
  id uuid primary key default gen_random_uuid(),
  figure_id uuid not null references reference_figures(id) on delete cascade,
  title text not null,
  event_date date not null,
  category text not null,             -- e.g. "career_triumph", "public_act", "loss", "recognition"
  source_citation text not null,      -- required: every reference event must be traceable
  created_at timestamptz default now()
);

alter table reference_figures enable row level security;
alter table reference_life_events enable row level security;

-- Public read (research transparency); no public write policy — writes go
-- through the seed script using the service-role key, which bypasses RLS.
create policy "public read figures" on reference_figures for select using (true);
create policy "public read events" on reference_life_events for select using (true);
```

**Trust model, explicitly different from `research_signals`:** that table is
intentionally open-write (anonymous, best-effort contributions). This one is not —
bad birth-time data here would silently corrupt every correlation the engine ever
finds. Writes are seed-script-only; reads are public, since transparency about the
underlying data is the point of a research corpus.

`birth_time_confidence` exists because historical birth-time accuracy varies
enormously — Einstein's is well-documented; many public figures' are rectified or
genuinely unknown. The correlation engine must be able to down-weight or exclude
time-sensitive techniques (houses, angles) for `unknown`-confidence figures rather
than silently treating a guessed time as fact.

## Curation workflow (v1)

A server-side seed script (`scripts/seed-reference-figures.ts`, following the same
pattern as `scripts/verify-sync.ts`), run manually against a hand-curated list.
Not a UI flow. Matches the vision doc's own framing: a curated ~40–50-figure test
bed, not open contribution, to start.

## Correlation engine

Runs as TypeScript, reusing the existing engine — no new runtime, no Python.

1. For each `reference_figures` row, compute its natal chart once via the existing
   `calculateChart()`.
2. For each of that figure's `reference_life_events`, compute the same class of
   sky-state data Chronicle already uses for personal events — transiting aspects
   to natal points, active Zodiacal Releasing period, active firdaria period,
   annual profection — via the same underlying functions
   `computeSkyState`/`calculateFirdaria`/`buildL1Periods` already call
   (`src/lib/chronicle/sky-state.ts`, `src/lib/astrology/zodiacalReleasing.ts`).
   For `unknown`-confidence birth times, house-dependent and angle-dependent
   techniques are excluded from that figure's contribution — only time-independent
   techniques (transiting aspects to planets, ZR by sign, firdaria) are counted.
3. Aggregate across the whole corpus: for each (technique, event category) pair,
   track how often that technique is "active" (within a defined orb/period) at the
   time of events in that category, versus baseline (random dates). This produces
   a correlation strength per technique per category — the "fixed astrological
   grammar" ranking the vision doc describes.
4. New data (as more figures/events are seeded) is staged, not applied instantly:
   a batch re-run either reinforces an existing (technique, category) correlation
   cluster's weight, or — if the new evidence conflicts meaningfully with the
   existing cluster — forms a new cluster rather than averaging the two together
   and blurring the signal. This mirrors the vision doc's explicit reasoning for
   avoiding naive averaging.
5. Results are exposed as ranked hypotheses ("Saturn return transits correlate
   with X% of career-triumph events in this corpus, n=—"), not asserted as fact —
   consistent with the project's existing guardrail language pattern already used
   throughout Cosmora's Oracle prompts (symbolic framing, never deterministic
   claims).

## Testing / verification

- `npx tsc --noEmit` — clean typecheck.
- Seed script run against a small manually-verified batch (e.g. 5 figures with
  well-documented data) as a smoke test before the full ~40-50 curated set is
  entered.
- A verification script (`scripts/verify-correlation-engine.ts`, no-network, pure
  function assertions — same pattern as `scripts/verify-sync.ts`) asserting the
  aggregation math on synthetic fixture data: known technique-hit patterns produce
  the expected correlation ranking, `unknown`-confidence figures correctly exclude
  house/angle techniques from their contribution, and the cluster
  reinforce-vs-split logic behaves correctly on a crafted conflicting-evidence
  case.

## Relationship to Observatory (separate spec)

Independent subsystems. Observatory (`docs/superpowers/specs/2026-08-09-observatory-design.md`)
visualizes a single user's own chart and Chronicle events; this design is a
standalone shared reference corpus with no dependency on Observatory. A future
version could let a user overlay a historical figure's chart in the Observatory
scene once both exist, but that integration is out of scope for both current specs.
