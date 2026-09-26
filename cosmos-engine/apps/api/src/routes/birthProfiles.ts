import type { FastifyInstance } from "fastify";
import { birthProfileInputSchema } from "@cosmos-engine/schemas";
import { getPool } from "../db.js";

function toApiShape(row: Record<string, unknown>) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    birthDate: row.birth_date,
    birthTime: row.birth_time,
    timezone: row.timezone,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    houseSystem: row.house_system,
    zodiacMode: row.zodiac_mode,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export async function birthProfileRoutes(app: FastifyInstance) {
  app.post("/v1/birth-profiles", async (request, reply) => {
    const tenantId = request.headers["x-tenant-id"];
    if (typeof tenantId !== "string") {
      return reply.code(400).send({ error: "x-tenant-id header is required" });
    }

    const parsed = birthProfileInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const input = parsed.data;

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO birth_profiles
        (tenant_id, user_id, birth_date, birth_time, timezone, latitude, longitude, house_system, zodiac_mode, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        tenantId,
        input.userId,
        input.birthDate,
        input.birthTime ?? null,
        input.timezone,
        input.latitude,
        input.longitude,
        input.houseSystem,
        input.zodiacMode,
        input.metadata,
      ],
    );
    return reply.code(201).send(toApiShape(result.rows[0]));
  });

  app.get<{ Params: { id: string } }>("/v1/birth-profiles/:id", async (request, reply) => {
    const tenantId = request.headers["x-tenant-id"];
    if (typeof tenantId !== "string") {
      return reply.code(400).send({ error: "x-tenant-id header is required" });
    }

    const pool = getPool();
    const result = await pool.query(
      "SELECT * FROM birth_profiles WHERE id = $1 AND tenant_id = $2",
      [request.params.id, tenantId],
    );
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: "not found" });
    }
    return reply.send(toApiShape(result.rows[0]));
  });
}
