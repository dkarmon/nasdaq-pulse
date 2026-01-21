// ABOUTME: API endpoint for fetching live stock quotes with intraday change.
// ABOUTME: Returns current price, previous close, and change percentage for each symbol.

import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/market-data/yahoo";

export type LiveQuote = {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
};

export type LiveQuotesResponse = {
  quotes: LiveQuote[];
  fetchedAt: string;
};

const MAX_SYMBOLS = 50;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const symbolsParam = request.nextUrl.searchParams.get("symbols");

  if (!symbolsParam) {
    return NextResponse.json(
      { error: "symbols query parameter is required" },
      { status: 400 }
    );
  }

  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, MAX_SYMBOLS);

  if (symbols.length === 0) {
    return NextResponse.json(
      { error: "symbols query parameter is required" },
      { status: 400 }
    );
  }

  const quotes: LiveQuote[] = [];

  // Fetch quotes in parallel
  const results = await Promise.all(symbols.map((symbol) => getQuote(symbol)));

  for (const result of results) {
    if (result) {
      const change = result.price - result.previousClose;
      const changePercent =
        result.previousClose > 0
          ? (change / result.previousClose) * 100
          : 0;

      quotes.push({
        symbol: result.symbol,
        price: result.price,
        previousClose: result.previousClose,
        change,
        changePercent,
      });
    }
  }

  const response: LiveQuotesResponse = {
    quotes,
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
