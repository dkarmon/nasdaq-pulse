// ABOUTME: Finnhub API client for fetching stock quotes and company profiles.
// ABOUTME: Used by the daily refresh job to get current market data.

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

type FinnhubQuote = {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High of the day
  l: number;  // Low of the day
  o: number;  // Open
  pc: number; // Previous close
  t: number;  // Timestamp
};

type FinnhubProfile = {
  country: string;
  currency: string;
  exchange: string;
  finnhubIndustry: string;
  ipo: string;
  logo: string;
  marketCapitalization: number; // In millions
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
};

export type QuoteResult = {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  updatedAt: string;
};

export type ProfileResult = {
  symbol: string;
  name: string;
  exchange: string;
  industry: string;
  marketCap: number;
  peRatio: number | null;
  week52High: number;
  week52Low: number;
  logo?: string;
  website?: string;
};

function getApiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    throw new Error("FINNHUB_API_KEY is not set");
  }
  return key;
}

async function fetchWithRetry<T>(url: string, retries = 3): Promise<T | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      if (!response.ok) {
        console.error("Finnhub API error:", response.status, "for", url);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error("Finnhub fetch error (attempt " + (attempt + 1) + "):", error);
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  return null;
}

export async function getQuote(symbol: string): Promise<QuoteResult | null> {
  const url = FINNHUB_BASE_URL + "/quote?symbol=" + symbol + "&token=" + getApiKey();
  const data = await fetchWithRetry<FinnhubQuote>(url);

  if (!data || data.c === 0) {
    return null;
  }

  return {
    symbol,
    price: data.c,
    change: data.d,
    changePct: data.dp,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
    volume: 0, // Finnhub quote endpoint doesn't include volume
    updatedAt: new Date().toISOString(),
  };
}

export async function getCompanyProfile(symbol: string): Promise<ProfileResult | null> {
  const url = FINNHUB_BASE_URL + "/stock/profile2?symbol=" + symbol + "&token=" + getApiKey();
  const data = await fetchWithRetry<FinnhubProfile>(url);

  if (!data || !data.name) {
    return null;
  }

  return {
    symbol,
    name: data.name,
    exchange: data.exchange,
    industry: data.finnhubIndustry,
    marketCap: data.marketCapitalization * 1_000_000,
    peRatio: null, // Would need separate API call for this
    week52High: 0, // Would need separate API call for this
    week52Low: 0,  // Would need separate API call for this
    logo: data.logo,
    website: data.weburl,
  };
}
