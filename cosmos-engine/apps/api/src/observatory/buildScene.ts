import { createHash } from "node:crypto";
import { polarPlacement, nearestBody } from "@cosmos-engine/astro-math";
import type { ScenePayload } from "@cosmos-engine/schemas";
import { computeMockNatalPoints } from "../astrology/mockProvider.js";

const NATAL_RADIUS = 200;
const NATAL_LAYER_Z = 2;
const EVENT_RADIUS = 260;
const EVENT_LAYER_Z = 5;
const ACTIVATION_MAX_ORB_DEGREES = 15;

export interface BuildScenePayloadInput {
  profileId: string;
  birthDate: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
}

// Deterministic (not random) so that buildScenePayload is a pure function of
// its inputs: the same profile/event/date always yields the same sceneId,
// which the "is deterministic for the same inputs" test relies on.
function deterministicSceneId(input: BuildScenePayloadInput): string {
  return createHash("sha256")
    .update(`${input.profileId}:${input.birthDate}:${input.eventId}:${input.eventStartsAt}`)
    .digest("hex")
    .slice(0, 32);
}

export function buildScenePayload(input: BuildScenePayloadInput): ScenePayload {
  const natalPoints = computeMockNatalPoints(input.profileId, input.birthDate);
  const eventDateOnly = input.eventStartsAt.slice(0, 10);
  const eventPoints = computeMockNatalPoints(input.eventId, eventDateOnly);
  const eventSun = eventPoints.find((p) => p.body === "Sun")!;

  const natalNodes = natalPoints.map((point) => {
    const placement = polarPlacement(point.zodiacLongitude, NATAL_RADIUS, NATAL_LAYER_Z);
    return {
      id: `pp_${point.body.toLowerCase()}`,
      type: "natal_planet" as const,
      ...placement,
      label: point.body,
    };
  });

  const eventPlacement = polarPlacement(eventSun.zodiacLongitude, EVENT_RADIUS, EVENT_LAYER_Z);
  const eventNodeId = `evt_${input.eventId}`;
  const eventNode = {
    id: eventNodeId,
    type: "event" as const,
    ...eventPlacement,
    label: input.eventTitle,
  };

  const nearest = nearestBody(
    eventSun.zodiacLongitude,
    natalPoints.map((p) => ({ body: p.body, zodiacLongitude: p.zodiacLongitude })),
  );
  const weight = Math.max(0, 1 - nearest.separation / ACTIVATION_MAX_ORB_DEGREES);

  return {
    sceneId: deterministicSceneId(input),
    timeWindow: { start: input.birthDate, end: eventDateOnly },
    nodes: [...natalNodes, eventNode],
    edges: [
      {
        id: `edge_${eventNodeId}_${nearest.body.toLowerCase()}`,
        from: eventNodeId,
        to: `pp_${nearest.body.toLowerCase()}`,
        type: "ACTIVATES",
        weight,
      },
    ],
    animations: [],
    filters: { showMidpoints: false, showAntiscia: false, showForecasts: false },
  };
}
