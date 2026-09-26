# Cosmos Engine Sprint 1: Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Cosmos Engine backend foundation — a self-contained monorepo with a Postgres-backed API service exposing birth-profile CRUD, life-event CRUD, and a mocked astrology-computation/derived-points endpoint, plus a tested pure-math library for longitude/antiscia/midpoint calculations.

**Architecture:** New `cosmos-engine/` directory at the repo root, decoupled from the existing Next.js app (`src/`) so neither's dependencies or build ever collide. It is its own npm workspaces root: `packages/astro-math` (pure functions, zero I/O), `packages/schemas` (Zod schemas = single source of truth, JSON Schema files kept as generated artifacts for cross-language consumers), and `apps/api` (Fastify service using `pg` directly against the `postgres-core.sql` tables). This is the "First sprint tasks" list from `cosmos-engine-mtds-v1/docs/21-Developer-Handoff.md` — it deliberately stops short of the "First vertical slice" (web UI + Three.js Observatory scene), which is a follow-up plan once this foundation lands and John has reviewed it.

**Tech Stack:** Node 24, TypeScript, npm workspaces, Fastify 5, `pg` (node-postgres), Zod, Vitest, Docker Compose (Postgres 16 + Neo4j 5 + Redis 7, per the spec's `infra/docker-compose.example.yml`).

**Spec:**
- `cosmos-engine-mtds-v1/docs/02-Canonical-Ontology.md` (object shape, required fields)
- `cosmos-engine-mtds-v1/docs/05-Astrology-Engine.md` (math, schemas, required tests)
- `cosmos-engine-mtds-v1/docs/21-Developer-Handoff.md` (sprint tasks, coding standards, definition of done)
- `cosmos-engine-mtds-v1/schemas/postgres-core.sql` (canonical table DDL)
- `cosmos-engine-mtds-v1/schemas/event.schema.json` (LifeEvent JSON Schema)
- `cosmos-engine-mtds-v1/schemas/openapi.yaml` (route stubs to fill in)
- `cosmos-engine-mtds-v1/infra/docker-compose.example.yml` (local infra)

## Global Constraints

- TypeScript for web/API (per 21-Developer-Handoff.md "Coding standards") — no Python in this plan; Python is reserved for future astrology/ML services, not this sprint.
- All schemas generated from shared contracts — Zod schemas in `packages/schemas` are canonical; JSON Schema output must stay consistent with `event.schema.json`'s required fields (`id, tenant_id, owner_user_id, event_type, title, starts_at, timezone, source_type`).
- No untyped agent outputs — every API request/response body is validated against a Zod schema, not `any`.
- No direct DB access from frontend — this sprint ships no frontend; `apps/api` is the only thing that touches Postgres.
- Every object requires the canonical fields from 02-Canonical-Ontology.md: `id, tenant_id, owner_user_id/created_by, created_at, updated_at, visibility, provenance, version` — birth profiles and life events in `postgres-core.sql` already carry the DB-level subset (`tenant_id`, owner columns, `created_at`); this sprint does not add the full `visibility`/`provenance` envelope yet (tracked as a gap below, not silently dropped).
- Astrology Engine acceptance criteria that apply to this sprint: "Same birth profile always produces same chart" (mock provider must be deterministic per input), "Aspect orb calculations handle zodiac wraparound" (must be unit tested).
- Default aspect orb for the mocked provider: use the major aspects only (conjunction 0°, opposition 180°, trine 120°, square 90°, sextile 60°) with an 8° orb — minor aspects and a configurable orb table are out of scope for this sprint.

---

## File Structure

```
cosmos-engine/
├── package.json                          # workspaces root
├── tsconfig.base.json                    # shared TS compiler options
├── vitest.config.ts                      # shared test config (workspace-aware)
├── .env.example                          # DATABASE_URL, PORT
├── infra/
│   ├── docker-compose.yml                # postgres + neo4j + redis + api
│   └── migrations/
│       └── 001_core.sql                  # copy of schemas/postgres-core.sql
├── packages/
│   ├── astro-math/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── longitude.ts              # normalize, sign/degree, angular separation
│   │   │   ├── antiscia.ts               # antiscion, contra-antiscion
│   │   │   ├── midpoint.ts               # midpoint (near-arc convention)
│   │   │   ├── aspects.ts                # detectAspect(a, b) -> Aspect | null
│   │   │   └── index.ts                  # public exports
│   │   └── test/
│   │       ├── longitude.test.ts
│   │       ├── antiscia.test.ts
│   │       ├── midpoint.test.ts
│   │       └── aspects.test.ts
│   └── schemas/
│       ├── package.json
│       ├── src/
│       │   ├── common.ts                 # CosmosObjectEnvelope zod schema
│       │   ├── birthProfile.ts           # BirthProfile zod schema + types
│       │   ├── lifeEvent.ts              # LifeEvent zod schema + types
│       │   ├── planetaryPoint.ts         # PlanetaryPoint + DerivedPoint zod schemas
│       │   └── index.ts
│       └── test/
│           └── lifeEvent.test.ts         # cross-check against event.schema.json required fields
└── apps/
    └── api/
        ├── package.json
        ├── src/
        │   ├── server.ts                 # Fastify bootstrap
        │   ├── db.ts                     # pg Pool singleton
        │   ├── routes/
        │   │   ├── health.ts
        │   │   ├── birthProfiles.ts      # POST /v1/birth-profiles, GET /v1/birth-profiles/:id
        │   │   ├── events.ts             # POST /v1/events, GET /v1/events
        │   │   └── derivedPoints.ts      # GET /v1/astrology/derived-points
        │   ├── astrology/
        │   │   └── mockProvider.ts       # deterministic mock natal computation
        │   └── openapi.ts                # serves the openapi.yaml contract at /v1/openapi.yaml
        └── test/
            ├── health.test.ts
            ├── birthProfiles.test.ts     # requires local Postgres (docker compose)
            ├── events.test.ts            # requires local Postgres
            └── derivedPoints.test.ts     # no DB needed, exercises mock provider
```

---

### Task 1: Monorepo scaffold

**Files:**
- Create: `cosmos-engine/package.json`
- Create: `cosmos-engine/tsconfig.base.json`
- Create: `cosmos-engine/vitest.config.ts`
- Create: `cosmos-engine/.env.example`
- Create: `cosmos-engine/.gitignore`

**Interfaces:**
- Produces: the `npm run test` / `npm run dev` scripts every later task assumes exist at `cosmos-engine/` root.

- [ ] **Step 1: Create the workspace root `package.json`**

```json
{
  "name": "cosmos-engine",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "vitest run",
    "dev:api": "npm run dev --workspace=apps/api",
    "migrate": "node --experimental-strip-types infra/migrate.ts"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist"
  }
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts", "apps/*/test/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create `.env.example`**

```
DATABASE_URL=postgres://cosmos:cosmos@localhost:5432/cosmos
PORT=4000
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
dist/
.env
```

- [ ] **Step 6: Install root dev dependencies**

Run: `cd cosmos-engine && npm install`
Expected: `package-lock.json` created inside `cosmos-engine/`, no errors.

- [ ] **Step 7: Commit**

```bash
git add cosmos-engine/package.json cosmos-engine/package-lock.json cosmos-engine/tsconfig.base.json cosmos-engine/vitest.config.ts cosmos-engine/.env.example cosmos-engine/.gitignore
git commit -m "cosmos-engine: scaffold npm workspaces monorepo"
```

---

### Task 2: `packages/astro-math` — longitude, antiscia, midpoint, aspects (TDD)

**Files:**
- Create: `cosmos-engine/packages/astro-math/package.json`
- Create: `cosmos-engine/packages/astro-math/src/longitude.ts`
- Create: `cosmos-engine/packages/astro-math/src/antiscia.ts`
- Create: `cosmos-engine/packages/astro-math/src/midpoint.ts`
- Create: `cosmos-engine/packages/astro-math/src/aspects.ts`
- Create: `cosmos-engine/packages/astro-math/src/index.ts`
- Test: `cosmos-engine/packages/astro-math/test/longitude.test.ts`
- Test: `cosmos-engine/packages/astro-math/test/antiscia.test.ts`
- Test: `cosmos-engine/packages/astro-math/test/midpoint.test.ts`
- Test: `cosmos-engine/packages/astro-math/test/aspects.test.ts`

**Interfaces:**
- Produces: `normalizeLongitude(lon: number): number`, `signAndDegree(lon: number): { sign: string; degreeInSign: number }`, `angularSeparation(a: number, b: number): number`, `antiscion(lon: number): number`, `contraAntiscion(lon: number): number`, `midpoint(a: number, b: number): number`, `detectAspect(a: number, b: number): { aspectType: string; exactAngle: number; actualAngle: number; orb: number } | null`, `ZODIAC_SIGNS: readonly string[]`, `MAJOR_ASPECTS: { type: string; angle: number }[]`.
- Consumes: nothing (pure library, no dependencies on other packages).

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@cosmos-engine/astro-math",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "exports": { ".": "./src/index.ts" }
}
```

- [ ] **Step 2: Write the failing longitude tests**

`cosmos-engine/packages/astro-math/test/longitude.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { normalizeLongitude, signAndDegree, angularSeparation } from "../src/longitude.js";

describe("normalizeLongitude", () => {
  it("wraps negative degrees into 0-360", () => {
    expect(normalizeLongitude(-10)).toBeCloseTo(350);
  });
  it("wraps degrees over 360 back into range", () => {
    expect(normalizeLongitude(370)).toBeCloseTo(10);
  });
  it("leaves in-range values unchanged", () => {
    expect(normalizeLongitude(145.25)).toBeCloseTo(145.25);
  });
});

describe("signAndDegree", () => {
  it("places 0 degrees at 0 Aries", () => {
    expect(signAndDegree(0)).toEqual({ sign: "Aries", degreeInSign: 0 });
  });
  it("places 145.25 degrees at 25.25 Leo", () => {
    const result = signAndDegree(145.25);
    expect(result.sign).toBe("Leo");
    expect(result.degreeInSign).toBeCloseTo(25.25);
  });
  it("places 359.9 degrees at 29.9 Pisces", () => {
    const result = signAndDegree(359.9);
    expect(result.sign).toBe("Pisces");
    expect(result.degreeInSign).toBeCloseTo(29.9);
  });
});

describe("angularSeparation (zodiac wraparound)", () => {
  it("returns the short arc across the 0/360 boundary", () => {
    // 355 degrees and 5 degrees are 10 degrees apart, not 350
    expect(angularSeparation(355, 5)).toBeCloseTo(10);
  });
  it("is symmetric", () => {
    expect(angularSeparation(5, 355)).toBeCloseTo(10);
  });
  it("returns 0 for identical longitudes", () => {
    expect(angularSeparation(90, 90)).toBeCloseTo(0);
  });
  it("returns 180 for exact oppositions", () => {
    expect(angularSeparation(10, 190)).toBeCloseTo(180);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd cosmos-engine && npx vitest run packages/astro-math/test/longitude.test.ts`
Expected: FAIL — `Cannot find module '../src/longitude.js'`

- [ ] **Step 4: Implement `src/longitude.ts`**

```typescript
export const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

export function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

export function signAndDegree(longitude: number): { sign: string; degreeInSign: number } {
  const normalized = normalizeLongitude(longitude);
  const signIndex = Math.floor(normalized / 30);
  const degreeInSign = normalized - signIndex * 30;
  return { sign: ZODIAC_SIGNS[signIndex], degreeInSign };
}

export function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(normalizeLongitude(a) - normalizeLongitude(b));
  return diff > 180 ? 360 - diff : diff;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd cosmos-engine && npx vitest run packages/astro-math/test/longitude.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 6: Write the failing antiscia tests**

`cosmos-engine/packages/astro-math/test/antiscia.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { antiscion, contraAntiscion } from "../src/antiscia.js";

describe("antiscion", () => {
  it("maps 0 Cancer (90 deg) to itself (solstice point)", () => {
    expect(antiscion(90)).toBeCloseTo(90);
  });
  it("maps 0 Capricorn (270 deg) to itself (solstice point)", () => {
    expect(antiscion(270)).toBeCloseTo(270);
  });
  it("maps 0 Aries (0 deg) to 0 Libra (180 deg)", () => {
    expect(antiscion(0)).toBeCloseTo(180);
  });
  it("maps 15 Taurus (45 deg) to 15 Leo (135 deg)", () => {
    expect(antiscion(45)).toBeCloseTo(135);
  });
});

describe("contraAntiscion", () => {
  it("is 180 degrees from the antiscion", () => {
    const lon = 145.25;
    const diff = Math.abs(antiscion(lon) - contraAntiscion(lon));
    expect(Math.min(diff, 360 - diff)).toBeCloseTo(180);
  });
  it("maps 0 Aries (0 deg) to itself (equinox point)", () => {
    expect(contraAntiscion(0)).toBeCloseTo(0);
  });
  it("maps 0 Libra (180 deg) to itself (equinox point)", () => {
    expect(contraAntiscion(180)).toBeCloseTo(180);
  });
});
```

- [ ] **Step 7: Run tests to verify they fail**

Run: `cd cosmos-engine && npx vitest run packages/astro-math/test/antiscia.test.ts`
Expected: FAIL — module not found

- [ ] **Step 8: Implement `src/antiscia.ts`**

```typescript
import { normalizeLongitude } from "./longitude.js";

/** Reflection about the solstitial (Cancer/Capricorn, 90/270 deg) axis. */
export function antiscion(longitude: number): number {
  return normalizeLongitude(180 - longitude);
}

/** Reflection about the equinoctial (Aries/Libra, 0/180 deg) axis. */
export function contraAntiscion(longitude: number): number {
  return normalizeLongitude(360 - longitude);
}
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `cd cosmos-engine && npx vitest run packages/astro-math/test/antiscia.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 10: Write the failing midpoint tests**

`cosmos-engine/packages/astro-math/test/midpoint.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { midpoint } from "../src/midpoint.js";

describe("midpoint", () => {
  it("finds the near-arc midpoint of two nearby points", () => {
    expect(midpoint(10, 20)).toBeCloseTo(15);
  });
  it("finds the near-arc midpoint across the 0/360 boundary", () => {
    // 350 and 10 are 20 degrees apart the short way; near midpoint is 0
    expect(midpoint(350, 10)).toBeCloseTo(0);
  });
  it("is order-independent", () => {
    expect(midpoint(20, 10)).toBeCloseTo(midpoint(10, 20));
  });
  it("returns the point itself when both inputs are equal", () => {
    expect(midpoint(77, 77)).toBeCloseTo(77);
  });
});
```

- [ ] **Step 11: Run tests to verify they fail**

Run: `cd cosmos-engine && npx vitest run packages/astro-math/test/midpoint.test.ts`
Expected: FAIL — module not found

- [ ] **Step 12: Implement `src/midpoint.ts`**

```typescript
import { normalizeLongitude } from "./longitude.js";

/** Near-arc midpoint: the point on the shorter arc between a and b. */
export function midpoint(a: number, b: number): number {
  const normA = normalizeLongitude(a);
  const normB = normalizeLongitude(b);
  const forwardDiff = normalizeLongitude(normB - normA);
  const step = forwardDiff > 180 ? forwardDiff - 360 : forwardDiff;
  return normalizeLongitude(normA + step / 2);
}
```

- [ ] **Step 13: Run tests to verify they pass**

Run: `cd cosmos-engine && npx vitest run packages/astro-math/test/midpoint.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 14: Write the failing aspects tests**

`cosmos-engine/packages/astro-math/test/aspects.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { detectAspect, MAJOR_ASPECTS } from "../src/aspects.js";

describe("MAJOR_ASPECTS", () => {
  it("defines the five major aspects from the spec", () => {
    const types = MAJOR_ASPECTS.map((a) => a.type).sort();
    expect(types).toEqual(
      ["conjunction", "opposition", "sextile", "square", "trine"].sort(),
    );
  });
});

describe("detectAspect", () => {
  it("detects an exact conjunction", () => {
    const result = detectAspect(10, 10);
    expect(result).toMatchObject({ aspectType: "conjunction", orb: 0 });
  });
  it("detects a square within orb, wrapping across 0/360", () => {
    // 358 and 88 are 90 degrees apart the short way
    const result = detectAspect(358, 88);
    expect(result).toMatchObject({ aspectType: "square" });
    expect(result!.orb).toBeCloseTo(0);
  });
  it("detects an applying-orb trine within the 8 degree default orb", () => {
    const result = detectAspect(0, 125);
    expect(result).toMatchObject({ aspectType: "trine" });
    expect(result!.orb).toBeCloseTo(5);
  });
  it("returns null when no major aspect is within orb", () => {
    expect(detectAspect(0, 40)).toBeNull();
  });
});
```

- [ ] **Step 15: Run tests to verify they fail**

Run: `cd cosmos-engine && npx vitest run packages/astro-math/test/aspects.test.ts`
Expected: FAIL — module not found

- [ ] **Step 16: Implement `src/aspects.ts`**

```typescript
import { angularSeparation } from "./longitude.js";

export const MAJOR_ASPECTS = [
  { type: "conjunction", angle: 0 },
  { type: "sextile", angle: 60 },
  { type: "square", angle: 90 },
  { type: "trine", angle: 120 },
  { type: "opposition", angle: 180 },
] as const;

const DEFAULT_ORB_DEGREES = 8;

export interface AspectHit {
  aspectType: string;
  exactAngle: number;
  actualAngle: number;
  orb: number;
}

export function detectAspect(a: number, b: number): AspectHit | null {
  const actualAngle = angularSeparation(a, b);
  let best: AspectHit | null = null;
  for (const { type, angle } of MAJOR_ASPECTS) {
    const orb = Math.abs(actualAngle - angle);
    if (orb <= DEFAULT_ORB_DEGREES && (best === null || orb < best.orb)) {
      best = { aspectType: type, exactAngle: angle, actualAngle, orb };
    }
  }
  return best;
}
```

- [ ] **Step 17: Run tests to verify they pass**

Run: `cd cosmos-engine && npx vitest run packages/astro-math/test/aspects.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 18: Write `src/index.ts`**

```typescript
export * from "./longitude.js";
export * from "./antiscia.js";
export * from "./midpoint.js";
export * from "./aspects.js";
```

- [ ] **Step 19: Run the full astro-math suite**

Run: `cd cosmos-engine && npx vitest run packages/astro-math`
Expected: PASS (27 tests total)

- [ ] **Step 20: Commit**

```bash
git add cosmos-engine/packages/astro-math
git commit -m "cosmos-engine: add astro-math package (longitude, antiscia, midpoint, aspects)"
```

---

### Task 3: `packages/schemas` — canonical Zod contracts

**Files:**
- Create: `cosmos-engine/packages/schemas/package.json`
- Create: `cosmos-engine/packages/schemas/src/common.ts`
- Create: `cosmos-engine/packages/schemas/src/birthProfile.ts`
- Create: `cosmos-engine/packages/schemas/src/lifeEvent.ts`
- Create: `cosmos-engine/packages/schemas/src/planetaryPoint.ts`
- Create: `cosmos-engine/packages/schemas/src/index.ts`
- Test: `cosmos-engine/packages/schemas/test/lifeEvent.test.ts`

**Interfaces:**
- Consumes: nothing from other packages.
- Produces: `BirthProfileInput`, `BirthProfile`, `LifeEventInput`, `LifeEvent`, `PlanetaryPoint`, `DerivedPoint`, `Aspect` (Zod schemas + inferred TS types), all imported by `apps/api` in Task 4/5/6.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@cosmos-engine/schemas",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "zod": "^3.24.1"
  }
}
```

Run: `cd cosmos-engine/packages/schemas && npm install`

- [ ] **Step 2: Write the failing cross-check test**

`cosmos-engine/packages/schemas/test/lifeEvent.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { lifeEventInputSchema } from "../src/lifeEvent.js";

const specPath = fileURLToPath(
  new URL("../../../../cosmos-engine-mtds-v1/schemas/event.schema.json", import.meta.url),
);
const spec = JSON.parse(readFileSync(specPath, "utf-8"));

describe("lifeEventInputSchema", () => {
  it("accepts a minimal valid event", () => {
    const result = lifeEventInputSchema.safeParse({
      ownerUserId: "3b9a1f2e-7c3d-4a2b-9e1a-2f5c6d7e8f90",
      eventType: "CareerStart",
      title: "Started at Cosmos Engine",
      startsAt: "2026-09-24T00:00:00Z",
      timezone: "America/Chicago",
      sourceType: "manual",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an event missing a spec-required field", () => {
    const result = lifeEventInputSchema.safeParse({
      ownerUserId: "3b9a1f2e-7c3d-4a2b-9e1a-2f5c6d7e8f90",
      eventType: "CareerStart",
      title: "Missing timezone and sourceType",
      startsAt: "2026-09-24T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("covers every field the spec's JSON Schema marks required (minus id/tenant_id, assigned server-side)", () => {
    const specRequired: string[] = spec.required;
    const serverAssigned = ["id", "tenant_id"];
    const clientRequired = specRequired.filter((f) => !serverAssigned.includes(f));
    // camelCase mapping of the spec's snake_case required fields
    const camelCased = clientRequired.map((f) =>
      f.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
    );
    for (const field of camelCased) {
      expect(lifeEventInputSchema.shape).toHaveProperty(field);
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd cosmos-engine && npx vitest run packages/schemas/test/lifeEvent.test.ts`
Expected: FAIL — `Cannot find module '../src/lifeEvent.js'`

- [ ] **Step 4: Write `src/common.ts`**

```typescript
import { z } from "zod";

export const provenanceSchema = z.object({
  source: z.enum(["manual", "calendar", "photo", "agent", "ephemeris", "import"]),
  sourceId: z.string().optional(),
  confidence: z.number().min(0).max(1).default(1),
});

export type Provenance = z.infer<typeof provenanceSchema>;
```

- [ ] **Step 5: Write `src/birthProfile.ts`**

```typescript
import { z } from "zod";

export const birthProfileInputSchema = z.object({
  userId: z.string().uuid(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  birthTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "expected HH:MM or HH:MM:SS").optional(),
  timezone: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  houseSystem: z.string().default("whole_sign"),
  zodiacMode: z.enum(["tropical", "sidereal"]).default("tropical"),
  metadata: z.record(z.unknown()).default({}),
});

export const birthProfileSchema = birthProfileInputSchema.extend({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export type BirthProfileInput = z.infer<typeof birthProfileInputSchema>;
export type BirthProfile = z.infer<typeof birthProfileSchema>;
```

- [ ] **Step 6: Write `src/lifeEvent.ts`**

This must stay compatible with `cosmos-engine-mtds-v1/schemas/event.schema.json`'s required fields: `id, tenant_id, owner_user_id, event_type, title, starts_at, timezone, source_type`.

```typescript
import { z } from "zod";

export const EVENT_CATEGORIES = [
  "Birth", "Death", "RelationshipStart", "RelationshipEnd", "Conflict",
  "Reconciliation", "CareerStart", "CareerEnd", "Promotion", "CreativeRelease",
  "Move", "Illness", "Recovery", "SpiritualExperience", "Dream", "LegalEvent",
  "FinancialEvent", "EducationEvent", "IdentityShift", "ParentingEvent",
  "Travel", "Unknown",
] as const;

export const lifeEventInputSchema = z.object({
  ownerUserId: z.string().uuid(),
  eventType: z.enum(EVENT_CATEGORIES),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  timezone: z.string().min(1),
  emotionalValence: z.number().min(-1).max(1).nullable().optional(),
  emotionalIntensity: z.number().min(0).max(1).nullable().optional(),
  importanceScore: z.number().min(0).max(1).default(0),
  sourceType: z.enum(["manual", "calendar", "photo", "agent", "ephemeris", "import"]),
  confidence: z.number().min(0).max(1).default(1),
  metadata: z.record(z.unknown()).default({}),
});

export const lifeEventSchema = lifeEventInputSchema.extend({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type LifeEventInput = z.infer<typeof lifeEventInputSchema>;
export type LifeEvent = z.infer<typeof lifeEventSchema>;
```

- [ ] **Step 7: Write `src/planetaryPoint.ts`**

```typescript
import { z } from "zod";

export const planetaryPointSchema = z.object({
  id: z.string(),
  body: z.string(),
  chartContext: z.enum(["natal", "transit", "progression", "return"]),
  timestamp: z.string().datetime(),
  zodiacLongitude: z.number().min(0).max(360),
  sign: z.string(),
  degreeInSign: z.number().min(0).max(30),
  house: z.number().int().min(1).max(12).nullable(),
  speed: z.number().nullable(),
  retrograde: z.boolean().nullable(),
  declination: z.number().nullable(),
  rightAscension: z.number().nullable(),
});

export const derivedPointSchema = z.object({
  id: z.string(),
  sourcePointId: z.string().nullable(),
  sourcePair: z.tuple([z.string(), z.string()]).nullable(),
  pointType: z.enum(["antiscion", "contra_antiscion", "midpoint"]),
  zodiacLongitude: z.number().min(0).max(360),
  sign: z.string(),
  degreeInSign: z.number().min(0).max(30),
  calculationMethod: z.string(),
});

export const aspectSchema = z.object({
  id: z.string(),
  pointAId: z.string(),
  pointBId: z.string(),
  aspectType: z.string(),
  exactAngle: z.number(),
  actualAngle: z.number(),
  orb: z.number(),
  applying: z.boolean().nullable(),
});

export type PlanetaryPoint = z.infer<typeof planetaryPointSchema>;
export type DerivedPoint = z.infer<typeof derivedPointSchema>;
export type Aspect = z.infer<typeof aspectSchema>;
```

- [ ] **Step 8: Write `src/index.ts`**

```typescript
export * from "./common.js";
export * from "./birthProfile.js";
export * from "./lifeEvent.js";
export * from "./planetaryPoint.js";
```

- [ ] **Step 9: Run the cross-check test from Step 2 to verify it now passes**

Run: `cd cosmos-engine && npx vitest run packages/schemas/test/lifeEvent.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 10: Commit**

```bash
git add cosmos-engine/packages/schemas
git commit -m "cosmos-engine: add canonical Zod schemas for birth profile, life event, points"
```

---

### Task 4: Postgres migrations + migration runner

**Files:**
- Create: `cosmos-engine/infra/migrations/001_core.sql`
- Create: `cosmos-engine/infra/migrate.ts`

**Interfaces:**
- Produces: a `schema_migrations` tracking table and the 8 tables from `postgres-core.sql` (`tenants, users, birth_profiles, life_events, planetary_positions, derived_points, aspects, agent_findings, forecast_objects`), applied via `npm run migrate` from the workspace root.
- Consumes: `DATABASE_URL` from `.env`.

- [ ] **Step 1: Copy the spec's DDL into a numbered migration**

`cosmos-engine/infra/migrations/001_core.sql` — copy verbatim from `cosmos-engine-mtds-v1/schemas/postgres-core.sql` (already read into this plan above), reformatted one-statement-per-line for readability:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE birth_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  birth_date DATE NOT NULL,
  birth_time TIME,
  timezone TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  house_system TEXT DEFAULT 'whole_sign',
  zodiac_mode TEXT DEFAULT 'tropical',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE life_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE planetary_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  profile_id UUID,
  chart_context TEXT NOT NULL,
  body TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  zodiac_longitude NUMERIC NOT NULL,
  sign TEXT NOT NULL,
  degree_in_sign NUMERIC NOT NULL,
  house INTEGER,
  speed NUMERIC,
  retrograde BOOLEAN,
  declination NUMERIC,
  right_ascension NUMERIC,
  engine_version TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE derived_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  source_point_id UUID,
  source_pair JSONB,
  point_type TEXT NOT NULL,
  zodiac_longitude NUMERIC NOT NULL,
  sign TEXT NOT NULL,
  degree_in_sign NUMERIC NOT NULL,
  calculation_method TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE aspects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  point_a_id UUID NOT NULL,
  point_b_id UUID NOT NULL,
  aspect_type TEXT NOT NULL,
  exact_angle NUMERIC NOT NULL,
  actual_angle NUMERIC NOT NULL,
  orb NUMERIC NOT NULL,
  applying BOOLEAN,
  exact_at TIMESTAMPTZ,
  weight NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  finding_type TEXT NOT NULL,
  claim TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  evidence JSONB NOT NULL,
  limitations JSONB DEFAULT '[]'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forecast_objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  theme TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  score_type TEXT NOT NULL,
  score NUMERIC NOT NULL,
  drivers JSONB DEFAULT '[]'::jsonb,
  evidence JSONB DEFAULT '[]'::jsonb,
  limitations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: Write the migration runner**

`cosmos-engine/infra/migrate.ts`:

```typescript
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const migrationsDir = fileURLToPath(new URL("./migrations", import.meta.url));

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const applied = await pool.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations",
    );
    const appliedSet = new Set(applied.rows.map((r) => r.filename));

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`skip ${file} (already applied)`);
        continue;
      }
      const sql = readFileSync(path.join(migrationsDir, file), "utf-8");
      console.log(`applying ${file}`);
      await pool.query("BEGIN");
      try {
        await pool.query(sql);
        await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await pool.query("COMMIT");
      } catch (err) {
        await pool.query("ROLLBACK");
        throw err;
      }
    }
    console.log("migrations complete");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Add `pg` to the root workspace so the migration script can run from the repo root**

