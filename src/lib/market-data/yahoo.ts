// ABOUTME: Yahoo Finance API client for quotes and historical data.
// ABOUTME: No API key required - uses unofficial but reliable Yahoo Finance endpoints.

import type { HistoricalDataPoint } from "./types";

const BASE_URL = "https://query1.finance.yahoo.com";

type YahooChartResult = {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
        previousClose?: number;
        chartPreviousClose?: number;
        currency: string;
        exchangeName: string;
        longName?: string;
        shortName?: string;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
      };
    }> | null;
    error: null | { code: string; description: string };
  };
};

export type YahooQuote = {
  symbol: string;
  price: number;
  previousClose: number;
  name: string;
  exchange: string;
  marketCap?: number;
};

export type YahooGrowth = {
  symbol: string;
  currentPrice: number;
  growth1d: number;
  growth5d: number;
  growth1m: number;
  growth6m: number;
  growth12m: number;
};

async function fetchYahoo<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Yahoo Finance fetch error:", error);
    return null;
  }
}

export async function getQuote(symbol: string): Promise<YahooQuote | null> {
  const url = `${BASE_URL}/v8/finance/chart/${symbol}?interval=1d&range=1d`;
  const data = await fetchYahoo<YahooChartResult>(url);

  if (!data || data.chart.error || !data.chart.result) {
    return null;
  }

  const result = data.chart.result[0];
  return {
    symbol: result.meta.symbol,
    price: result.meta.regularMarketPrice,
    previousClose: result.meta.previousClose ?? result.meta.chartPreviousClose ?? 0,
    name: result.meta.longName || result.meta.shortName || symbol,
    exchange: result.meta.exchangeName,
  };
}

export function calculateGrowthByCalendarMonths(
  prices: number[],
  timestamps: number[],
  monthsAgo: number
): number {
  if (prices.length === 0) return 0;

  const currentPrice = prices[prices.length - 1];

  // Calculate target date (calendar months ago)
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() - monthsAgo);
  const targetTime = targetDate.getTime();

  // Find the price at the last trading day on or BEFORE target date.
  // This gives us the full growth period.
  let targetIdx = 0;
  for (let i = 0; i < timestamps.length; i++) {
    if (timestamps[i] * 1000 <= targetTime && prices[i] !== undefined) {
      targetIdx = i;
    } else if (timestamps[i] * 1000 > targetTime) {
      // Once we pass the target time, stop looking
      break;
    }
  }

  const pastPrice = prices[targetIdx];
  if (!pastPrice || pastPrice === 0) return 0;

  return ((currentPrice - pastPrice) / pastPrice) * 100;
}

export function calculateGrowthByDays(
  prices: number[],
  timestamps: number[],
  daysAgo: number
): number {
  if (prices.length === 0) return 0;

  const currentPrice = prices[prices.length - 1];

  // Calculate target date (days ago)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - daysAgo);
  const targetTime = targetDate.getTime();

  // Find the price at the last trading day on or BEFORE target date.
  // This gives us the full growth period (e.g., if 5 days ago was Saturday,
  // use Friday's close, not Monday's, to capture the full 5-day growth).
  let targetIdx = 0;
  for (let i = 0; i < timestamps.length; i++) {
    if (timestamps[i] * 1000 <= targetTime && prices[i] !== undefined) {
      targetIdx = i;
    } else if (timestamps[i] * 1000 > targetTime) {
      // Once we pass the target time, stop looking
      break;
    }
  }

  const pastPrice = prices[targetIdx];
  if (!pastPrice || pastPrice === 0) return 0;

  return ((currentPrice - pastPrice) / pastPrice) * 100;
}

function detectLikelySplit(prices: number[], daysToCheck: number = 30): boolean {
  // Check for single-day jumps > 200% in recent history (likely reverse split)
  const startIdx = Math.max(0, prices.length - daysToCheck);
  for (let i = startIdx + 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const curr = prices[i];
    if (prev > 0) {
      const change = Math.abs((curr - prev) / prev);
      if (change > 2.0) { // > 200% change
        return true;
      }
    }
  }
  return false;
}

