// ABOUTME: On-demand refresh of daily AI badges for the current top-25 recommended stocks.
// ABOUTME: Called by the client on app load so analyst data stays fresh when the active formula changes.

import { NextRequest, NextResponse } from "next/server";
import { refreshDailyAiBadges } from "@/lib/ai/daily-badges";
import type { Exchange } from "@/lib/market-data/types";

export const maxDuration = 300; // 5 minutes (Pro plan)
export const dynamic = "force-dynamic";

function parseExchange(value: unknown): Exchange {
  return typeof value === "string" && value.toLowerCase() === "tlv" ? "tlv" : "nasdaq";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const exchange = parseExchange((body as { exchange?: unknown }).exchange);

    const result = await refreshDailyAiBadges({
      exchange,
      trigger: "manual",
      timeBudgetMs: 240_000,
    });

    return NextResponse.json({
      ok: true,
      exchange,
      runDate: result.runDate,
      added: result.added,
      skipped: result.skipped,
      removed: result.removed,
      failed: result.failed,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
