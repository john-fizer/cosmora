import { NextRequest, NextResponse } from "next/server";
import { isPro, getOracleUsageToday, FREE_ORACLE_DAILY_LIMIT } from "@/lib/subscription";

export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get("customerId");
  if (!customerId) return NextResponse.json({ tier: "free", oracleUsed: 0, oracleLimit: FREE_ORACLE_DAILY_LIMIT });

  const pro = isPro(customerId);
  const oracleUsed = getOracleUsageToday(customerId);

  return NextResponse.json({
    tier: pro ? "pro" : "free",
    oracleUsed,
    // Infinity would serialize to null over JSON (JSON has no representation
    // for it), silently breaking any oracleUsed < oracleLimit or
    // oracleLimit - oracleUsed arithmetic a future UI adds. A large finite
    // sentinel survives the round-trip and behaves identically in practice.
    oracleLimit: pro ? Number.MAX_SAFE_INTEGER : FREE_ORACLE_DAILY_LIMIT,
  });
}
