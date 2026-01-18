// ABOUTME: Shared logic for refreshing stock data from Finnhub.
// ABOUTME: Called by multiple cron jobs to process different letter ranges.

import { getQuote, getCompanyProfile, getGrowthData, getNasdaqSymbols } from "@/lib/market-data/finnhub";
import { saveStocks, getStocks, saveProfiles } from "@/lib/market-data/storage";
import type { Stock, CompanyProfile } from "@/lib/market-data/types";

export type RefreshResult = {
  success: boolean;
  range: string;
  processed: number;
  failed: number;
  totalSymbols: number;
  duration: string;
  errors: string[];
};

// Cache symbols in memory to avoid fetching every time
let cachedSymbols: string[] | null = null;
let symbolsCacheTime = 0;
const SYMBOLS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function getSymbols(): Promise<string[]> {
  const now = Date.now();
  if (cachedSymbols && (now - symbolsCacheTime) < SYMBOLS_CACHE_TTL) {
    return cachedSymbols;
  }

  console.log("Fetching NASDAQ symbols from Finnhub...");
  const symbols = await getNasdaqSymbols();
  console.log("Found " + symbols.length + " symbols");

  cachedSymbols = symbols;
  symbolsCacheTime = now;
  return symbols;
}

function filterByRange(symbols: string[], startLetter: string, endLetter: string): string[] {
  const start = startLetter.toUpperCase();
  const end = endLetter.toUpperCase();
  return symbols.filter(s => {
    const first = s.charAt(0).toUpperCase();
    return first >= start && first <= end;
  });
}

export async function refreshStocksInRange(
  startLetter: string,
  endLetter: string
): Promise<RefreshResult> {
  const startTime = Date.now();
  const range = startLetter + "-" + endLetter;

  const result: RefreshResult = {
    success: false,
    range,
    processed: 0,
    failed: 0,
    totalSymbols: 0,
    duration: "0s",
    errors: [],
  };

  try {
    // Get all symbols and filter by range
    const allSymbols = await getSymbols();
    const symbols = filterByRange(allSymbols, startLetter, endLetter);
    result.totalSymbols = symbols.length;

    console.log("Processing " + symbols.length + " symbols in range " + range);

    // Get existing stocks to merge with
    const existingStocks = await getStocks();
    const stocksMap = new Map<string, Stock>();
    existingStocks.forEach(s => stocksMap.set(s.symbol, s));

    const profiles = new Map<string, CompanyProfile>();

    // Process in batches to respect rate limits (60/min)
    // With 2 calls per stock (quote + candles), we can do ~30 stocks/min
    const BATCH_SIZE = 15;
    const DELAY_MS = 30000; // 30 seconds between batches

    for (let idx = 0; idx < symbols.length; idx += BATCH_SIZE) {
      const batch = symbols.slice(idx, idx + BATCH_SIZE);
      const batchNum = Math.floor(idx / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(symbols.length / BATCH_SIZE);
      console.log("Batch " + batchNum + "/" + totalBatches + " (" + batch.length + " symbols)");

      const batchPromises = batch.map(async (symbol) => {
        try {
          // Get quote and growth data (2 API calls)
          const [quote, growth] = await Promise.all([
            getQuote(symbol),
            getGrowthData(symbol),
          ]);

          if (!quote) {
            result.failed++;
            return;
          }

          // Get profile (only if we don't have it cached)
          let profile = null;
          if (!stocksMap.has(symbol)) {
            profile = await getCompanyProfile(symbol);
          }

          const stock: Stock = {
            symbol,
            name: profile?.name ?? stocksMap.get(symbol)?.name ?? symbol,
            price: quote.price,
            marketCap: profile?.marketCap ?? stocksMap.get(symbol)?.marketCap ?? 0,
            growth1m: growth?.growth1m ?? 0,
            growth6m: growth?.growth6m ?? 0,
            growth12m: growth?.growth12m ?? 0,
            updatedAt: new Date().toISOString(),
          };

          stocksMap.set(symbol, stock);

          if (profile) {
            profiles.set(symbol, {
              symbol,
              name: profile.name,
              exchange: profile.exchange,
              industry: profile.industry,
              marketCap: profile.marketCap,
              peRatio: profile.peRatio,
              week52High: profile.week52High,
              week52Low: profile.week52Low,
              logo: profile.logo,
            });
          }

          result.processed++;
        } catch (error) {
          result.failed++;
          result.errors.push(symbol + ": " + String(error));
        }
      });

      await Promise.all(batchPromises);

      // Wait between batches
      if (idx + BATCH_SIZE < symbols.length) {
        console.log("Waiting 30s for rate limits...");
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    // Save all stocks (merged)
    const allStocks = Array.from(stocksMap.values());
    allStocks.sort((a, b) => b.growth1m - a.growth1m);

    console.log("Saving " + allStocks.length + " total stocks to Redis...");
    await saveStocks(allStocks);

    if (profiles.size > 0) {
      await saveProfiles(profiles);
    }

    result.success = true;
    result.duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";

    console.log("Refresh complete for range " + range + " in " + result.duration);

    return result;
  } catch (error) {
    result.errors.push("Fatal: " + String(error));
    result.duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
    console.error("Refresh failed for range " + range + ":", error);
    return result;
  }
}
