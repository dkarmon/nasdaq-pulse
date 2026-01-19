// ABOUTME: API route returning screener data with growth metrics.
// ABOUTME: Supports NASDAQ and TLV exchanges, sorting, and filtering by maximum growth thresholds.

import { NextRequest, NextResponse } from "next/server";
import { getStocks, getLastUpdated } from "@/lib/market-data/storage";
import { getScreenerData as getMockScreenerData } from "@/lib/market-data/mock";
import type {
  Stock,
  ScreenerParams,
  SortPeriod,
  FilterValue,
  ScreenerResponse,
  Exchange,
} from "@/lib/market-data/types";

function parseFilterValue(value: string | null): FilterValue {
  if (!value || value === "any") {
    return "any";
  }
  if (value === "5" || value === "10" || value === "25") {
    return value;
  }
  const num = parseFloat(value);
  if (!isNaN(num)) {
    return num;
  }
  return "any";
}

function parseSortPeriod(value: string | null): SortPeriod {
  if (value === "5d" || value === "6m" || value === "12m") {
    return value;
  }
  return "1m";
}

function parseLimit(value: string | null): number {
  const parsed = parseInt(value ?? "50", 10);
  if (parsed === 25 || parsed === 50 || parsed === 100) {
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
  const filterValue = (value: FilterValue): number => {
    if (value === "any") return Infinity;
    if (typeof value === "number") return value;
    return parseFloat(value);
  };

  const max5d = filterValue(params.filters.max5d);
  const max1m = filterValue(params.filters.max1m);
  const max6m = filterValue(params.filters.max6m);
  const max12m = filterValue(params.filters.max12m);

  return stocks.filter((stock) =>
    (stock.growth5d ?? 0) <= max5d &&
    stock.growth1m <= max1m &&
    stock.growth6m <= max6m &&
    stock.growth12m <= max12m
  );
}

function sortStocks(stocks: Stock[], sortBy: SortPeriod): Stock[] {
  const sorted = [...stocks];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "5d": return (b.growth5d ?? 0) - (a.growth5d ?? 0);
      case "1m": return b.growth1m - a.growth1m;
      case "6m": return b.growth6m - a.growth6m;
      case "12m": return b.growth12m - a.growth12m;
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

    // Apply search filter first (matches symbol prefix)
    if (search && search.length > 0) {
      const searchUpper = search.toUpperCase();
      // For TLV, symbols have .TA suffix, so match with or without it
      filtered = filtered.filter(stock => {
        const baseSymbol = stock.symbol.replace(/\.TA$/, "");
        return stock.symbol.startsWith(searchUpper) || baseSymbol.startsWith(searchUpper);
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
      max5d: parseFilterValue(searchParams.get("max5d")),
      max1m: parseFilterValue(searchParams.get("max1m")),
      max6m: parseFilterValue(searchParams.get("max6m")),
      max12m: parseFilterValue(searchParams.get("max12m")),
    },
    exchange: parseExchange(searchParams.get("exchange")),
  };

  const search = searchParams.get("search") ?? undefined;
  const data = await fetchScreenerData(params, search);

  return NextResponse.json(data);
}
