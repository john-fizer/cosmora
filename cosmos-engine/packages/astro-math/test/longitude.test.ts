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
