import { z } from "zod";

export const userInputSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email().nullable().optional(),
});

export const userSchema = userInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export type UserInput = z.infer<typeof userInputSchema>;
export type User = z.infer<typeof userSchema>;
