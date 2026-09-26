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
