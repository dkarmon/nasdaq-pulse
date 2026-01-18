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

function calculateGrowth(prices: number[], daysAgo: number): number {
  if (prices.length < daysAgo + 1) {
    // If not enough data, use what we have
    const pastPrice = prices[0];
    const currentPrice = prices[prices.length - 1];
    if (!pastPrice || pastPrice === 0) return 0;
    return ((currentPrice - pastPrice) / pastPrice) * 100;
  }

  const currentPrice = prices[prices.length - 1];
  const pastPrice = prices[prices.length - 1 - daysAgo];

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
  const closePrices = quotes.close.filter((p): p is number => p !== null);

  if (closePrices.length === 0) {
    return null;
  }

  return {
    symbol: result.meta.symbol,
    currentPrice: result.meta.regularMarketPrice,
    growth1m: calculateGrowth(closePrices, 22),   // ~22 trading days
    growth6m: calculateGrowth(closePrices, 126),  // ~126 trading days
    growth12m: calculateGrowth(closePrices, 252), // ~252 trading days
  };
}

export async function getQuoteAndGrowth(symbol: string): Promise<{
  quote: YahooQuote;
  growth: YahooGrowth;
} | null> {
  // Single API call gets both quote and historical data
  const url = `${BASE_URL}/v8/finance/chart/${symbol}?interval=1d&range=1y`;
  const data = await fetchYahoo<YahooChartResult>(url);

  if (!data || data.chart.error || !data.chart.result) {
    return null;
  }

  const result = data.chart.result[0];
  const quotes = result.indicators.quote[0];
  const closePrices = quotes.close.filter((p): p is number => p !== null);

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
      growth1m: calculateGrowth(closePrices, 22),
      growth6m: calculateGrowth(closePrices, 126),
      growth12m: calculateGrowth(closePrices, 252),
    },
  };
}
