import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../src/server.js";
import { getPool, closePool } from "../src/db.js";

let tenantId: string;
let userId: string;
let tenantIdB: string;

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

  const tenantB = await pool.query(
    "INSERT INTO tenants (name) VALUES ('test-tenant-events-b') RETURNING id",
  );
  tenantIdB = tenantB.rows[0].id;
  await pool.query(
    "INSERT INTO users (tenant_id, email) VALUES ($1, 'events-b@example.com') RETURNING id",
    [tenantIdB],
  );
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

  it("rejects a malformed x-tenant-id on POST with 400 instead of a raw Postgres error", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/v1/events",
      headers: { "x-tenant-id": "not-a-uuid" },
      payload: {
        ownerUserId: userId,
        eventType: "CareerStart",
        title: "Bad tenant",
        startsAt: "2026-09-24T00:00:00Z",
        timezone: "America/Chicago",
        sourceType: "manual",
      },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("rejects a malformed ownerUserId query param on GET with 400 instead of a raw Postgres error", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "GET",
      url: "/v1/events?ownerUserId=not-a-uuid",
      headers: { "x-tenant-id": tenantId },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("does not leak events to a different tenant querying the same ownerUserId", async () => {
    const app = buildServer();

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/events",
      headers: { "x-tenant-id": tenantId },
      payload: {
        ownerUserId: userId,
        eventType: "CareerStart",
        title: "Tenant A only event",
        startsAt: "2026-09-24T00:00:00Z",
        timezone: "America/Chicago",
        sourceType: "manual",
      },
    });
    expect(createResponse.statusCode).toBe(201);

    const crossTenantResponse = await app.inject({
      method: "GET",
      url: `/v1/events?ownerUserId=${userId}`,
      headers: { "x-tenant-id": tenantIdB },
    });
    expect(crossTenantResponse.statusCode).toBe(200);
    expect(crossTenantResponse.json()).toEqual([]);

    await app.close();
  });
});
