import { z } from "zod";

export const birthProfileInputSchema = z.object({
  userId: z.string().uuid(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  birthTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "expected HH:MM or HH:MM:SS").optional(),
  timezone: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  houseSystem: z.string().default("whole_sign"),
  zodiacMode: z.enum(["tropical", "sidereal"]).default("tropical"),
  metadata: z.record(z.unknown()).default({}),
});

export const birthProfileSchema = birthProfileInputSchema.extend({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export type BirthProfileInput = z.infer<typeof birthProfileInputSchema>;
export type BirthProfile = z.infer<typeof birthProfileSchema>;
