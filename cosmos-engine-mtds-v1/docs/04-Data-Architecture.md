# 04 — Data Architecture

## Purpose

Define the canonical database, graph projection, vector memory, event bus, and data governance approach.

## Storage strategy

Cosmos uses a hybrid data architecture:

1. PostgreSQL is canonical truth.
2. Neo4j is graph projection and relationship analysis.
3. pgvector or dedicated vector store is semantic retrieval.
4. Object storage holds media.
5. Event bus carries change events.
6. Warehouse/lakehouse supports opt-in aggregate research.

## PostgreSQL canonical tables

Core tables:

- tenants
- users
- birth_profiles
- life_events
- event_participants
- relationships
- locations
- media_assets
- planetary_positions
- aspects
- derived_points
- symbolic_annotations
- agent_runs
- agent_findings
- forecast_objects
- scene_objects
- consent_grants
- audit_log

## Life event table

```sql
CREATE TABLE life_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  owner_user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  timezone TEXT NOT NULL,
  location_id UUID,
  emotional_valence NUMERIC,
  emotional_intensity NUMERIC,
  importance_score NUMERIC DEFAULT 0,
  source_type TEXT NOT NULL,
  source_ref TEXT,
  confidence NUMERIC DEFAULT 1.0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

## Derived point table

```sql
CREATE TABLE derived_points (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  source_point_id UUID NOT NULL,
  point_type TEXT NOT NULL,
  zodiac_longitude NUMERIC NOT NULL,
  sign TEXT NOT NULL,
  degree_in_sign NUMERIC NOT NULL,
  calculation_method TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`point_type` values:

- ANTISCION
- CONTRA_ANTISCION
- MIDPOINT_NEAR
- MIDPOINT_FAR
- ARABIC_PART
- HARMONIC_POINT
- PROGRESSED_POINT
- SOLAR_ARC_POINT

## Neo4j graph projection

Canonical objects become graph nodes:

```cypher
(:User {id, tenant_id})
(:Event {id, event_type, starts_at, importance_score})
(:Person {id, name_hash})
(:PlanetaryPoint {id, body, longitude, sign, house})
(:DerivedPoint {id, type, longitude, sign})
(:Aspect {id, type, orb, exact_at})
(:Theme {id, label})
(:Chapter {id, title, starts_at, ends_at})
(:Forecast {id, theme, probability, starts_at, ends_at})
```

Edges:

```cypher
(:Event)-[:INVOLVES]->(:Person)
(:Event)-[:ACTIVATES]->(:PlanetaryPoint)
(:PlanetaryPoint)-[:HAS_DERIVED_POINT]->(:DerivedPoint)
(:PlanetaryPoint)-[:ASPECTS {type, orb}]->(:PlanetaryPoint)
(:Event)-[:BELONGS_TO]->(:Chapter)
(:Event)-[:ECHOES {score}]->(:Event)
(:Forecast)-[:SUPPORTED_BY]->(:Event)
(:Forecast)-[:SUPPORTED_BY]->(:Aspect)
```

## Vector memory

Embeddings must be created for:

- Event descriptions.
- Journal entries.
- Dreams.
- Media captions.
- Agent findings.
- Forecast explanations.
- Script scenes.

Embedding record:

```json
{
  "object_id": "evt_123",
  "object_type": "life_event",
  "embedding_model": "text-embedding-model-version",
  "embedding_version": 3,
  "tenant_id": "tenant_1",
  "visibility": "private",
  "text_hash": "sha256",
  "created_at": "2026-07-05T00:00:00Z"
}
```

## Event bus topics

- `life_event.created`
- `life_event.updated`
- `birth_profile.created`
- `astrology.positions.computed`
- `graph.projection.requested`
- `graph.projection.completed`
- `embedding.requested`
- `agent.run.requested`
- `agent.finding.created`
- `forecast.created`
- `cinema.job.created`

## Replayability

The graph and vector store are projections. They must be rebuildable from PostgreSQL and object storage. Every projection job records checkpoint and version.

## Data acceptance criteria

- Canonical writes occur in PostgreSQL first.
- Graph state can be dropped and rebuilt.
- Vector records can be regenerated after embedding model upgrades.
- Every object has provenance and tenant scope.
- Every AI output links to evidence object IDs.
