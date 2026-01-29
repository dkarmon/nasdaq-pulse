// ABOUTME: Gemini AI client for generating stock analyses.
// ABOUTME: Uses Google's Gemini 2.0 Flash model with structured JSON output.

import { GoogleGenAI } from "@google/genai";
import type { NewsItem } from "@/lib/market-data/types";
import type { GeminiAnalysisResponse } from "./types";

const MODEL_VERSION = "gemini-2.0-flash";

const ANALYSIS_PROMPT = `You are a stock analyst. Based ONLY on the following news articles about {company} ({symbol}), provide a recommendation and brief explanation.

IMPORTANT: Base your analysis ONLY on the information provided in these articles. Do not use any external knowledge about the company.

NEWS ARTICLES:
{articles}

Provide a JSON response with this exact structure:
{
  "recommendation": "buy" | "hold" | "sell",
  "english": "Up to 3 paragraphs explaining the recommendation based on the news",
  "hebrew": "Same explanation in Hebrew"
}

Guidelines:
- recommendation: Use "buy" if news is predominantly positive and suggests growth potential, "sell" if news is predominantly negative and suggests risk, "hold" if news is mixed or neutral
- english: 2-3 paragraphs summarizing the key points from the news and explaining your recommendation
- hebrew: Accurate Hebrew translation of the English explanation`;

function formatArticles(news: NewsItem[]): string {
  return news
    .map(
      (article, i) =>
        `[${i + 1}] ${article.headline}
Source: ${article.source} | Published: ${article.publishedAt}
${article.summary}`
    )
    .join("\n\n");
}

export async function generateStockAnalysis(
  symbol: string,
  companyName: string,
  news: NewsItem[]
): Promise<{ analysis: GeminiAnalysisResponse; modelVersion: string }> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = ANALYSIS_PROMPT.replace("{company}", companyName)
    .replace("{symbol}", symbol)
    .replace("{articles}", formatArticles(news));

  const response = await ai.models.generateContent({
    model: MODEL_VERSION,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  const parsed = JSON.parse(text) as GeminiAnalysisResponse;

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
