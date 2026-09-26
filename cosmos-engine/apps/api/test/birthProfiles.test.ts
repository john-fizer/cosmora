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
