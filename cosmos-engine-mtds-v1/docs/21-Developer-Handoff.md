# 21 — Developer Handoff

## Purpose

Tell engineering agents and human developers exactly how to use this MTDS.

## Implementation doctrine

Do not implement isolated features. Implement canonical objects, services, contracts, and projections in order.

## First sprint tasks

1. Create monorepo.
2. Add API service skeleton.
3. Add PostgreSQL migrations.
4. Add birth profile CRUD.
5. Add life event CRUD.
6. Add astrology computation interface with mocked provider.
7. Add derived point utility library.
8. Add unit tests for longitude math.
9. Add OpenAPI contract.
10. Add local Docker Compose.

## Suggested monorepo

```text
cosmos-engine/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
├── services/
│   ├── astrology-service/
│   ├── graph-service/
│   ├── vector-service/
│   ├── agent-orchestrator/
│   ├── probability-engine/
│   └── cinema-engine/
├── packages/
│   ├── schemas/
│   ├── astro-math/
│   ├── graph-types/
│   ├── ui/
│   └── config/
├── infra/
├── docs/
└── tests/
```

## Coding standards

- TypeScript for web/API unless a Python service is justified.
- Python for astrology and ML computation.
- All schemas generated from shared contracts.
- No untyped agent outputs.
- All environment variables documented.
- All database migrations reviewed.
- No direct DB access from frontend.

## Definition of done

A task is done only when:

- Code compiles.
- Tests pass.
- Schema updated.
- API documented.
- Telemetry added.
- Feature flag added if needed.
- Privacy impact considered.
- Developer notes updated.

## Autonomous coding agent instruction

When implementing from this MTDS:

1. Read the relevant doc.
2. Identify canonical objects involved.
3. Check schemas.
4. Implement smallest vertical slice.
5. Add tests first for math or contracts.
6. Never invent new object types without updating ontology.
7. Never bypass permission checks.
8. Never allow AI output to mutate canonical truth.
9. Return a change report with files changed, tests added, and assumptions.

## First vertical slice

Target: “User enters birth profile and one life event; Observatory renders natal anchors and event star.”

Required components:

- Birth profile form.
- Event form.
- Astrology calculation mock or real provider.
- PostgreSQL persistence.
- Scene payload endpoint.
- Basic Three.js display.
- Unit tests for longitude and antiscion math.

## Acceptance criteria

- A new developer can understand the system from README and docs.
- First vertical slice can be implemented without asking conceptual questions.
- Future documents can extend the canon without breaking existing decisions.
