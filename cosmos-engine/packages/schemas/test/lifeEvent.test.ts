import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { lifeEventInputSchema } from "../src/lifeEvent.js";

const specPath = fileURLToPath(
  new URL("../../../../cosmos-engine-mtds-v1/schemas/event.schema.json", import.meta.url),
);
const spec = JSON.parse(readFileSync(specPath, "utf-8"));

describe("lifeEventInputSchema", () => {
  it("accepts a minimal valid event", () => {
    const result = lifeEventInputSchema.safeParse({
      ownerUserId: "3b9a1f2e-7c3d-4a2b-9e1a-2f5c6d7e8f90",
      eventType: "CareerStart",
      title: "Started at Cosmos Engine",
      startsAt: "2026-09-24T00:00:00Z",
      timezone: "America/Chicago",
      sourceType: "manual",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an event missing a spec-required field", () => {
    const result = lifeEventInputSchema.safeParse({
      ownerUserId: "3b9a1f2e-7c3d-4a2b-9e1a-2f5c6d7e8f90",
      eventType: "CareerStart",
      title: "Missing timezone and sourceType",
      startsAt: "2026-09-24T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("covers every field the spec's JSON Schema marks required (minus id/tenant_id, assigned server-side)", () => {
    const specRequired: string[] = spec.required;
    const serverAssigned = ["id", "tenant_id"];
    const clientRequired = specRequired.filter((f) => !serverAssigned.includes(f));
    // camelCase mapping of the spec's snake_case required fields
    const camelCased = clientRequired.map((f) =>
      f.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
    );
    for (const field of camelCased) {
      expect(lifeEventInputSchema.shape).toHaveProperty(field);
    }
  });
});
