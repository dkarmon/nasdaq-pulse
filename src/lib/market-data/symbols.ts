// ABOUTME: Pinned NASDAQ symbols guaranteed to be fetched by the refresh job.
// ABOUTME: Merged with the Finnhub symbol list in getNasdaqSymbols().
// ABOUTME: Use this for stocks that Finnhub misclassifies or that are newly re-listed.

export const PINNED_NASDAQ_SYMBOLS: string[] = [
  // Re-listed / recently IPO'd stocks not yet reliably in Finnhub
  "SNDK", // SanDisk Inc. — re-listed 2025 after Western Digital spin-off
  "LITE", // Lumentum Holdings — occasionally missing from Yahoo Finance data
];
