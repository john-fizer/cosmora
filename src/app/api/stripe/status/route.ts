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
    oracleLimit: pro ? Infinity : FREE_ORACLE_DAILY_LIMIT,
  });
}
