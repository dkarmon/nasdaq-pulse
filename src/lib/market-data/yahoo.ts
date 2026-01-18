// ABOUTME: Yahoo Finance API client for quotes and historical data.
// ABOUTME: No API key required - uses unofficial but reliable Yahoo Finance endpoints.

const BASE_URL = "https://query1.finance.yahoo.com";

type YahooChartResult = {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
        previousClose: number;
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
    previousClose: result.meta.previousClose,
    name: result.meta.longName || result.meta.shortName || symbol,
    exchange: result.meta.exchangeName,
  };
}

function calculateGrowthByCalendarMonths(
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

  // Find the price at the closest trading day to target date
  let closestIdx = 0;
  let closestDiff = Infinity;
  for (let i = 0; i < timestamps.length; i++) {
    const diff = Math.abs(timestamps[i] * 1000 - targetTime);
    if (diff < closestDiff && prices[i] !== undefined) {
      closestDiff = diff;
      closestIdx = i;
    }
  }

  const pastPrice = prices[closestIdx];
  if (!pastPrice || pastPrice === 0) return 0;

  return ((currentPrice - pastPrice) / pastPrice) * 100;
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
    growth1m: calculateGrowthByCalendarMonths(closePrices, validTimestamps, 1),
    growth6m: calculateGrowthByCalendarMonths(closePrices, validTimestamps, 6),
    growth12m: calculateGrowthByCalendarMonths(closePrices, validTimestamps, 12),
  };
}

type YahooQuoteSummary = {
  quoteSummary: {
    result: Array<{
      summaryDetail?: {
        marketCap?: { raw: number };
      };
      price?: {
        marketCap?: { raw: number };
        longName?: string;
        shortName?: string;
      };
    }> | null;
    error: null | { code: string; description: string };
  };
};

export async function getMarketCap(symbol: string): Promise<number> {
  const url = `${BASE_URL}/v10/finance/quoteSummary/${symbol}?modules=price`;
  const data = await fetchYahoo<YahooQuoteSummary>(url);

  if (!data || data.quoteSummary.error || !data.quoteSummary.result) {
    return 0;
  }

  const result = data.quoteSummary.result[0];
  return result.price?.marketCap?.raw ?? 0;
}

export async function getQuoteAndGrowth(symbol: string): Promise<{
  quote: YahooQuote;
  growth: YahooGrowth;
  history: HistoricalDataPoint[];
} | null> {
  // Single API call gets quote and historical data
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

  return {
    quote: {
      symbol: result.meta.symbol,
      price: result.meta.regularMarketPrice,
      previousClose: result.meta.previousClose,
      name: result.meta.longName || result.meta.shortName || symbol,
      exchange: result.meta.exchangeName,
    },
    growth: {
      symbol: result.meta.symbol,
      currentPrice: result.meta.regularMarketPrice,
      growth1m: calculateGrowthByCalendarMonths(closePrices, validTimestamps, 1),
      growth6m: calculateGrowthByCalendarMonths(closePrices, validTimestamps, 6),
      growth12m: calculateGrowthByCalendarMonths(closePrices, validTimestamps, 12),
    },
    history,
  };
}

export type HistoricalDataPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

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
