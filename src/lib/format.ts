// ABOUTME: Shared formatting utilities for displaying numbers, prices, and percentages.
// ABOUTME: Consolidates formatting logic that was previously duplicated across components.

/**
 * Formats a growth percentage with sign prefix.
 * Shows one decimal place by default, or no decimals in compact mode.
 */
export function formatGrowth(value: number, compact?: boolean): string {
  const sign = value >= 0 ? "+" : "";
  const decimals = compact ? 0 : 1;
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Formats an intraday change percentage with exactly two decimals.
 */
export function formatIntraday(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Formats a price with currency symbol.
 * Shows two decimal places by default, or no decimals in compact mode.
 */
export function formatPrice(value: number, currency: string = "USD", compact?: boolean): string {
  const symbol = currency === "ILS" ? "₪" : "$";
  const decimals = compact ? 0 : 2;
  return `${symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Formats a market cap value with appropriate suffix (T, B, M).
 * Returns "N/A" for zero values.
 */
export function formatMarketCap(value: number): string {
  if (value === 0) return "N/A";
  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  return `$${value.toLocaleString()}`;
}
