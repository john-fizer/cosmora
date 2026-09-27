import { z } from "zod";

export const tenantInputSchema = z.object({
  name: z.string().min(1),
});

export const tenantSchema = tenantInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export type TenantInput = z.infer<typeof tenantInputSchema>;
export type Tenant = z.infer<typeof tenantSchema>;
