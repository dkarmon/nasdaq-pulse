// ABOUTME: Pure functions for recommendation filtering and scoring logic.
// ABOUTME: Identifies stocks with consistent ascending growth patterns.

import type { Stock } from "./types";

/**
 * Checks if a stock has valid data for recommendation scoring.
 * All growth values must be at least 1% to qualify.
 */
export function hasValidRecommendationData(stock: Stock): boolean {
  if (stock.growth5d === undefined) return false;
  if (stock.growth5d < 1) return false;
  if (stock.growth1m < 1) return false;
  if (stock.growth6m < 1) return false;
  if (stock.growth12m < 1) return false;
  return true;
}

/**
 * Checks if a stock meets the recommendation criteria:
 * growth must be strictly ascending (5D < 1M < 6M < 12M).
 */
export function isRecommended(stock: Stock): boolean {
  if (stock.growth5d === undefined) return false;
  return (
    stock.growth5d < stock.growth1m &&
    stock.growth1m < stock.growth6m &&
    stock.growth6m < stock.growth12m
  );
}

/**
 * Calculates a recommendation score based on growth acceleration.
 * Formula: (3*(1M-5D)/25 + 2*(6M-1M)/150 + (12M-6M)/182) * avgGrowth
 * where avgGrowth = (5D + 1M + 6M + 12M) / 4
 */
export function calculateRecommendationScore(stock: Stock): number {
  const growth5d = stock.growth5d!;
  const diff1 = (3 * (stock.growth1m - growth5d)) / 25;
  const diff2 = (2 * (stock.growth6m - stock.growth1m)) / 150;
  const diff3 = (stock.growth12m - stock.growth6m) / 182;
  const baseScore = diff1 + diff2 + diff3;
  const avgGrowth = (growth5d + stock.growth1m + stock.growth6m + stock.growth12m) / 4;
  return baseScore * avgGrowth;
}

/**
 * Filters stocks to those meeting recommendation criteria with valid data,
 * then sorts by recommendation score descending (highest first).
 */
export function filterAndSortByRecommendation(stocks: Stock[]): Stock[] {
  const filtered = stocks.filter(
    (stock) => hasValidRecommendationData(stock) && isRecommended(stock)
  );

  return filtered.sort((a, b) => {
    const scoreA = calculateRecommendationScore(a);
    const scoreB = calculateRecommendationScore(b);
    return scoreB - scoreA;
  });
}
