// ABOUTME: Mock data provider for tests and fallback when APIs are unavailable.
// ABOUTME: Returns realistic NASDAQ stock data for development and testing.

import type {
  Stock,
  Quote,
  CompanyProfile,
  HistoricalDataPoint,
  NewsItem,
  ScreenerResponse,
  StockDetailResponse,
  NewsResponse,
  ScreenerParams,
} from "./types";
import { defaultRecommendationFormula } from "@/lib/recommendations/config";
import { filterAndSortByRecommendation, scoreStocksWithFormula } from "./recommendation";
import type { RecommendationFormulaSummary } from "@/lib/recommendations/types";

const rawMockStocks: Array<Omit<Stock, "growth3m"> & { growth3m?: number; growth1d?: number }> = [
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    exchange: "nasdaq",
    price: 142.5,
    currency: "USD",
    marketCap: 3500000000000,
    growth5d: 4.2,
    growth1m: 18.2,
    growth6m: 45.3,
    growth12m: 180.5,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "SMCI",
    name: "Super Micro Computer",
    exchange: "nasdaq",
    price: 890.0,
    currency: "USD",
    marketCap: 52000000000,
    growth5d: 8.3,
    growth1m: 25.1,
    growth6m: 120.4,
    growth12m: 450.2,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    exchange: "nasdaq",
    price: 192.68,
    currency: "USD",
    marketCap: 2950000000000,
    growth5d: 1.8,
    growth1m: 6.4,
    growth6m: 12.8,
    growth12m: 28.3,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    exchange: "nasdaq",
    price: 404.12,
    currency: "USD",
    marketCap: 3090000000000,
    growth5d: 1.2,
    growth1m: 4.2,
    growth6m: 18.5,
    growth12m: 42.1,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "META",
    name: "Meta Platforms Inc.",
    exchange: "nasdaq",
    price: 505.75,
    currency: "USD",
    marketCap: 1280000000000,
    growth5d: 2.5,
    growth1m: 8.9,
    growth6m: 35.2,
    growth12m: 165.8,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    exchange: "nasdaq",
    price: 141.8,
    currency: "USD",
    marketCap: 1750000000000,
    growth5d: 0.9,
    growth1m: 3.1,
    growth6m: 22.4,
    growth12m: 48.7,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    exchange: "nasdaq",
    price: 178.25,
    currency: "USD",
    marketCap: 1850000000000,
    growth5d: 1.5,
    growth1m: 5.6,
    growth6m: 28.9,
    growth12m: 62.4,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "AVGO",
    name: "Broadcom Inc.",
    exchange: "nasdaq",
    price: 1320.5,
    currency: "USD",
    marketCap: 612000000000,
    growth5d: 3.1,
    growth1m: 12.3,
    growth6m: 52.1,
    growth12m: 115.6,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    exchange: "nasdaq",
    price: 248.5,
    currency: "USD",
    marketCap: 790000000000,
    growth5d: -1.2,
    growth1m: -2.4,
    growth6m: 15.8,
    growth12m: -8.2,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices",
    exchange: "nasdaq",
    price: 156.8,
    currency: "USD",
    marketCap: 253000000000,
    growth5d: 2.1,
    growth1m: 7.8,
    growth6m: 42.3,
    growth12m: 85.4,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "NFLX",
    name: "Netflix Inc.",
    exchange: "nasdaq",
    price: 628.4,
    currency: "USD",
    marketCap: 272000000000,
    growth5d: 2.8,
    growth1m: 9.2,
    growth6m: 38.6,
    growth12m: 78.9,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "COST",
    name: "Costco Wholesale",
    exchange: "nasdaq",
    price: 745.2,
    currency: "USD",
    marketCap: 330000000000,
    growth5d: 1.4,
    growth1m: 4.8,
    growth6m: 15.2,
    growth12m: 35.6,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "ADBE",
    name: "Adobe Inc.",
    exchange: "nasdaq",
    price: 548.9,
    currency: "USD",
    marketCap: 244000000000,
    growth5d: 0.6,
    growth1m: 2.1,
    growth6m: 8.4,
    growth12m: 18.2,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "PEP",
    name: "PepsiCo Inc.",
    exchange: "nasdaq",
    price: 172.3,
    currency: "USD",
    marketCap: 237000000000,
    growth5d: 0.3,
    growth1m: 1.2,
    growth6m: 5.8,
    growth12m: 12.4,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "INTC",
    name: "Intel Corporation",
    exchange: "nasdaq",
    price: 42.8,
    currency: "USD",
    marketCap: 181000000000,
    growth5d: -1.8,
    growth1m: -5.2,
    growth6m: -12.4,
    growth12m: -28.6,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "CSCO",
    name: "Cisco Systems",
    exchange: "nasdaq",
    price: 52.4,
    currency: "USD",
    marketCap: 212000000000,
    growth5d: 0.9,
    growth1m: 3.5,
    growth6m: 12.1,
    growth12m: 24.8,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "QCOM",
    name: "QUALCOMM Inc.",
    exchange: "nasdaq",
    price: 168.9,
    currency: "USD",
    marketCap: 188000000000,
    growth5d: 1.7,
    growth1m: 6.2,
    growth6m: 28.4,
    growth12m: 52.3,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "INTU",
    name: "Intuit Inc.",
    exchange: "nasdaq",
    price: 625.8,
    currency: "USD",
    marketCap: 175000000000,
    growth5d: 1.5,
    growth1m: 5.4,
    growth6m: 18.9,
    growth12m: 38.2,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "TXN",
    name: "Texas Instruments",
    exchange: "nasdaq",
    price: 178.5,
    currency: "USD",
    marketCap: 162000000000,
    growth5d: 1.1,
    growth1m: 4.1,
    growth6m: 14.8,
    growth12m: 22.6,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "ISRG",
    name: "Intuitive Surgical",
    exchange: "nasdaq",
    price: 412.3,
    currency: "USD",
    marketCap: 146000000000,
    growth5d: 2.0,
    growth1m: 7.2,
    growth6m: 25.6,
    growth12m: 48.9,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "AMAT",
    name: "Applied Materials",
    exchange: "nasdaq",
    price: 198.4,
    currency: "USD",
    marketCap: 164000000000,
    growth5d: 2.3,
    growth1m: 8.5,
    growth6m: 32.1,
    growth12m: 68.4,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "LRCX",
    name: "Lam Research",
    exchange: "nasdaq",
    price: 892.5,
    currency: "USD",
    marketCap: 117000000000,
    growth5d: 2.7,
    growth1m: 9.8,
    growth6m: 38.4,
    growth12m: 72.5,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "MU",
    name: "Micron Technology",
    exchange: "nasdaq",
    price: 98.6,
    currency: "USD",
    marketCap: 109000000000,
    growth5d: 3.2,
    growth1m: 11.2,
    growth6m: 48.9,
    growth12m: 92.3,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "KLAC",
    name: "KLA Corporation",
    exchange: "nasdaq",
    price: 685.2,
    currency: "USD",
    marketCap: 93000000000,
    growth5d: 2.1,
    growth1m: 7.6,
    growth6m: 28.5,
    growth12m: 58.4,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "MRVL",
    name: "Marvell Technology",
    exchange: "nasdaq",
    price: 72.4,
    currency: "USD",
    marketCap: 62000000000,
    growth5d: 4.0,
    growth1m: 14.5,
    growth6m: 58.2,
    growth12m: 95.6,
    updatedAt: new Date().toISOString(),
  },
];

