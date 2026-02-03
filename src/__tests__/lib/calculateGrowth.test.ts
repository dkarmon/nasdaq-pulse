// ABOUTME: Tests for growth calculation functions.
// ABOUTME: Validates trading-day based growth calculations against live prices.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateGrowthByTradingDays, calculateGrowthByCalendarMonths } from "@/lib/market-data/yahoo";

describe("calculateGrowthByTradingDays", () => {
  it("calculates 1D growth: live price vs yesterday's close", () => {
    // prices array contains historical close prices (most recent = yesterday)
    const prices = [100, 101, 102, 103, 104]; // yesterday's close = 104
    const currentPrice = 106; // live price

    // 1 trading day back = prices[length - 1] = 104 (yesterday)
    const growth = calculateGrowthByTradingDays(prices, currentPrice, 1);

    // (106 - 104) / 104 * 100 = 1.92%
    expect(growth).toBeCloseTo(1.92, 2);
  });

  it("calculates 5D growth: live price vs 5 trading days ago", () => {
    // prices array: [5d ago, 4d ago, 3d ago, 2d ago, yesterday]
    const prices = [100, 102, 104, 106, 108];
    const currentPrice = 110;

    // 5 trading days back = prices[length - 5] = prices[0] = 100
    const growth = calculateGrowthByTradingDays(prices, currentPrice, 5);

    // (110 - 100) / 100 * 100 = 10%
    expect(growth).toBeCloseTo(10, 2);
  });

  it("uses oldest available when not enough trading days exist", () => {
    // Only 3 days of data
    const prices = [100, 105, 110];
    const currentPrice = 115;

    // 5 trading days back requested, but only 3 exist
    // Should use prices[0] = 100 (oldest available)
    const growth = calculateGrowthByTradingDays(prices, currentPrice, 5);

    // (115 - 100) / 100 * 100 = 15%
    expect(growth).toBeCloseTo(15, 2);
  });

  it("returns 0 for empty prices array", () => {
    expect(calculateGrowthByTradingDays([], 100, 1)).toBe(0);
  });

  it("returns 0 when past price is 0", () => {
    const prices = [0, 50, 100];
    const currentPrice = 110;

    // 5 trading days back = prices[0] = 0
    const growth = calculateGrowthByTradingDays(prices, currentPrice, 5);
    expect(growth).toBe(0);
  });

  it("handles single price entry", () => {
    const prices = [100];
    const currentPrice = 110;

    // 1 trading day back = prices[0] = 100
    const growth = calculateGrowthByTradingDays(prices, currentPrice, 1);

    // (110 - 100) / 100 * 100 = 10%
    expect(growth).toBeCloseTo(10, 2);
  });

  it("WDC regression: 5D should show positive growth not negative", () => {
    // Based on actual WDC data from plan:
    // Yesterday (Feb 02) close: $270.23 (end of prices array)
    // Jan 30 close: $250.23
    // Jan 29 close: $278.41
    // Jan 28 close: $279.70
    // Jan 27 close: $252.66 (5 trading days back)
    const prices = [252.66, 279.70, 278.41, 250.23, 270.23];
    const currentPrice = 270.23;

    // 5 trading days back = prices[0] = 252.66
    const growth5d = calculateGrowthByTradingDays(prices, currentPrice, 5);

    // (270.23 - 252.66) / 252.66 * 100 = 6.95%
    expect(growth5d).toBeCloseTo(6.95, 1);
    expect(growth5d).toBeGreaterThan(0); // Critical: should be positive, not -3.4%
  });

  it("WDC regression: 1D should show near-zero when price unchanged", () => {
    // Live price equals yesterday's close
    const prices = [252.66, 279.70, 278.41, 250.23, 270.23];
    const currentPrice = 270.23;

    // 1 trading day back = prices[4] = 270.23 (yesterday)
    const growth1d = calculateGrowthByTradingDays(prices, currentPrice, 1);

    // (270.23 - 270.23) / 270.23 * 100 = 0%
    expect(growth1d).toBeCloseTo(0, 2);
  });
});

describe("calculateGrowthByCalendarMonths", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates 1 month growth correctly", () => {
    // Use 11pm UTC (after market close) so that the target day's close is included
    const now = new Date("2026-01-22T23:00:00Z");
    vi.setSystemTime(now);

    // 1 month ago = Dec 22 at 11pm
    const timestamps = [
      Math.floor(new Date("2025-12-20T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2025-12-21T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2025-12-22T21:00:00Z").getTime() / 1000), // 1 month ago
      Math.floor(new Date("2025-12-23T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-20T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-21T21:00:00Z").getTime() / 1000),
    ];
    const prices = [95, 96, 100, 101, 108, 110];

    const growth1m = calculateGrowthByCalendarMonths(prices, timestamps, 1);

    // Last timestamp <= Dec 22 11pm is Dec 22 21:00 (price 100)
    // Current price is 110
    // Growth = (110 - 100) / 100 * 100 = 10%
    expect(growth1m).toBeCloseTo(10, 2);
  });
});
