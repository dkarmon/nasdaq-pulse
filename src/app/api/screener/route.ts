// ABOUTME: API route returning screener data with growth metrics.
// ABOUTME: Supports NASDAQ and TLV exchanges, sorting, and omit rules filtering.

import { NextRequest, NextResponse } from "next/server";
import { getStocks, getLastUpdated } from "@/lib/market-data/storage";
import { getScreenerData as getMockScreenerData } from "@/lib/market-data/mock";
import type {
  Stock,
  ScreenerParams,
  SortPeriod,
  ScreenerResponse,
  Exchange,
} from "@/lib/market-data/types";
import { fetchActiveFormula, summarizeFormula, fetchEffectiveOmitRules } from "@/lib/recommendations/server";
import { createClient } from "@/lib/supabase/server";
import { filterAndSortByRecommendation, scoreStocksWithFormula } from "@/lib/market-data/recommendation";
import { applyOmitRules } from "@/lib/market-data/omit-rules";

function parseSortPeriod(value: string | null): SortPeriod {
  if (
    value === "score" ||
    value === "intraday" ||
    value === "1d" ||
    value === "5d" ||
    value === "1m" ||
    value === "6m" ||
    value === "12m" ||
    value === "az"
  ) {
    return value;
  }
  return "1m";
}

function parseLimit(value: string | null): number {
  const parsed = parseInt(value ?? "50", 10);
  if (isNaN(parsed) || parsed < 1) {
    return 50;
  }
  // Allow standard presets or any value up to 10000 for recommended mode
  if (parsed <= 10000) {
    return parsed;
  }
  return 50;
}

function parseExchange(value: string | null): Exchange {
  if (value?.toLowerCase() === "tlv") {
    return "tlv";
  }
  return "nasdaq";
}

function parseBoolean(value: string | null): boolean {
  return value === "true" || value === "1";
}

function sortStocks(stocks: Stock[], sortBy: SortPeriod): Stock[] {
  const sorted = [...stocks];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "score":
      case "intraday":
        return b.growth1m - a.growth1m;
      case "1d": return (b.growth1d ?? 0) - (a.growth1d ?? 0);
      case "5d": return (b.growth5d ?? 0) - (a.growth5d ?? 0);
      case "1m": return b.growth1m - a.growth1m;
      case "6m": return b.growth6m - a.growth6m;
      case "12m": return b.growth12m - a.growth12m;
      case "az": {
        const aName = a.symbol.endsWith(".TA") ? (a.nameHebrew || a.name) : a.name;
        const bName = b.symbol.endsWith(".TA") ? (b.nameHebrew || b.name) : b.name;
        return (aName || a.symbol).localeCompare(bName || b.symbol, undefined, { sensitivity: "base" });
      }
      default: return b.growth1m - a.growth1m;
    }
  });
  return sorted;
}

async function fetchScreenerData(params: ScreenerParams, search?: string, userId?: string | null): Promise<ScreenerResponse> {
  const exchange = params.exchange;
  const recommendedOnly = params.recommendedOnly === true;
  const includeScores = params.includeScores === true;

  // Fetch effective omit rules for user (or admin defaults if no user)
  const omitRules = await fetchEffectiveOmitRules(userId ?? null);

  // Try to get data from Redis first
  const stocks = await getStocks(exchange);
  const lastUpdated = await getLastUpdated(exchange);

  if (stocks.length > 0) {
    let filtered = stocks;

    // Apply search filter (matches symbol, name, or Hebrew name)
    if (search && search.length > 0) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(stock => {
        const baseSymbol = stock.symbol.replace(/\.TA$/, "").toLowerCase();
        const symbolLower = stock.symbol.toLowerCase();
        const nameLower = (stock.name || "").toLowerCase();
        const nameHebrewLower = (stock.nameHebrew || "").toLowerCase();

        return symbolLower.includes(searchLower) ||
               baseSymbol.includes(searchLower) ||
               nameLower.includes(searchLower) ||
               nameHebrewLower.includes(searchLower);
      });
    }

    filtered = applyOmitRules(filtered, omitRules, exchange);
    filtered = sortStocks(filtered, params.sortBy);

    const activeFormula = await fetchActiveFormula(exchange, { fallbackToDefault: true });
    let recommendationApplied: Stock[] = filtered;

    if (recommendedOnly) {
      recommendationApplied = filterAndSortByRecommendation(filtered, activeFormula ?? undefined);
      recommendationApplied = recommendationApplied.slice(0, params.limit);
    } else if (includeScores) {
      recommendationApplied = scoreStocksWithFormula(filtered, activeFormula ?? undefined);
      recommendationApplied = recommendationApplied.slice(0, params.limit);
    } else {
      recommendationApplied = filtered.slice(0, params.limit);
    }

    return {
      stocks: recommendationApplied,
      updatedAt: lastUpdated ?? new Date().toISOString(),
      source: "live",
      exchange,
      recommendation: {
        activeFormula: summarizeFormula(activeFormula ?? null),
      },
    };
  }

  // Fall back to mock data if Redis is empty (only for NASDAQ)
  if (exchange === "nasdaq") {
    const response = await getMockScreenerData(params);
    const activeFormula = await fetchActiveFormula(exchange, { fallbackToDefault: true });
    let mockStocks = applyOmitRules(response.stocks, omitRules, exchange);

    if (recommendedOnly) {
      mockStocks = filterAndSortByRecommendation(mockStocks, activeFormula ?? undefined).slice(0, params.limit);
    } else if (includeScores) {
      mockStocks = scoreStocksWithFormula(mockStocks, activeFormula ?? undefined).slice(0, params.limit);
    }

    return {
      ...response,
      recommendation: {
        activeFormula: summarizeFormula(activeFormula ?? null),
      },
      stocks: mockStocks,
    };
  }

  // Return empty for TLV if no data
  return {
    stocks: [],
    updatedAt: new Date().toISOString(),
    source: "cached",
    exchange,
    recommendation: {
      activeFormula: summarizeFormula(await fetchActiveFormula(exchange, { fallbackToDefault: true })),
    },
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Get user ID for omit rules (optional - guest users get admin defaults)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  const params: ScreenerParams = {
    sortBy: parseSortPeriod(searchParams.get("sortBy")),
    limit: parseLimit(searchParams.get("limit")),
    exchange: parseExchange(searchParams.get("exchange")),
    recommendedOnly: parseBoolean(searchParams.get("recommendedOnly")),
    includeScores: parseBoolean(searchParams.get("includeScores")),
  };

  const search = searchParams.get("search") ?? undefined;
  const data = await fetchScreenerData(params, search, userId);

  return NextResponse.json(data);
}
