import Fastify from "fastify";
import { healthRoutes } from "./routes/health.js";
import { birthProfileRoutes } from "./routes/birthProfiles.js";
import { eventRoutes } from "./routes/events.js";

export function buildServer() {
  const app = Fastify({ logger: true });
  app.register(healthRoutes);
  app.register(birthProfileRoutes);
  app.register(eventRoutes);
  return app;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 4000);
  app.listen({ port, host: "0.0.0.0" }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
