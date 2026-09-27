import type { FastifyInstance } from "fastify";
import { tenantInputSchema } from "@cosmos-engine/schemas";
import { getPool } from "../db.js";

function toApiShape(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export async function tenantRoutes(app: FastifyInstance) {
  app.post("/v1/tenants", async (request, reply) => {
    const parsed = tenantInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const pool = getPool();
    const result = await pool.query(
      "INSERT INTO tenants (name) VALUES ($1) RETURNING *",
      [parsed.data.name],
    );
    return reply.code(201).send(toApiShape(result.rows[0]));
  });
}
