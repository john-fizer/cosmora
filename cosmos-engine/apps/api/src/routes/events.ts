import type { FastifyInstance } from "fastify";
import { lifeEventInputSchema } from "@cosmos-engine/schemas";
import { getPool } from "../db.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toApiShape(row: Record<string, unknown>) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    ownerUserId: row.owner_user_id,
    eventType: row.event_type,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timezone: row.timezone,
    emotionalValence: row.emotional_valence === null ? null : Number(row.emotional_valence),
    emotionalIntensity:
      row.emotional_intensity === null ? null : Number(row.emotional_intensity),
    importanceScore: Number(row.importance_score),
    sourceType: row.source_type,
    confidence: Number(row.confidence),
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function eventRoutes(app: FastifyInstance) {
  app.post("/v1/events", async (request, reply) => {
    const tenantId = request.headers["x-tenant-id"];
    if (typeof tenantId !== "string") {
      return reply.code(400).send({ error: "x-tenant-id header is required" });
    }
    if (!UUID_REGEX.test(tenantId)) {
      return reply.code(400).send({ error: "x-tenant-id must be a valid UUID" });
    }

    const parsed = lifeEventInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const input = parsed.data;

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO life_events
        (tenant_id, owner_user_id, event_type, title, description, starts_at, ends_at,
         timezone, emotional_valence, emotional_intensity, importance_score,
         source_type, confidence, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        tenantId,
        input.ownerUserId,
        input.eventType,
        input.title,
        input.description ?? null,
        input.startsAt,
        input.endsAt ?? null,
        input.timezone,
        input.emotionalValence ?? null,
        input.emotionalIntensity ?? null,
        input.importanceScore,
        input.sourceType,
        input.confidence,
        input.metadata,
      ],
    );
    return reply.code(201).send(toApiShape(result.rows[0]));
  });

  app.get<{ Querystring: { ownerUserId?: string } }>("/v1/events", async (request, reply) => {
    const tenantId = request.headers["x-tenant-id"];
    if (typeof tenantId !== "string") {
      return reply.code(400).send({ error: "x-tenant-id header is required" });
    }
    if (!UUID_REGEX.test(tenantId)) {
      return reply.code(400).send({ error: "x-tenant-id must be a valid UUID" });
    }
    const { ownerUserId } = request.query;
    if (!ownerUserId) {
      return reply.code(400).send({ error: "ownerUserId query param is required" });
    }
    if (!UUID_REGEX.test(ownerUserId)) {
      return reply.code(400).send({ error: "ownerUserId must be a valid UUID" });
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM life_events
       WHERE tenant_id = $1 AND owner_user_id = $2 AND deleted_at IS NULL
       ORDER BY starts_at DESC`,
      [tenantId, ownerUserId],
    );
    return reply.send(result.rows.map(toApiShape));
  });
}
