# Cosmos Engine First Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the MTDS handoff doc's "First vertical slice" target — *"User enters birth profile and one life event; Observatory renders natal anchors and event star"* — as a real, click-through demo: a minimal web app that submits a birth profile and a life event to the existing Sprint 1 API, fetches a computed 3D scene payload, and renders it with Three.js.

**Architecture:** Adds one new workspace app, `apps/web` (Vite + React + @react-three/fiber, no router/auth — a single-page flow: onboarding form → observatory view), plus three small additions to what Sprint 1 already built: (1) minimal `POST /v1/tenants` and `POST /v1/users` bootstrap endpoints in `apps/api` (nothing in Sprint 1 could create the tenant/user a birth profile requires — without these, "a user enters a birth profile" has no path from a fresh browser), (2) a `polarPlacement`/nearest-body helper in `packages/astro-math` implementing doc 13's coordinate model, (3) a `GET /v1/observatory/scene` endpoint in `apps/api` that composes a stored birth profile + life event into the scene-payload shape doc 13 defines, using the mocked astrology provider Sprint 1 already built. No new astrology computation, no auth, no persistence of the scene itself — this is presentation over what already exists.

**Tech Stack:** Same as Sprint 1 for `packages/*` and `apps/api` (TypeScript, Zod, Fastify, `pg`, Vitest). New for `apps/web`: Vite 6, React 19, `@react-three/fiber` 9 + `@react-three/drei` 10 (same major versions as the existing Cosmora Next.js app at the repo root, for consistency) — no test framework wired for the UI layer; verification is a manual browser smoke pass at the end (Task 8), not automated UI tests.

