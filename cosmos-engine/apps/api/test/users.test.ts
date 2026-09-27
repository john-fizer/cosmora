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
