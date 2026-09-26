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
