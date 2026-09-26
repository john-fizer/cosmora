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
