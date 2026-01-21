// ABOUTME: Shared formatting utilities for displaying numbers, prices, and percentages.
// ABOUTME: Consolidates formatting logic that was previously duplicated across components.

/**
 * Formats a growth percentage with sign prefix.
 * Always shows one decimal place.
 */
export function formatGrowth(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Formats a price with currency symbol.
 * Shows two decimal places with thousands separators.
 */
export function formatPrice(value: number, currency: string = "USD"): string {
  const symbol = currency === "ILS" ? "₪" : "$";
  return `${symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
