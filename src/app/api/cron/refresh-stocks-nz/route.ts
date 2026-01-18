// ABOUTME: Cron job to refresh stocks L-Z (~1,536 stocks).
// ABOUTME: Part of the daily refresh cycle (runs at 21:25 UTC / 11:25 PM Israel).

import { NextResponse } from "next/server";
import { refreshStocksInRange } from "@/lib/cron/refresh-stocks";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const isVercelCron = request.headers.get("x-vercel-cron") === "true";
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!isVercelCron && cronSecret && authHeader !== "Bearer " + cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await refreshStocksInRange("L", "Z");

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}