Run: `cd cosmos-engine && npm install pg @types/pg --workspace=apps/api` (this also satisfies Task 5's dependency — installed once here since Task 5 hasn't scaffolded `apps/api` yet, so instead run `npm install pg @types/pg -D` at the `cosmos-engine/` root for the migration script's own use)

```bash
cd cosmos-engine && npm install pg @types/pg -D
```

- [ ] **Step 4: Verify the runner against a local Postgres**

This step requires Docker (built in Task 8) — if Docker isn't available yet, skip verification here and re-run after Task 8. If available:

Run: `docker run --rm -e POSTGRES_USER=cosmos -e POSTGRES_PASSWORD=cosmos -e POSTGRES_DB=cosmos -p 5432:5432 -d --name cosmos-pg-test postgres:16`
Run: `cd cosmos-engine && DATABASE_URL=postgres://cosmos:cosmos@localhost:5432/cosmos npm run migrate`
Expected: `applying 001_core.sql` then `migrations complete`, no errors.
Run: `docker stop cosmos-pg-test` to clean up.

- [ ] **Step 5: Commit**

```bash
git add cosmos-engine/infra/migrations cosmos-engine/infra/migrate.ts cosmos-engine/package.json cosmos-engine/package-lock.json
git commit -m "cosmos-engine: add postgres-core migration and migration runner"
```

---

### Task 5: `apps/api` skeleton + health check

**Files:**
- Create: `cosmos-engine/apps/api/package.json`
- Create: `cosmos-engine/apps/api/src/server.ts`
- Create: `cosmos-engine/apps/api/src/db.ts`
- Create: `cosmos-engine/apps/api/src/routes/health.ts`
- Test: `cosmos-engine/apps/api/test/health.test.ts`

**Interfaces:**
- Consumes: nothing yet from `packages/*` (wired in Tasks 6-7).
- Produces: `buildServer(): FastifyInstance` — every later route task imports this to attach routes and every test imports this to get an injectable server instance.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@cosmos-engine/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --experimental-strip-types --watch src/server.ts"
  },
  "dependencies": {
    "fastify": "^5.2.1",
    "pg": "^8.13.1",
    "@cosmos-engine/schemas": "*",
    "@cosmos-engine/astro-math": "*"
  },
  "devDependencies": {
    "@types/pg": "^8.11.10"
  }
}
```

Run: `cd cosmos-engine && npm install`

- [ ] **Step 2: Write the failing health test**

`cosmos-engine/apps/api/test/health.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildServer } from "../src/server.js";

