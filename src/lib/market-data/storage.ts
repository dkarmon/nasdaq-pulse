// ABOUTME: Upstash Redis storage helpers for caching stock data.
// ABOUTME: Provides read/write functions for quotes, profiles, and growth data.

import { Redis } from "@upstash/redis";
import type { Stock, CompanyProfile, HistoricalDataPoint, Exchange } from "./types";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

/**
 * Returns exchange-specific Redis keys.
 */
function getKeys(exchange: Exchange) {
  return {
    STOCKS: `stocks:${exchange}`,
    LAST_UPDATED: `last_updated:${exchange}`,
    RUN_STATUS: `run_status:${exchange}`,
    SYMBOLS: `symbols:${exchange}`,
    SYMBOLS_UPDATED: `symbols_updated:${exchange}`,
  };
}

// Shared keys (not exchange-specific)
const SHARED_KEYS = {
  PROFILES: "profiles",
  HISTORY: "history",
};

// Stock data (for screener)
export async function saveStocks(stocks: Stock[], exchange: Exchange = "nasdaq"): Promise<void> {
  const keys = getKeys(exchange);
  await redis.set(keys.STOCKS, JSON.stringify(stocks));
  await redis.set(keys.LAST_UPDATED, new Date().toISOString());
}

export async function getStocks(exchange: Exchange = "nasdaq"): Promise<Stock[]> {
  const keys = getKeys(exchange);
  const data = await redis.get<string>(keys.STOCKS);
  if (!data) return [];
  return typeof data === "string" ? JSON.parse(data) : data;
}

// Company profiles (shared across exchanges - symbol includes .TA for TASE)
export async function saveProfile(symbol: string, profile: CompanyProfile): Promise<void> {
  await redis.hset(SHARED_KEYS.PROFILES, { [symbol]: JSON.stringify(profile) });
}

export async function saveProfiles(profiles: Map<string, CompanyProfile>): Promise<void> {
  const entries: Record<string, string> = {};
  profiles.forEach((profile, symbol) => {
    entries[symbol] = JSON.stringify(profile);
  });
  if (Object.keys(entries).length > 0) {
    await redis.hset(SHARED_KEYS.PROFILES, entries);
  }
}

export async function getProfile(symbol: string): Promise<CompanyProfile | null> {
  const data = await redis.hget<string>(SHARED_KEYS.PROFILES, symbol);
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}

// Historical data (shared - symbol includes .TA for TASE)
export async function saveHistory(
  symbol: string,
  history: HistoricalDataPoint[]
): Promise<void> {
  await redis.hset(SHARED_KEYS.HISTORY, { [symbol]: JSON.stringify(history) });
}

export async function getHistory(symbol: string): Promise<HistoricalDataPoint[]> {
  const data = await redis.hget<string>(SHARED_KEYS.HISTORY, symbol);
  if (!data) return [];
  return typeof data === "string" ? JSON.parse(data) : data;
}

// Metadata
export async function getLastUpdated(exchange: Exchange = "nasdaq"): Promise<string | null> {
  const keys = getKeys(exchange);
  return redis.get<string>(keys.LAST_UPDATED);
}

export async function isDataFresh(exchange: Exchange = "nasdaq", maxAgeHours = 24): Promise<boolean> {
  const lastUpdated = await getLastUpdated(exchange);
  if (!lastUpdated) return false;

  const lastUpdateTime = new Date(lastUpdated).getTime();
  const now = Date.now();
  const ageMs = now - lastUpdateTime;
  const ageHours = ageMs / (1000 * 60 * 60);

  return ageHours < maxAgeHours;
}

// Run status tracking
export type RunStatus = {
  range: string;
  startedAt: string;
  completedAt: string;
  success: boolean;
  processed: number;
  failed: number;
  totalSymbols: number;
  duration: string;
  errors: string[];
};

export async function saveRunStatus(status: RunStatus, exchange: Exchange = "nasdaq"): Promise<void> {
  const keys = getKeys(exchange);
  await redis.lpush(keys.RUN_STATUS, JSON.stringify(status));
  await redis.ltrim(keys.RUN_STATUS, 0, 9);
}

export async function getRunHistory(exchange: Exchange = "nasdaq"): Promise<RunStatus[]> {
  const keys = getKeys(exchange);
  const data = await redis.lrange<string>(keys.RUN_STATUS, 0, 9);
  if (!data || data.length === 0) return [];
  return data.map(item => typeof item === "string" ? JSON.parse(item) : item);
}

export async function getStockCount(exchange: Exchange = "nasdaq"): Promise<number> {
  const stocks = await getStocks(exchange);
  return stocks.length;
}

// Symbol list caching (for NASDAQ - TLV uses static list)
export async function saveSymbols(symbols: string[], exchange: Exchange = "nasdaq"): Promise<void> {
  const keys = getKeys(exchange);
  await redis.set(keys.SYMBOLS, JSON.stringify(symbols));
  await redis.set(keys.SYMBOLS_UPDATED, new Date().toISOString());
}

export async function getSymbols(exchange: Exchange = "nasdaq"): Promise<string[]> {
  const keys = getKeys(exchange);
  const data = await redis.get<string>(keys.SYMBOLS);
  if (!data) return [];
  return typeof data === "string" ? JSON.parse(data) : data;
}

export async function getSymbolsLastUpdated(exchange: Exchange = "nasdaq"): Promise<string | null> {
  const keys = getKeys(exchange);
  return redis.get<string>(keys.SYMBOLS_UPDATED);
}

export async function areSymbolsFresh(exchange: Exchange = "nasdaq", maxAgeHours = 24): Promise<boolean> {
  const lastUpdated = await getSymbolsLastUpdated(exchange);
  if (!lastUpdated) return false;

  const ageMs = Date.now() - new Date(lastUpdated).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  return ageHours < maxAgeHours;
}
