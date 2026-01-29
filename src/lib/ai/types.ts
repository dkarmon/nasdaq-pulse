// ABOUTME: TypeScript types for AI-generated stock analysis.
// ABOUTME: Defines Recommendation, StockAnalysis, and related types.

export type Recommendation = "buy" | "hold" | "sell";

export type NewsSource = {
  headline: string;
  url: string;
  publishedAt: string;
};

export type StockAnalysis = {
  id: string;
  symbol: string;
  recommendation: Recommendation;
  analysisEn: string;
  analysisHe: string;
  newsSources: NewsSource[];
  newsCount: number;
  modelVersion: string;
  generatedAt: string;
};

export type GeminiAnalysisResponse = {
  recommendation: Recommendation;
  english: string;
  hebrew: string;
};
