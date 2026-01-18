// ABOUTME: API route returning screener data for NASDAQ stocks with growth metrics.
// ABOUTME: Supports sorting by 1M/6M/12M growth and filtering by minimum growth thresholds.

import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getStocks, getLastUpdated } from "@/lib/market-data/storage";
import { getScreenerData as getMockScreenerData } from "@/lib/market-data/mock";
import type {
  Stock,
  ScreenerParams,
  SortPeriod,
  FilterValue,
  ScreenerResponse,
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
  if (value === "6m" || value === "12m") {
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

function applyFilters(stocks: Stock[], params: ScreenerParams): Stock[] {
  const filterValue = (value: FilterValue): number => {
    if (value === "any") return -Infinity;
    if (typeof value === "number") return value;
    return parseFloat(value);
  };

  const min1m = filterValue(params.filters.min1m);
  const min6m = filterValue(params.filters.min6m);
  const min12m = filterValue(params.filters.min12m);

  return stocks.filter((stock) =>
    stock.growth1m >= min1m &&
    stock.growth6m >= min6m &&
    stock.growth12m >= min12m
  );
}

function sortStocks(stocks: Stock[], sortBy: SortPeriod): Stock[] {
  const sorted = [...stocks];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "1m": return b.growth1m - a.growth1m;
      case "6m": return b.growth6m - a.growth6m;
      case "12m": return b.growth12m - a.growth12m;
      default: return b.growth1m - a.growth1m;
    }
  });
  return sorted;
}

async function fetchScreenerData(params: ScreenerParams): Promise<ScreenerResponse> {
  // Try to get data from Redis first
  const stocks = await getStocks();
  const lastUpdated = await getLastUpdated();

  if (stocks.length > 0) {
    let filtered = applyFilters(stocks, params);
    filtered = sortStocks(filtered, params.sortBy);
    filtered = filtered.slice(0, params.limit);

    return {
      stocks: filtered,
      updatedAt: lastUpdated ?? new Date().toISOString(),
      source: "live",
    };
  }

  // Fall back to mock data if Redis is empty
  return getMockScreenerData(params);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const params: ScreenerParams = {
    sortBy: parseSortPeriod(searchParams.get("sortBy")),
    limit: parseLimit(searchParams.get("limit")),
    filters: {
      min1m: parseFilterValue(searchParams.get("min1m")),
      min6m: parseFilterValue(searchParams.get("min6m")),
      min12m: parseFilterValue(searchParams.get("min12m")),
    },
  };

  const data = await fetchScreenerData(params);

  return NextResponse.json(data);
}
