import { describe, it, expect } from "vitest";
import { antiscion, contraAntiscion } from "../src/antiscia.js";

describe("antiscion", () => {
  it("maps 0 Cancer (90 deg) to itself (solstice point)", () => {
    expect(antiscion(90)).toBeCloseTo(90);
  });
  it("maps 0 Capricorn (270 deg) to itself (solstice point)", () => {
    expect(antiscion(270)).toBeCloseTo(270);
  });
  it("maps 0 Aries (0 deg) to 0 Libra (180 deg)", () => {
    expect(antiscion(0)).toBeCloseTo(180);
  });
  it("maps 15 Taurus (45 deg) to 15 Leo (135 deg)", () => {
    expect(antiscion(45)).toBeCloseTo(135);
  });
});

describe("contraAntiscion", () => {
  it("is 180 degrees from the antiscion", () => {
    const lon = 145.25;
    const diff = Math.abs(antiscion(lon) - contraAntiscion(lon));
    expect(Math.min(diff, 360 - diff)).toBeCloseTo(180);
  });
  it("maps 0 Aries (0 deg) to itself (equinox point)", () => {
    expect(contraAntiscion(0)).toBeCloseTo(0);
  });
  it("maps 0 Libra (180 deg) to itself (equinox point)", () => {
    expect(contraAntiscion(180)).toBeCloseTo(180);
  });
});
