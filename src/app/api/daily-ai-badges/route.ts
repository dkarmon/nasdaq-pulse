// ABOUTME: Returns today's daily AI badge set (top-20 membership) for the requested exchange.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { Exchange } from "@/lib/market-data/types";

function parseExchange(value: string | null): Exchange {
  return value?.toLowerCase() === "tlv" ? "tlv" : "nasdaq";
}

function utcRunDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const exchange = parseExchange(request.nextUrl.searchParams.get("exchange"));
  const runDate = utcRunDateString();

  const supabase = createAdminClient();

  const { data: run, error: runError } = await supabase
    .from("daily_ai_runs")
    .select("id,formula_id,formula_version,status,completed_at")
    .eq("exchange", exchange)
    .eq("run_date", runDate)
    .maybeSingle();

  if (runError) {
    return NextResponse.json({ error: runError.message }, { status: 500 });
  }

  if (!run?.id) {
    return NextResponse.json({
      runDate,
      exchange,
      formulaId: null,
      badges: {},
    });
  }

  const { data: badges, error: badgeError } = await supabase
    .from("daily_ai_badges")
    .select("symbol,recommendation,generated_at,analysis_id")
    .eq("run_id", run.id);

  if (badgeError) {
    return NextResponse.json({ error: badgeError.message }, { status: 500 });
  }

  const map: Record<string, { recommendation: string; generatedAt: string; analysisId: string }> = {};
  for (const row of (badges ?? []) as any[]) {
    map[String(row.symbol).toUpperCase()] = {
      recommendation: row.recommendation,
      generatedAt: row.generated_at,
      analysisId: row.analysis_id,
    };
  }

  return NextResponse.json({
    runDate,
    exchange,
    formulaId: run.formula_id ?? null,
    badges: map,
    status: run.status ?? null,
    completedAt: run.completed_at ?? null,
  });
}

