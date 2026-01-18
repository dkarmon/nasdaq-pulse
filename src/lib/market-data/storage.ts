// ABOUTME: Upstash Redis storage helpers for caching stock data.
// ABOUTME: Provides read/write functions for quotes, profiles, and growth data.

import { Redis } from "@upstash/redis";
import type { Stock, CompanyProfile, HistoricalDataPoint } from "./types";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const KEYS = {
  STOCKS: "stocks",
  PROFILES: "profiles",
  HISTORY: "history",
  LAST_UPDATED: "last_updated",
};

// Stock data (for screener)
export async function saveStocks(stocks: Stock[]): Promise<void> {
  await redis.set(KEYS.STOCKS, JSON.stringify(stocks));
  await redis.set(KEYS.LAST_UPDATED, new Date().toISOString());
}

export async function getStocks(): Promise<Stock[]> {
  const data = await redis.get<string>(KEYS.STOCKS);
  if (!data) return [];
  return typeof data === "string" ? JSON.parse(data) : data;
}

// Company profiles
export async function saveProfile(symbol: string, profile: CompanyProfile): Promise<void> {
  await redis.hset(KEYS.PROFILES, { [symbol]: JSON.stringify(profile) });
}

export async function saveProfiles(profiles: Map<string, CompanyProfile>): Promise<void> {
  const entries: Record<string, string> = {};
  profiles.forEach((profile, symbol) => {
    entries[symbol] = JSON.stringify(profile);
  });
  if (Object.keys(entries).length > 0) {
    await redis.hset(KEYS.PROFILES, entries);
  }
}

export async function getProfile(symbol: string): Promise<CompanyProfile | null> {
  const data = await redis.hget<string>(KEYS.PROFILES, symbol);
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}

// Historical data (for charts)
export async function saveHistory(
  symbol: string,
  history: HistoricalDataPoint[]
): Promise<void> {
  await redis.hset(KEYS.HISTORY, { [symbol]: JSON.stringify(history) });
}

export async function getHistory(symbol: string): Promise<HistoricalDataPoint[]> {
  const data = await redis.hget<string>(KEYS.HISTORY, symbol);
  if (!data) return [];
  return typeof data === "string" ? JSON.parse(data) : data;
}

// Metadata
export async function getLastUpdated(): Promise<string | null> {
  return redis.get<string>(KEYS.LAST_UPDATED);
}

export async function isDataFresh(maxAgeHours = 24): Promise<boolean> {
  const lastUpdated = await getLastUpdated();
  if (!lastUpdated) return false;

  const lastUpdateTime = new Date(lastUpdated).getTime();
  const now = Date.now();
  const ageMs = now - lastUpdateTime;
  const ageHours = ageMs / (1000 * 60 * 60);

  return ageHours < maxAgeHours;
}

// Clear all data (for debugging)
export async function clearAll(): Promise<void> {
  await redis.del(KEYS.STOCKS);
  await redis.del(KEYS.PROFILES);
  await redis.del(KEYS.HISTORY);
  await redis.del(KEYS.LAST_UPDATED);
}