const mockStocks: Stock[] = rawMockStocks.map((stock) => ({
  ...stock,
  growth3m: stock.growth3m ?? ((stock.growth1m + stock.growth6m) / 2),
  growth1d: stock.growth1d ?? (stock.growth5d ?? 0) / 5,
}));

const mockProfiles: Record<string, CompanyProfile> = {
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    exchange: "NASDAQ",
    industry: "Semiconductors",
    marketCap: 3500000000000,
    peRatio: 65.2,
    week52High: 152.89,
    week52Low: 47.32,
  },
  AAPL: {
    symbol: "AAPL",
    name: "Apple Inc.",
    exchange: "NASDAQ",
    industry: "Consumer Electronics",
    marketCap: 2950000000000,
    peRatio: 31.5,
    week52High: 199.62,
    week52Low: 164.08,
  },
  MSFT: {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    exchange: "NASDAQ",
    industry: "Software",
    marketCap: 3090000000000,
    peRatio: 36.8,
    week52High: 420.82,
    week52Low: 309.45,
  },
};

const mockNews: NewsItem[] = [
  {
    id: "1",
    headline: "NVIDIA Q4 earnings beat expectations, AI demand remains strong",
    summary:
      "NVIDIA reported record revenue driven by data center GPU sales as AI infrastructure spending accelerates.",
    source: "Bloomberg",
    url: "https://example.com/news/1",
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    sentiment: "positive",
    symbols: ["NVDA"],
  },
  {
    id: "2",
    headline: "Apple announces new AI features for upcoming iPhone models",
    summary:
      "Apple previewed on-device AI capabilities coming to iOS 18, including enhanced Siri and image recognition.",
    source: "WSJ",
    url: "https://example.com/news/2",
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    sentiment: "positive",
    symbols: ["AAPL"],
  },
  {
    id: "3",
    headline: "Microsoft cloud revenue growth steady amid enterprise AI adoption",
    summary:
      "Azure revenue grew 29% year-over-year as enterprises deploy AI workloads on Microsoft cloud infrastructure.",
    source: "CNBC",
    url: "https://example.com/news/3",
    publishedAt: new Date(Date.now() - 10800000).toISOString(),
    sentiment: "neutral",
    symbols: ["MSFT"],
  },
  {
    id: "4",
    headline: "Semiconductor stocks slide as yields rise",
    summary:
      "Chip makers retreated from recent highs as Treasury yields climbed, pressuring growth stock valuations.",
    source: "Reuters",
    url: "https://example.com/news/4",
    publishedAt: new Date(Date.now() - 14400000).toISOString(),
    sentiment: "negative",
    symbols: ["NVDA", "AMD", "INTC"],
  },
];

