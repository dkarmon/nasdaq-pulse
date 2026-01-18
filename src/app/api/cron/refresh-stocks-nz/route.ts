// ABOUTME: Cron job to refresh stocks N-Z from Finnhub.
// ABOUTME: Part of the daily refresh cycle (runs at 00:15 UTC / 2:15 AM Israel).

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

  const result = await refreshStocksInRange("N", "Z");

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}
