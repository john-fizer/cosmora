import { describe, it, expect } from "vitest";
import { scenePayloadSchema } from "../src/scenePayload.js";

describe("scenePayloadSchema", () => {
  it("accepts a minimal valid scene with one natal node, one event node, and one edge", () => {
    const result = scenePayloadSchema.safeParse({
      sceneId: "11111111-1111-1111-1111-111111111111",
      timeWindow: { start: "1991-04-23", end: "2026-09-24" },
      nodes: [
        { id: "pp_sun", type: "natal_planet", x: 200, y: 0, z: 2, label: "Sun" },
        { id: "evt_1", type: "event", x: -50, y: 240, z: 5, label: "Joined Cosmos Engine" },
      ],
      edges: [
        { id: "edge_1", from: "evt_1", to: "pp_sun", type: "ACTIVATES", weight: 0.8 },
      ],
      animations: [],
      filters: { showMidpoints: false, showAntiscia: false, showForecasts: false },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a node with an unknown type", () => {
    const result = scenePayloadSchema.safeParse({
      sceneId: "11111111-1111-1111-1111-111111111111",
      timeWindow: { start: "1991-04-23", end: "2026-09-24" },
      nodes: [{ id: "x", type: "not_a_real_type", x: 0, y: 0, z: 0, label: "X" }],
      edges: [],
      animations: [],
      filters: { showMidpoints: false, showAntiscia: false, showForecasts: false },
    });
    expect(result.success).toBe(false);
  });
});
