// ABOUTME: Gemini AI client for generating stock analyses.
// ABOUTME: Uses Google's Gemini 2.0 Flash model with Google Search grounding.

import { GoogleGenAI } from "@google/genai";
import type { GeminiAnalysisResponse } from "./types";

const MODEL_VERSION = "gemini-2.0-flash";

export type StockMetrics = {
  sector?: string;
  industry?: string;
  marketCap?: number;
  growth1d?: number;
  growth5d?: number;
  growth1m: number;
  growth6m: number;
  growth12m: number;
  price: number;
  currency: string;
  description?: string;
};

const ANALYSIS_PROMPT = `You are a stock analyst. Analyze {company} ({symbol}) based on the provided metrics and your knowledge of the company.

STOCK METRICS:
{metrics}

Search for recent analyst reports, financial news, and market sentiment about this company to inform your analysis.

IMPORTANT: Respond with ONLY a valid JSON object (no markdown, no code blocks, no extra text). Use this exact structure:
{"recommendation":"buy","english":"Your 2-3 paragraph analysis in English","hebrew":"Same analysis in Hebrew"}

The recommendation field must be exactly one of: "buy", "hold", or "sell"

Guidelines:
- Analyze growth trends: positive multi-timeframe growth suggests momentum
- Consider sector context, competitive position, and market cap for risk assessment
- Reference recent analyst ratings, earnings reports, or significant company news if available
- "buy": Strong growth metrics, positive momentum, favorable outlook, analyst upgrades
- "hold": Mixed signals, stable but no clear direction, wait for catalysts
- "sell": Declining metrics, negative momentum, concerning trends, analyst downgrades
- Be specific about the numbers and recent events driving your recommendation`;

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

  lines.push("");
  lines.push("Growth Performance:");
  if (metrics.growth1d !== undefined) {
    lines.push(`  1 Day: ${metrics.growth1d >= 0 ? "+" : ""}${metrics.growth1d.toFixed(2)}%`);
  }
  if (metrics.growth5d !== undefined) {
    lines.push(`  5 Day: ${metrics.growth5d >= 0 ? "+" : ""}${metrics.growth5d.toFixed(2)}%`);
  }
  lines.push(`  1 Month: ${metrics.growth1m >= 0 ? "+" : ""}${metrics.growth1m.toFixed(2)}%`);
  lines.push(`  6 Month: ${metrics.growth6m >= 0 ? "+" : ""}${metrics.growth6m.toFixed(2)}%`);
  lines.push(`  12 Month: ${metrics.growth12m >= 0 ? "+" : ""}${metrics.growth12m.toFixed(2)}%`);

  if (metrics.description) {
    lines.push("");
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

export { MODEL_VERSION };
