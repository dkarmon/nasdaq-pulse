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

// Day counts for each period
const DAYS_5D = 5;
const DAYS_1M = 30;
const DAYS_6M = 180;
const DAYS_12M = 365;

/**
 * Calculates a recommendation score based on growth acceleration.
 * Formula: 2.5*(1M/5D)/25 + 2*(6M/1M)/150 + 1.5*(12M/6M)/185
 * Each ratio is normalized by the day difference between periods.
 * Higher weights for shorter-term acceleration emphasize recent momentum.
 */
export function calculateRecommendationScore(stock: Stock): number {
  const growth5d = stock.growth5d!;
  const ratio1 = stock.growth1m / growth5d / (DAYS_1M - DAYS_5D);
  const ratio2 = stock.growth6m / stock.growth1m / (DAYS_6M - DAYS_1M);
  const ratio3 = stock.growth12m / stock.growth6m / (DAYS_12M - DAYS_6M);
  return 2.5 * ratio1 + 2 * ratio2 + 1.5 * ratio3;
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
