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
