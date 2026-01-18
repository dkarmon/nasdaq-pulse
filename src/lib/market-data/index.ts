// ABOUTME: Facade combining all market data providers with fallback logic.
// ABOUTME: Returns mock data when live providers are unavailable or rate-limited.

import * as finnhub from "./finnhub";
import * as twelveData from "./twelve-data";
import * as newsApi from "./newsapi";
import * as mock from "./mock";
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

export type { Stock, Quote, CompanyProfile, HistoricalDataPoint, NewsItem };
export type { ScreenerResponse, StockDetailResponse, NewsResponse };
export type { ScreenerParams, SortPeriod, FilterPreset, ScreenerFilters } from "./types";

export async function getScreener(
  params: ScreenerParams
): Promise<ScreenerResponse> {
  return mock.getScreenerData(params);
}

export async function getQuote(symbol: string): Promise<Quote | null> {
  const liveQuote = await finnhub.getQuote(symbol);
  if (liveQuote) {
    return liveQuote;
  }

  const mockDetail = mock.getStockDetail(symbol);
  return mockDetail?.quote ?? null;
}

export async function getCompanyProfile(
  symbol: string
): Promise<CompanyProfile | null> {
  const liveProfile = await finnhub.getCompanyProfile(symbol);
  if (liveProfile) {
    return liveProfile;
  }

  const mockDetail = mock.getStockDetail(symbol);
  return mockDetail?.profile ?? null;
}

export async function getHistoricalData(
  symbol: string,
  days: number = 365
): Promise<HistoricalDataPoint[]> {
  const liveHistory = await twelveData.getTimeSeries(symbol, days);
  if (liveHistory && liveHistory.length > 0) {
    return liveHistory;
  }

  const mockDetail = mock.getStockDetail(symbol);
  return mockDetail?.history ?? [];
}

export async function getStockDetail(
  symbol: string
): Promise<StockDetailResponse | null> {
  const [quote, profile, history] = await Promise.all([
    getQuote(symbol),
    getCompanyProfile(symbol),
    getHistoricalData(symbol),
  ]);

  if (!quote || !profile) {
    return mock.getStockDetail(symbol);
  }

  return {
    profile,
    quote,
    history,
    updatedAt: new Date().toISOString(),
  };
}

export async function getNews(symbol?: string): Promise<NewsResponse> {
  if (symbol) {
    const liveNews = await newsApi.getNewsForStock(symbol);
    if (liveNews.length > 0) {
      return {
        items: liveNews,
        updatedAt: new Date().toISOString(),
      };
    }
  } else {
    const liveNews = await newsApi.getMarketNews();
    if (liveNews.length > 0) {
      return {
        items: liveNews,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  return mock.getNews(symbol);
}

export { finnhubLimiter, twelveDataLimiter, newsApiLimiter } from "./rate-limiter";
