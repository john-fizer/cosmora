import type { FastifyInstance } from "fastify";
import { userInputSchema } from "@cosmos-engine/schemas";
import { getPool } from "../db.js";

function toApiShape(row: Record<string, unknown>) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    createdAt: row.created_at,
  };
}

export async function userRoutes(app: FastifyInstance) {
  app.post("/v1/users", async (request, reply) => {
    const parsed = userInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const pool = getPool();
    const result = await pool.query(
      "INSERT INTO users (tenant_id, email) VALUES ($1, $2) RETURNING *",
      [parsed.data.tenantId, parsed.data.email ?? null],
    );
    return reply.code(201).send(toApiShape(result.rows[0]));
  });
}
