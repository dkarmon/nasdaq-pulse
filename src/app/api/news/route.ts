import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { demoNews } from "@/lib/demo-data";

const cacheTtl = Number(process.env.CACHE_TTL_QUOTES_SECONDS ?? 300);

const fetchNews = unstable_cache(
  async (symbol: string) => {
    // TODO: replace with live provider (Finnhub / MarketAux / NewsAPI).
    return demoNews.map((item) => ({
      ...item,
      symbol,
    }));
  },
  ["news-proxy"],
  { revalidate: cacheTtl },
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "AAPL";
  const news = await fetchNews(symbol);

  return NextResponse.json({
    data: news,
    lastUpdated: new Date().toISOString(),
  });
}
