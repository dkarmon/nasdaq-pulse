// ABOUTME: API route for AI-powered stock analysis generation and retrieval.
// ABOUTME: GET fetches latest analysis for a symbol, POST generates a new one.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStockDetail } from "@/lib/market-data";
import { generateStockAnalysis, type StockMetrics } from "@/lib/ai/gemini";
import type { StockAnalysis, NewsSource } from "@/lib/ai/types";
import type { Exchange } from "@/lib/market-data/types";

function getExchangeFromSymbol(symbol: string): Exchange {
  return symbol.toUpperCase().endsWith(".TA") ? "tlv" : "nasdaq";
}

function utcRunDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

type RouteParams = {
  params: Promise<{ symbol: string }>;
};

function mapDbToAnalysis(row: {
  id: string;
  symbol: string;
  recommendation: string;
  analysis_en: string;
  analysis_he: string;
  news_sources: NewsSource[];
  news_count: number;
  model_version: string;
  generated_at: string;
}): StockAnalysis {
  return {
    id: row.id,
    symbol: row.symbol,
    recommendation: row.recommendation as StockAnalysis["recommendation"],
    analysisEn: row.analysis_en,
    analysisHe: row.analysis_he,
    newsSources: row.news_sources,
    newsCount: row.news_count,
    modelVersion: row.model_version,
    generatedAt: row.generated_at,
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { symbol } = await params;

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  const upperSymbol = symbol.toUpperCase();
  const exchange = getExchangeFromSymbol(upperSymbol);
  const runDate = utcRunDateString();

  const supabase = await createClient();

  // Prefer today's daily badge analysis if present (top-20 membership).
  const { data: run } = await supabase
    .from("daily_ai_runs")
    .select("id")
    .eq("exchange", exchange)
    .eq("run_date", runDate)
    .maybeSingle();

  if (run?.id) {
    const { data: badge } = await supabase
      .from("daily_ai_badges")
      .select("analysis_id")
      .eq("run_id", run.id)
      .eq("symbol", upperSymbol)
      .maybeSingle();

    if (badge?.analysis_id) {
      const { data: dailyRow } = await supabase
        .from("stock_analyses")
        .select("*")
        .eq("id", badge.analysis_id)
        .single();

      if (dailyRow) {
        return NextResponse.json({
          analysis: mapDbToAnalysis(dailyRow),
          meta: { source: "daily", runDate },
        });
      }
    }
  }

  const { data, error } = await supabase
    .from("stock_analyses")
    .select("*")
    .eq("symbol", upperSymbol)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ analysis: null, meta: { source: "none", runDate } });
  }

  return NextResponse.json({ analysis: mapDbToAnalysis(data), meta: { source: "latest", runDate } });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { symbol } = await params;

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  const upperSymbol = symbol.toUpperCase();

  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check rate limit settings
  const { data: settings } = await supabase
    .from("recommendation_settings")
    .select("ai_rate_limit_enabled, ai_rate_limit_seconds")
    .single();

  if (settings?.ai_rate_limit_enabled && settings.ai_rate_limit_seconds > 0) {
    const cutoff = new Date(
      Date.now() - settings.ai_rate_limit_seconds * 1000
    ).toISOString();

    const { data: recentAnalysis } = await supabase
      .from("stock_analyses")
      .select("generated_at")
      .eq("symbol", upperSymbol)
      .gte("generated_at", cutoff)
      .limit(1)
      .single();

    if (recentAnalysis) {
      return NextResponse.json(
        {
          error: "Rate limit reached. Please try again later.",
          code: "RATE_LIMIT",
        },
        { status: 429 }
      );
    }
  }

  // Fetch stock detail for metrics
  const stockDetail = await getStockDetail(upperSymbol);
  if (!stockDetail) {
    return NextResponse.json(
      { error: "Stock not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Build metrics from stock detail
  const isTLV = upperSymbol.endsWith(".TA");
  const metrics: StockMetrics = {
    price: stockDetail.quote.price,
    currency: isTLV ? "ILS" : "USD",
    marketCap: stockDetail.profile.marketCap,
    sector: stockDetail.profile.sector,
    industry: stockDetail.profile.industry,
    growth1d: stockDetail.growth1d,
    growth5d: stockDetail.growth5d,
    growth1m: stockDetail.growth1m,
    growth3m: stockDetail.growth3m,
    growth6m: stockDetail.growth6m,
    growth12m: stockDetail.growth12m,
    description: stockDetail.profile.description,
  };

  const companyName = stockDetail.profile.name || upperSymbol;

  // Generate analysis with Gemini (uses Google Search grounding)
  let result;
  try {
    result = await generateStockAnalysis(upperSymbol, companyName, metrics);
  } catch (err) {
    console.error("Gemini analysis error:", err);
    return NextResponse.json(
      {
        error: "Failed to generate analysis",
        code: "AI_ERROR",
      },
      { status: 500 }
    );
  }

  // Insert into database
  const { data: inserted, error: insertError } = await supabase
    .from("stock_analyses")
    .insert({
      symbol: upperSymbol,
      recommendation: result.analysis.recommendation,
      analysis_en: result.analysis.english,
      analysis_he: result.analysis.hebrew,
      news_sources: [],
      news_count: 0,
      model_version: result.modelVersion,
      generated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error("Insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to save analysis" },
      { status: 500 }
    );
  }

  return NextResponse.json({ analysis: mapDbToAnalysis(inserted) });
}
