import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { demoQuotes } from "@/lib/demo-data";

type NormalizedQuote = {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  marketCap: string;
  status: "live" | "stale";
};

const cacheTtl = Number(process.env.CACHE_TTL_QUOTES_SECONDS ?? 60);

const fetchQuotes = unstable_cache(
  async (tickers: string[]) => {
    // TODO: replace with live providers (Finnhub / Twelve Data / Alpha Vantage).
    return tickers.map<NormalizedQuote>((symbol) => {
      const fallback = demoQuotes.find((item) => item.symbol === symbol);
      return (
        fallback ?? {
          symbol,
          price: 0,
          change: 0,
          changePct: 0,
          marketCap: "N/A",
          status: "stale",
        }
      );
    });
  },
  ["quotes-proxy"],
  { revalidate: cacheTtl },
);

export async function GET(request: NextRequest) {
  const tickers = request.nextUrl.searchParams
    .get("tickers")
    ?.split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);

  if (!tickers || tickers.length === 0) {
    return NextResponse.json({ error: "tickers query param is required" }, { status: 400 });
  }

  const quotes = await fetchQuotes(tickers);

  return NextResponse.json({
    data: quotes,
    lastUpdated: new Date().toISOString(),
  });
}
