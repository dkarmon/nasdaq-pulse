// ABOUTME: Cron job to refresh NASDAQ stocks L-Z (~1,536 stocks) and TLV stocks (~491 stocks).
// ABOUTME: Part of the daily refresh cycle (runs at 21:25 UTC / 11:25 PM Israel).

import { NextResponse } from "next/server";
import { refreshStocksInRange, refreshTlvStocks } from "@/lib/cron/refresh-stocks";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // TODO: Restore auth check after local testing
  // const isVercelCron = request.headers.get("x-vercel-cron") === "true";
  // const cronSecret = process.env.CRON_SECRET;
  // const authHeader = request.headers.get("authorization");

  // if (!isVercelCron && cronSecret && authHeader !== "Bearer " + cronSecret) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  const nasdaqResult = await refreshStocksInRange("L", "Z");
  const tlvResult = await refreshTlvStocks();

  const success = nasdaqResult.success && tlvResult.success;

  return NextResponse.json({
    nasdaq: nasdaqResult,
    tlv: tlvResult,
    success,
  }, {
    status: success ? 200 : 500,
  });
}
