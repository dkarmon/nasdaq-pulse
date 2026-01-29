// ABOUTME: API route for AI-powered stock analysis generation and retrieval.
// ABOUTME: GET fetches latest analysis for a symbol, POST generates a new one.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNews, getCompanyProfile } from "@/lib/market-data";
import { generateStockAnalysis } from "@/lib/ai/gemini";
import type { StockAnalysis, NewsSource } from "@/lib/ai/types";

type RouteParams = {
  params: Promise<{ symbol: string }>;
};

const MIN_NEWS_ARTICLES = 3;

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

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stock_analyses")
    .select("*")
    .eq("symbol", symbol.toUpperCase())
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ analysis: null });
  }

  return NextResponse.json({ analysis: mapDbToAnalysis(data) });
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

  // Fetch news
  const newsResponse = await getNews(upperSymbol);
  const news = newsResponse.items.slice(0, 10);

  if (news.length < MIN_NEWS_ARTICLES) {
    return NextResponse.json(
      {
        error: `Not enough recent news articles to generate analysis. Found ${news.length}, need at least ${MIN_NEWS_ARTICLES}.`,
        code: "INSUFFICIENT_NEWS",
        newsCount: news.length,
      },
      { status: 400 }
    );
  }

  // Get company name
  const profile = await getCompanyProfile(upperSymbol);
  const companyName = profile?.name || upperSymbol;

  // Generate analysis with Gemini
  let result;
  try {
    result = await generateStockAnalysis(upperSymbol, companyName, news);
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

  // Prepare news sources for storage
  const newsSources: NewsSource[] = news.map((item) => ({
    headline: item.headline,
    url: item.url,
    publishedAt: item.publishedAt,
  }));

  // Insert into database
  const { data: inserted, error: insertError } = await supabase
    .from("stock_analyses")
    .insert({
      symbol: upperSymbol,
      recommendation: result.analysis.recommendation,
      analysis_en: result.analysis.english,
      analysis_he: result.analysis.hebrew,
      news_sources: newsSources,
      news_count: news.length,
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
