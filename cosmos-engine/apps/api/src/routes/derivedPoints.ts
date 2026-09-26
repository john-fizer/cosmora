import type { FastifyInstance } from "fastify";
import { antiscion, contraAntiscion, midpoint, signAndDegree } from "@cosmos-engine/astro-math";
import { computeMockNatalPoints } from "../astrology/mockProvider.js";

export async function derivedPointRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { profile_id?: string; birth_date?: string; types?: string } }>(
    "/v1/astrology/derived-points",
    async (request, reply) => {
      const { profile_id: profileId, birth_date: birthDate, types } = request.query;
      if (!profileId) {
        return reply.code(400).send({ error: "profile_id query param is required" });
      }
      const effectiveBirthDate = birthDate ?? "1970-01-01";
      const requestedTypes = types
        ? types.split(",")
        : ["antiscion", "contra_antiscion", "midpoint"];

      const natalPoints = computeMockNatalPoints(profileId, effectiveBirthDate);
      const derived: unknown[] = [];

      if (requestedTypes.includes("antiscion")) {
        for (const point of natalPoints) {
          const lon = antiscion(point.zodiacLongitude);
          const { sign, degreeInSign } = signAndDegree(lon);
          derived.push({
            id: `antiscion-${point.id}`,
            sourcePointId: point.id,
            sourcePair: null,
            pointType: "antiscion",
            zodiacLongitude: lon,
            sign,
            degreeInSign,
            calculationMethod: "solstitial-reflection-v1",
          });
        }
      }

      if (requestedTypes.includes("contra_antiscion")) {
        for (const point of natalPoints) {
          const lon = contraAntiscion(point.zodiacLongitude);
          const { sign, degreeInSign } = signAndDegree(lon);
          derived.push({
            id: `contra-antiscion-${point.id}`,
            sourcePointId: point.id,
            sourcePair: null,
            pointType: "contra_antiscion",
            zodiacLongitude: lon,
            sign,
            degreeInSign,
            calculationMethod: "equinoctial-reflection-v1",
          });
        }
      }

      if (requestedTypes.includes("midpoint")) {
        for (let i = 0; i < natalPoints.length; i++) {
          for (let j = i + 1; j < natalPoints.length; j++) {
            const a = natalPoints[i];
            const b = natalPoints[j];
            const lon = midpoint(a.zodiacLongitude, b.zodiacLongitude);
            const { sign, degreeInSign } = signAndDegree(lon);
            derived.push({
              id: `midpoint-${a.id}-${b.id}`,
              sourcePointId: null,
              sourcePair: [a.id, b.id],
              pointType: "midpoint",
              zodiacLongitude: lon,
              sign,
              degreeInSign,
              calculationMethod: "near-arc-midpoint-v1",
            });
          }
        }
      }

      return reply.send(derived);
    },
  );
}
