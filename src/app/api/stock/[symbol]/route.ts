// ABOUTME: API route returning detailed stock information for a specific symbol.
// ABOUTME: Includes company profile, current quote, and historical price data.

import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getStockDetail } from "@/lib/market-data";

const cacheTtl = Number(process.env.CACHE_TTL_STOCK_SECONDS ?? 300);

type RouteParams = {
  params: Promise<{ symbol: string }>;
};

const fetchStockDetail = unstable_cache(
  async (symbol: string) => {
    return getStockDetail(symbol);
  },
  ["stock-detail"],
  { revalidate: cacheTtl }
);

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { symbol } = await params;

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol is required" },
      { status: 400 }
    );
  }

  const detail = await fetchStockDetail(symbol.toUpperCase());

  if (!detail) {
    return NextResponse.json(
      { error: "Stock not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(detail);
}