**Spec:**
- `cosmos-engine-mtds-v1/docs/13-4D-Renderer.md` (coordinate model, scene payload shape, layers)
- `cosmos-engine-mtds-v1/docs/14-UX-Rooms.md` (Observatory room definition, onboarding flow)
- `cosmos-engine-mtds-v1/docs/21-Developer-Handoff.md` ("First vertical slice" target and required components)
- Sprint 1 plan: `docs/superpowers/plans/2026-09-24-cosmos-engine-sprint1-foundation.md` (what already exists: `computeMockNatalPoints`, `packages/astro-math`'s `angularSeparation`/`signAndDegree`, birth-profile/event CRUD, all of which this plan builds on without modifying)

## Global Constraints

- TypeScript for web/API — no Python (per 21-Developer-Handoff.md, same as Sprint 1).
- No untyped agent outputs — every new request/response body validated against a Zod schema.
- No direct DB access from `apps/web` — it only ever talks to `apps/api` over HTTP, same as Sprint 1's boundary.
- Wire format is camelCase JSON, matching every existing Sprint 1 endpoint — NOT doc 13's literal snake_case scene-payload example (`scene_id`, `time_window`, `show_midpoints`). Doc 13's JSON block is illustrating the *concept*, not a wire contract the way `event.schema.json` is; camelCase keeps this endpoint consistent with `birthProfiles.ts`/`events.ts`'s established convention (`toApiShape` snake_case→camelCase mapping). Field names: `sceneId`, `timeWindow: { start, end }`, `nodes[]` (`id, type, x, y, z, label`), `edges[]` (`id, from, to, type, weight`), `animations: []`, `filters: { showMidpoints, showAntiscia, showForecasts }`.
- Coordinate model is doc 13's exactly: `angle = longitudeDegrees * Math.PI / 180`, `x = radius * cos(angle)`, `y = radius * sin(angle)`, `z = layerDepth`. Layer depths used here: natal anchors = `2`, events = `5` (doc 13's Layer 2 / Layer 5).
- Event placement: the event's zodiac longitude for placement purposes is the transiting Sun's longitude on the event's `starts_at` date, computed via the existing `computeMockNatalPoints(eventId, eventDateOnly)` (Sprint 1's deterministic mock provider) — take the `Sun` entry's `zodiacLongitude`. This is a documented MVP simplification (one representative body standing in for "where in the sky this moment falls"), not a new astrology feature.
- Activation edge: the event node gets exactly one `ACTIVATES` edge to whichever natal body is closest in zodiac longitude (via `angularSeparation` from `packages/astro-math`), with `weight = max(0, 1 - separation / 15)` (a 15° reference orb for this visualization-only weighting — distinct from `aspects.ts`'s 8° major-aspect orb, since this is "nearest body" not "exact aspect").
- Bootstrap endpoints (`POST /v1/tenants`, `POST /v1/users`) are MVP-only scaffolding to unblock the vertical slice's demo flow, not a production account system — no auth, no rate limiting, matches the "no auth beyond a trusted header" gap already documented in Sprint 1's plan. Deliberately out of scope for this plan: input sanitization beyond Zod validation, and graceful handling of a bogus `tenantId` on `POST /v1/users` (an FK violation there surfaces as an unhandled 500 — acceptable for this MVP bootstrap path, note it as a known gap rather than building error handling for it).

---

## File Structure

```
cosmos-engine/
├── packages/
│   ├── astro-math/
│   │   ├── src/
│   │   │   ├── placement.ts            # NEW: polarPlacement, nearestBody
│   │   │   └── index.ts                # MODIFY: export placement.ts
│   │   └── test/
│   │       └── placement.test.ts       # NEW
│   └── schemas/
│       └── src/
│           ├── tenant.ts               # NEW: tenantInputSchema, Tenant
│           ├── user.ts                 # NEW: userInputSchema, User
│           ├── scenePayload.ts         # NEW: sceneNodeSchema, sceneEdgeSchema, scenePayloadSchema
│           └── index.ts                # MODIFY: export the three new files
└── apps/
    ├── api/
    │   └── src/
    │       ├── routes/
    │       │   ├── tenants.ts          # NEW: POST /v1/tenants
    │       │   ├── users.ts            # NEW: POST /v1/users
    │       │   └── observatoryScene.ts # NEW: GET /v1/observatory/scene
    │       ├── observatory/
    │       │   └── buildScene.ts       # NEW: pure scene-assembly function (testable without HTTP)
    │       └── server.ts               # MODIFY: register 3 new route plugins
    │   └── test/
    │       ├── tenants.test.ts         # NEW
    │       ├── users.test.ts           # NEW
    │       └── observatoryScene.test.ts # NEW
    └── web/                            # NEW app
        ├── package.json
        ├── vite.config.ts
        ├── index.html
        └── src/
            ├── main.tsx
            ├── App.tsx
            ├── vite-env.d.ts
            ├── api.ts                  # fetch wrappers
            ├── OnboardingForm.tsx
            └── ObservatoryScene.tsx
```

---

### Task 1: `packages/schemas` — tenant, user, and scene-payload contracts

**Files:**
- Create: `cosmos-engine/packages/schemas/src/tenant.ts`
- Create: `cosmos-engine/packages/schemas/src/user.ts`
- Create: `cosmos-engine/packages/schemas/src/scenePayload.ts`
- Modify: `cosmos-engine/packages/schemas/src/index.ts`
- Test: `cosmos-engine/packages/schemas/test/scenePayload.test.ts`

**Interfaces:**
- Consumes: nothing new (uses `zod`, already a dependency).
- Produces: `tenantInputSchema`, `Tenant`, `userInputSchema`, `User`, `sceneNodeSchema`, `SceneNode`, `sceneEdgeSchema`, `SceneEdge`, `scenePayloadSchema`, `ScenePayload` — all imported by Task 2's `apps/api` routes.

- [ ] **Step 1: Write `src/tenant.ts`**

```typescript
import { z } from "zod";

export const tenantInputSchema = z.object({
  name: z.string().min(1),
});

export const tenantSchema = tenantInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export type TenantInput = z.infer<typeof tenantInputSchema>;
export type Tenant = z.infer<typeof tenantSchema>;
```

- [ ] **Step 2: Write `src/user.ts`**

```typescript
import { z } from "zod";

export const userInputSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email().nullable().optional(),
});

export const userSchema = userInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export type UserInput = z.infer<typeof userInputSchema>;
export type User = z.infer<typeof userSchema>;
```

- [ ] **Step 3: Write the failing scene-payload test**

`cosmos-engine/packages/schemas/test/scenePayload.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { scenePayloadSchema } from "../src/scenePayload.js";

describe("scenePayloadSchema", () => {
  it("accepts a minimal valid scene with one natal node, one event node, and one edge", () => {
    const result = scenePayloadSchema.safeParse({
      sceneId: "11111111-1111-1111-1111-111111111111",
      timeWindow: { start: "1991-04-23", end: "2026-09-24" },
      nodes: [
        { id: "pp_sun", type: "natal_planet", x: 200, y: 0, z: 2, label: "Sun" },
        { id: "evt_1", type: "event", x: -50, y: 240, z: 5, label: "Joined Cosmos Engine" },
      ],
      edges: [
        { id: "edge_1", from: "evt_1", to: "pp_sun", type: "ACTIVATES", weight: 0.8 },
      ],
      animations: [],
      filters: { showMidpoints: false, showAntiscia: false, showForecasts: false },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a node with an unknown type", () => {
    const result = scenePayloadSchema.safeParse({
      sceneId: "11111111-1111-1111-1111-111111111111",
      timeWindow: { start: "1991-04-23", end: "2026-09-24" },
      nodes: [{ id: "x", type: "not_a_real_type", x: 0, y: 0, z: 0, label: "X" }],
      edges: [],
      animations: [],
      filters: { showMidpoints: false, showAntiscia: false, showForecasts: false },
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd cosmos-engine && npx vitest run packages/schemas/test/scenePayload.test.ts`
Expected: FAIL — `Cannot find module '../src/scenePayload.js'`

- [ ] **Step 5: Write `src/scenePayload.ts`**

```typescript
import { z } from "zod";

export const sceneNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["natal_planet", "event"]),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  label: z.string(),
});

export const sceneEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  type: z.string(),
  weight: z.number(),
});

export const scenePayloadSchema = z.object({
  sceneId: z.string(),
  timeWindow: z.object({
    start: z.string(),
    end: z.string(),
  }),
  nodes: z.array(sceneNodeSchema),
  edges: z.array(sceneEdgeSchema),
  animations: z.array(z.unknown()),
  filters: z.object({
    showMidpoints: z.boolean(),
    showAntiscia: z.boolean(),
    showForecasts: z.boolean(),
  }),
});

export type SceneNode = z.infer<typeof sceneNodeSchema>;
export type SceneEdge = z.infer<typeof sceneEdgeSchema>;
export type ScenePayload = z.infer<typeof scenePayloadSchema>;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd cosmos-engine && npx vitest run packages/schemas/test/scenePayload.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 7: Write `src/index.ts` additions**

Add to the existing `packages/schemas/src/index.ts` (don't remove the existing export lines from Sprint 1):

```typescript
export * from "./tenant.js";
export * from "./user.js";
export * from "./scenePayload.js";
```

- [ ] **Step 8: Run the full schemas suite**

Run: `cd cosmos-engine && npx vitest run packages/schemas`
Expected: PASS (all prior tests + 2 new = 5 tests)

- [ ] **Step 9: Commit**

```bash
git add cosmos-engine/packages/schemas
git commit -m "cosmos-engine: add tenant, user, and scene-payload schemas"
```

---

### Task 2: `packages/astro-math` — polar placement + nearest-body helper

**Files:**
- Create: `cosmos-engine/packages/astro-math/src/placement.ts`
- Modify: `cosmos-engine/packages/astro-math/src/index.ts`
- Test: `cosmos-engine/packages/astro-math/test/placement.test.ts`

**Interfaces:**
- Consumes: `normalizeLongitude`, `angularSeparation` from `./longitude.js` (Sprint 1, already exists).
- Produces: `polarPlacement(longitudeDegrees: number, radius: number, layerDepth: number): { x: number; y: number; z: number }`, `nearestBody(targetLongitude: number, bodies: { body: string; zodiacLongitude: number }[]): { body: string; separation: number }`, both imported by Task 4's `apps/api/src/observatory/buildScene.ts`.

- [ ] **Step 1: Write the failing test**

`cosmos-engine/packages/astro-math/test/placement.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { polarPlacement, nearestBody } from "../src/placement.js";

describe("polarPlacement", () => {
  it("places 0 degrees at (radius, 0) on the given layer", () => {
    const result = polarPlacement(0, 200, 2);
    expect(result.x).toBeCloseTo(200);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBe(2);
  });

  it("places 90 degrees at (0, radius)", () => {
    const result = polarPlacement(90, 200, 2);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(200);
  });

  it("places 180 degrees at (-radius, 0)", () => {
    const result = polarPlacement(180, 200, 2);
    expect(result.x).toBeCloseTo(-200);
    expect(result.y).toBeCloseTo(0);
  });

  it("carries the layer depth through unchanged", () => {
    expect(polarPlacement(45, 100, 5).z).toBe(5);
  });
});

describe("nearestBody", () => {
  const bodies = [
    { body: "Sun", zodiacLongitude: 10 },
    { body: "Moon", zodiacLongitude: 145 },
    { body: "Mars", zodiacLongitude: 355 },
  ];

  it("finds the closest body by angular separation, including wraparound", () => {
    // target at 5 degrees: Mars (355) is 10 away, Sun (10) is 5 away
    const result = nearestBody(5, bodies);
    expect(result.body).toBe("Sun");
    expect(result.separation).toBeCloseTo(5);
  });

  it("picks the wraparound-nearest body over a naive linear-distance nearest", () => {
    // target at 358: Mars (355) is 3 away; Sun (10) is 12 away the short way
    const result = nearestBody(358, bodies);
    expect(result.body).toBe("Mars");
    expect(result.separation).toBeCloseTo(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cosmos-engine && npx vitest run packages/astro-math/test/placement.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/placement.ts`**

```typescript
import { normalizeLongitude, angularSeparation } from "./longitude.js";

export interface Placement {
  x: number;
  y: number;
  z: number;
}

export function polarPlacement(longitudeDegrees: number, radius: number, layerDepth: number): Placement {
  const angle = (normalizeLongitude(longitudeDegrees) * Math.PI) / 180;
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
    z: layerDepth,
  };
}

export interface BodyPosition {
  body: string;
  zodiacLongitude: number;
}

export interface NearestBodyResult {
  body: string;
  separation: number;
}

export function nearestBody(targetLongitude: number, bodies: BodyPosition[]): NearestBodyResult {
  let best: NearestBodyResult | null = null;
  for (const candidate of bodies) {
    const separation = angularSeparation(targetLongitude, candidate.zodiacLongitude);
    if (best === null || separation < best.separation) {
      best = { body: candidate.body, separation };
    }
  }
  if (best === null) {
    throw new Error("nearestBody requires at least one candidate body");
  }
  return best;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cosmos-engine && npx vitest run packages/astro-math/test/placement.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Add to `src/index.ts`**

Add this line to the existing `packages/astro-math/src/index.ts` (don't remove the existing Sprint 1 export lines):

```typescript
export * from "./placement.js";
```

- [ ] **Step 6: Run the full astro-math suite**

Run: `cd cosmos-engine && npx vitest run packages/astro-math`
Expected: PASS (26 prior + 6 new = 32 tests)

- [ ] **Step 7: Commit**

```bash
git add cosmos-engine/packages/astro-math
git commit -m "cosmos-engine: add polar placement and nearest-body helpers"
```

---

### Task 3: `apps/api` — tenant and user bootstrap endpoints

**Files:**
- Create: `cosmos-engine/apps/api/src/routes/tenants.ts`
- Create: `cosmos-engine/apps/api/src/routes/users.ts`
- Modify: `cosmos-engine/apps/api/src/server.ts`
- Test: `cosmos-engine/apps/api/test/tenants.test.ts`
- Test: `cosmos-engine/apps/api/test/users.test.ts`

**Interfaces:**
- Consumes: `tenantInputSchema`, `userInputSchema` from `@cosmos-engine/schemas` (Task 1); `getPool()` from `../db.js` (Sprint 1).
- Produces: `POST /v1/tenants` (201, body: `Tenant`), `POST /v1/users` (201, body: `User`) — consumed by Task 6's web app bootstrap flow.

**Requires local Postgres** — same as Sprint 1's DB-backed tasks: bring up a throwaway `postgres:16` container, run `npm run migrate` before running this task's tests.

- [ ] **Step 1: Write the failing tests**

`cosmos-engine/apps/api/test/tenants.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildServer } from "../src/server.js";

describe("POST /v1/tenants", () => {
  it("creates a tenant", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/v1/tenants",
      payload: { name: "vertical-slice-demo" },
    });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeTruthy();
    expect(body.name).toBe("vertical-slice-demo");
    await app.close();
  });

  it("rejects a missing name with 400", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/v1/tenants",
      payload: {},
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
```

`cosmos-engine/apps/api/test/users.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../src/server.js";
import { getPool, closePool } from "../src/db.js";

let tenantId: string;

beforeAll(async () => {
  const pool = getPool();
  const tenant = await pool.query(
    "INSERT INTO tenants (name) VALUES ('users-test-tenant') RETURNING id",
  );
  tenantId = tenant.rows[0].id;
});

afterAll(async () => {
  await closePool();
});

describe("POST /v1/users", () => {
  it("creates a user under a tenant", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/v1/users",
      payload: { tenantId, email: "demo@example.com" },
    });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeTruthy();
    expect(body.tenantId).toBe(tenantId);
    await app.close();
  });

  it("rejects a malformed tenantId with 400", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/v1/users",
      payload: { tenantId: "not-a-uuid" },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cosmos-engine && DATABASE_URL=postgres://cosmos:cosmos@localhost:5432/cosmos npx vitest run apps/api/test/tenants.test.ts apps/api/test/users.test.ts`
Expected: FAIL — 404 on both routes

- [ ] **Step 3: Implement `src/routes/tenants.ts`**

```typescript
import type { FastifyInstance } from "fastify";
import { tenantInputSchema } from "@cosmos-engine/schemas";
import { getPool } from "../db.js";

function toApiShape(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export async function tenantRoutes(app: FastifyInstance) {
  app.post("/v1/tenants", async (request, reply) => {
    const parsed = tenantInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const pool = getPool();
    const result = await pool.query(
      "INSERT INTO tenants (name) VALUES ($1) RETURNING *",
      [parsed.data.name],
    );
    return reply.code(201).send(toApiShape(result.rows[0]));
  });
}
```

- [ ] **Step 4: Implement `src/routes/users.ts`**

```typescript
import type { FastifyInstance } from "fastify";
import { userInputSchema } from "@cosmos-engine/schemas";
import { getPool } from "../db.js";

function toApiShape(row: Record<string, unknown>) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    createdAt: row.created_at,
  };
}

export async function userRoutes(app: FastifyInstance) {
  app.post("/v1/users", async (request, reply) => {
    const parsed = userInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const pool = getPool();
    const result = await pool.query(
      "INSERT INTO users (tenant_id, email) VALUES ($1, $2) RETURNING *",
      [parsed.data.tenantId, parsed.data.email ?? null],
    );
    return reply.code(201).send(toApiShape(result.rows[0]));
  });
}
```

- [ ] **Step 5: Register both routes in `server.ts`**

Add to the existing `apps/api/src/server.ts` (don't remove any of the Sprint 1 route registrations — `healthRoutes`, `birthProfileRoutes`, `eventRoutes`, `derivedPointRoutes`, `openapiRoutes`):

```typescript
import { tenantRoutes } from "./routes/tenants.js";
import { userRoutes } from "./routes/users.js";
```

and inside `buildServer()`, alongside the existing `app.register(...)` calls:

```typescript
  app.register(tenantRoutes);
  app.register(userRoutes);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd cosmos-engine && DATABASE_URL=postgres://cosmos:cosmos@localhost:5432/cosmos npx vitest run apps/api/test/tenants.test.ts apps/api/test/users.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add cosmos-engine/apps/api
git commit -m "cosmos-engine: add tenant and user bootstrap endpoints"
```

---

### Task 4: `apps/api` — observatory scene endpoint

**Files:**
- Create: `cosmos-engine/apps/api/src/observatory/buildScene.ts`
- Create: `cosmos-engine/apps/api/src/routes/observatoryScene.ts`
- Modify: `cosmos-engine/apps/api/src/server.ts`
- Test: `cosmos-engine/apps/api/test/observatoryScene.test.ts`

**Interfaces:**
- Consumes: `computeMockNatalPoints` from `../astrology/mockProvider.js` (Sprint 1); `polarPlacement`, `nearestBody` from `@cosmos-engine/astro-math` (Task 2); `getPool()` from `../db.js`.
- Produces: `buildScenePayload(input: { profileId: string; birthDate: string; eventId: string; eventTitle: string; eventStartsAt: string }): ScenePayload` (pure function, no I/O — testable without a database); `GET /v1/observatory/scene?profile_id=&event_id=` (200: `ScenePayload`, 400/404 on bad input).

- [ ] **Step 1: Write the failing test for `buildScenePayload`**

`cosmos-engine/apps/api/test/observatoryScene.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../src/server.js";
import { getPool, closePool } from "../src/db.js";
import { buildScenePayload } from "../src/observatory/buildScene.js";

describe("buildScenePayload", () => {
  it("produces 10 natal nodes, 1 event node, and exactly 1 activation edge", () => {
    const scene = buildScenePayload({
      profileId: "profile-1",
      birthDate: "1991-04-23",
      eventId: "event-1",
      eventTitle: "Joined Cosmos Engine",
      eventStartsAt: "2026-09-24",
    });
    expect(scene.nodes).toHaveLength(11);
    expect(scene.nodes.filter((n) => n.type === "natal_planet")).toHaveLength(10);
    expect(scene.nodes.filter((n) => n.type === "event")).toHaveLength(1);
    expect(scene.edges).toHaveLength(1);
    expect(scene.edges[0].type).toBe("ACTIVATES");
    expect(scene.edges[0].from).toBe("evt_event-1");
  });

  it("is deterministic for the same inputs", () => {
    const a = buildScenePayload({
      profileId: "profile-1",
      birthDate: "1991-04-23",
      eventId: "event-1",
      eventTitle: "Joined Cosmos Engine",
      eventStartsAt: "2026-09-24",
    });
    const b = buildScenePayload({
      profileId: "profile-1",
      birthDate: "1991-04-23",
      eventId: "event-1",
      eventTitle: "Joined Cosmos Engine",
      eventStartsAt: "2026-09-24",
    });
    expect(a).toEqual(b);
  });

  it("places natal nodes at layer depth 2 and the event node at layer depth 5", () => {
    const scene = buildScenePayload({
      profileId: "profile-1",
      birthDate: "1991-04-23",
      eventId: "event-1",
      eventTitle: "Joined Cosmos Engine",
      eventStartsAt: "2026-09-24",
    });
    for (const node of scene.nodes.filter((n) => n.type === "natal_planet")) {
      expect(node.z).toBe(2);
    }
    expect(scene.nodes.find((n) => n.type === "event")!.z).toBe(5);
  });
});

describe("GET /v1/observatory/scene", () => {
  let tenantId: string;
  let profileId: string;
  let eventId: string;

  afterAll(async () => {
    await closePool();
  });

  beforeAll(async () => {
    const app = buildServer();
    const pool = getPool();

    const tenant = await pool.query("INSERT INTO tenants (name) VALUES ('scene-test') RETURNING id");
    tenantId = tenant.rows[0].id;
    const user = await pool.query(
      "INSERT INTO users (tenant_id, email) VALUES ($1, 'scene@example.com') RETURNING id",
      [tenantId],
    );
    const userId = user.rows[0].id;

    const profileResponse = await app.inject({
      method: "POST",
      url: "/v1/birth-profiles",
      headers: { "x-tenant-id": tenantId },
      payload: {
        userId,
        birthDate: "1991-04-23",
        timezone: "America/Chicago",
        latitude: 41.8781,
        longitude: -87.6298,
      },
    });
    profileId = profileResponse.json().id;

    const eventResponse = await app.inject({
      method: "POST",
      url: "/v1/events",
      headers: { "x-tenant-id": tenantId },
      payload: {
        ownerUserId: userId,
        eventType: "CareerStart",
        title: "Joined Cosmos Engine",
        startsAt: "2026-09-24T00:00:00Z",
        timezone: "America/Chicago",
        sourceType: "manual",
      },
    });
    eventId = eventResponse.json().id;

    await app.close();
  });

  it("returns a full scene payload for a stored profile and event", async () => {
    const app = buildServer();
    const sceneResponse = await app.inject({
      method: "GET",
      url: `/v1/observatory/scene?profile_id=${profileId}&event_id=${eventId}`,
      headers: { "x-tenant-id": tenantId },
    });
    expect(sceneResponse.statusCode).toBe(200);
    const scene = sceneResponse.json();
    expect(scene.nodes).toHaveLength(11);
    expect(scene.edges).toHaveLength(1);
    await app.close();
  });

  it("returns 404 when the profile does not belong to the given tenant", async () => {
    const app = buildServer();
    const otherTenant = await getPool().query("INSERT INTO tenants (name) VALUES ('scene-test-other') RETURNING id");
    const response = await app.inject({
      method: "GET",
      url: `/v1/observatory/scene?profile_id=${profileId}&event_id=${eventId}`,
      headers: { "x-tenant-id": otherTenant.rows[0].id },
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it("returns 400 when profile_id is not a valid UUID", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "GET",
      url: `/v1/observatory/scene?profile_id=not-a-uuid&event_id=${eventId}`,
      headers: { "x-tenant-id": tenantId },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cosmos-engine && DATABASE_URL=postgres://cosmos:cosmos@localhost:5432/cosmos npx vitest run apps/api/test/observatoryScene.test.ts`
Expected: FAIL — module not found / 404

- [ ] **Step 3: Implement `src/observatory/buildScene.ts`**

```typescript
import { randomUUID } from "node:crypto";
import { polarPlacement, nearestBody } from "@cosmos-engine/astro-math";
import type { ScenePayload } from "@cosmos-engine/schemas";
import { computeMockNatalPoints } from "../astrology/mockProvider.js";

const NATAL_RADIUS = 200;
const NATAL_LAYER_Z = 2;
const EVENT_RADIUS = 260;
const EVENT_LAYER_Z = 5;
const ACTIVATION_MAX_ORB_DEGREES = 15;

export interface BuildScenePayloadInput {
  profileId: string;
  birthDate: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
}

export function buildScenePayload(input: BuildScenePayloadInput): ScenePayload {
  const natalPoints = computeMockNatalPoints(input.profileId, input.birthDate);
  const eventDateOnly = input.eventStartsAt.slice(0, 10);
  const eventPoints = computeMockNatalPoints(input.eventId, eventDateOnly);
  const eventSun = eventPoints.find((p) => p.body === "Sun")!;

  const natalNodes = natalPoints.map((point) => {
    const placement = polarPlacement(point.zodiacLongitude, NATAL_RADIUS, NATAL_LAYER_Z);
    return {
      id: `pp_${point.body.toLowerCase()}`,
      type: "natal_planet" as const,
      ...placement,
      label: point.body,
    };
  });

  const eventPlacement = polarPlacement(eventSun.zodiacLongitude, EVENT_RADIUS, EVENT_LAYER_Z);
  const eventNodeId = `evt_${input.eventId}`;
  const eventNode = {
    id: eventNodeId,
    type: "event" as const,
    ...eventPlacement,
    label: input.eventTitle,
  };

  const nearest = nearestBody(
    eventSun.zodiacLongitude,
    natalPoints.map((p) => ({ body: p.body, zodiacLongitude: p.zodiacLongitude })),
  );
  const weight = Math.max(0, 1 - nearest.separation / ACTIVATION_MAX_ORB_DEGREES);

  return {
    sceneId: randomUUID(),
    timeWindow: { start: input.birthDate, end: eventDateOnly },
    nodes: [...natalNodes, eventNode],
    edges: [
      {
        id: `edge_${eventNodeId}_${nearest.body.toLowerCase()}`,
        from: eventNodeId,
        to: `pp_${nearest.body.toLowerCase()}`,
        type: "ACTIVATES",
        weight,
      },
    ],
    animations: [],
    filters: { showMidpoints: false, showAntiscia: false, showForecasts: false },
  };
}
```

- [ ] **Step 4: Run the `buildScenePayload` tests to verify they pass**

Run: `cd cosmos-engine && npx vitest run apps/api/test/observatoryScene.test.ts -t buildScenePayload`
Expected: PASS (3 tests) — this part needs no database.

- [ ] **Step 5: Implement `src/routes/observatoryScene.ts`**

```typescript
import type { FastifyInstance } from "fastify";
import { getPool } from "../db.js";
import { buildScenePayload } from "../observatory/buildScene.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function observatorySceneRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { profile_id?: string; event_id?: string } }>(
    "/v1/observatory/scene",
    async (request, reply) => {
      const tenantId = request.headers["x-tenant-id"];
      if (typeof tenantId !== "string" || !UUID_REGEX.test(tenantId)) {
        return reply.code(400).send({ error: "x-tenant-id must be a valid UUID" });
      }
      const { profile_id: profileId, event_id: eventId } = request.query;
      if (!profileId || !UUID_REGEX.test(profileId)) {
        return reply.code(400).send({ error: "profile_id must be a valid UUID" });
      }
      if (!eventId || !UUID_REGEX.test(eventId)) {
        return reply.code(400).send({ error: "event_id must be a valid UUID" });
      }

      const pool = getPool();
      const profileResult = await pool.query(
        "SELECT birth_date FROM birth_profiles WHERE id = $1 AND tenant_id = $2",
        [profileId, tenantId],
      );
      if (profileResult.rows.length === 0) {
        return reply.code(404).send({ error: "birth profile not found" });
      }

      const eventResult = await pool.query(
        "SELECT title, starts_at FROM life_events WHERE id = $1 AND tenant_id = $2",
        [eventId, tenantId],
      );
      if (eventResult.rows.length === 0) {
        return reply.code(404).send({ error: "life event not found" });
      }

      const birthDateRaw = profileResult.rows[0].birth_date;
      const birthDate =
        birthDateRaw instanceof Date ? birthDateRaw.toISOString().slice(0, 10) : String(birthDateRaw);
      const eventStartsAtRaw = eventResult.rows[0].starts_at;
      const eventStartsAt =
        eventStartsAtRaw instanceof Date ? eventStartsAtRaw.toISOString() : String(eventStartsAtRaw);

      const scene = buildScenePayload({
        profileId,
        birthDate,
        eventId,
        eventTitle: eventResult.rows[0].title,
        eventStartsAt,
      });
      return reply.send(scene);
    },
  );
}
```

- [ ] **Step 6: Register the route in `server.ts`**

Add to the existing `apps/api/src/server.ts`:

```typescript
import { observatorySceneRoutes } from "./routes/observatoryScene.js";
```

and inside `buildServer()`:

```typescript
  app.register(observatorySceneRoutes);
```

- [ ] **Step 7: Run the full test file to verify it passes**

Run: `cd cosmos-engine && DATABASE_URL=postgres://cosmos:cosmos@localhost:5432/cosmos npx vitest run apps/api/test/observatoryScene.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 8: Commit**

```bash
git add cosmos-engine/apps/api
git commit -m "cosmos-engine: add observatory scene endpoint"
```

---

### Task 5: `apps/web` — Vite + React + Three.js app scaffold

**Files:**
- Create: `cosmos-engine/apps/web/package.json`
- Create: `cosmos-engine/apps/web/vite.config.ts`
- Create: `cosmos-engine/apps/web/index.html`
- Create: `cosmos-engine/apps/web/src/main.tsx`
- Create: `cosmos-engine/apps/web/src/App.tsx`
- Create: `cosmos-engine/apps/web/src/vite-env.d.ts`
- Create: `cosmos-engine/apps/web/tsconfig.json`

**Interfaces:**
- Produces: a running dev server at `http://localhost:5173` serving a placeholder page, and the `App` component every later web task extends.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@cosmos-engine/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "three": "^0.170.0",
    "@react-three/fiber": "^9.0.0",
    "@react-three/drei": "^10.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.0",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
```

- [ ] **Step 4: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Cosmos Engine — Observatory</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Write `src/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 6: Write `src/vite-env.d.ts`**

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 7: Write a placeholder `src/App.tsx`**

```tsx
export default function App() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", color: "#eae6f4", background: "#08080f", minHeight: "100vh" }}>
      <h1>Cosmos Engine — Observatory</h1>
      <p>Vertical slice scaffold running.</p>
    </main>
  );
}
```

- [ ] **Step 8: Install dependencies**

Run: `cd cosmos-engine && npm install`
Expected: no errors; `apps/web` appears as a workspace in the install output.

- [ ] **Step 9: Verify the dev server boots**

Run: `cd cosmos-engine/apps/web && npm run dev -- --port 5173 &` (background it, or run and immediately curl from another terminal), then `curl -s http://localhost:5173/ | head -20`
Expected: HTML containing `<div id="root">` and a reference to `/src/main.tsx`. Stop the dev server afterward (kill the backgrounded process).

- [ ] **Step 10: Commit**

```bash
git add cosmos-engine/apps/web cosmos-engine/package-lock.json
git commit -m "cosmos-engine: scaffold apps/web (Vite + React + Three.js)"
```

---

### Task 6: `apps/web` — API client and onboarding form

**Files:**
- Create: `cosmos-engine/apps/web/src/api.ts`
- Create: `cosmos-engine/apps/web/src/OnboardingForm.tsx`
- Modify: `cosmos-engine/apps/web/src/App.tsx`

**Interfaces:**
- Consumes: nothing from other packages (talks to `apps/api` over `fetch`, matching its existing wire format from Sprint 1 + Tasks 3-4).
- Produces: `bootstrapTenant(name: string): Promise<{ id: string }>`, `bootstrapUser(tenantId: string): Promise<{ id: string }>`, `createBirthProfile(tenantId, input): Promise<{ id: string }>`, `createEvent(tenantId, input): Promise<{ id: string }>` — all from `api.ts`, consumed by `OnboardingForm.tsx` and (for `fetchScene`) by Task 7.
- `OnboardingForm`'s `onComplete` prop: `(result: { tenantId: string; profileId: string; eventId: string }) => void` — consumed by `App.tsx` (this task) and indirectly by Task 7's `ObservatoryScene` (App.tsx passes the ids through).

- [ ] **Step 1: Write `src/api.ts`**

```typescript
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function postJson(path: string, tenantId: string | null, body: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`${path} failed with ${response.status}: ${errorBody}`);
  }
  return response.json();
}

export async function bootstrapTenant(name: string): Promise<{ id: string }> {
  return postJson("/v1/tenants", null, { name });
}

export async function bootstrapUser(tenantId: string): Promise<{ id: string }> {
  return postJson("/v1/users", null, { tenantId });
}

export interface BirthProfileFormInput {
  userId: string;
  birthDate: string;
  birthTime?: string;
  timezone: string;
  latitude: number;
  longitude: number;
}

export async function createBirthProfile(
  tenantId: string,
  input: BirthProfileFormInput,
): Promise<{ id: string }> {
  return postJson("/v1/birth-profiles", tenantId, input);
}

export interface EventFormInput {
  ownerUserId: string;
  eventType: string;
  title: string;
  startsAt: string;
  timezone: string;
  sourceType: string;
}

export async function createEvent(tenantId: string, input: EventFormInput): Promise<{ id: string }> {
  return postJson("/v1/events", tenantId, input);
}

export interface ScenePayload {
  sceneId: string;
  timeWindow: { start: string; end: string };
  nodes: { id: string; type: "natal_planet" | "event"; x: number; y: number; z: number; label: string }[];
  edges: { id: string; from: string; to: string; type: string; weight: number }[];
  animations: unknown[];
  filters: { showMidpoints: boolean; showAntiscia: boolean; showForecasts: boolean };
}

export async function fetchScene(
  tenantId: string,
  profileId: string,
  eventId: string,
): Promise<ScenePayload> {
  const response = await fetch(
    `${API_BASE}/v1/observatory/scene?profile_id=${profileId}&event_id=${eventId}`,
    { headers: { "x-tenant-id": tenantId } },
  );
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`fetchScene failed with ${response.status}: ${errorBody}`);
  }
  return response.json();
}
```

- [ ] **Step 2: Write `src/OnboardingForm.tsx`**

```tsx
import { useState } from "react";
import { bootstrapTenant, bootstrapUser, createBirthProfile, createEvent } from "./api.js";

export interface OnboardingResult {
  tenantId: string;
  profileId: string;
  eventId: string;
}

export function OnboardingForm({ onComplete }: { onComplete: (result: OnboardingResult) => void }) {
  const [birthDate, setBirthDate] = useState("1991-04-23");
  const [timezone, setTimezone] = useState("America/Chicago");
  const [latitude, setLatitude] = useState("41.8781");
  const [longitude, setLongitude] = useState("-87.6298");
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("CareerStart");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const tenant = await bootstrapTenant(`web-demo-${Date.now()}`);
      const user = await bootstrapUser(tenant.id);
      const profile = await createBirthProfile(tenant.id, {
        userId: user.id,
        birthDate,
        timezone,
        latitude: Number(latitude),
        longitude: Number(longitude),
      });
      const event = await createEvent(tenant.id, {
        ownerUserId: user.id,
        eventType,
        title: eventTitle,
        startsAt: new Date(eventStartsAt).toISOString(),
        timezone,
        sourceType: "manual",
      });
      onComplete({ tenantId: tenant.id, profileId: profile.id, eventId: event.id });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 420 }}>
      <h2>Birth profile</h2>
      <label>
        Birth date
        <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
      </label>
      <label>
        Timezone
        <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} required />
      </label>
      <label>
        Latitude
        <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} required />
      </label>
      <label>
        Longitude
        <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} required />
      </label>

      <h2>Life event</h2>
      <label>
        Title
        <input type="text" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required />
      </label>
      <label>
        Event type
        <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
          <option value="CareerStart">CareerStart</option>
          <option value="RelationshipStart">RelationshipStart</option>
          <option value="Move">Move</option>
          <option value="CreativeRelease">CreativeRelease</option>
        </select>
      </label>
      <label>
        Date and time
        <input type="datetime-local" value={eventStartsAt} onChange={(e) => setEventStartsAt(e.target.value)} required />
      </label>

      {error && <p style={{ color: "#e07a7a" }}>{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Entering the observatory..." : "Enter the observatory"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Wire it into `src/App.tsx`**

```tsx
import { useState } from "react";
import { OnboardingForm, type OnboardingResult } from "./OnboardingForm.js";

export default function App() {
  const [onboarding, setOnboarding] = useState<OnboardingResult | null>(null);

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", color: "#eae6f4", background: "#08080f", minHeight: "100vh" }}>
      <h1>Cosmos Engine — Observatory</h1>
      {!onboarding && <OnboardingForm onComplete={setOnboarding} />}
      {onboarding && <p>Profile {onboarding.profileId} and event {onboarding.eventId} created. Scene rendering arrives in Task 7.</p>}
    </main>
  );
}
```

- [ ] **Step 4: Verify it builds**

Run: `cd cosmos-engine/apps/web && npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add cosmos-engine/apps/web
git commit -m "cosmos-engine: add API client and onboarding form to apps/web"
```

---

### Task 7: `apps/web` — Three.js Observatory scene

**Files:**
- Create: `cosmos-engine/apps/web/src/ObservatoryScene.tsx`
- Modify: `cosmos-engine/apps/web/src/App.tsx`

**Interfaces:**
- Consumes: `fetchScene`, `ScenePayload` from `./api.js` (Task 6).
- Produces: `ObservatoryScene({ tenantId, profileId, eventId }: { tenantId: string; profileId: string; eventId: string })` — a React component rendering the fetched scene, consumed by `App.tsx`.

- [ ] **Step 1: Write `src/ObservatoryScene.tsx`**

```tsx
import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { fetchScene, type ScenePayload } from "./api.js";

const SCALE = 1 / 40;

function SceneNode({ node }: { node: ScenePayload["nodes"][number] }) {
  const color = node.type === "event" ? "#c8a55b" : "#7b6fd4";
  const size = node.type === "event" ? 0.5 : 0.3;
  return (
    <group position={[node.x * SCALE, node.y * SCALE, node.z]}>
      <mesh>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text position={[0, size + 0.3, 0]} fontSize={0.25} color="#eae6f4">
        {node.label}
      </Text>
    </group>
  );
}

export function ObservatoryScene({
  tenantId,
  profileId,
  eventId,
}: {
  tenantId: string;
  profileId: string;
  eventId: string;
}) {
  const [scene, setScene] = useState<ScenePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScene(tenantId, profileId, eventId)
      .then(setScene)
      .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "Failed to load scene"));
  }, [tenantId, profileId, eventId]);

  if (error) {
    return <p style={{ color: "#e07a7a" }}>{error}</p>;
  }
  if (!scene) {
    return <p>Reading the cosmos...</p>;
  }

  return (
    <div style={{ width: "100%", height: "80vh" }}>
      <Canvas camera={{ position: [0, 0, 12] }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        {scene.nodes.map((node) => (
          <SceneNode key={node.id} node={node} />
        ))}
        <OrbitControls />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `src/App.tsx`**

```tsx
import { useState } from "react";
import { OnboardingForm, type OnboardingResult } from "./OnboardingForm.js";
import { ObservatoryScene } from "./ObservatoryScene.js";

export default function App() {
  const [onboarding, setOnboarding] = useState<OnboardingResult | null>(null);

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", color: "#eae6f4", background: "#08080f", minHeight: "100vh" }}>
      <h1>Cosmos Engine — Observatory</h1>
      {!onboarding && <OnboardingForm onComplete={setOnboarding} />}
      {onboarding && (
        <ObservatoryScene
          tenantId={onboarding.tenantId}
          profileId={onboarding.profileId}
          eventId={onboarding.eventId}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verify it builds**

Run: `cd cosmos-engine/apps/web && npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add cosmos-engine/apps/web
git commit -m "cosmos-engine: render the observatory scene with react-three-fiber"
```

---

### Task 8: End-to-end smoke verification

**Files:** none created or modified — this task verifies Tasks 1-7 work together as a real running app.

- [ ] **Step 1: Bring up the full stack**

From `cosmos-engine/`:
```bash
docker compose -f infra/docker-compose.yml up -d postgres
```
Wait for Postgres to accept connections, then:
```bash
DATABASE_URL=postgres://cosmos:cosmos@localhost:5432/cosmos npm run migrate
```

- [ ] **Step 2: Start the API**

```bash
cd apps/api && DATABASE_URL=postgres://cosmos:cosmos@localhost:5432/cosmos node --experimental-strip-types src/server.ts
```
(background this or run in a separate terminal/session — it must stay running for Step 4)

If this fails with `ERR_MODULE_NOT_FOUND` (a known, already-ledgered Sprint 1 gap: Node's native TS type-stripping doesn't resolve `.js`-suffixed relative imports to sibling `.ts` files on this Node version), use `npx tsx src/server.ts` instead as a workaround for this verification pass — don't attempt to fix the underlying tooling gap as part of this task, just get the server running so the rest of this task can proceed.

- [ ] **Step 3: Start the web app**

In another terminal: `cd apps/web && npm run dev`

- [ ] **Step 4: Drive the app in a real browser**

Open `http://localhost:5173` in a browser (or use browser automation tooling if available in your environment). Fill in the birth-profile fields (defaults are pre-filled), fill in an event title and a date/time, submit. Confirm:
- The form submits without an error message appearing.
- The Observatory view replaces the form.
- After a moment, colored spheres appear (10 purple natal-planet spheres arranged in a ring, 1 gold event sphere) with text labels.
- No errors appear in the browser console.
- Dragging the mouse orbits the camera (confirms `OrbitControls` is working).

- [ ] **Step 5: Tear down**

Stop the web dev server, stop the API server, and run `docker compose -f infra/docker-compose.yml down` from `cosmos-engine/`.

- [ ] **Step 6: Record the result**

Document what you observed (pass/fail, and any screenshots if your tooling supports capturing them) — this is the plan's final acceptance evidence, not a code change, so there is nothing to commit for this task.

## Known gaps carried forward (not silently dropped)

- **CORS origin** defaults to `http://localhost:5173` via `CORS_ORIGIN` env var (`apps/api/src/server.ts`) — must be set explicitly before any non-localhost deployment.
- **No auth beyond a trusted `x-tenant-id` header** — same gap Sprint 1 already carries; this plan's new `POST /v1/tenants`/`POST /v1/users` bootstrap endpoints have no auth at all (by design, for the demo flow).
- **Timezone handling is not fully correct**: `birth_date` (a Postgres `DATE`) is parsed at the server's local midnight rather than being timezone-agnostic, and the event's own stored `timezone` column is never read when computing its placement date (the event's UTC instant is used instead). This can shift which natal chart / event placement is computed. Tracked as a follow-up, not fixed in this plan.
- **`packages/schemas/openapi.yaml` was not updated** — it still only documents 4 of the 7+ endpoints this plan and Sprint 1 together expose (`/v1/tenants`, `/v1/users`, `/v1/observatory/scene` are undocumented).
- **The Observatory UI renders nodes only** — `edges`, `timeWindow`, `filters`, and `animations` are fetched from the scene payload but never displayed, so the computed `ACTIVATES` relationship is invisible in the UI.
- **`apps/web`'s production build (`vite build`) and a wired `typecheck` script were never run/added** — only the dev server and a manual `tsc --noEmit` were verified during this plan.
