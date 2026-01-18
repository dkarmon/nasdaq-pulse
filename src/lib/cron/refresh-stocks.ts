// ABOUTME: Shared logic for refreshing stock data from Yahoo Finance.
// ABOUTME: Called by cron jobs to process different letter ranges of NASDAQ stocks.

import { getQuoteAndGrowth } from "@/lib/market-data/yahoo";
import { saveStocks, getStocks, saveRunStatus } from "@/lib/market-data/storage";
import { NASDAQ_SYMBOLS } from "@/lib/market-data/symbols";
import type { Stock } from "@/lib/market-data/types";

export type RefreshResult = {
  success: boolean;
  range: string;
  processed: number;
  failed: number;
  totalSymbols: number;
  duration: string;
  errors: string[];
};

function filterByRange(symbols: readonly string[], startLetter: string, endLetter: string): string[] {
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
    // Filter curated NASDAQ symbols by range
    const symbols = filterByRange(NASDAQ_SYMBOLS, startLetter, endLetter);
    result.totalSymbols = symbols.length;

    console.log("Processing " + symbols.length + " symbols in range " + range);

    // Get existing stocks to merge with
    const existingStocks = await getStocks();
    const stocksMap = new Map<string, Stock>();
    existingStocks.forEach(s => stocksMap.set(s.symbol, s));

    // Process in batches (Yahoo is generous but let's be respectful)
    const BATCH_SIZE = 10;
    const DELAY_MS = 2000; // 2 seconds between batches

    for (let idx = 0; idx < symbols.length; idx += BATCH_SIZE) {
      const batch = symbols.slice(idx, idx + BATCH_SIZE);
      const batchNum = Math.floor(idx / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(symbols.length / BATCH_SIZE);
      console.log("Batch " + batchNum + "/" + totalBatches + " (" + batch.length + " symbols)");

      const batchPromises = batch.map(async (symbol) => {
        try {
          // Single API call gets quote + growth data
          const data = await getQuoteAndGrowth(symbol);

          if (!data) {
            result.failed++;
            result.errors.push(symbol + ": No data returned");
            return;
          }

          const stock: Stock = {
            symbol,
            name: data.quote.name,
            price: data.quote.price,
            marketCap: 0, // Yahoo chart endpoint doesn't include market cap
            growth1m: data.growth.growth1m,
            growth6m: data.growth.growth6m,
            growth12m: data.growth.growth12m,
            updatedAt: new Date().toISOString(),
          };

          stocksMap.set(symbol, stock);
          result.processed++;
        } catch (error) {
          result.failed++;
          result.errors.push(symbol + ": " + String(error));
        }
      });

      await Promise.all(batchPromises);

      // Wait between batches
      if (idx + BATCH_SIZE < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    // Save all stocks (merged)
    const allStocks = Array.from(stocksMap.values());
    allStocks.sort((a, b) => b.growth1m - a.growth1m);

    console.log("Saving " + allStocks.length + " total stocks to Redis...");
    await saveStocks(allStocks);

    result.success = true;
    result.duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";

    // Save run status
    await saveRunStatus({
      range: result.range,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      totalSymbols: result.totalSymbols,
      duration: result.duration,
      errors: result.errors.slice(0, 20),
    });

    console.log("Refresh complete for range " + range + " in " + result.duration);

    return result;
  } catch (error) {
    result.errors.push("Fatal: " + String(error));
    result.duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";

    // Save run status even on failure
    await saveRunStatus({
      range: result.range,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      success: false,
      processed: result.processed,
      failed: result.failed,
      totalSymbols: result.totalSymbols,
      duration: result.duration,
      errors: result.errors.slice(0, 20),
    });

    console.error("Refresh failed for range " + range + ":", error);
    return result;
  }
}
