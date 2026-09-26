import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";

const contractPath = fileURLToPath(
  new URL("../../../packages/schemas/openapi.yaml", import.meta.url),
);

export async function openapiRoutes(app: FastifyInstance) {
  app.get("/v1/openapi.yaml", async (_request, reply) => {
    const contract = readFileSync(contractPath, "utf-8");
    return reply.type("text/yaml").send(contract);
  });
}
