import { z } from "zod";

export const EVENT_CATEGORIES = [
  "Birth", "Death", "RelationshipStart", "RelationshipEnd", "Conflict",
  "Reconciliation", "CareerStart", "CareerEnd", "Promotion", "CreativeRelease",
  "Move", "Illness", "Recovery", "SpiritualExperience", "Dream", "LegalEvent",
  "FinancialEvent", "EducationEvent", "IdentityShift", "ParentingEvent",
  "Travel", "Unknown",
] as const;

export const lifeEventInputSchema = z.object({
  ownerUserId: z.string().uuid(),
  eventType: z.enum(EVENT_CATEGORIES),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  timezone: z.string().min(1),
  emotionalValence: z.number().min(-1).max(1).nullable().optional(),
  emotionalIntensity: z.number().min(0).max(1).nullable().optional(),
  importanceScore: z.number().min(0).max(1).default(0),
  sourceType: z.enum(["manual", "calendar", "photo", "agent", "ephemeris", "import"]),
  confidence: z.number().min(0).max(1).default(1),
  metadata: z.record(z.unknown()).default({}),
});

export const lifeEventSchema = lifeEventInputSchema.extend({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type LifeEventInput = z.infer<typeof lifeEventInputSchema>;
export type LifeEvent = z.infer<typeof lifeEventSchema>;
