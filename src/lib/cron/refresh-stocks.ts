// ABOUTME: Shared logic for refreshing stock data from Yahoo Finance.
// ABOUTME: Supports both NASDAQ and TLV exchanges with exchange-specific symbol sources.

import { getQuoteAndGrowth } from "@/lib/market-data/yahoo";
import {
  saveStocks,
  getStocks,
  saveRunStatus,
  saveSymbols,
  getSymbols,
  areSymbolsFresh,
} from "@/lib/market-data/storage";
import type { Stock, Exchange } from "@/lib/market-data/types";
import { getTaseSymbols, toYahooSymbol, getHebrewName, getEnglishName } from "@/lib/market-data/tase-symbols";

export type RefreshResult = {
  success: boolean;
  exchange: Exchange;
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
  const isFresh = await areSymbolsFresh("nasdaq", 24);

  if (isFresh) {
    const cached = await getSymbols("nasdaq");
    if (cached.length > 0) {
      console.log(`Using ${cached.length} cached NASDAQ symbols`);
      return cached;
    }
  }

  // Fetch fresh symbols from Finnhub
  console.log("Fetching fresh NASDAQ symbols from Finnhub...");
  const symbols = await fetchNasdaqSymbolsFromFinnhub();

  if (symbols.length > 0) {
    await saveSymbols(symbols, "nasdaq");
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

/**
 * Refresh NASDAQ stocks in a given alphabetical range.
 */
export async function refreshStocksInRange(
  startLetter: string,
  endLetter: string
): Promise<RefreshResult> {
  return refreshExchangeStocksInRange("nasdaq", startLetter, endLetter);
}

/**
 * Refresh all TLV (TASE) stocks.
 */
export async function refreshTlvStocks(): Promise<RefreshResult> {
  return refreshExchangeStocksInRange("tlv", "A", "Z");
}

/**
 * Internal function to refresh stocks for any exchange.
 */
async function refreshExchangeStocksInRange(
  exchange: Exchange,
  startLetter: string,
  endLetter: string
): Promise<RefreshResult> {
  const startTime = Date.now();
  const range = startLetter + "-" + endLetter;

  const result: RefreshResult = {
    success: false,
    exchange,
    range,
    processed: 0,
    failed: 0,
    totalSymbols: 0,
    duration: "0s",
    errors: [],
  };

  try {
    // Get symbols based on exchange
    let allSymbols: string[];
    if (exchange === "tlv") {
      allSymbols = getTaseSymbols();
      console.log(`Using ${allSymbols.length} TLV symbols from static list`);
    } else {
      allSymbols = await getNasdaqSymbols();
    }

    const symbols = filterByRange(allSymbols, startLetter, endLetter);
    result.totalSymbols = symbols.length;

    console.log(`Processing ${symbols.length} ${exchange.toUpperCase()} symbols in range ${range}`);

    // Get existing stocks to merge with
    const existingStocks = await getStocks(exchange);
    const stocksMap = new Map<string, Stock>();
    existingStocks.forEach(s => stocksMap.set(s.symbol, s));

    const DELAY_BETWEEN_REQUESTS_MS = 0;
    const failedSymbols: string[] = [];

    for (let idx = 0; idx < symbols.length; idx++) {
      const symbol = symbols[idx];
      // For TLV, convert to Yahoo format (add .TA suffix)
      const yahooSymbol = exchange === "tlv" ? toYahooSymbol(symbol) : symbol;

      // Progress logging every 50 symbols
      if (idx % 50 === 0 || idx === symbols.length - 1) {
        console.log(`Progress: ${idx + 1}/${symbols.length} (${result.processed} ok, ${result.failed} failed)`);
      }

      try {
        const data = await getQuoteAndGrowth(yahooSymbol);

        if (!data) {
          result.failed++;
          failedSymbols.push(symbol);
          result.errors.push(`${symbol}: No data returned`);
          continue;
        }

        // Get name based on exchange
        let name = data.quote.name;
        let nameHebrew: string | undefined;

        if (exchange === "tlv") {
          // Use English name from our list if Yahoo's name is poor
          const englishName = getEnglishName(symbol);
          if (englishName) {
            name = englishName;
          }
          nameHebrew = getHebrewName(symbol);
        }

        const stock: Stock = {
          symbol: yahooSymbol,
          name,
          nameHebrew,
          exchange,
          price: data.quote.price,
          currency: exchange === "tlv" ? "ILS" : "USD",
          marketCap: 0,
          growth1d: data.growth.growth1d,
          growth5d: data.growth.growth5d,
          growth1m: data.growth.growth1m,
          growth6m: data.growth.growth6m,
          growth12m: data.growth.growth12m,
          updatedAt: new Date().toISOString(),
          hasSplitWarning: data.hasSplitWarning || undefined,
        };

        stocksMap.set(yahooSymbol, stock);
        result.processed++;
      } catch (error) {
        result.failed++;
        failedSymbols.push(symbol);
        result.errors.push(`${symbol}: ${String(error)}`);
      }

      if (idx < symbols.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS));
      }
    }

    if (failedSymbols.length > 0) {
      console.log(`\n=== FAILED SYMBOLS (${failedSymbols.length}) ===`);
      console.log(failedSymbols.join(', '));
      console.log('=== END FAILED SYMBOLS ===\n');
    }

    // Save all stocks (merged)
    const allStocks = Array.from(stocksMap.values());
    allStocks.sort((a, b) => b.growth1m - a.growth1m);

    console.log(`Saving ${allStocks.length} total ${exchange.toUpperCase()} stocks to Redis...`);
    await saveStocks(allStocks, exchange);

    result.success = true;
    result.duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";

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
    }, exchange);

    console.log(`Refresh complete for ${exchange.toUpperCase()} range ${range} in ${result.duration}`);

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
    }, exchange);

    console.error(`Refresh failed for ${exchange.toUpperCase()} range ${range}:`, error);
    return result;
  }
}
