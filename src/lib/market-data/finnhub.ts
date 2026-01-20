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

export async function getQuotes(symbols: string[]): Promise<Map<string, QuoteResult>> {
  const results = new Map<string, QuoteResult>();
  const BATCH_SIZE = 30;
  const DELAY_MS = 1000;

  for (let idx = 0; idx < symbols.length; idx += BATCH_SIZE) {
    const batch = symbols.slice(idx, idx + BATCH_SIZE);

    const promises = batch.map(async (symbol) => {
      const quote = await getQuote(symbol);
      if (quote) {
        results.set(symbol, quote);
      }
    });

    await Promise.all(promises);

    if (idx + BATCH_SIZE < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  return results;
}

export async function getProfiles(symbols: string[]): Promise<Map<string, ProfileResult>> {
  const results = new Map<string, ProfileResult>();
  const BATCH_SIZE = 30;
  const DELAY_MS = 1000;

  for (let idx = 0; idx < symbols.length; idx += BATCH_SIZE) {
    const batch = symbols.slice(idx, idx + BATCH_SIZE);

    const promises = batch.map(async (symbol) => {
      const profile = await getCompanyProfile(symbol);
      if (profile) {
        results.set(symbol, profile);
      }
    });

    await Promise.all(promises);

    if (idx + BATCH_SIZE < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  return results;
}

// Alias for backwards compatibility
export const getProfile = getCompanyProfile;

// Historical candle data
type FinnhubCandle = {
  c: number[];  // Close prices
  h: number[];  // High prices
  l: number[];  // Low prices
  o: number[];  // Open prices
  t: number[];  // Timestamps
  v: number[];  // Volumes
  s: string;    // Status: "ok" or "no_data"
};

export type GrowthResult = {
  symbol: string;
  currentPrice: number;
  growth1m: number;
  growth6m: number;
  growth12m: number;
};

export async function getCandles(
  symbol: string,
  fromTimestamp: number,
  toTimestamp: number
): Promise<FinnhubCandle | null> {
  const url = FINNHUB_BASE_URL + "/stock/candle?symbol=" + symbol +
    "&resolution=D&from=" + fromTimestamp + "&to=" + toTimestamp +
    "&token=" + getApiKey();

  const data = await fetchWithRetry<FinnhubCandle>(url);

  if (!data || data.s !== "ok" || !data.c || data.c.length === 0) {
    return null;
  }

  return data;
}

function calculateGrowth(currentPrice: number, pastPrice: number): number {
  if (pastPrice === 0) return 0;
  return ((currentPrice - pastPrice) / pastPrice) * 100;
}

export async function getGrowthData(symbol: string): Promise<GrowthResult | null> {
  const now = Math.floor(Date.now() / 1000);
  const oneYearAgo = now - (365 * 24 * 60 * 60);

  const candles = await getCandles(symbol, oneYearAgo, now);

  if (!candles || candles.c.length === 0) {
    return null;
  }

  const prices = candles.c;
  const currentPrice = prices[prices.length - 1];

  // Find prices at ~1 month, ~6 months, ~12 months ago
  // Daily candles, so ~22 trading days = 1 month, ~126 = 6 months, ~252 = 12 months
  const price1mAgo = prices[Math.max(0, prices.length - 22)] ?? currentPrice;
  const price6mAgo = prices[Math.max(0, prices.length - 126)] ?? currentPrice;
  const price12mAgo = prices[0] ?? currentPrice;

  return {
    symbol,
    currentPrice,
    growth1m: calculateGrowth(currentPrice, price1mAgo),
    growth6m: calculateGrowth(currentPrice, price6mAgo),
    growth12m: calculateGrowth(currentPrice, price12mAgo),
  };
}

// Get all NASDAQ symbols
type FinnhubSymbol = {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
};

export async function getNasdaqSymbols(): Promise<string[]> {
  const url = FINNHUB_BASE_URL + "/stock/symbol?exchange=US&token=" + getApiKey();
  const data = await fetchWithRetry<FinnhubSymbol[]>(url);

  if (!data) {
    return [];
  }

  // Filter for common stocks on NASDAQ (symbol format without dots usually)
  // and exclude ETFs, preferred shares, warrants, etc.
  return data
    .filter(s =>
      s.type === "Common Stock" &&
      !s.symbol.includes(".") &&
      !s.symbol.includes("-") &&
      s.symbol.length <= 5
    )
    .map(s => s.symbol)
    .sort();
}