function generateHistoricalData(
  symbol: string,
  days: number
): HistoricalDataPoint[] {
  const stock = mockStocks.find((s) => s.symbol === symbol);
  const basePrice = stock?.price ?? 100;
  const data: HistoricalDataPoint[] = [];
  let price = basePrice * (1 - (stock?.growth12m ?? 20) / 100);

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dailyChange = (Math.random() - 0.48) * 0.03;
    price = price * (1 + dailyChange);
    const dayVariance = price * 0.02;

    data.push({
      date: date.toISOString().split("T")[0],
      open: price - dayVariance * Math.random(),
      high: price + dayVariance * Math.random(),
      low: price - dayVariance * Math.random(),
      close: price,
      volume: Math.floor(10000000 + Math.random() * 50000000),
    });
  }

  return data;
}

function sortStocks(stocks: Stock[], sortBy: string): Stock[] {
  const sorted = [...stocks];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "score":
      case "intraday":
        return b.growth1m - a.growth1m;
      case "1d":
        return (b.growth1d ?? 0) - (a.growth1d ?? 0);
      case "5d":
        return (b.growth5d ?? 0) - (a.growth5d ?? 0);
      case "1m":
        return b.growth1m - a.growth1m;
      case "3m":
        return b.growth3m - a.growth3m;
      case "6m":
        return b.growth6m - a.growth6m;
      case "12m":
        return b.growth12m - a.growth12m;
      case "az": {
        const aName = a.symbol.endsWith(".TA") ? (a.nameHebrew || a.name) : a.name;
        const bName = b.symbol.endsWith(".TA") ? (b.nameHebrew || b.name) : b.name;
        return (aName || a.symbol).localeCompare(bName || b.symbol, undefined, { sensitivity: "base" });
      }
      default:
        return b.growth1m - a.growth1m;
    }
  });
  return sorted;
}

export function getScreenerData(params: ScreenerParams): ScreenerResponse {
  const activeFormula: RecommendationFormulaSummary = {
    id: defaultRecommendationFormula.id,
    name: defaultRecommendationFormula.name,
    description: defaultRecommendationFormula.description,
    expression: defaultRecommendationFormula.expression,
    status: defaultRecommendationFormula.status,
    version: defaultRecommendationFormula.version,
    updatedAt: defaultRecommendationFormula.updatedAt ?? new Date().toISOString(),
  };

  let stocks = sortStocks(mockStocks, params.sortBy);
  if (params.recommendedOnly) {
    stocks = filterAndSortByRecommendation(stocks, activeFormula);
  } else if (params.includeScores) {
    stocks = scoreStocksWithFormula(stocks, activeFormula);
  }
  stocks = stocks.slice(0, params.limit);

  return {
    stocks,
    updatedAt: new Date().toISOString(),
    source: "cached",
    exchange: params.exchange ?? "nasdaq",
    recommendation: {
      activeFormula,
    },
  };
}

export function getStockDetail(symbol: string): StockDetailResponse | null {
  const stock = mockStocks.find((s) => s.symbol === symbol);
  if (!stock) return null;

  const profile = mockProfiles[symbol] ?? {
    symbol,
    name: stock.name,
    exchange: "NASDAQ",
    industry: "Technology",
    marketCap: stock.marketCap,
    peRatio: 25 + Math.random() * 30,
    week52High: stock.price * 1.2,
    week52Low: stock.price * 0.7,
  };

  const dailyGrowth = stock.growth1d ?? (stock.growth5d ?? 0) / 5;
  const previousClose = stock.price / (1 + dailyGrowth / 100);

  const quote: Quote = {
    symbol,
    price: stock.price,
    change: stock.price - previousClose,
    changePct: dailyGrowth,
    open: stock.price * 0.998,
    high: stock.price * 1.01,
    low: stock.price * 0.99,
    previousClose,
    volume: Math.floor(10000000 + Math.random() * 50000000),
    updatedAt: new Date().toISOString(),
  };

  return {
    profile,
    quote,
    history: generateHistoricalData(symbol, 365),
    growth1d: stock.growth1d,
    growth5d: stock.growth5d,
    growth1m: stock.growth1m,
    growth3m: stock.growth3m,
    growth6m: stock.growth6m,
    growth12m: stock.growth12m,
    updatedAt: new Date().toISOString(),
  };
}

export function getNews(symbol?: string): NewsResponse {
  const items = symbol
    ? mockNews.filter((n) => n.symbols.includes(symbol))
    : mockNews;

  return {
    items,
    updatedAt: new Date().toISOString(),
  };
}

export function getAllMockStocks(): Stock[] {
  return mockStocks;
}
