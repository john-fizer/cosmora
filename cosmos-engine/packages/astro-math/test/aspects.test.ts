import { describe, it, expect } from "vitest";
import { detectAspect, MAJOR_ASPECTS } from "../src/aspects.js";

describe("MAJOR_ASPECTS", () => {
  it("defines the five major aspects from the spec", () => {
    const types = MAJOR_ASPECTS.map((a) => a.type).sort();
    expect(types).toEqual(
      ["conjunction", "opposition", "sextile", "square", "trine"].sort(),
    );
  });
});

describe("detectAspect", () => {
  it("detects an exact conjunction", () => {
    const result = detectAspect(10, 10);
    expect(result).toMatchObject({ aspectType: "conjunction", orb: 0 });
  });
  it("detects a square within orb, wrapping across 0/360", () => {
    // 358 and 88 are 90 degrees apart the short way
    const result = detectAspect(358, 88);
    expect(result).toMatchObject({ aspectType: "square" });
    expect(result!.orb).toBeCloseTo(0);
  });
  it("detects an applying-orb trine within the 8 degree default orb", () => {
    const result = detectAspect(0, 125);
    expect(result).toMatchObject({ aspectType: "trine" });
    expect(result!.orb).toBeCloseTo(5);
  });
  it("returns null when no major aspect is within orb", () => {
    expect(detectAspect(0, 40)).toBeNull();
  });
});
