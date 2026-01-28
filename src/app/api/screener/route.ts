// ABOUTME: API route returning screener data with growth metrics.
// ABOUTME: Supports NASDAQ and TLV exchanges, sorting, and filtering by maximum growth thresholds.

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
import { fetchActiveFormula, summarizeFormula } from "@/lib/recommendations/server";
import { filterAndSortByRecommendation, scoreStocksWithFormula } from "@/lib/market-data/recommendation";

function parseMinPrice(value: string | null): number | null {
  if (!value || value === "null" || value === "") {
    return null;
  }
  const num = parseFloat(value);
  if (!isNaN(num) && num > 0) {
    return num;
  }
  return null;
}

function parseSortPeriod(value: string | null): SortPeriod {
  if (value === "1d" || value === "5d" || value === "6m" || value === "12m" || value === "az") {
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
  if (value === "tlv") {
    return "tlv";
  }
  return "nasdaq";
}

function parseBoolean(value: string | null): boolean {
  return value === "true" || value === "1";
}

function applyFilters(stocks: Stock[], params: ScreenerParams): Stock[] {
  const minPrice = params.filters.minPrice;

  if (minPrice === null) {
    return stocks;
  }

  return stocks.filter((stock) => stock.price >= minPrice);
}

function sortStocks(stocks: Stock[], sortBy: SortPeriod): Stock[] {
  const sorted = [...stocks];
  sorted.sort((a, b) => {
    switch (sortBy) {
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

async function fetchScreenerData(params: ScreenerParams, search?: string): Promise<ScreenerResponse> {
  const exchange = params.exchange;
  const recommendedOnly = (params as any).recommendedOnly === true;
  const includeScores = (params as any).includeScores === true;

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

    filtered = applyFilters(filtered, params);
    filtered = sortStocks(filtered, params.sortBy);

    const activeFormula = await fetchActiveFormula({ fallbackToDefault: true });
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
    const activeFormula = await fetchActiveFormula({ fallbackToDefault: true });
    return {
      ...response,
      recommendation: {
        activeFormula: summarizeFormula(activeFormula ?? null),
      },
      stocks: recommendedOnly
        ? filterAndSortByRecommendation(response.stocks, activeFormula ?? undefined).slice(0, params.limit)
        : includeScores
          ? scoreStocksWithFormula(response.stocks, activeFormula ?? undefined).slice(0, params.limit)
          : response.stocks,
    };
  }

  // Return empty for TLV if no data
  return {
    stocks: [],
    updatedAt: new Date().toISOString(),
    source: "cached",
    exchange,
    recommendation: {
      activeFormula: summarizeFormula(await fetchActiveFormula({ fallbackToDefault: true })),
    },
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const params: ScreenerParams = {
    sortBy: parseSortPeriod(searchParams.get("sortBy")),
    limit: parseLimit(searchParams.get("limit")),
    filters: {
      minPrice: parseMinPrice(searchParams.get("minPrice")),
    },
    exchange: parseExchange(searchParams.get("exchange")),
  };
  const recommendedOnly = parseBoolean(searchParams.get("recommendedOnly"));
  const includeScores = parseBoolean(searchParams.get("includeScores"));

  const search = searchParams.get("search") ?? undefined;
  const data = await fetchScreenerData(
    { ...params, ...(recommendedOnly ? { recommendedOnly: true } : {}), ...(includeScores ? { includeScores: true } : {}) } as ScreenerParams,
    search
  );

  return NextResponse.json(data);
}
