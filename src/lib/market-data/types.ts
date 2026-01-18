// ABOUTME: Core TypeScript interfaces for market data throughout the application.
// ABOUTME: Defines Stock, Quote, NewsItem, and provider response types.

export type SortPeriod = "1m" | "6m" | "12m";

export type Stock = {
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  growth1m: number;
  growth6m: number;
  growth12m: number;
  updatedAt: string;
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
  exchange: string;
  industry: string;
  marketCap: number;
  peRatio: number | null;
  week52High: number;
  week52Low: number;
  logo?: string;
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
};

export type StockDetailResponse = {
  profile: CompanyProfile;
  quote: Quote;
  history: HistoricalDataPoint[];
  updatedAt: string;
};

export type NewsResponse = {
  items: NewsItem[];
  updatedAt: string;
};

export type FilterPreset = "any" | "5" | "10" | "25";

export type ScreenerFilters = {
  min1m: FilterPreset;
  min6m: FilterPreset;
  min12m: FilterPreset;
};

export type ScreenerParams = {
  sortBy: SortPeriod;
  limit: number;
  filters: ScreenerFilters;
};
