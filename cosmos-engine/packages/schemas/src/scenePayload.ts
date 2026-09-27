import { z } from "zod";

export const sceneNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["natal_planet", "event"]),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  label: z.string(),
});

export const sceneEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  type: z.string(),
  weight: z.number(),
});

export const scenePayloadSchema = z.object({
  sceneId: z.string(),
  timeWindow: z.object({
    start: z.string(),
    end: z.string(),
  }),
  nodes: z.array(sceneNodeSchema),
  edges: z.array(sceneEdgeSchema),
  animations: z.array(z.unknown()),
  filters: z.object({
    showMidpoints: z.boolean(),
    showAntiscia: z.boolean(),
    showForecasts: z.boolean(),
  }),
});

export type SceneNode = z.infer<typeof sceneNodeSchema>;
export type SceneEdge = z.infer<typeof sceneEdgeSchema>;
export type ScenePayload = z.infer<typeof scenePayloadSchema>;
