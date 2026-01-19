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

    // Process sequentially with delays to avoid rate limiting
    const DELAY_BETWEEN_REQUESTS_MS = 1500; // 1.5 seconds between each request
    const failedSymbols: string[] = [];

    for (let idx = 0; idx < symbols.length; idx++) {
      const symbol = symbols[idx];

      // Progress logging every 50 symbols
      if (idx % 50 === 0 || idx === symbols.length - 1) {
        console.log(`Progress: ${idx + 1}/${symbols.length} (${result.processed} ok, ${result.failed} failed)`);
      }

      try {
        // Fetch quote+growth (skip market cap - it requires auth)
        const data = await getQuoteAndGrowth(symbol);

        if (!data) {
          result.failed++;
          failedSymbols.push(symbol);
          result.errors.push(`${symbol}: No data returned`);
          continue;
        }

        const stock: Stock = {
          symbol,
          name: data.quote.name,
          price: data.quote.price,
          marketCap: 0, // Skip market cap - requires crumb auth
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
        failedSymbols.push(symbol);
        result.errors.push(`${symbol}: ${String(error)}`);
      }

      // Wait between requests to avoid rate limiting
      if (idx < symbols.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS));
      }
    }

    // Log all failed symbols at the end
    if (failedSymbols.length > 0) {
      console.log(`\n=== FAILED SYMBOLS (${failedSymbols.length}) ===`);
      console.log(failedSymbols.join(', '));
      console.log('=== END FAILED SYMBOLS ===\n');
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
