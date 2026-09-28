import type { FastifyInstance } from "fastify";
import { getPool } from "../db.js";
import { buildScenePayload } from "../observatory/buildScene.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function observatorySceneRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { profile_id?: string; event_id?: string } }>(
    "/v1/observatory/scene",
    async (request, reply) => {
      const tenantId = request.headers["x-tenant-id"];
      if (typeof tenantId !== "string" || !UUID_REGEX.test(tenantId)) {
        return reply.code(400).send({ error: "x-tenant-id must be a valid UUID" });
      }
      const { profile_id: profileId, event_id: eventId } = request.query;
      if (!profileId || !UUID_REGEX.test(profileId)) {
        return reply.code(400).send({ error: "profile_id must be a valid UUID" });
      }
      if (!eventId || !UUID_REGEX.test(eventId)) {
        return reply.code(400).send({ error: "event_id must be a valid UUID" });
      }

      const pool = getPool();
      const profileResult = await pool.query(
        "SELECT birth_date FROM birth_profiles WHERE id = $1 AND tenant_id = $2",
        [profileId, tenantId],
      );
      if (profileResult.rows.length === 0) {
        return reply.code(404).send({ error: "birth profile not found" });
      }

      const eventResult = await pool.query(
        "SELECT title, starts_at FROM life_events WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
        [eventId, tenantId],
      );
      if (eventResult.rows.length === 0) {
        return reply.code(404).send({ error: "life event not found" });
      }

      const birthDateRaw = profileResult.rows[0].birth_date;
      const birthDate =
        birthDateRaw instanceof Date ? birthDateRaw.toISOString().slice(0, 10) : String(birthDateRaw);
      const eventStartsAtRaw = eventResult.rows[0].starts_at;
      const eventStartsAt =
        eventStartsAtRaw instanceof Date ? eventStartsAtRaw.toISOString() : String(eventStartsAtRaw);

      const scene = buildScenePayload({
        profileId,
        birthDate,
        eventId,
        eventTitle: eventResult.rows[0].title,
        eventStartsAt,
      });
      return reply.send(scene);
    },
  );
}
