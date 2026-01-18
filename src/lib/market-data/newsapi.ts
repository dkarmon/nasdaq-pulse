// ABOUTME: NewsAPI client for fetching stock-related news articles.
// ABOUTME: Returns news with sentiment classification and symbol mapping.

import { newsApiLimiter } from "./rate-limiter";
import type { NewsItem } from "./types";

const NEWS_API_KEY = process.env.NEWS_API_KEY ?? "";
const BASE_URL = "https://newsapi.org/v2";

async function fetchWithRateLimit<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T | null> {
  if (!NEWS_API_KEY) {
    console.warn("NEWS_API_KEY not configured");
    return null;
  }

  if (!newsApiLimiter.consumeToken()) {
    console.warn("NewsAPI rate limit reached");
    return null;
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("apiKey", NEWS_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  try {
    const response = await fetch(url.toString(), {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      console.error(`NewsAPI error: ${response.status}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("NewsAPI fetch error:", error);
    return null;
  }
}

type NewsApiArticle = {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
};

type NewsApiResponse = {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
};

function classifySentiment(
  text: string
): "positive" | "negative" | "neutral" {
  const lowerText = text.toLowerCase();

  const positiveWords = [
    "surge",
    "gain",
    "rise",
    "beat",
    "exceed",
    "growth",
    "profit",
    "record",
    "strong",
    "bullish",
    "upgrade",
    "rally",
    "soar",
  ];

  const negativeWords = [
    "drop",
    "fall",
    "decline",
    "miss",
    "loss",
    "weak",
    "bearish",
    "downgrade",
    "plunge",
    "slide",
    "cut",
    "layoff",
    "warning",
  ];

  let score = 0;

  for (const word of positiveWords) {
    if (lowerText.includes(word)) score += 1;
  }

  for (const word of negativeWords) {
    if (lowerText.includes(word)) score -= 1;
  }

  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

const COMPANY_KEYWORDS: Record<string, string[]> = {
  AAPL: ["apple", "iphone", "ios", "mac"],
  MSFT: ["microsoft", "windows", "azure", "office"],
  NVDA: ["nvidia", "geforce", "rtx", "cuda"],
  GOOGL: ["google", "alphabet", "android", "youtube"],
  AMZN: ["amazon", "aws", "prime"],
  META: ["meta", "facebook", "instagram", "whatsapp"],
  TSLA: ["tesla", "elon musk", "electric vehicle", "ev"],
  AMD: ["amd", "radeon", "ryzen", "epyc"],
  INTC: ["intel", "core", "xeon"],
  NFLX: ["netflix", "streaming"],
};

function extractSymbols(text: string, querySymbol?: string): string[] {
  const symbols = new Set<string>();
  const lowerText = text.toLowerCase();

  if (querySymbol) {
    symbols.add(querySymbol);
  }

  for (const [symbol, keywords] of Object.entries(COMPANY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        symbols.add(symbol);
        break;
      }
    }
  }

  return Array.from(symbols);
}

export async function getNewsForStock(
  symbol: string,
  limit: number = 5
): Promise<NewsItem[]> {
  const companyKeywords = COMPANY_KEYWORDS[symbol] || [symbol.toLowerCase()];
  const query = companyKeywords.join(" OR ");

  const data = await fetchWithRateLimit<NewsApiResponse>("/everything", {
    q: query,
    language: "en",
    sortBy: "publishedAt",
    pageSize: limit.toString(),
  });

  if (!data || !data.articles) {
    return [];
  }

  return data.articles.map((article, index) => {
    const combinedText = `${article.title} ${article.description || ""}`;

    return {
      id: `${symbol}-${index}-${Date.now()}`,
      headline: article.title,
      summary: article.description || "",
      source: article.source.name,
      url: article.url,
      publishedAt: article.publishedAt,
      sentiment: classifySentiment(combinedText),
      symbols: extractSymbols(combinedText, symbol),
    };
  });
}

export async function getMarketNews(limit: number = 10): Promise<NewsItem[]> {
  const data = await fetchWithRateLimit<NewsApiResponse>("/top-headlines", {
    category: "business",
    country: "us",
    pageSize: limit.toString(),
  });

  if (!data || !data.articles) {
    return [];
  }

  return data.articles.map((article, index) => {
    const combinedText = `${article.title} ${article.description || ""}`;

    return {
      id: `market-${index}-${Date.now()}`,
      headline: article.title,
      summary: article.description || "",
      source: article.source.name,
      url: article.url,
      publishedAt: article.publishedAt,
      sentiment: classifySentiment(combinedText),
      symbols: extractSymbols(combinedText),
    };
  });
}
