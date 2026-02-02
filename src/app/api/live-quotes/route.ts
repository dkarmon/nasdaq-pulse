// ABOUTME: API endpoint for fetching live stock quotes with intraday change.
// ABOUTME: Returns current price, open price, and intraday change percentage for each symbol.

import { NextRequest, NextResponse } from "next/server";
import { getBatchQuotes } from "@/lib/market-data/yahoo";

export type LiveQuote = {
  symbol: string;
  price: number;
  open: number;
  change: number;
  changePercent: number;
};

export type LiveQuotesResponse = {
  quotes: LiveQuote[];
  fetchedAt: string;
};

const MAX_SYMBOLS = 500;

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

  // Fetch quotes in batches of 20 (vs individual requests)
  const quotesMap = await getBatchQuotes(symbols);

  const quotes: LiveQuote[] = [];
  for (const symbol of symbols) {
    const quote = quotesMap.get(symbol);
    if (quote) {
      // Intraday change: from today's open to current price
      const change = quote.price - quote.open;
      const changePercent =
        quote.open > 0 ? (change / quote.open) * 100 : 0;

      // Use the input symbol (not quote.symbol) to ensure format matches client expectations
      // Yahoo may return TLV symbols without .TA suffix in sparkData.symbol
      quotes.push({
        symbol,
        price: quote.price,
        open: quote.open,
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
