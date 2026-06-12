import { getDb } from "./db";

export const FREE_ORACLE_DAILY_LIMIT = 5;
export const FREE_PROFILE_LIMIT = 1;

interface SubRow {
  customer_id: string;
  stripe_sub_id: string | null;
  tier: "free" | "pro";
  period_end: number | null;
  updated_at: number;
}

export function getSubscription(customerId: string): SubRow | undefined {
  return getDb()
    .prepare("SELECT * FROM subscriptions WHERE customer_id = ?")
    .get(customerId) as SubRow | undefined;
}

export function upsertSubscription(
  customerId: string,
  tier: "free" | "pro",
  stripeSubId: string | null,
  periodEnd: number | null
) {
  getDb()
    .prepare(`
      INSERT INTO subscriptions (customer_id, tier, stripe_sub_id, period_end, updated_at)
      VALUES (?, ?, ?, ?, unixepoch())
      ON CONFLICT (customer_id) DO UPDATE SET
        tier = excluded.tier,
        stripe_sub_id = excluded.stripe_sub_id,
        period_end = excluded.period_end,
        updated_at = unixepoch()
    `)
    .run(customerId, tier, stripeSubId, periodEnd);
}

export function isPro(customerId: string | null | undefined): boolean {
  // Stripe not configured — open access (dev / pre-launch)
  if (!process.env.STRIPE_SECRET_KEY) return true;

  if (!customerId) return false;
  const sub = getSubscription(customerId);
  if (!sub || sub.tier !== "pro") return false;
  if (sub.period_end && sub.period_end < Math.floor(Date.now() / 1000)) return false;
  return true;
}

export function getOracleUsageToday(customerId: string): number {
  const today = new Date().toISOString().split("T")[0];
  const row = getDb()
    .prepare("SELECT count FROM oracle_usage WHERE customer_id = ? AND date = ?")
    .get(customerId, today) as { count: number } | undefined;
  return row?.count ?? 0;
}

export function incrementOracleUsage(customerId: string): void {
  const today = new Date().toISOString().split("T")[0];
  getDb()
    .prepare(`
      INSERT INTO oracle_usage (customer_id, date, count) VALUES (?, ?, 1)
      ON CONFLICT (customer_id, date) DO UPDATE SET count = count + 1
    `)
    .run(customerId, today);
}
