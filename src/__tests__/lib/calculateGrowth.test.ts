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

  it("1D uses yesterday's close (index -2) to skip today's partial data", () => {
    // During market hours, Yahoo returns today's partial data as the last element
    // prices = [... 3d ago, 2d ago, yesterday close, today partial]
    const prices = [252.66, 279.70, 250.23, 270.23]; // 270.23 is today's partial
    const currentPrice = 270.23;

    // 1D growth uses tradingDaysAgo=2 to skip today's partial data
    // prices[length - 2] = prices[2] = 250.23 (yesterday's close)
    const growth1d = calculateGrowthByTradingDays(prices, currentPrice, 2);

    // (270.23 - 250.23) / 250.23 * 100 = 7.99%
    expect(growth1d).toBeCloseTo(7.99, 1);
  });

  it("5D uses OPEN prices to match Google Finance", () => {
    // WDC actual data: using OPEN from 5 trading days back matches Google better
    // Jan 28 open: $263.45 (5 trading days back)
    // Current price: $287.41
    // Google shows: +10.99%, our open-based: +9.09%
    const openPrices = [244.09, 263.45, 285.00, 278.24, 243.76, 279.90];
    // Index:          Jan27   Jan28   Jan29   Jan30   Feb02   Feb03
    const currentPrice = 287.41;

    // 5 trading days back from Feb 3 = Jan 28 = openPrices[1] = 263.45
    // Using index: length(6) - 5 = 1
    const growth5d = calculateGrowthByTradingDays(openPrices, currentPrice, 5);

    // (287.41 - 263.45) / 263.45 * 100 = 9.09%
    expect(growth5d).toBeCloseTo(9.09, 1);
  });
});

describe("calculateGrowthByCalendarMonths", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses first trading day ON OR AFTER target date (Google Finance methodology)", () => {
    // Today is Feb 3, 2026 (Monday)
    // 6 months ago = Aug 3, 2025 (Sunday - not a trading day)
    // Google Finance uses Aug 4 (Monday), NOT Aug 1 (Friday)
    const now = new Date("2026-02-03T20:00:00Z");
    vi.setSystemTime(now);

    // Timestamps around Aug 3, 2025 (Sunday)
    const timestamps = [
      Math.floor(new Date("2025-08-01T20:00:00Z").getTime() / 1000), // Friday before
      Math.floor(new Date("2025-08-04T20:00:00Z").getTime() / 1000), // Monday after (first trading day ON OR AFTER)
      Math.floor(new Date("2025-08-05T20:00:00Z").getTime() / 1000),
      // ... more trading days
      Math.floor(new Date("2026-02-03T20:00:00Z").getTime() / 1000), // today
    ];
    // JFB example: Friday price = $6.99, Monday price = $8.20
    // Using Friday (our old behavior): growth = (27.20 - 6.99) / 6.99 = 289%
    // Using Monday (Google behavior): growth = (27.20 - 8.20) / 8.20 = 232%
    const prices = [6.99, 8.20, 8.50, 27.20];

    const growth6m = calculateGrowthByCalendarMonths(prices, timestamps, 6);

    // Should use Monday (Aug 4) price of $8.20, NOT Friday (Aug 1) price of $6.99
    // Growth = (27.20 - 8.20) / 8.20 * 100 = 231.7%
    expect(growth6m).toBeCloseTo(231.7, 0);
  });

  it("uses exact target date when it is a trading day", () => {
    // Today is Feb 3, 2026 (Monday)
    // 1 month ago = Jan 3, 2026 - let's assume this is a Friday (trading day)
    const now = new Date("2026-02-03T20:00:00Z");
    vi.setSystemTime(now);

    const timestamps = [
      Math.floor(new Date("2026-01-02T20:00:00Z").getTime() / 1000), // Thu Jan 2
      Math.floor(new Date("2026-01-03T20:00:00Z").getTime() / 1000), // Fri Jan 3 (target date)
      Math.floor(new Date("2026-01-06T20:00:00Z").getTime() / 1000), // Mon Jan 6
      Math.floor(new Date("2026-02-03T20:00:00Z").getTime() / 1000), // today
    ];
    const prices = [100, 105, 108, 115];

    const growth1m = calculateGrowthByCalendarMonths(prices, timestamps, 1);

    // Should use Jan 3 (price 105) since it's on the target date
    // Growth = (115 - 105) / 105 * 100 = 9.52%
    expect(growth1m).toBeCloseTo(9.52, 0);
  });

  it("supports 3M growth using the same calendar-month logic", () => {
    const now = new Date("2026-02-03T20:00:00Z");
    vi.setSystemTime(now);

    const timestamps = [
      Math.floor(new Date("2025-10-31T20:00:00Z").getTime() / 1000),
      Math.floor(new Date("2025-11-03T20:00:00Z").getTime() / 1000), // 3 months target date
      Math.floor(new Date("2026-02-03T20:00:00Z").getTime() / 1000),
    ];
    const prices = [100, 110, 132];

    const growth3m = calculateGrowthByCalendarMonths(prices, timestamps, 3);

    // (132 - 110) / 110 * 100 = 20%
    expect(growth3m).toBeCloseTo(20, 2);
  });

  it("returns 0 for empty prices array", () => {
    vi.setSystemTime(new Date("2026-02-03T20:00:00Z"));
    expect(calculateGrowthByCalendarMonths([], [], 1)).toBe(0);
  });

  it("uses most recent price as fallback when no prices after target date", () => {
    // Edge case: all timestamps are before target date
    const now = new Date("2026-02-03T20:00:00Z");
    vi.setSystemTime(now);

    // Only old data available (all before 6 months ago)
    const timestamps = [
      Math.floor(new Date("2025-07-01T20:00:00Z").getTime() / 1000),
      Math.floor(new Date("2025-07-02T20:00:00Z").getTime() / 1000),
    ];
    const prices = [100, 105];

    const growth6m = calculateGrowthByCalendarMonths(prices, timestamps, 6);

    // Falls back to most recent price (105)
    // Growth = (105 - 105) / 105 * 100 = 0%
    expect(growth6m).toBe(0);
  });
});
