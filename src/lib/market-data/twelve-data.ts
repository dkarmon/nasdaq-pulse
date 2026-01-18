// ABOUTME: Twelve Data API client for historical time series data.
// ABOUTME: Used to compute 1M/6M/12M growth percentages for the screener.

import { twelveDataLimiter } from "./rate-limiter";
import type { HistoricalDataPoint } from "./types";

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY ?? "";
const BASE_URL = "https://api.twelvedata.com";

async function fetchWithRateLimit<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T | null> {
  if (!TWELVE_DATA_API_KEY) {
    console.warn("TWELVE_DATA_API_KEY not configured");
    return null;
  }

  if (!twelveDataLimiter.consumeToken()) {
    console.warn("Twelve Data rate limit reached");
    return null;
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("apikey", TWELVE_DATA_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  try {
    const response = await fetch(url.toString(), {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 21600 },
    });

    if (!response.ok) {
      console.error(`Twelve Data API error: ${response.status}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Twelve Data fetch error:", error);
    return null;
  }
}

type TwelveDataTimeSeries = {
  meta?: {
    symbol: string;
    interval: string;
    currency: string;
    exchange_timezone: string;
  };
  values?: Array<{
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }>;
  status?: string;
  message?: string;
};

export async function getTimeSeries(
  symbol: string,
  outputSize: number = 365
): Promise<HistoricalDataPoint[] | null> {
  const data = await fetchWithRateLimit<TwelveDataTimeSeries>("/time_series", {
    symbol,
    interval: "1day",
    outputsize: outputSize.toString(),
  });

  if (!data || !data.values || data.status === "error") {
    return null;
  }

  return data.values.map((point) => ({
    date: point.datetime,
    open: parseFloat(point.open),
    high: parseFloat(point.high),
    low: parseFloat(point.low),
    close: parseFloat(point.close),
    volume: parseInt(point.volume, 10),
  }));
}

export function computeGrowth(
  history: HistoricalDataPoint[],
  days: number
): number | null {
  if (history.length < days + 1) {
    return null;
  }

  const currentPrice = history[0].close;
  const pastPrice = history[Math.min(days, history.length - 1)].close;

  if (pastPrice === 0) {
    return null;
  }

  return ((currentPrice - pastPrice) / pastPrice) * 100;
}

export async function getGrowthMetrics(
  symbol: string
): Promise<{
  growth1m: number | null;
  growth6m: number | null;
  growth12m: number | null;
} | null> {
  const history = await getTimeSeries(symbol, 365);

  if (!history || history.length === 0) {
    return null;
  }

  return {
    growth1m: computeGrowth(history, 30),
    growth6m: computeGrowth(history, 180),
    growth12m: computeGrowth(history, 365),
  };
}
