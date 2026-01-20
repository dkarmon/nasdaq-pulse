// ABOUTME: TASE (Tel Aviv Stock Exchange) symbol utilities and data access.
// ABOUTME: Stock list sourced from Twelve Data API, saved as static JSON.

import taseStocksJson from "./tase-stocks.json";

export type TaseStock = {
  symbol: string;
  name: string;
  nameHebrew?: string;
  currency: string;
};

/**
 * All TASE stocks from Twelve Data API.
 * Source: https://api.twelvedata.com/stocks?exchange=TASE
 * Filtered to common stocks with letter symbols only.
 */
export const TASE_STOCKS: TaseStock[] = taseStocksJson;

/**
 * Converts a TASE symbol to Yahoo Finance format by appending .TA suffix.
 */
export function toYahooSymbol(symbol: string): string {
  return `${symbol}.TA`;
}

/**
 * Converts a Yahoo Finance .TA symbol back to plain TASE symbol.
 */
export function fromYahooSymbol(yahooSymbol: string): string {
  return yahooSymbol.replace(/\.TA$/, "");
}

/**
 * Returns all TASE symbols (without .TA suffix).
 */
export function getTaseSymbols(): string[] {
  return TASE_STOCKS.map((s) => s.symbol);
}

/**
 * Returns the Hebrew name for a given symbol, if available.
 */
export function getHebrewName(symbol: string): string | undefined {
  const plainSymbol = fromYahooSymbol(symbol);
  return TASE_STOCKS.find((s) => s.symbol === plainSymbol)?.nameHebrew;
}

/**
 * Returns the English name for a given symbol, if available.
 */
export function getEnglishName(symbol: string): string | undefined {
  const plainSymbol = fromYahooSymbol(symbol);
  return TASE_STOCKS.find((s) => s.symbol === plainSymbol)?.name;
}

/**
 * Returns full stock info for a symbol.
 */
export function getTaseStockInfo(symbol: string): TaseStock | undefined {
  const plainSymbol = fromYahooSymbol(symbol);
  return TASE_STOCKS.find((s) => s.symbol === plainSymbol);
}

/**
 * Checks if a symbol is a TASE stock.
 */
export function isTaseSymbol(symbol: string): boolean {
  const plainSymbol = fromYahooSymbol(symbol);
  return TASE_STOCKS.some((s) => s.symbol === plainSymbol);
}
