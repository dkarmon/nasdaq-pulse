// ABOUTME: Core TypeScript interfaces for market data throughout the application.
// ABOUTME: Defines Stock, Quote, NewsItem, and provider response types.

export type Exchange = "nasdaq" | "tlv";

export type SortPeriod = "1d" | "5d" | "1m" | "6m" | "12m" | "az";

export type ScreenerFilters = Record<string, never>;

export type Stock = {
  symbol: string;
  name: string;
  nameHebrew?: string;
  exchange: Exchange;
  price: number;
  currency: string;
  marketCap: number;
  growth1d?: number;
  growth5d?: number;
  growth1m: number;
  growth6m: number;
  growth12m: number;
  updatedAt: string;
  hasSplitWarning?: boolean;
  recommendationScore?: number;
  recommendationFormulaId?: string;
  recommendationFormulaVersion?: number;
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
  recommendation?: {
    activeFormula?: import("@/lib/recommendations/types").RecommendationFormulaSummary | null;
  };
};

export type StockDetailResponse = {
  profile: CompanyProfile;
  quote: Quote;
  history: HistoricalDataPoint[];
  growth1d?: number;
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

export type OmitField = "price" | "marketCap" | "growth1d" | "growth5d" | "growth1m" | "growth6m" | "growth12m";

export type OmitRule = {
  field: OmitField;
  min?: number | null;
  max?: number | null;
};

export type ExchangeOmitRules = {
  nasdaq: OmitRule[];
  tlv: OmitRule[];
};

export type OmitRulesConfig = {
  rules: ExchangeOmitRules;
  enabled: boolean;
};

export type UserOmitPrefs = {
  syncWithAdmin: boolean;
  customRules: OmitRulesConfig | null;
};

export type ScreenerParams = {
  sortBy: SortPeriod;
  limit: number;
  exchange: Exchange;
  recommendedOnly?: boolean;
  includeScores?: boolean;
};
