# 19 — Testing, Observability, and QA

## Purpose

Define how Cosmos maintains correctness and reliability.

## Test layers

### Unit tests

- Astrology math.
- Derived point formulas.
- Aspect orb calculations.
- Event normalization.
- Permission checks.
- Retrieval scoring.

### Integration tests

- Event creation -> astrology compute -> graph projection -> renderer payload.
- Biography extraction -> user confirmation -> canonical write.
- Agent workflow -> finding object -> evidence references.

### Contract tests

- REST OpenAPI schema.
- Internal RPC schemas.
- Event bus schemas.
- Scene payload schemas.

### Visual tests

- Natal chart rendering.
- Transit animation.
- Layer toggles.
- Forecast cloud rendering.
- Reduced motion mode.

### AI evaluation

- Evidence citation accuracy.
- Overclaim detection.
- Sensitivity language.
- Agent disagreement quality.
- Forecast calibration over time.

## Golden charts

Maintain a suite of known birth profiles and expected outputs. Any astrology engine change must pass golden chart tests.

## Observability

Every request has:

- request_id
- tenant_id hash
- user_id hash
- service name
- latency
- status
- error type

Agent workflows additionally log:

- workflow_id
- prompt_version
- model
- context_packet_hash
- tool calls
- output IDs

## SLOs

Initial service-level objectives:

- API p95 latency under 300ms for simple reads.
- Observatory scene initial payload under 2 seconds for normal users.
- Astrology calculation under 5 seconds for one-year transit scan.
- Agent workflow status visible within 1 second.
- 99.5% monthly uptime during beta.

## Acceptance criteria

- Core astrology formulas have deterministic tests.
- Privacy permission tests exist for every retrieval path.
- Agent outputs are evaluated before release.
- Telemetry dashboards exist before public beta.
- Incidents can be traced by request ID.