describe("GET /health", () => {
  it("returns status ok", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    await app.close();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd cosmos-engine && npx vitest run apps/api/test/health.test.ts`
Expected: FAIL — `Cannot find module '../src/server.js'`

- [ ] **Step 4: Write `src/db.ts`**

```typescript
import pg from "pg";

let pool: pg.Pool | undefined;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
```

- [ ] **Step 5: Write `src/routes/health.ts`**

```typescript
import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok" }));
}
```

- [ ] **Step 6: Write `src/server.ts`**

```typescript
import Fastify from "fastify";
import { healthRoutes } from "./routes/health.js";

export function buildServer() {
  const app = Fastify({ logger: true });
  app.register(healthRoutes);
  return app;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 4000);
  app.listen({ port, host: "0.0.0.0" }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 7: Run the health test from Step 2 to verify it now passes**

Run: `cd cosmos-engine && npx vitest run apps/api/test/health.test.ts`
Expected: PASS (1 test)

- [ ] **Step 8: Commit**

```bash
git add cosmos-engine/apps/api
git commit -m "cosmos-engine: scaffold Fastify API skeleton with health check"
```

---

### Task 6: Birth profile CRUD

**Files:**
- Create: `cosmos-engine/apps/api/src/routes/birthProfiles.ts`
- Modify: `cosmos-engine/apps/api/src/server.ts`
- Test: `cosmos-engine/apps/api/test/birthProfiles.test.ts`

**Interfaces:**
- Consumes: `birthProfileInputSchema`, `BirthProfile` from `@cosmos-engine/schemas`; `getPool()` from `../db.js`.
- Produces: `POST /v1/birth-profiles` (201, body: `BirthProfile`), `GET /v1/birth-profiles/:id` (200: `BirthProfile`, 404 if missing).

**Requires local Postgres** — run `docker compose -f cosmos-engine/infra/docker-compose.yml up -d postgres` and `npm run migrate` (Task 4) before running this task's tests. A fixed test tenant/user must exist; Step 1 below seeds them.

- [ ] **Step 1: Write the failing CRUD test with a seeded tenant/user**

`cosmos-engine/apps/api/test/birthProfiles.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../src/server.js";
import { getPool, closePool } from "../src/db.js";

let tenantId: string;
let userId: string;

beforeAll(async () => {
  const pool = getPool();
  const tenant = await pool.query(
    "INSERT INTO tenants (name) VALUES ('test-tenant') RETURNING id",
  );
  tenantId = tenant.rows[0].id;
  const user = await pool.query(
    "INSERT INTO users (tenant_id, email) VALUES ($1, 'test@example.com') RETURNING id",
    [tenantId],
  );
  userId = user.rows[0].id;
});

afterAll(async () => {
  await closePool();
});

describe("birth profile CRUD", () => {
  it("creates then fetches a birth profile", async () => {
    const app = buildServer();

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/birth-profiles",
      headers: { "x-tenant-id": tenantId },
      payload: {
        userId,
        birthDate: "1991-04-23",
        birthTime: "08:06",
        timezone: "America/Chicago",
        latitude: 41.8781,
        longitude: -87.6298,
      },
    });
    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json();
    expect(created.id).toBeTruthy();
    expect(created.zodiacMode).toBe("tropical");

    const getResponse = await app.inject({
      method: "GET",
      url: `/v1/birth-profiles/${created.id}`,
      headers: { "x-tenant-id": tenantId },
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json().id).toBe(created.id);

    await app.close();
  });

  it("returns 404 for an unknown id", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "GET",
      url: "/v1/birth-profiles/00000000-0000-0000-0000-000000000000",
      headers: { "x-tenant-id": tenantId },
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it("rejects an invalid payload with 400", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/v1/birth-profiles",
      headers: { "x-tenant-id": tenantId },
      payload: { userId, timezone: "America/Chicago" },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cosmos-engine && npx vitest run apps/api/test/birthProfiles.test.ts`
Expected: FAIL — 404 on `/v1/birth-profiles` (route not registered)

- [ ] **Step 3: Implement `src/routes/birthProfiles.ts`**

```typescript
import type { FastifyInstance } from "fastify";
import { birthProfileInputSchema } from "@cosmos-engine/schemas";
import { getPool } from "../db.js";

function toApiShape(row: Record<string, unknown>) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    birthDate: row.birth_date,
    birthTime: row.birth_time,
    timezone: row.timezone,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    houseSystem: row.house_system,
    zodiacMode: row.zodiac_mode,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export async function birthProfileRoutes(app: FastifyInstance) {
  app.post("/v1/birth-profiles", async (request, reply) => {
    const tenantId = request.headers["x-tenant-id"];
    if (typeof tenantId !== "string") {
      return reply.code(400).send({ error: "x-tenant-id header is required" });
    }

    const parsed = birthProfileInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const input = parsed.data;

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO birth_profiles
        (tenant_id, user_id, birth_date, birth_time, timezone, latitude, longitude, house_system, zodiac_mode, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        tenantId,
        input.userId,
        input.birthDate,
        input.birthTime ?? null,
        input.timezone,
        input.latitude,
        input.longitude,
        input.houseSystem,
        input.zodiacMode,
        input.metadata,
      ],
    );
    return reply.code(201).send(toApiShape(result.rows[0]));
  });

  app.get<{ Params: { id: string } }>("/v1/birth-profiles/:id", async (request, reply) => {
    const tenantId = request.headers["x-tenant-id"];
    if (typeof tenantId !== "string") {
      return reply.code(400).send({ error: "x-tenant-id header is required" });
    }

    const pool = getPool();
    const result = await pool.query(
      "SELECT * FROM birth_profiles WHERE id = $1 AND tenant_id = $2",
      [request.params.id, tenantId],
    );
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: "not found" });
    }
    return reply.send(toApiShape(result.rows[0]));
  });
}
```

- [ ] **Step 4: Register the route in `server.ts`**

```typescript
import Fastify from "fastify";
import { healthRoutes } from "./routes/health.js";
import { birthProfileRoutes } from "./routes/birthProfiles.js";

export function buildServer() {
  const app = Fastify({ logger: true });
  app.register(healthRoutes);
  app.register(birthProfileRoutes);
  return app;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 4000);
  app.listen({ port, host: "0.0.0.0" }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Precondition: Postgres running and migrated (Task 4/8).
Run: `cd cosmos-engine && DATABASE_URL=postgres://cosmos:cosmos@localhost:5432/cosmos npx vitest run apps/api/test/birthProfiles.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add cosmos-engine/apps/api
git commit -m "cosmos-engine: add birth profile CRUD endpoints"
```

---

### Task 7: Life event CRUD

**Files:**
- Create: `cosmos-engine/apps/api/src/routes/events.ts`
- Modify: `cosmos-engine/apps/api/src/server.ts`
- Test: `cosmos-engine/apps/api/test/events.test.ts`

**Interfaces:**
- Consumes: `lifeEventInputSchema` from `@cosmos-engine/schemas`; `getPool()` from `../db.js`.
- Produces: `POST /v1/events` (201), `GET /v1/events?ownerUserId=` (200: array).

- [ ] **Step 1: Write the failing test**

`cosmos-engine/apps/api/test/events.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../src/server.js";
import { getPool, closePool } from "../src/db.js";

let tenantId: string;
let userId: string;

beforeAll(async () => {
  const pool = getPool();
  const tenant = await pool.query(
    "INSERT INTO tenants (name) VALUES ('test-tenant-events') RETURNING id",
  );
  tenantId = tenant.rows[0].id;
  const user = await pool.query(
    "INSERT INTO users (tenant_id, email) VALUES ($1, 'events@example.com') RETURNING id",
    [tenantId],
  );
  userId = user.rows[0].id;
});

afterAll(async () => {
  await closePool();
});

describe("life event CRUD", () => {
  it("creates then lists events for an owner", async () => {
    const app = buildServer();

    const createResponse = await app.inject({
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
    expect(createResponse.statusCode).toBe(201);

    const listResponse = await app.inject({
      method: "GET",
      url: `/v1/events?ownerUserId=${userId}`,
      headers: { "x-tenant-id": tenantId },
    });
    expect(listResponse.statusCode).toBe(200);
    const events = listResponse.json();
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Joined Cosmos Engine");

    await app.close();
  });

  it("rejects an unknown eventType with 400", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/v1/events",
      headers: { "x-tenant-id": tenantId },
      payload: {
        ownerUserId: userId,
        eventType: "NotARealCategory",
        title: "Bad event",
        startsAt: "2026-09-24T00:00:00Z",
        timezone: "America/Chicago",
        sourceType: "manual",
      },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cosmos-engine && DATABASE_URL=postgres://cosmos:cosmos@localhost:5432/cosmos npx vitest run apps/api/test/events.test.ts`
Expected: FAIL — 404 on `/v1/events`

- [ ] **Step 3: Implement `src/routes/events.ts`**

```typescript
import type { FastifyInstance } from "fastify";
import { lifeEventInputSchema } from "@cosmos-engine/schemas";
import { getPool } from "../db.js";

function toApiShape(row: Record<string, unknown>) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    ownerUserId: row.owner_user_id,
    eventType: row.event_type,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timezone: row.timezone,
    emotionalValence: row.emotional_valence === null ? null : Number(row.emotional_valence),
    emotionalIntensity:
      row.emotional_intensity === null ? null : Number(row.emotional_intensity),
    importanceScore: Number(row.importance_score),
    sourceType: row.source_type,
    confidence: Number(row.confidence),
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function eventRoutes(app: FastifyInstance) {
  app.post("/v1/events", async (request, reply) => {
    const tenantId = request.headers["x-tenant-id"];
    if (typeof tenantId !== "string") {
      return reply.code(400).send({ error: "x-tenant-id header is required" });
    }

    const parsed = lifeEventInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const input = parsed.data;

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO life_events
        (tenant_id, owner_user_id, event_type, title, description, starts_at, ends_at,
         timezone, emotional_valence, emotional_intensity, importance_score,
         source_type, confidence, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        tenantId,
        input.ownerUserId,
        input.eventType,
        input.title,
        input.description ?? null,
        input.startsAt,
        input.endsAt ?? null,
        input.timezone,
        input.emotionalValence ?? null,
        input.emotionalIntensity ?? null,
        input.importanceScore,
        input.sourceType,
        input.confidence,
        input.metadata,
      ],
    );
    return reply.code(201).send(toApiShape(result.rows[0]));
  });

  app.get<{ Querystring: { ownerUserId?: string } }>("/v1/events", async (request, reply) => {
    const tenantId = request.headers["x-tenant-id"];
    if (typeof tenantId !== "string") {
      return reply.code(400).send({ error: "x-tenant-id header is required" });
    }
    const { ownerUserId } = request.query;
    if (!ownerUserId) {
      return reply.code(400).send({ error: "ownerUserId query param is required" });
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM life_events
       WHERE tenant_id = $1 AND owner_user_id = $2 AND deleted_at IS NULL
       ORDER BY starts_at DESC`,
      [tenantId, ownerUserId],
    );
    return reply.send(result.rows.map(toApiShape));
  });
}
```

- [ ] **Step 4: Register the route in `server.ts`**

```typescript
import Fastify from "fastify";
import { healthRoutes } from "./routes/health.js";
import { birthProfileRoutes } from "./routes/birthProfiles.js";
import { eventRoutes } from "./routes/events.js";

export function buildServer() {
  const app = Fastify({ logger: true });
  app.register(healthRoutes);
  app.register(birthProfileRoutes);
  app.register(eventRoutes);
  return app;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 4000);
  app.listen({ port, host: "0.0.0.0" }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd cosmos-engine && DATABASE_URL=postgres://cosmos:cosmos@localhost:5432/cosmos npx vitest run apps/api/test/events.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add cosmos-engine/apps/api
git commit -m "cosmos-engine: add life event CRUD endpoints"
```

---

### Task 8: Mocked astrology provider + derived-points endpoint

**Files:**
- Create: `cosmos-engine/apps/api/src/astrology/mockProvider.ts`
- Create: `cosmos-engine/apps/api/src/routes/derivedPoints.ts`
- Modify: `cosmos-engine/apps/api/src/server.ts`
- Test: `cosmos-engine/apps/api/test/derivedPoints.test.ts`

**Interfaces:**
- Consumes: `antiscion`, `contraAntiscion`, `midpoint`, `signAndDegree` from `@cosmos-engine/astro-math`; `PlanetaryPoint`, `DerivedPoint` types from `@cosmos-engine/schemas`.
- Produces: `computeMockNatalPoints(profileId: string, birthDate: string): PlanetaryPoint[]` (deterministic — same input always returns the same output, satisfying the spec's "same birth profile always produces same chart" acceptance criterion), `GET /v1/astrology/derived-points?profile_id=&types=` (200: array of `DerivedPoint`, no DB required — pure computation from the mock provider).

- [ ] **Step 1: Write the failing test**

`cosmos-engine/apps/api/test/derivedPoints.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildServer } from "../src/server.js";
import { computeMockNatalPoints } from "../src/astrology/mockProvider.js";

describe("computeMockNatalPoints", () => {
  it("is deterministic for the same profile id and birth date", () => {
    const a = computeMockNatalPoints("profile-1", "1991-04-23");
    const b = computeMockNatalPoints("profile-1", "1991-04-23");
    expect(a).toEqual(b);
  });

  it("returns a different chart for a different birth date", () => {
    const a = computeMockNatalPoints("profile-1", "1991-04-23");
    const b = computeMockNatalPoints("profile-1", "2000-01-01");
    expect(a).not.toEqual(b);
  });

  it("includes all ten visible bodies", () => {
    const points = computeMockNatalPoints("profile-1", "1991-04-23");
    const bodies = points.map((p) => p.body).sort();
    expect(bodies).toEqual(
      [
        "Sun", "Moon", "Mercury", "Venus", "Mars",
        "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
      ].sort(),
    );
  });
});

describe("GET /v1/astrology/derived-points", () => {
  it("returns antiscia, contra-antiscia, and midpoints for a profile", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "GET",
      url: "/v1/astrology/derived-points?profile_id=profile-1&birth_date=1991-04-23",
    });
    expect(response.statusCode).toBe(200);
    const points = response.json();
    expect(points.length).toBeGreaterThan(0);
    expect(points.every((p: { pointType: string }) =>
      ["antiscion", "contra_antiscion", "midpoint"].includes(p.pointType),
    )).toBe(true);
    await app.close();
  });

  it("returns 400 when profile_id is missing", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "GET",
      url: "/v1/astrology/derived-points?birth_date=1991-04-23",
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cosmos-engine && npx vitest run apps/api/test/derivedPoints.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/astrology/mockProvider.ts`**

Deterministic pseudo-chart: hashes `profileId + birthDate` into a seed, then derives ten body longitudes from it. This is explicitly a mock — no real ephemeris — matching "First sprint tasks: astrology computation interface with mocked provider."

```typescript
import { createHash } from "node:crypto";
import { signAndDegree } from "@cosmos-engine/astro-math";
import type { PlanetaryPoint } from "@cosmos-engine/schemas";

const BODIES = [
  "Sun", "Moon", "Mercury", "Venus", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
];

function seedFor(profileId: string, birthDate: string, body: string): number {
  const hash = createHash("sha256").update(`${profileId}:${birthDate}:${body}`).digest();
  // Use the first 4 bytes as an unsigned 32-bit int, map into 0-360 degrees.
  const intValue = hash.readUInt32BE(0);
  return (intValue % 36000) / 100;
}

export function computeMockNatalPoints(profileId: string, birthDate: string): PlanetaryPoint[] {
  return BODIES.map((body) => {
    const zodiacLongitude = seedFor(profileId, birthDate, body);
    const { sign, degreeInSign } = signAndDegree(zodiacLongitude);
    return {
      id: `mock-${profileId}-${body}`,
      body,
      chartContext: "natal" as const,
      timestamp: `${birthDate}T00:00:00Z`,
      zodiacLongitude,
      sign,
      degreeInSign,
      house: null,
      speed: null,
      retrograde: null,
      declination: null,
      rightAscension: null,
    };
  });
}
```

- [ ] **Step 4: Implement `src/routes/derivedPoints.ts`**

```typescript
import type { FastifyInstance } from "fastify";
import { antiscion, contraAntiscion, midpoint, signAndDegree } from "@cosmos-engine/astro-math";
import { computeMockNatalPoints } from "../astrology/mockProvider.js";

export async function derivedPointRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { profile_id?: string; birth_date?: string; types?: string } }>(
    "/v1/astrology/derived-points",
    async (request, reply) => {
      const { profile_id: profileId, birth_date: birthDate, types } = request.query;
      if (!profileId) {
        return reply.code(400).send({ error: "profile_id query param is required" });
      }
      const effectiveBirthDate = birthDate ?? "1970-01-01";
      const requestedTypes = types
        ? types.split(",")
        : ["antiscion", "contra_antiscion", "midpoint"];

      const natalPoints = computeMockNatalPoints(profileId, effectiveBirthDate);
      const derived: unknown[] = [];

      if (requestedTypes.includes("antiscion")) {
        for (const point of natalPoints) {
          const lon = antiscion(point.zodiacLongitude);
          const { sign, degreeInSign } = signAndDegree(lon);
          derived.push({
            id: `antiscion-${point.id}`,
            sourcePointId: point.id,
            sourcePair: null,
            pointType: "antiscion",
            zodiacLongitude: lon,
            sign,
            degreeInSign,
            calculationMethod: "solstitial-reflection-v1",
          });
        }
      }

      if (requestedTypes.includes("contra_antiscion")) {
        for (const point of natalPoints) {
          const lon = contraAntiscion(point.zodiacLongitude);
          const { sign, degreeInSign } = signAndDegree(lon);
          derived.push({
            id: `contra-antiscion-${point.id}`,
            sourcePointId: point.id,
            sourcePair: null,
            pointType: "contra_antiscion",
            zodiacLongitude: lon,
            sign,
            degreeInSign,
            calculationMethod: "equinoctial-reflection-v1",
          });
        }
      }

      if (requestedTypes.includes("midpoint")) {
        for (let i = 0; i < natalPoints.length; i++) {
          for (let j = i + 1; j < natalPoints.length; j++) {
            const a = natalPoints[i];
            const b = natalPoints[j];
            const lon = midpoint(a.zodiacLongitude, b.zodiacLongitude);
            const { sign, degreeInSign } = signAndDegree(lon);
            derived.push({
              id: `midpoint-${a.id}-${b.id}`,
              sourcePointId: null,
              sourcePair: [a.id, b.id],
              pointType: "midpoint",
              zodiacLongitude: lon,
              sign,
              degreeInSign,
              calculationMethod: "near-arc-midpoint-v1",
            });
          }
        }
      }

      return reply.send(derived);
    },
  );
}
```

- [ ] **Step 5: Register the route in `server.ts`**

```typescript
import Fastify from "fastify";
import { healthRoutes } from "./routes/health.js";
import { birthProfileRoutes } from "./routes/birthProfiles.js";
import { eventRoutes } from "./routes/events.js";
import { derivedPointRoutes } from "./routes/derivedPoints.js";

export function buildServer() {
  const app = Fastify({ logger: true });
  app.register(healthRoutes);
  app.register(birthProfileRoutes);
  app.register(eventRoutes);
  app.register(derivedPointRoutes);
  return app;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 4000);
  app.listen({ port, host: "0.0.0.0" }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd cosmos-engine && npx vitest run apps/api/test/derivedPoints.test.ts`
Expected: PASS (5 tests) — no DB needed for this route.

- [ ] **Step 7: Commit**

```bash
git add cosmos-engine/apps/api
git commit -m "cosmos-engine: add mocked astrology provider and derived-points endpoint"
```

---

### Task 9: OpenAPI contract

**Files:**
- Create: `cosmos-engine/packages/schemas/openapi.yaml`
- Create: `cosmos-engine/apps/api/src/openapi.ts`
- Modify: `cosmos-engine/apps/api/src/server.ts`
- Test: `cosmos-engine/apps/api/test/openapi.test.ts`

**Interfaces:**
- Produces: `GET /v1/openapi.yaml` serving the contract as static text.

- [ ] **Step 1: Write the filled-in OpenAPI contract**

`cosmos-engine/packages/schemas/openapi.yaml` — extends `cosmos-engine-mtds-v1/schemas/openapi.yaml`'s route stubs with the request/response bodies actually implemented in Tasks 6-8:

```yaml
openapi: 3.1.0
info:
  title: Cosmos Engine API
  version: 0.1.0
paths:
  /v1/birth-profiles:
    post:
      summary: Create a birth profile
      parameters:
        - name: x-tenant-id
          in: header
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [userId, birthDate, timezone, latitude, longitude]
              properties:
                userId: { type: string, format: uuid }
                birthDate: { type: string, pattern: '^\d{4}-\d{2}-\d{2}$' }
                birthTime: { type: string }
                timezone: { type: string }
                latitude: { type: number, minimum: -90, maximum: 90 }
                longitude: { type: number, minimum: -180, maximum: 180 }
                houseSystem: { type: string }
                zodiacMode: { type: string, enum: [tropical, sidereal] }
      responses:
        '201': { description: Created }
        '400': { description: Invalid payload }
  /v1/birth-profiles/{id}:
    get:
      summary: Fetch a birth profile by id
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
        - name: x-tenant-id
          in: header
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200': { description: OK }
        '404': { description: Not found }
  /v1/events:
    post:
      summary: Create a life event
      parameters:
        - name: x-tenant-id
          in: header
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [ownerUserId, eventType, title, startsAt, timezone, sourceType]
              properties:
                ownerUserId: { type: string, format: uuid }
                eventType: { type: string }
                title: { type: string }
                startsAt: { type: string, format: date-time }
                timezone: { type: string }
                sourceType: { type: string }
      responses:
        '201': { description: Created }
        '400': { description: Invalid payload }
    get:
      summary: List life events for an owner
      parameters:
        - name: ownerUserId
          in: query
          required: true
          schema: { type: string, format: uuid }
        - name: x-tenant-id
          in: header
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200': { description: OK }
  /v1/astrology/derived-points:
    get:
      summary: List derived astrology points (mocked provider)
      parameters:
        - name: profile_id
          in: query
          required: true
          schema: { type: string }
        - name: birth_date
          in: query
          required: false
          schema: { type: string }
        - name: types
          in: query
          required: false
          schema: { type: string }
      responses:
        '200': { description: OK }
        '400': { description: Missing profile_id }
```

- [ ] **Step 2: Write the failing test**

`cosmos-engine/apps/api/test/openapi.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildServer } from "../src/server.js";

describe("GET /v1/openapi.yaml", () => {
  it("serves the OpenAPI contract as YAML", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "GET", url: "/v1/openapi.yaml" });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("openapi: 3.1.0");
    expect(response.body).toContain("/v1/birth-profiles");
    await app.close();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd cosmos-engine && npx vitest run apps/api/test/openapi.test.ts`
Expected: FAIL — 404

- [ ] **Step 4: Implement `src/openapi.ts`**

```typescript
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";

const contractPath = fileURLToPath(
  new URL("../../../packages/schemas/openapi.yaml", import.meta.url),
);

export async function openapiRoutes(app: FastifyInstance) {
  app.get("/v1/openapi.yaml", async (_request, reply) => {
    const contract = readFileSync(contractPath, "utf-8");
    return reply.type("text/yaml").send(contract);
  });
}
```

- [ ] **Step 5: Register the route in `server.ts`**

```typescript
import Fastify from "fastify";
import { healthRoutes } from "./routes/health.js";
import { birthProfileRoutes } from "./routes/birthProfiles.js";
import { eventRoutes } from "./routes/events.js";
import { derivedPointRoutes } from "./routes/derivedPoints.js";
import { openapiRoutes } from "./openapi.js";

export function buildServer() {
  const app = Fastify({ logger: true });
  app.register(healthRoutes);
  app.register(birthProfileRoutes);
  app.register(eventRoutes);
  app.register(derivedPointRoutes);
  app.register(openapiRoutes);
  return app;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 4000);
  app.listen({ port, host: "0.0.0.0" }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd cosmos-engine && npx vitest run apps/api/test/openapi.test.ts`
Expected: PASS (1 test)

- [ ] **Step 7: Commit**

```bash
git add cosmos-engine/packages/schemas/openapi.yaml cosmos-engine/apps/api
git commit -m "cosmos-engine: fill in and serve the OpenAPI contract"
```

---

### Task 10: Local Docker Compose

**Files:**
- Create: `cosmos-engine/infra/docker-compose.yml`
- Create: `cosmos-engine/apps/api/Dockerfile`

**Interfaces:**
- Produces: `docker compose -f cosmos-engine/infra/docker-compose.yml up -d` — brings up Postgres 16, Neo4j 5, Redis 7, and the API service together for local development and for running Tasks 6-9's DB-backed tests.

- [ ] **Step 1: Write `docker-compose.yml`**

Extends the spec's `docker-compose.example.yml` with the API service:

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: cosmos
      POSTGRES_PASSWORD: cosmos
      POSTGRES_DB: cosmos
    ports: ["5432:5432"]
    volumes:
      - cosmos-postgres-data:/var/lib/postgresql/data
  neo4j:
    image: neo4j:5
    environment:
      NEO4J_AUTH: neo4j/cosmospassword
    ports: ["7474:7474", "7687:7687"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
  api:
    build:
      context: ..
      dockerfile: apps/api/Dockerfile
    environment:
      DATABASE_URL: postgres://cosmos:cosmos@postgres:5432/cosmos
      PORT: "4000"
    ports: ["4000:4000"]
    depends_on:
      - postgres
volumes:
  cosmos-postgres-data:
```

- [ ] **Step 2: Write `apps/api/Dockerfile`**

```dockerfile
FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN npm install --workspace=apps/api --include-workspace-root
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "--experimental-strip-types", "src/server.ts"]
```

- [ ] **Step 3: Verify the full stack comes up**

Run: `cd cosmos-engine && docker compose -f infra/docker-compose.yml up -d postgres neo4j redis`
Expected: three containers running (`docker compose -f infra/docker-compose.yml ps` shows `Up` for all three).

Run: `cd cosmos-engine && DATABASE_URL=postgres://cosmos:cosmos@localhost:5432/cosmos npm run migrate`
Expected: `migrations complete`

Run: `cd cosmos-engine && DATABASE_URL=postgres://cosmos:cosmos@localhost:5432/cosmos npm test`
Expected: all suites PASS (astro-math, schemas, api — health/birthProfiles/events/derivedPoints/openapi)

Run: `cd cosmos-engine && docker compose -f infra/docker-compose.yml down`
Expected: containers stopped and removed (data volume persists for next run).

- [ ] **Step 4: Commit**

```bash
git add cosmos-engine/infra/docker-compose.yml cosmos-engine/apps/api/Dockerfile
git commit -m "cosmos-engine: add local Docker Compose stack"
```

---

## Known gaps carried forward (not silently dropped)

- **Full canonical envelope** (`visibility`, `provenance`, `version` from 02-Canonical-Ontology.md) is not yet on `birth_profiles`/`life_events` rows — the spec's DDL itself doesn't have these columns either. Needs a schema decision (new columns vs. a shared `cosmos_objects` table) before the Living Knowledge Graph work (doc 07) can build on it.
- **Real ephemeris computation** — `computeMockNatalPoints` is a deterministic hash, not real astronomy. Cosmora's existing `src/lib/astrology/calculator.ts` (astronomy-engine, VSOP87) is the natural real provider to wire in next, once this branch's relationship to the main app (shared package vs. separate service) is decided.
- **Auth** — `x-tenant-id` header is trusted as-is with no verification. Fine for local dev, not for anything exposed past localhost.
- **The "First vertical slice"** (birth profile form + event form + Observatory 3D render) from 21-Developer-Handoff.md is intentionally out of scope here — this plan only covers the backend foundation it depends on.
