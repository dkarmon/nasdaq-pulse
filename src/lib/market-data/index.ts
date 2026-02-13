// ABOUTME: Facade combining all market data providers with fallback logic.
// ABOUTME: Returns mock data when live providers are unavailable or rate-limited.

import * as finnhub from "./finnhub";
import * as yahoo from "./yahoo";
import * as newsApi from "./newsapi";
import * as mock from "./mock";
import { getHebrewName } from "./tase-symbols";
import { getCompanyInfo } from "./company-info";
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
export type { ScreenerParams, SortDirection, SortPeriod } from "./types";

function mergeStaticCompanyInfo(profile: CompanyProfile, symbol: string): CompanyProfile {
  const companyInfo = getCompanyInfo(symbol);
  if (!companyInfo) {
    return profile;
  }

  return {
    ...profile,
    ...(companyInfo.sector && { sector: companyInfo.sector }),
    ...(companyInfo.industry && { industry: companyInfo.industry }),
    ...(companyInfo.description && { description: companyInfo.description }),
    ...(companyInfo.descriptionHebrew && {
      descriptionHebrew: companyInfo.descriptionHebrew,
    }),
  };
}

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
  // Skip Finnhub for TASE stocks (they return 403)
  let profile: CompanyProfile | null = null;

  if (!symbol.endsWith(".TA")) {
    const liveProfile = await finnhub.getCompanyProfile(symbol);
    if (liveProfile) {
      profile = liveProfile;
    }
  }

  if (!profile) {
    const mockDetail = mock.getStockDetail(symbol);
    profile = mockDetail?.profile ?? null;
  }

  return profile ? mergeStaticCompanyInfo(profile, symbol) : null;
}

export async function getHistoricalData(
  symbol: string,
  days: number = 365
): Promise<HistoricalDataPoint[]> {
  const liveHistory = await yahoo.getHistoricalData(symbol, days);
  if (liveHistory && liveHistory.length > 0) {
    return liveHistory;
  }

  const mockDetail = mock.getStockDetail(symbol);
  return mockDetail?.history ?? [];
}

export async function getStockDetail(
  symbol: string
): Promise<StockDetailResponse | null> {
  // TLV stocks are stored with .TA suffix, so symbol is already in Yahoo format
  // Use Yahoo's combined endpoint for consistent data
  const yahooData = await yahoo.getQuoteAndGrowth(symbol);

  if (!yahooData) {
    return mock.getStockDetail(symbol);
  }

  // Try to get profile from Finnhub (skips TASE stocks)
  let profile = await getCompanyProfile(symbol);

  // Build minimal profile from Yahoo data if none available
  if (!profile) {
    const hebrewName = getHebrewName(yahooData.quote.symbol);
    profile = {
      symbol: yahooData.quote.symbol,
      name: yahooData.quote.name,
      nameHebrew: hebrewName,
      exchange: yahooData.quote.exchange,
      industry: "",
      marketCap: 0,
      peRatio: null,
      week52High: 0,
      week52Low: 0,
    };
  }
  profile = mergeStaticCompanyInfo(profile, symbol);

  return {
    profile,
    quote: {
      symbol: yahooData.quote.symbol,
      price: yahooData.quote.price,
      change: yahooData.quote.price - yahooData.quote.previousClose,
      changePct: ((yahooData.quote.price - yahooData.quote.previousClose) / yahooData.quote.previousClose) * 100,
      open: yahooData.quote.price,
      high: yahooData.quote.price,
      low: yahooData.quote.price,
      previousClose: yahooData.quote.previousClose,
      volume: 0,
      updatedAt: new Date().toISOString(),
    },
    history: yahooData.history,
    growth1d: yahooData.growth.growth1d,
    growth5d: yahooData.growth.growth5d,
    growth1m: yahooData.growth.growth1m,
    growth6m: yahooData.growth.growth6m,
    growth12m: yahooData.growth.growth12m,
    updatedAt: new Date().toISOString(),
    nameHebrew: getHebrewName(symbol),
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

export { finnhubLimiter, newsApiLimiter } from "./rate-limiter";
