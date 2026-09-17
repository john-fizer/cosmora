# 16 — APIs and Contracts

## Purpose

Define API patterns and initial endpoints.

## API principles

- Contract-first.
- Versioned.
- Tenant-scoped.
- Provenance-aware.
- Idempotent where possible.
- Async for expensive operations.

## REST endpoint groups

### Birth profiles

```http
POST /v1/birth-profiles
GET /v1/birth-profiles/{id}
POST /v1/birth-profiles/{id}/calculate
```

### Events

```http
POST /v1/events
GET /v1/events/{id}
PATCH /v1/events/{id}
GET /v1/events?start=&end=&type=
```

### Astrology

```http
GET /v1/astrology/natal/{profile_id}
GET /v1/astrology/transits?profile_id=&start=&end=
GET /v1/astrology/derived-points?profile_id=&types=antiscia,midpoints
```

### Graph

```http
GET /v1/graph/neighborhood?object_id=&depth=2
GET /v1/graph/constellations?profile_id=
POST /v1/graph/rebuild
```

### Agents

```http
POST /v1/agents/workflows
GET /v1/agents/workflows/{id}
GET /v1/agents/findings/{id}
```

### Forecasts

```http
POST /v1/forecasts
GET /v1/forecasts/{id}
POST /v1/forecasts/{id}/feedback
```

### Cinema

```http
POST /v1/cinema/scripts
POST /v1/cinema/render-jobs
GET /v1/cinema/render-jobs/{id}
```

## Event creation example

```json
{
  "event_type": "CreativeRelease",
  "title": "Released first single",
  "starts_at": "2026-04-01T12:00:00-05:00",
  "timezone": "America/Chicago",
  "description": "Released a song publicly.",
  "importance_score": 0.8,
  "source_type": "manual"
}
```

## Async job response

```json
{
  "job_id": "uuid",
  "status": "queued",
  "status_url": "/v1/jobs/uuid",
  "estimated_seconds": 120
}
```

## Internal contracts

Use gRPC or typed internal RPC for service-to-service communication:

- AstrologyCompute.CalculateNatal
- AstrologyCompute.CalculateTransits
- GraphProjection.ProjectObject
- VectorMemory.EmbedObject
- AgentOrchestrator.StartWorkflow
- ProbabilityEngine.ScoreWindow
- CinemaEngine.CreateStoryboard

## WebSocket scene stream

```text
/ws/v1/observatory/scenes/{scene_id}
```

Events:

- node.added
- node.updated
- edge.added
- time.changed
- layer.toggled
- forecast.updated

## Acceptance criteria

- OpenAPI spec exists for public endpoints.
- Internal APIs have typed schemas.
- Async jobs are idempotent where possible.
- Every response includes request ID.
- Error responses are standardized.
