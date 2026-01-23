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
  if (value === "5d" || value === "6m" || value === "12m" || value === "az") {
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
    filtered = filtered.slice(0, params.limit);

    return {
      stocks: filtered,
      updatedAt: lastUpdated ?? new Date().toISOString(),
      source: "live",
      exchange,
    };
  }

  // Fall back to mock data if Redis is empty (only for NASDAQ)
  if (exchange === "nasdaq") {
    return getMockScreenerData(params);
  }

  // Return empty for TLV if no data
  return {
    stocks: [],
    updatedAt: new Date().toISOString(),
    source: "cached",
    exchange,
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

  const search = searchParams.get("search") ?? undefined;
  const data = await fetchScreenerData(params, search);

  return NextResponse.json(data);
}
