// ABOUTME: Status endpoint showing data refresh health and history.
// ABOUTME: Returns last update time, stock count, and recent run history.

import { NextResponse } from "next/server";
import { getLastUpdated, getStockCount, getRunHistory } from "@/lib/market-data/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [lastUpdated, stockCount, runHistory] = await Promise.all([
      getLastUpdated(),
      getStockCount(),
      getRunHistory(),
    ]);

    // Calculate data age
    let dataAgeHours: number | null = null;
    if (lastUpdated) {
      const ageMs = Date.now() - new Date(lastUpdated).getTime();
      dataAgeHours = Math.round((ageMs / (1000 * 60 * 60)) * 10) / 10;
    }

    // Check if data is stale (older than 26 hours)
    const isStale = dataAgeHours === null || dataAgeHours > 26;

    return NextResponse.json({
      status: isStale ? "stale" : "healthy",
      data: {
        lastUpdated,
        dataAgeHours,
        stockCount,
        isStale,
      },
      recentRuns: runHistory,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: String(error),
      },
      { status: 500 }
    );
  }
}
