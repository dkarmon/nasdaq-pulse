// ABOUTME: Core TypeScript interfaces for market data throughout the application.
// ABOUTME: Defines Stock, Quote, NewsItem, and provider response types.

export type Exchange = "nasdaq" | "tlv";

export type SortPeriod = "5d" | "1m" | "6m" | "12m" | "az";

export type Stock = {
  symbol: string;
  name: string;
  nameHebrew?: string;
  exchange: Exchange;
  price: number;
  currency: string;
  marketCap: number;
  growth5d?: number;
  growth1m: number;
  growth6m: number;
  growth12m: number;
  updatedAt: string;
  hasSplitWarning?: boolean;
};

export type Quote = {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  updatedAt: string;
};

export type CompanyProfile = {
  symbol: string;
  name: string;
  nameHebrew?: string;
  exchange: string;
  sector?: string;
  industry: string;
  marketCap: number;
  peRatio: number | null;
  week52High: number;
  week52Low: number;
  logo?: string;
  website?: string;
  description?: string;
  descriptionHebrew?: string;
};

export type HistoricalDataPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type NewsItem = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: "positive" | "negative" | "neutral";
  symbols: string[];
};

export type ScreenerResponse = {
  stocks: Stock[];
  updatedAt: string;
  source: "live" | "cached" | "seed";
  exchange: Exchange;
};

export type StockDetailResponse = {
  profile: CompanyProfile;
  quote: Quote;
  history: HistoricalDataPoint[];
  growth5d?: number;
  growth1m: number;
  growth6m: number;
  growth12m: number;
  updatedAt: string;
  nameHebrew?: string;
};

export type NewsResponse = {
  items: NewsItem[];
  updatedAt: string;
};

export type ScreenerFilters = {
  minPrice: number | null;
};

export type ScreenerParams = {
  sortBy: SortPeriod;
  limit: number;
  filters: ScreenerFilters;
  exchange: Exchange;
};
