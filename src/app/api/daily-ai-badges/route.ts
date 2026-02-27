// ABOUTME: Returns daily AI badge set (top-25 membership) for the requested exchange.
// ABOUTME: Prefers today's run, then falls back to latest successful run with badges.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { Exchange } from "@/lib/market-data/types";

export const dynamic = "force-dynamic";

function parseExchange(value: string | null): Exchange {
  return value?.toLowerCase() === "tlv" ? "tlv" : "nasdaq";
}

function utcRunDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

type DailyRunRow = {
  id: string;
  run_date: string;
  formula_id: string | null;
  status: "running" | "ok" | "partial" | "failed" | null;
  completed_at: string | null;
  started_at: string | null;
  created_at: string | null;
};

type BadgeMap = Record<string, { recommendation: string; generatedAt: string; analysisId: string }>;

function statusPriority(status: DailyRunRow["status"]): number {
  if (status === "ok") return 0;
  if (status === "partial") return 1;
  if (status === "running") return 2;
  return 3;
}

function sortTodayRuns(runs: DailyRunRow[]): DailyRunRow[] {
  return [...runs].sort((a, b) => {
    const byStatus = statusPriority(a.status) - statusPriority(b.status);
    if (byStatus !== 0) return byStatus;
    const aTs = a.completed_at ?? a.started_at ?? a.created_at ?? "";
    const bTs = b.completed_at ?? b.started_at ?? b.created_at ?? "";
    return bTs.localeCompare(aTs);
  });
}

async function fetchBadgesForRun(supabase: ReturnType<typeof createAdminClient>, runId: string): Promise<{
  map: BadgeMap;
  error: string | null;
}> {
  const { data: badges, error } = await supabase
    .from("daily_ai_badges")
    .select("symbol,recommendation,generated_at,analysis_id")
    .eq("run_id", runId);

  if (error) {
    return { map: {}, error: error.message };
  }

  const map: BadgeMap = {};
  for (const row of (badges ?? []) as any[]) {
    map[String(row.symbol).toUpperCase()] = {
      recommendation: row.recommendation,
      generatedAt: row.generated_at,
      analysisId: row.analysis_id,
    };
  }

  return { map, error: null };
}

export async function GET(request: NextRequest) {
  const exchange = parseExchange(request.nextUrl.searchParams.get("exchange"));
  const requestedRunDate = utcRunDateString();

  const supabase = createAdminClient();

  const { data: todayRunsData, error: todayRunsError } = await supabase
    .from("daily_ai_runs")
    .select("id,run_date,formula_id,status,completed_at,started_at,created_at")
    .eq("exchange", exchange)
    .eq("run_date", requestedRunDate)
    .order("started_at", { ascending: false })
    .limit(5);

  if (todayRunsError) {
    return NextResponse.json({ error: todayRunsError.message }, { status: 500 });
  }

  const todayRuns = sortTodayRuns((todayRunsData ?? []) as DailyRunRow[]);
  const triedRunIds = new Set<string>();

  for (const run of todayRuns) {
    triedRunIds.add(run.id);
    const { map, error } = await fetchBadgesForRun(supabase, run.id);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }
    if (Object.keys(map).length > 0) {
      return NextResponse.json({
        runDate: run.run_date,
        requestedRunDate,
        exchange,
        formulaId: run.formula_id ?? null,
        badges: map,
        status: run.status ?? null,
        completedAt: run.completed_at ?? null,
      });
    }
  }

  const { data: fallbackRunsData, error: fallbackRunsError } = await supabase
    .from("daily_ai_runs")
    .select("id,run_date,formula_id,status,completed_at,started_at,created_at")
    .eq("exchange", exchange)
    .in("status", ["ok", "partial"])
    .order("run_date", { ascending: false })
    .order("completed_at", { ascending: false })
    .limit(10);

  if (fallbackRunsError) {
    return NextResponse.json({ error: fallbackRunsError.message }, { status: 500 });
  }

  for (const run of (fallbackRunsData ?? []) as DailyRunRow[]) {
    if (triedRunIds.has(run.id)) continue;
    const { map, error } = await fetchBadgesForRun(supabase, run.id);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }
    if (Object.keys(map).length > 0) {
      return NextResponse.json({
        runDate: run.run_date,
        requestedRunDate,
        exchange,
        formulaId: run.formula_id ?? null,
        badges: map,
        status: run.status ?? null,
        completedAt: run.completed_at ?? null,
      });
    }
  }

  return NextResponse.json({
    runDate: requestedRunDate,
    requestedRunDate,
    exchange,
    formulaId: null,
    badges: {},
    status: null,
    completedAt: null,
  });
}
