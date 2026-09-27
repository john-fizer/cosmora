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
