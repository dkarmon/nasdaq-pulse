// ABOUTME: Finnhub API client for real-time quotes and company profiles.
// ABOUTME: Handles rate limiting and error fallback to cached data.

import { finnhubLimiter } from "./rate-limiter";
import type { Quote, CompanyProfile } from "./types";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY ?? "";
const BASE_URL = "https://finnhub.io/api/v1";

async function fetchWithRateLimit<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T | null> {
  if (!FINNHUB_API_KEY) {
    console.warn("FINNHUB_API_KEY not configured");
    return null;
  }

  if (!finnhubLimiter.consumeToken()) {
    console.warn("Finnhub rate limit reached");
    return null;
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("token", FINNHUB_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  try {
    const response = await fetch(url.toString(), {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error(`Finnhub API error: ${response.status}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Finnhub fetch error:", error);
    return null;
  }
}

type FinnhubQuote = {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
};

type FinnhubProfile = {
  country: string;
  currency: string;
  exchange: string;
  finnhubIndustry: string;
  ipo: string;
  logo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
};

export async function getQuote(symbol: string): Promise<Quote | null> {
  const data = await fetchWithRateLimit<FinnhubQuote>("/quote", { symbol });

  if (!data || data.c === 0) {
    return null;
  }

  return {
    symbol,
    price: data.c,
    change: data.d,
    changePct: data.dp,
    open: data.o,
    high: data.h,
    low: data.l,
    previousClose: data.pc,
    volume: 0,
    updatedAt: new Date(data.t * 1000).toISOString(),
  };
}

export async function getCompanyProfile(
  symbol: string
): Promise<CompanyProfile | null> {
  const data = await fetchWithRateLimit<FinnhubProfile>("/stock/profile2", {
    symbol,
  });

  if (!data || !data.name) {
    return null;
  }

  return {
    symbol: data.ticker,
    name: data.name,
    exchange: data.exchange,
    industry: data.finnhubIndustry,
    marketCap: data.marketCapitalization * 1000000,
    peRatio: null,
    week52High: 0,
    week52Low: 0,
    logo: data.logo,
  };
}

export async function getMultipleQuotes(
  symbols: string[]
): Promise<Map<string, Quote>> {
  const results = new Map<string, Quote>();

  for (const symbol of symbols) {
    const quote = await getQuote(symbol);
    if (quote) {
      results.set(symbol, quote);
    }
  }

  return results;
}
