// ABOUTME: API route returning screener data for NASDAQ stocks with growth metrics.
// ABOUTME: Supports sorting by 1M/6M/12M growth and filtering by minimum growth thresholds.

import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getScreenerData } from "@/lib/market-data/mock";
import type {
  ScreenerParams,
  SortPeriod,
  FilterPreset,
  ScreenerResponse,
} from "@/lib/market-data/types";

const cacheTtl = Number(process.env.CACHE_TTL_SCREENER_SECONDS ?? 3600);

function parseFilterPreset(value: string | null): FilterPreset {
  if (value === "5" || value === "10" || value === "25") {
    return value;
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

const fetchScreenerData = unstable_cache(
  async (params: ScreenerParams): Promise<ScreenerResponse> => {
    return getScreenerData(params);
  },
  ["screener-data"],
  { revalidate: cacheTtl }
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const params: ScreenerParams = {
    sortBy: parseSortPeriod(searchParams.get("sortBy")),
    limit: parseLimit(searchParams.get("limit")),
    filters: {
      min1m: parseFilterPreset(searchParams.get("min1m")),
      min6m: parseFilterPreset(searchParams.get("min6m")),
      min12m: parseFilterPreset(searchParams.get("min12m")),
    },
  };

  const data = await fetchScreenerData(params);

  return NextResponse.json(data);
}