export async function getGrowthData(symbol: string): Promise<YahooGrowth | null> {
  // Get 1 year of daily data
  const url = `${BASE_URL}/v8/finance/chart/${symbol}?interval=1d&range=1y`;
  const data = await fetchYahoo<YahooChartResult>(url);

  if (!data || data.chart.error || !data.chart.result) {
    return null;
  }

  const result = data.chart.result[0];
  const quotes = result.indicators.quote[0];

  // Build aligned arrays of prices and timestamps (excluding null prices)
  const closePrices: number[] = [];
  const validTimestamps: number[] = [];
  for (let i = 0; i < quotes.close.length; i++) {
    if (quotes.close[i] !== null) {
      closePrices.push(quotes.close[i]);
      validTimestamps.push(result.timestamp[i]);
    }
  }

  if (closePrices.length === 0) {
    return null;
  }

  return {
    symbol: result.meta.symbol,
    currentPrice: result.meta.regularMarketPrice,
    growth1d: calculateGrowthByDays(closePrices, validTimestamps, 1),
    growth5d: calculateGrowthByDays(closePrices, validTimestamps, 5),
    growth1m: calculateGrowthByCalendarMonths(closePrices, validTimestamps, 1),
    growth6m: calculateGrowthByCalendarMonths(closePrices, validTimestamps, 6),
    growth12m: calculateGrowthByCalendarMonths(closePrices, validTimestamps, 12),
  };
}

export async function getQuoteAndGrowth(symbol: string): Promise<{
  quote: YahooQuote;
  growth: YahooGrowth;
  history: HistoricalDataPoint[];
  hasSplitWarning: boolean;
} | null> {
  // Fetch both 1y (for growth/history) and 1d (for accurate previousClose) data
  const yearUrl = `${BASE_URL}/v8/finance/chart/${symbol}?interval=1d&range=1y`;
  const dayUrl = `${BASE_URL}/v8/finance/chart/${symbol}?interval=1d&range=1d`;

  const [yearData, dayData] = await Promise.all([
    fetchYahoo<YahooChartResult>(yearUrl),
    fetchYahoo<YahooChartResult>(dayUrl),
  ]);

  if (!yearData || yearData.chart.error || !yearData.chart.result) {
    return null;
  }

  const result = yearData.chart.result[0];
  const quotes = result.indicators.quote[0];

  // Build aligned arrays of prices and timestamps (excluding null prices)
  const closePrices: number[] = [];
  const validTimestamps: number[] = [];
  const history: HistoricalDataPoint[] = [];

  for (let i = 0; i < result.timestamp.length; i++) {
    if (quotes.close[i] !== null) {
      closePrices.push(quotes.close[i]);
      validTimestamps.push(result.timestamp[i]);
      history.push({
        date: new Date(result.timestamp[i] * 1000).toISOString().split("T")[0],
        open: quotes.open[i] ?? 0,
        high: quotes.high[i] ?? 0,
        low: quotes.low[i] ?? 0,
        close: quotes.close[i] ?? 0,
        volume: quotes.volume[i] ?? 0,
      });
    }
  }

  if (closePrices.length === 0) {
    return null;
  }

  // Detect likely stock split (>200% single-day change in last 30 days)
  const hasSplitWarning = detectLikelySplit(closePrices, 30);

  // Get previousClose from 1d data (accurate) or fall back to 1y data
  const dayResult = dayData?.chart.result?.[0];
  const previousClose =
    dayResult?.meta.chartPreviousClose ??
    result.meta.previousClose ??
    result.meta.chartPreviousClose ??
    0;

  // Try metadata-based calculation first, fall back to historical if it produces NaN
  const metadataGrowth1d = previousClose
    ? ((result.meta.regularMarketPrice - previousClose) / previousClose) * 100
    : NaN;
  const growth1d = Number.isFinite(metadataGrowth1d)
    ? metadataGrowth1d
    : calculateGrowthByDays(closePrices, validTimestamps, 1);

  return {
    quote: {
      symbol: result.meta.symbol,
      price: result.meta.regularMarketPrice,
      previousClose,
      name: result.meta.longName || result.meta.shortName || symbol,
      exchange: result.meta.exchangeName,
    },
    growth: {
      symbol: result.meta.symbol,
      currentPrice: result.meta.regularMarketPrice,
      growth1d,
      growth5d: calculateGrowthByDays(closePrices, validTimestamps, 5),
      growth1m: calculateGrowthByCalendarMonths(closePrices, validTimestamps, 1),
      growth6m: calculateGrowthByCalendarMonths(closePrices, validTimestamps, 6),
      growth12m: calculateGrowthByCalendarMonths(closePrices, validTimestamps, 12),
    },
    history,
    hasSplitWarning,
  };
}

