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

  it("sets Access-Control-Allow-Origin for a cross-origin request", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "http://localhost:5173" },
    });
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    await app.close();
  });
});
