// ABOUTME: Batch API route for latest AI recommendation badges by symbol.
// ABOUTME: Used as a fallback when a visible top-25 row is missing a daily badge row.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { Recommendation } from "@/lib/ai/types";

type BadgeResponse = {
  recommendation: Recommendation;
  generatedAt: string;
};

function parseSymbols(value: string | null): string[] {
  if (!value) return [];
  const parts = value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  // Avoid overly large fan-out requests.
  return Array.from(new Set(parts)).slice(0, 50);
}

export async function GET(request: NextRequest) {
  const symbols = parseSymbols(request.nextUrl.searchParams.get("symbols"));
  if (symbols.length === 0) {
    return NextResponse.json({ badges: {} as Record<string, BadgeResponse> });
  }

  const supabase = createAdminClient();
  const badges: Record<string, BadgeResponse> = {};

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      const { data, error } = await supabase
        .from("stock_analyses")
        .select("recommendation,generated_at")
        .eq("symbol", symbol)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data?.recommendation || !data?.generated_at) return null;
      return {
        symbol,
        recommendation: data.recommendation as Recommendation,
        generatedAt: data.generated_at as string,
      };
    })
  );

  for (const row of results) {
    if (!row) continue;
    badges[row.symbol] = {
      recommendation: row.recommendation,
      generatedAt: row.generatedAt,
    };
  }

  return NextResponse.json({ badges });
}