export async function getHistoricalData(symbol: string, days: number = 365): Promise<HistoricalDataPoint[]> {
  const range = days <= 30 ? "1mo" : days <= 90 ? "3mo" : days <= 180 ? "6mo" : "1y";
  const url = `${BASE_URL}/v8/finance/chart/${symbol}?interval=1d&range=${range}`;
  const data = await fetchYahoo<YahooChartResult>(url);

  if (!data || data.chart.error || !data.chart.result) {
    return [];
  }

  const result = data.chart.result[0];
  const quotes = result.indicators.quote[0];

  const history: HistoricalDataPoint[] = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    if (quotes.close[i] !== null) {
      history.push({
        date: new Date(result.timestamp[i] * 1000).toISOString().split("T")[0],
        open: quotes.open[i] ?? 0,
        high: quotes.high[i] ?? 0,
        low: quotes.low[i] ?? 0,
        close: quotes.close[i] ?? 0,
        volume: quotes.volume[i] ?? 0,
      });
    }
  }

  return history;
}

// Batch quote types and constants
const SPARK_BATCH_SIZE = 20;

type SparkResponse = Record<
  string,
  {
    symbol: string;
    chartPreviousClose: number;
    close: number[];
    timestamp: number[];
  }
>;

export type BatchQuote = {
  symbol: string;
  price: number;
  previousClose: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseSparkResponse(data: SparkResponse): Map<string, BatchQuote> {
  const results = new Map<string, BatchQuote>();

  for (const [symbol, sparkData] of Object.entries(data)) {
    if (sparkData && sparkData.close && sparkData.close.length > 0) {
      results.set(symbol, {
        symbol: sparkData.symbol,
        price: sparkData.close[sparkData.close.length - 1],
        previousClose: sparkData.chartPreviousClose,
      });
    }
  }

  return results;
}

async function fetchSparkBatchWithRetry(
  symbols: string[],
  maxRetries = 3
): Promise<Map<string, BatchQuote>> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const encodedSymbols = symbols.map(s => encodeURIComponent(s)).join(",");
      const url = `${BASE_URL}/v8/finance/spark?symbols=${encodedSymbols}&interval=1d&range=1d`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: SparkResponse = await response.json();
      return parseSparkResponse(data);
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(
          `Batch failed after ${maxRetries} retries:`,
          symbols.slice(0, 3).join(","),
          "...",
          error
        );
        return new Map();
      }
      // Exponential backoff: 100ms, 200ms, 400ms
      await sleep(100 * Math.pow(2, attempt - 1));
    }
  }
  return new Map();
}

export async function getBatchQuotes(
  symbols: string[]
): Promise<Map<string, BatchQuote>> {
  if (symbols.length === 0) {
    return new Map();
  }

  const results = new Map<string, BatchQuote>();

  // Split into batches of 20
  const batches: string[][] = [];
  for (let i = 0; i < symbols.length; i += SPARK_BATCH_SIZE) {
    batches.push(symbols.slice(i, i + SPARK_BATCH_SIZE));
  }

  // Fetch all batches in parallel with retry
  const batchResults = await Promise.all(
    batches.map((batch) => fetchSparkBatchWithRetry(batch))
  );

  // Merge results
  for (const batchResult of batchResults) {
    for (const [symbol, quote] of batchResult) {
      results.set(symbol, quote);
    }
  }

  // Fall back to individual chart calls for symbols missing from spark
  // (spark endpoint may not return data for some regional markets like TLV)
  const missingSymbols = symbols.filter((s) => !results.has(s));
  if (missingSymbols.length > 0) {
    const fallbackQuotes = await Promise.all(
      missingSymbols.map(async (symbol) => {
        const quote = await getQuote(symbol);
        return { symbol, quote };
      })
    );

    for (const { symbol, quote } of fallbackQuotes) {
      if (quote) {
        results.set(symbol, {
          symbol: quote.symbol,
          price: quote.price,
          previousClose: quote.previousClose,
        });
      }
    }
  }

  return results;
}
