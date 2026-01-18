// ABOUTME: Shared logic for refreshing stock data from Yahoo Finance.
// ABOUTME: Fetches NASDAQ symbols from Finnhub, caches in Redis, uses Yahoo for quotes.

import { getQuoteAndGrowth, getMarketCap } from "@/lib/market-data/yahoo";
import {
  saveStocks,
  getStocks,
  saveRunStatus,
  saveSymbols,
  getSymbols,
  areSymbolsFresh,
} from "@/lib/market-data/storage";
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

type FinnhubSymbol = {
  symbol: string;
  type: string;
  mic?: string;
};

async function fetchNasdaqSymbolsFromFinnhub(): Promise<string[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    console.error("FINNHUB_API_KEY not set");
    return [];
  }

  const url = `https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    console.error(`Finnhub API error: ${response.status}`);
    return [];
  }

  const allSymbols: FinnhubSymbol[] = await response.json();

  // NASDAQ MIC codes
  const nasdaqMics = ["XNAS", "XNGS", "XNCM"];

  // Filter for NASDAQ common stocks only
  const nasdaqSymbols = allSymbols
    .filter(s =>
      s.type === "Common Stock" &&
      s.mic && nasdaqMics.includes(s.mic) &&
      !s.symbol.includes(".") &&
      !s.symbol.includes("-") &&
      s.symbol.length <= 5
    )
    .map(s => s.symbol)
    .sort();

  console.log(`Fetched ${nasdaqSymbols.length} NASDAQ symbols from Finnhub`);
  return nasdaqSymbols;
}

async function getNasdaqSymbols(): Promise<string[]> {
  // Check if we have fresh symbols cached
  const isFresh = await areSymbolsFresh(24);

  if (isFresh) {
    const cached = await getSymbols();
    if (cached.length > 0) {
      console.log(`Using ${cached.length} cached NASDAQ symbols`);
      return cached;
    }
  }

  // Fetch fresh symbols from Finnhub
  console.log("Fetching fresh NASDAQ symbols from Finnhub...");
  const symbols = await fetchNasdaqSymbolsFromFinnhub();

  if (symbols.length > 0) {
    await saveSymbols(symbols);
  }

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
    // Get all NASDAQ symbols and filter by range
    const allSymbols = await getNasdaqSymbols();
    const symbols = filterByRange(allSymbols, startLetter, endLetter);
    result.totalSymbols = symbols.length;

    console.log(`Processing ${symbols.length} symbols in range ${range}`);

    // Get existing stocks to merge with
    const existingStocks = await getStocks();
    const stocksMap = new Map<string, Stock>();
    existingStocks.forEach(s => stocksMap.set(s.symbol, s));

    // Process in batches - Yahoo is generous, use larger batches
    const BATCH_SIZE = 20;
    const DELAY_MS = 1000; // 1 second between batches

    for (let idx = 0; idx < symbols.length; idx += BATCH_SIZE) {
      const batch = symbols.slice(idx, idx + BATCH_SIZE);
      const batchNum = Math.floor(idx / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(symbols.length / BATCH_SIZE);

      if (batchNum % 10 === 1 || batchNum === totalBatches) {
        console.log(`Batch ${batchNum}/${totalBatches} (${result.processed} processed, ${result.failed} failed)`);
      }

      const batchPromises = batch.map(async (symbol) => {
        try {
          // Fetch quote+growth and market cap in parallel
          const [data, marketCap] = await Promise.all([
            getQuoteAndGrowth(symbol),
            getMarketCap(symbol),
          ]);

          if (!data) {
            result.failed++;
            if (result.errors.length < 50) {
              result.errors.push(`${symbol}: No data`);
            }
            return;
          }

          const stock: Stock = {
            symbol,
            name: data.quote.name,
            price: data.quote.price,
            marketCap: marketCap,
            growth1m: data.growth.growth1m,
            growth6m: data.growth.growth6m,
            growth12m: data.growth.growth12m,
            updatedAt: new Date().toISOString(),
            hasSplitWarning: data.hasSplitWarning || undefined,
          };

          stocksMap.set(symbol, stock);
          result.processed++;
        } catch (error) {
          result.failed++;
          if (result.errors.length < 50) {
            result.errors.push(`${symbol}: ${String(error)}`);
          }
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

    console.log(`Saving ${allStocks.length} total stocks to Redis...`);
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

    console.log(`Refresh complete for range ${range} in ${result.duration}`);

    return result;
  } catch (error) {
    result.errors.push("Fatal: " + String(error));
    result.duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";

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

    console.error(`Refresh failed for range ${range}:`, error);
    return result;
  }
}
