# Backend Foundation — Supabase Sync + Research Corpus (Design Spec)

**Date:** 2026-07-12
**Status:** Approved for planning
**Version target:** v2.1.x
**Sequencing:** Lands with pre-flight, BEFORE the public beta URL goes out — the first beta users' confirmed outcomes must flow into the corpus from day one.
**Alignment:** `cosmos-engine-mtds-v1/` (04-Data-Architecture, 18-Security-Privacy-and-Ethics, schemas/postgres-core.sql). This is the first server-side layer of the Cosmos Engine staged evolution — Cosmora remains localStorage-first; Supabase is durability + corpus, not a rewrite.

## 1. Purpose

Two jobs, two tiers:

- **Tier 1 — Private sync (default with account):** full backup + multi-device for profiles and Chronicle data. Encrypted in transit, row-level-secured per user. The user's motivation to create an account.
- **Tier 2 — Research corpus (explicit opt-in):** anonymized signature/outcome signals that the ML engine learns from. This is the moat: labeled astrological training data no other product collects. Learning phases: (1) corpus pipeline [this slice] → (2) aggregate pattern stats across users [slice B consumes] → (3) calibrated scoring / fine-tuned model [when corpus volume justifies].

## 2. Locked Decisions

| Decision | Choice |
|---|---|
| Consent model | Two-tier: private sync by default with account; research contribution is separate explicit opt-in |
| Auth | Supabase Auth: email magic link + Google OAuth now; Apple Sign-In added with Capacitor phase (required pre-App-Store; needs Apple dev account) |
| Source of truth | localStorage remains offline-first primary; server is durability + corpus |
| Conflict resolution | Last-write-wins by `updatedAt` (single-owner data) |
| Scope | Profiles + Chronicle (events/people) only; other localStorage domains (oracle memories, marriages…) join sync in later slices |
| Anonymity mechanism | Random contributor UUID generated client-side, stored ONLY in localStorage, never derivable from auth identity |

## 3. Schema (one migration, MTDS-aligned)

```sql
-- Tier 1: private, RLS = owner only
birth_profiles (
  id uuid pk, user_id uuid references auth.users not null,
  local_profile_id text not null,            -- maps to StoredProfile.id
  name text, birth_date date, birth_time time, birth_place text,
  latitude numeric, longitude numeric, timezone text, house_system text,
  payload jsonb not null,                    -- full StoredProfile for lossless round-trip
  updated_at timestamptz not null, created_at timestamptz default now(),
  unique (user_id, local_profile_id)
)

chronicle_events (
  id uuid pk, user_id uuid references auth.users not null,
  local_event_id text not null,              -- LifeEvent.id
  local_profile_id text not null,
  payload jsonb not null,                    -- full LifeEvent (verbatim narrative included — tier 1 is private)
  updated_at timestamptz not null, created_at timestamptz default now(),
  deleted_at timestamptz,                    -- soft delete for sync tombstones
  unique (user_id, local_event_id)
)

chronicle_people (
  id uuid pk, user_id uuid references auth.users not null,
  local_person_id text not null, local_profile_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null, created_at timestamptz default now(),
  deleted_at timestamptz,
  unique (user_id, local_person_id)
)

-- Tier 2: anonymized corpus, RLS = insert-only for authenticated, select for service_role only
research_signals (
  id uuid pk default gen_random_uuid(),
  contributor_id uuid not null,              -- client-generated random UUID; NO FK to auth.users
  event_type text not null,
  signature jsonb not null,                  -- canonical token array from computeSkyState
  encoder_version int not null,
  valence_bucket text not null,              -- negative | mixed | positive
  intensity_bucket text not null,            -- low | medium | high
  date_precision text not null,
  outcome text,                              -- confirmed | partially | did_not_happen | null
  created_at timestamptz default now()
)

consents (
  user_id uuid pk references auth.users,
  research_opt_in boolean not null default false,
  consent_text_version text not null,
  updated_at timestamptz not null
)
```

**RLS doctrine:**
- `birth_profiles`, `chronicle_events`, `chronicle_people`, `consents`: `user_id = auth.uid()` for all operations.
- `research_signals`: INSERT allowed for authenticated users; SELECT/UPDATE/DELETE denied to all client roles (service role only). No client can browse the corpus.

**Anonymization guarantees (tier 2):** no narratives, no names, no people, no locations, no birth data, no timestamps of the underlying events (only signal creation time), no linkage to `auth.users`. A full leak of `research_signals` exposes no identity or story.

## 4. Client Architecture

```
src/lib/sync/
  supabase.ts      — client init (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)
  auth.ts          — signInWithMagicLink(email), signInWithGoogle(), signOut(), onAuthChange
  engine.ts        — pushProfile/pushChronicle (debounced on change), pullAll (on login/new device),
                     LWW merge by updatedAt, tombstone handling
  research.ts      — contributorId (localStorage, random UUID), optIn/optOut (writes consents),
                     contributeSignals(events): strips events → research_signals rows
                     (recomputes signature via computeSkyState at current encoderVersion)
```

**Settings → "Cosmic Account" section:**
- Signed out: email field + magic-link button, Google button, one-line pitch ("Back up your chronicle. Sync across devices.")
- Signed in: email, sync status (last synced / pending), research opt-in toggle with plain-language consent copy (stating exactly what is and isn't collected), and **Delete my cloud data** (deletes tier 1 rows + consents; tier 2 rows are unlinkable by design and this is stated in the consent copy)
- Consent copy version recorded with every opt-in (`consent_text_version`)

**Sync triggers:** push debounced ~3s after any chronicle/profile mutation while signed in; pull on sign-in and app load; research contribution runs when opted-in on event save/reflection with outcome, and once retroactively at opt-in (with user shown the count first).

## 5. Out of Scope (this slice)

- Aggregate pattern-stat queries over the corpus (slice B)
- Any model training/inference
- Syncing other localStorage domains (oracle memories, chat history, marriages, akashic cache)
- Payments/tiers enforcement (guardrails slice)
- Apple Sign-In (Capacitor phase)
- Realtime/multi-writer collaboration

## 6. Testing

- `scripts/verify-sync.ts`: research stripper never emits narrative/name/location/birth fields (property-based over fixture events); valence/intensity bucketing boundaries; LWW merge logic (pure function, tested without network).
- RLS verified by integration check post-migration: anon client cannot select from `research_signals`; user A cannot read user B's rows (executed once against the live project during implementation, documented in the task report).
- `npm run build` clean.

## 7. Rollout

1. Create Supabase project (John confirms — touches account/billing; free tier suffices for beta)
2. Apply migration + RLS
3. Configure auth providers (magic link native; Google OAuth needs John's Google Cloud OAuth app — client ID/secret into Supabase dashboard)
4. Env vars locally + Vercel
5. Ship client slice
6. Verify with two test accounts before beta
