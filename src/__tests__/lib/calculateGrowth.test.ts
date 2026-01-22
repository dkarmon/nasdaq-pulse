// ABOUTME: Diagnostic tests for calculateGrowthByDays function.
// ABOUTME: Tests the date lookup logic with controlled timestamps.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateGrowthByDays, calculateGrowthByCalendarMonths } from "@/lib/market-data/yahoo";

describe("calculateGrowthByDays", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper to create timestamps in seconds (Yahoo format)
  function createTimestamps(startDate: Date, days: number): number[] {
    const timestamps: number[] = [];
    const current = new Date(startDate);
    for (let i = 0; i < days; i++) {
      // Skip weekends (simple approximation)
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Set to 4pm ET (market close) - 21:00 UTC
        current.setUTCHours(21, 0, 0, 0);
        timestamps.push(Math.floor(current.getTime() / 1000));
      }
      current.setDate(current.getDate() + 1);
    }
    return timestamps;
  }

  // Helper to create linear prices
  function createPrices(count: number, startPrice: number, increment: number): number[] {
    return Array.from({ length: count }, (_, i) => startPrice + i * increment);
  }

  it("calculates 5D growth correctly with 10 trading days of data", () => {
    // Set "now" to Wed Jan 22, 2026 at 2pm UTC
    const now = new Date("2026-01-22T14:00:00Z");
    vi.setSystemTime(now);

    // Create 10 trading days of data ending yesterday (Jan 21)
    // Start from Jan 8, 2026 (Wednesday)
    const timestamps = createTimestamps(new Date("2026-01-08T00:00:00Z"), 14);
    // Should give us ~10 trading days: Jan 8, 9, 12, 13, 14, 15, 16, 17, 20, 21

    // Prices: 100, 101, 102, 103, 104, 105, 106, 107, 108, 109
    const prices = createPrices(timestamps.length, 100, 1);

    // 5 days ago from Jan 22 = Jan 17 at 2pm UTC
    // Jan 17 is a Friday, so its timestamp (Jan 17 4pm ET = 21:00 UTC) should be found
    // That should be index 7 (Jan 8=0, 9=1, 12=2, 13=3, 14=4, 15=5, 16=6, 17=7)
    const growth5d = calculateGrowthByDays(prices, timestamps, 5);

    // Current price is prices[last] = 100 + (timestamps.length - 1)
    // Past price should be from ~5 days ago (not yesterday)
    // If it equals 1D growth, that's the bug!
    const currentPrice = prices[prices.length - 1];
    const yesterdayPrice = prices[prices.length - 2];
    const growth1d = ((currentPrice - yesterdayPrice) / yesterdayPrice) * 100;

    console.log("Timestamps:", timestamps.map(t => new Date(t * 1000).toISOString()));
    console.log("Prices:", prices);
    console.log("5D growth:", growth5d);
    console.log("1D growth:", growth1d);
    console.log("Current price:", currentPrice);
    console.log("Yesterday price:", yesterdayPrice);

    // 5D growth should NOT equal 1D growth (this is the bug we're looking for)
    expect(growth5d).not.toBe(growth1d);
  });

  it("returns correct past price index for 5 days ago", () => {
    // Set "now" to Wed Jan 22, 2026 at 11pm UTC (after market close)
    const now = new Date("2026-01-22T23:00:00Z");
    vi.setSystemTime(now);

    // Create timestamps for Jan 15, 16, 17, 20, 21 (5 trading days)
    // Market close is 4pm ET = 21:00 UTC
    const timestamps = [
      Math.floor(new Date("2026-01-15T21:00:00Z").getTime() / 1000), // Wed
      Math.floor(new Date("2026-01-16T21:00:00Z").getTime() / 1000), // Thu
      Math.floor(new Date("2026-01-17T21:00:00Z").getTime() / 1000), // Fri
      Math.floor(new Date("2026-01-20T21:00:00Z").getTime() / 1000), // Mon (skip weekend)
      Math.floor(new Date("2026-01-21T21:00:00Z").getTime() / 1000), // Tue
    ];
    const prices = [100, 101, 102, 103, 104]; // Each day +1

    // 5 days ago from Jan 22 11pm = Jan 17 11pm
    // Last timestamp <= Jan 17 11pm is Jan 17 21:00 (index 2)
    const growth5d = calculateGrowthByDays(prices, timestamps, 5);

    // Expected: (104 - 102) / 102 * 100 = 1.96%
    const expected5dGrowth = ((104 - 102) / 102) * 100;

    console.log("Expected 5D growth:", expected5dGrowth);
    console.log("Actual 5D growth:", growth5d);

    expect(growth5d).toBeCloseTo(expected5dGrowth, 2);
  });

  it("handles limited data (only 3 days) by using oldest available", () => {
    const now = new Date("2026-01-22T14:00:00Z");
    vi.setSystemTime(now);

    // Only 3 days of data: Jan 19, 20, 21
    const timestamps = [
      Math.floor(new Date("2026-01-19T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-20T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-21T21:00:00Z").getTime() / 1000),
    ];
    const prices = [100, 102, 104];

    // 5 days ago from Jan 22 = Jan 17, but we have no data that old
    // Should use the oldest available (Jan 19)
    const growth5d = calculateGrowthByDays(prices, timestamps, 5);

    // Expected: (104 - 100) / 100 * 100 = 4% (using oldest available)
    expect(growth5d).toBeCloseTo(4, 2);
  });

  it("handles weekend gap by using last price BEFORE target date", () => {
    const now = new Date("2026-01-22T14:00:00Z");
    vi.setSystemTime(now);

    // 4 days ago from Jan 22 (Wed) = Jan 18 (Saturday)
    // For growth calculation, we want the price from BEFORE the target (Friday's close)
    // not AFTER (Monday's open), because we want to measure the full period
    const timestamps = [
      Math.floor(new Date("2026-01-15T21:00:00Z").getTime() / 1000), // Wed
      Math.floor(new Date("2026-01-16T21:00:00Z").getTime() / 1000), // Thu
      Math.floor(new Date("2026-01-17T21:00:00Z").getTime() / 1000), // Fri
      Math.floor(new Date("2026-01-20T21:00:00Z").getTime() / 1000), // Mon
      Math.floor(new Date("2026-01-21T21:00:00Z").getTime() / 1000), // Tue
    ];
    const prices = [100, 101, 102, 103, 104];

    // 4 days ago = Saturday Jan 18
    // Should use Friday Jan 17 (last trading day on or BEFORE target)
    // NOT Monday Jan 20 (first trading day AFTER target)
    const growth4d = calculateGrowthByDays(prices, timestamps, 4);

    // Using Jan 17 (price 102): (104 - 102) / 102 * 100 = 1.96%
    const expectedGrowth = ((104 - 102) / 102) * 100;
    console.log("4D growth (weekend gap):", growth4d);
    console.log("Expected:", expectedGrowth);

    expect(growth4d).toBeCloseTo(expectedGrowth, 2);
  });

  it("uses correct past price when target date data is missing", () => {
    const now = new Date("2026-01-22T14:00:00Z");
    vi.setSystemTime(now);

    // Data is missing for Jan 17 (Friday) - simulates holiday or data gap
    const timestamps = [
      Math.floor(new Date("2026-01-15T21:00:00Z").getTime() / 1000), // Wed
      Math.floor(new Date("2026-01-16T21:00:00Z").getTime() / 1000), // Thu
      // Jan 17 is missing
      Math.floor(new Date("2026-01-20T21:00:00Z").getTime() / 1000), // Mon
      Math.floor(new Date("2026-01-21T21:00:00Z").getTime() / 1000), // Tue
    ];
    const prices = [100, 101, 103, 104];

    // 5 days ago = Fri Jan 17 at 2pm
    // Jan 17 is missing, so we should use Jan 16 (last available BEFORE target)
    // NOT Jan 20 (first available AFTER target)
    const growth5d = calculateGrowthByDays(prices, timestamps, 5);

    // Using Jan 16 (price 101): (104 - 101) / 101 * 100 = 2.97%
    const expectedGrowth = ((104 - 101) / 101) * 100;
    console.log("5D growth (missing data):", growth5d);
    console.log("Expected:", expectedGrowth);

    expect(growth5d).toBeCloseTo(expectedGrowth, 2);
  });

  it("5D growth must differ from 1D growth (regression test)", () => {
    const now = new Date("2026-01-22T14:00:00Z");
    vi.setSystemTime(now);

    // Create realistic data: 15 trading days with small daily changes
    const timestamps = [
      Math.floor(new Date("2026-01-02T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-03T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-06T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-07T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-08T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-09T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-10T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-13T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-14T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-15T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-16T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-17T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-20T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-21T21:00:00Z").getTime() / 1000),
    ];
    // Prices go from 100 to 113
    const prices = timestamps.map((_, i) => 100 + i);

    const growth5d = calculateGrowthByDays(prices, timestamps, 5);
    const growth1d = calculateGrowthByDays(prices, timestamps, 1);

    console.log("5D growth:", growth5d);
    console.log("1D growth:", growth1d);

    // These should be different values
    expect(growth5d).not.toBeCloseTo(growth1d, 2);
  });

  it("returns 0 for empty arrays", () => {
    vi.setSystemTime(new Date("2026-01-22T14:00:00Z"));
    expect(calculateGrowthByDays([], [], 5)).toBe(0);
  });

  it("returns 0 when past price is 0", () => {
    vi.setSystemTime(new Date("2026-01-22T14:00:00Z"));
    const timestamps = [
      Math.floor(new Date("2026-01-17T21:00:00Z").getTime() / 1000),
      Math.floor(new Date("2026-01-21T21:00:00Z").getTime() / 1000),
    ];
    const prices = [0, 100]; // Past price is 0
    expect(calculateGrowthByDays(prices, timestamps, 5)).toBe(0);
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
