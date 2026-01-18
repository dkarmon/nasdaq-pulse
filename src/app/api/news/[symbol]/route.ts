// ABOUTME: API route returning news articles for a specific stock symbol.
// ABOUTME: Includes headline, source, sentiment, and publish date.

import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getNews } from "@/lib/market-data";

const cacheTtl = Number(process.env.CACHE_TTL_NEWS_SECONDS ?? 1800);

type RouteParams = {
  params: Promise<{ symbol: string }>;
};

const fetchNews = unstable_cache(
  async (symbol: string) => {
    return getNews(symbol);
  },
  ["stock-news"],
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

  const news = await fetchNews(symbol.toUpperCase());

  return NextResponse.json(news);
}
