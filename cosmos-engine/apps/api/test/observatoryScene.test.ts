import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../src/server.js";
import { getPool, closePool } from "../src/db.js";
import { buildScenePayload } from "../src/observatory/buildScene.js";

describe("buildScenePayload", () => {
  it("produces 10 natal nodes, 1 event node, and exactly 1 activation edge", () => {
    const scene = buildScenePayload({
      profileId: "profile-1",
      birthDate: "1991-04-23",
      eventId: "event-1",
      eventTitle: "Joined Cosmos Engine",
      eventStartsAt: "2026-09-24",
    });
    expect(scene.nodes).toHaveLength(11);
    expect(scene.nodes.filter((n) => n.type === "natal_planet")).toHaveLength(10);
    expect(scene.nodes.filter((n) => n.type === "event")).toHaveLength(1);
    expect(scene.edges).toHaveLength(1);
    expect(scene.edges[0].type).toBe("ACTIVATES");
    expect(scene.edges[0].from).toBe("evt_event-1");
  });

  it("is deterministic for the same inputs", () => {
    const a = buildScenePayload({
      profileId: "profile-1",
      birthDate: "1991-04-23",
      eventId: "event-1",
      eventTitle: "Joined Cosmos Engine",
      eventStartsAt: "2026-09-24",
    });
    const b = buildScenePayload({
      profileId: "profile-1",
      birthDate: "1991-04-23",
      eventId: "event-1",
      eventTitle: "Joined Cosmos Engine",
      eventStartsAt: "2026-09-24",
    });
    expect(a).toEqual(b);
  });

  it("places natal nodes at layer depth 2 and the event node at layer depth 5", () => {
    const scene = buildScenePayload({
      profileId: "profile-1",
      birthDate: "1991-04-23",
      eventId: "event-1",
      eventTitle: "Joined Cosmos Engine",
      eventStartsAt: "2026-09-24",
    });
    for (const node of scene.nodes.filter((n) => n.type === "natal_planet")) {
      expect(node.z).toBe(2);
    }
    expect(scene.nodes.find((n) => n.type === "event")!.z).toBe(5);
  });
});

describe("GET /v1/observatory/scene", () => {
  let tenantId: string;
  let profileId: string;
  let eventId: string;

  afterAll(async () => {
    await closePool();
  });

  beforeAll(async () => {
    const app = buildServer();
    const pool = getPool();

    const tenant = await pool.query("INSERT INTO tenants (name) VALUES ('scene-test') RETURNING id");
    tenantId = tenant.rows[0].id;
    const user = await pool.query(
      "INSERT INTO users (tenant_id, email) VALUES ($1, 'scene@example.com') RETURNING id",
      [tenantId],
    );
    const userId = user.rows[0].id;

    const profileResponse = await app.inject({
      method: "POST",
      url: "/v1/birth-profiles",
      headers: { "x-tenant-id": tenantId },
      payload: {
        userId,
        birthDate: "1991-04-23",
        timezone: "America/Chicago",
        latitude: 41.8781,
        longitude: -87.6298,
      },
    });
    profileId = profileResponse.json().id;

    const eventResponse = await app.inject({
      method: "POST",
      url: "/v1/events",
      headers: { "x-tenant-id": tenantId },
      payload: {
        ownerUserId: userId,
        eventType: "CareerStart",
        title: "Joined Cosmos Engine",
        startsAt: "2026-09-24T00:00:00Z",
        timezone: "America/Chicago",
        sourceType: "manual",
      },
    });
    eventId = eventResponse.json().id;

    await app.close();
  });

  it("returns a full scene payload for a stored profile and event", async () => {
    const app = buildServer();
    const sceneResponse = await app.inject({
      method: "GET",
      url: `/v1/observatory/scene?profile_id=${profileId}&event_id=${eventId}`,
      headers: { "x-tenant-id": tenantId },
    });
    expect(sceneResponse.statusCode).toBe(200);
    const scene = sceneResponse.json();
    expect(scene.nodes).toHaveLength(11);
    expect(scene.edges).toHaveLength(1);
    await app.close();
  });

  it("returns 404 when the profile does not belong to the given tenant", async () => {
    const app = buildServer();
    const otherTenant = await getPool().query("INSERT INTO tenants (name) VALUES ('scene-test-other') RETURNING id");
    const response = await app.inject({
      method: "GET",
      url: `/v1/observatory/scene?profile_id=${profileId}&event_id=${eventId}`,
      headers: { "x-tenant-id": otherTenant.rows[0].id },
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it("returns 400 when profile_id is not a valid UUID", async () => {
    const app = buildServer();
    const response = await app.inject({
      method: "GET",
      url: `/v1/observatory/scene?profile_id=not-a-uuid&event_id=${eventId}`,
      headers: { "x-tenant-id": tenantId },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
