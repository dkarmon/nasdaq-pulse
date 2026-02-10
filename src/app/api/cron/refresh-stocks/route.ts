// ABOUTME: Cron job to refresh stocks A-K (~1,579 stocks).
// ABOUTME: Part of the daily refresh cycle (runs at 21:15 UTC / 11:15 PM Israel).

import { NextResponse } from "next/server";
import { refreshStocksInRange } from "@/lib/cron/refresh-stocks";
import { refreshDailyAiBadges } from "@/lib/ai/daily-badges";

export const maxDuration = 300; // 5 minutes (Pro plan)
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Allow Vercel cron or manual trigger
  const isVercelCron = request.headers.get("x-vercel-cron") === "true";
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!isVercelCron && cronSecret && authHeader !== "Bearer " + cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await refreshStocksInRange("A", "K");
  let ai: unknown = null;
  if (result.success) {
    try {
      // Piggyback AI refresh for NASDAQ top-20 (no extra cron job).
      ai = await refreshDailyAiBadges({ exchange: "nasdaq", trigger: "cron", timeBudgetMs: 240_000 });
    } catch (err) {
      ai = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  return NextResponse.json({ ...result, ai }, {
    status: result.success ? 200 : 500,
  });
}
