import { z } from "zod";

export const provenanceSchema = z.object({
  source: z.enum(["manual", "calendar", "photo", "agent", "ephemeris", "import"]),
  sourceId: z.string().optional(),
  confidence: z.number().min(0).max(1).default(1),
});

export type Provenance = z.infer<typeof provenanceSchema>;
