// ABOUTME: TASE (Tel Aviv Stock Exchange) symbol utilities and data access.
// ABOUTME: Stock list sourced from Twelve Data API, saved as static JSON.

import taseStocksJson from "./tase-stocks.json";

export type TaseStock = {
  symbol: string;
  name: string;
  currency: string;
};

/**
 * All TASE stocks from Twelve Data API.
 * Source: https://api.twelvedata.com/stocks?exchange=TASE
 * Filtered to common stocks with letter symbols only.
 */
export const TASE_STOCKS: TaseStock[] = taseStocksJson;

/**
 * Hebrew name overrides for major TASE stocks.
 * Add entries here for stocks that need Hebrew display names.
 */
const HEBREW_NAMES: Record<string, string> = {
  LUMI: "בנק לאומי",
  TEVA: "טבע",
  ESLT: "אלביט מערכות",
  POLI: "בנק הפועלים",
  MZTF: "בנק מזרחי טפחות",
  AZRG: "קבוצת עזריאלי",
  TSEM: "טאואר סמיקונדקטור",
  DSCT: "בנק דיסקונט",
  NVMI: "נובה",
  PHOE: "הפניקס",
  HARL: "הראל ביטוח",
  FIBI: "הבנק הבינלאומי",
  MMHD: "מנורה מבטחים",
  OPCE: "או.פי.סי אנרגיה",
  NWMD: "ניומד אנרג'י",
  ORA: "אורמת",
  NICE: "נייס",
  ICL: "כיל",
  ENLT: "אנלייט",
  MLSR: "מליסרון",
  CAMT: "קמטק",
  BEZQ: "בזק",
  BIG: "ביג",
  MGDL: "מגדל ביטוח",
  CLIS: "כלל ביטוח",
  DLEKG: "קבוצת דלק",
  STRS: "שטראוס",
  AMOT: "עמות",
  SKBN: "שיכון ובינוי",
  MVNE: "מבנה נדל\"ן",
  SPEN: "שפיר הנדסה",
  FTAL: "פתאל",
  SAE: "שופרסל",
  TASE: "הבורסה",
  AFPR: "אפי נכסים",
  ISRO: "ישרוטל",
  MTAV: "מיטב",
  ENRG: "אנרג'יקס",
  ELAL: "אל על",
  ALHE: "אלוני חץ",
  MTRX: "מטריקס",
  ELTR: "אלקטרה",
  ASHG: "אשטרום",
  OSEM: "אוסם",
  GZIT: "גזית גלוב",
  ITRN: "איתוראן",
  KMDA: "קמהדע",
  UNIT: "יוניטרוניקס",
  SANO: "סנו",
};

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
  return HEBREW_NAMES[plainSymbol];
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
