// ABOUTME: Cron job to refresh NASDAQ stocks L-Z (~1,536 stocks) and TLV stocks (~491 stocks).
// ABOUTME: Part of the daily refresh cycle (runs at 21:25 UTC / 11:25 PM Israel).

import { NextResponse } from "next/server";
import { refreshStocksInRange, refreshTlvStocks } from "@/lib/cron/refresh-stocks";
import { refreshDailyAiBadges } from "@/lib/ai/daily-badges";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const isVercelCron = request.headers.get("x-vercel-cron") === "true";
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!isVercelCron && cronSecret && authHeader !== "Bearer " + cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nasdaqResult = await refreshStocksInRange("L", "Z");
  const tlvResult = await refreshTlvStocks();

  const success = nasdaqResult.success && tlvResult.success;
  let ai: unknown = null;
  if (tlvResult.success) {
    try {
      // Piggyback AI refresh for TLV top-25 (no extra cron job).
      ai = await refreshDailyAiBadges({ exchange: "tlv", trigger: "cron", timeBudgetMs: 240_000 });
    } catch (err) {
      ai = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  return NextResponse.json({
    nasdaq: nasdaqResult,
    tlv: tlvResult,
    success,
    ai,
  }, {
    status: success ? 200 : 500,
  });
}
