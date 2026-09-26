import { z } from "zod";

export const planetaryPointSchema = z.object({
  id: z.string(),
  body: z.string(),
  chartContext: z.enum(["natal", "transit", "progression", "return"]),
  timestamp: z.string().datetime(),
  zodiacLongitude: z.number().min(0).max(360),
  sign: z.string(),
  degreeInSign: z.number().min(0).max(30),
  house: z.number().int().min(1).max(12).nullable(),
  speed: z.number().nullable(),
  retrograde: z.boolean().nullable(),
  declination: z.number().nullable(),
  rightAscension: z.number().nullable(),
});

export const derivedPointSchema = z.object({
  id: z.string(),
  sourcePointId: z.string().nullable(),
  sourcePair: z.tuple([z.string(), z.string()]).nullable(),
  pointType: z.enum(["antiscion", "contra_antiscion", "midpoint"]),
  zodiacLongitude: z.number().min(0).max(360),
  sign: z.string(),
  degreeInSign: z.number().min(0).max(30),
  calculationMethod: z.string(),
});

export const aspectSchema = z.object({
  id: z.string(),
  pointAId: z.string(),
  pointBId: z.string(),
  aspectType: z.string(),
  exactAngle: z.number(),
  actualAngle: z.number(),
  orb: z.number(),
  applying: z.boolean().nullable(),
});

export type PlanetaryPoint = z.infer<typeof planetaryPointSchema>;
export type DerivedPoint = z.infer<typeof derivedPointSchema>;
export type Aspect = z.infer<typeof aspectSchema>;
