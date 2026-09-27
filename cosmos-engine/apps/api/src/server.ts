import { pathToFileURL } from "node:url";
import Fastify from "fastify";
import { healthRoutes } from "./routes/health.js";
import { birthProfileRoutes } from "./routes/birthProfiles.js";
import { eventRoutes } from "./routes/events.js";
import { derivedPointRoutes } from "./routes/derivedPoints.js";
import { openapiRoutes } from "./openapi.js";
import { tenantRoutes } from "./routes/tenants.js";
import { userRoutes } from "./routes/users.js";
import { observatorySceneRoutes } from "./routes/observatoryScene.js";

export function buildServer() {
  const app = Fastify({ logger: true });
  app.register(healthRoutes);
  app.register(birthProfileRoutes);
  app.register(eventRoutes);
  app.register(derivedPointRoutes);
  app.register(openapiRoutes);
  app.register(tenantRoutes);
  app.register(userRoutes);
  app.register(observatorySceneRoutes);
  return app;
}

const isMain = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 4000);
  app.listen({ port, host: "0.0.0.0" }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
