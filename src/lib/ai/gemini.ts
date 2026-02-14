// ABOUTME: Gemini AI client for generating stock analyses.
// ABOUTME: Uses Google's Gemini 2.0 Flash model with Google Search grounding.

import { GoogleGenAI } from "@google/genai";
import type { GeminiAnalysisResponse } from "./types";

export const MODEL_VERSION = "gemini-2.0-flash";

export type StockMetrics = {
  sector?: string;
  industry?: string;
  marketCap?: number;
  growth1d?: number;
  growth5d?: number;
  growth1m: number;
  growth3m: number;
  growth6m: number;
  growth12m: number;
  price: number;
  currency: string;
  description?: string;
};

const ANALYSIS_PROMPT = `You are a stock analyst. Provide a brief recommendation for {company} ({symbol}) based on analyst reports and market-moving news.

CURRENT STOCK DATA:
{metrics}

Search for and base your analysis on:
1. ANALYST REPORTS: Recent ratings from major investment banks, price targets, upgrades/downgrades
2. MARKET-MOVING NEWS: M&A activity, product launches, regulatory decisions, major contracts, or other significant events

DO NOT discuss stock price growth or performance data - this is already shown in the UI. Focus only on analyst consensus and concrete news.

IMPORTANT: Respond with ONLY a valid JSON object (no markdown, no code blocks, no extra text). Use this exact structure:
{"recommendation":"buy","english":"Your 1 paragraph analysis in English","hebrew":"Same analysis in Hebrew"}

The recommendation field must be exactly one of: "buy", "hold", or "sell"

Your analysis MUST include:
- The analyst consensus (e.g., "15 of 20 analysts rate Buy, average target $250")
- Any recent rating changes or significant news events`;

function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
  if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
  if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
  return `$${marketCap.toFixed(0)}`;
}

function formatMetrics(metrics: StockMetrics): string {
  const lines: string[] = [];

  lines.push(`Current Price: ${metrics.currency === "ILS" ? "₪" : "$"}${metrics.price.toFixed(2)}`);

  if (metrics.marketCap) {
    lines.push(`Market Cap: ${formatMarketCap(metrics.marketCap)}`);
  }
  if (metrics.sector) {
    lines.push(`Sector: ${metrics.sector}`);
  }
  if (metrics.industry) {
    lines.push(`Industry: ${metrics.industry}`);
  }

  if (metrics.description) {
    lines.push(`Company Overview: ${metrics.description}`);
  }

  return lines.join("\n");
}

export async function generateStockAnalysis(
  symbol: string,
  companyName: string,
  metrics: StockMetrics
): Promise<{ analysis: GeminiAnalysisResponse; modelVersion: string }> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = ANALYSIS_PROMPT
    .replace("{company}", companyName)
    .replace("{symbol}", symbol)
    .replace("{metrics}", formatMetrics(metrics));

  const response = await ai.models.generateContent({
    model: MODEL_VERSION,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  // Extract JSON from response - it may be wrapped in markdown code blocks
  let jsonText = text.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonText) as GeminiAnalysisResponse;

  // Validate the response structure
  if (!["buy", "hold", "sell"].includes(parsed.recommendation)) {
    throw new Error(`Invalid recommendation: ${parsed.recommendation}`);
  }
  if (!parsed.english || !parsed.hebrew) {
    throw new Error("Missing analysis text in response");
  }

  return {
    analysis: parsed,
    modelVersion: MODEL_VERSION,
  };
}
