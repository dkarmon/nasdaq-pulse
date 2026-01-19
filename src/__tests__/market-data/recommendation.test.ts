// ABOUTME: Tests for recommendation filtering and scoring logic.
// ABOUTME: Covers data validation, recommendation criteria, and scoring formula.

import { describe, it, expect } from "vitest";
import {
  hasValidRecommendationData,
  isRecommended,
  calculateRecommendationScore,
  filterAndSortByRecommendation,
} from "@/lib/market-data/recommendation";
import type { Stock } from "@/lib/market-data/types";

function makeStock(overrides: Partial<Stock>): Stock {
  return {
    symbol: "TEST",
    name: "Test Stock",
    exchange: "nasdaq",
    price: 100,
    currency: "USD",
    marketCap: 1000000000,
    growth1m: 10,
    growth6m: 20,
    growth12m: 30,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("hasValidRecommendationData", () => {
  it("returns false when growth5d is undefined", () => {
    const stock = makeStock({ growth5d: undefined });
    expect(hasValidRecommendationData(stock)).toBe(false);
  });

  it("returns false when growth5d is 0", () => {
    const stock = makeStock({ growth5d: 0 });
    expect(hasValidRecommendationData(stock)).toBe(false);
  });

  it("returns false when growth5d is negative", () => {
    const stock = makeStock({ growth5d: -5 });
    expect(hasValidRecommendationData(stock)).toBe(false);
  });

  it("returns false when growth1m is 0", () => {
    const stock = makeStock({ growth5d: 5, growth1m: 0 });
    expect(hasValidRecommendationData(stock)).toBe(false);
  });

  it("returns false when growth1m is negative", () => {
    const stock = makeStock({ growth5d: 5, growth1m: -3 });
    expect(hasValidRecommendationData(stock)).toBe(false);
  });

  it("returns false when growth6m is 0", () => {
    const stock = makeStock({ growth5d: 5, growth1m: 10, growth6m: 0 });
    expect(hasValidRecommendationData(stock)).toBe(false);
  });

  it("returns false when growth6m is negative", () => {
    const stock = makeStock({ growth5d: 5, growth1m: 10, growth6m: -2 });
    expect(hasValidRecommendationData(stock)).toBe(false);
  });

  it("returns false when growth12m is 0", () => {
    const stock = makeStock({ growth5d: 5, growth1m: 10, growth6m: 20, growth12m: 0 });
    expect(hasValidRecommendationData(stock)).toBe(false);
  });

  it("returns false when growth12m is negative", () => {
    const stock = makeStock({ growth5d: 5, growth1m: 10, growth6m: 20, growth12m: -5 });
    expect(hasValidRecommendationData(stock)).toBe(false);
  });

  it("returns false when values are below 1", () => {
    const stock = makeStock({ growth5d: 0.5, growth1m: 0.8, growth6m: 0.9, growth12m: 0.95 });
    expect(hasValidRecommendationData(stock)).toBe(false);
  });

  it("returns true when all values are at least 1", () => {
    const stock = makeStock({ growth5d: 1, growth1m: 2, growth6m: 3, growth12m: 4 });
    expect(hasValidRecommendationData(stock)).toBe(true);
  });

  it("returns true when all values are well above 1", () => {
    const stock = makeStock({ growth5d: 5, growth1m: 10, growth6m: 20, growth12m: 30 });
    expect(hasValidRecommendationData(stock)).toBe(true);
  });
});

describe("isRecommended", () => {
  it("returns true when growth is strictly ascending (5D < 1M < 6M < 12M)", () => {
    const stock = makeStock({ growth5d: 5, growth1m: 10, growth6m: 20, growth12m: 30 });
    expect(isRecommended(stock)).toBe(true);
  });

  it("returns false when growth5d is undefined", () => {
    const stock = makeStock({ growth5d: undefined, growth1m: 10, growth6m: 20, growth12m: 30 });
    expect(isRecommended(stock)).toBe(false);
  });

  it("returns false when 5D equals 1M", () => {
    const stock = makeStock({ growth5d: 10, growth1m: 10, growth6m: 20, growth12m: 30 });
    expect(isRecommended(stock)).toBe(false);
  });

  it("returns false when 5D > 1M", () => {
    const stock = makeStock({ growth5d: 15, growth1m: 10, growth6m: 20, growth12m: 30 });
    expect(isRecommended(stock)).toBe(false);
  });

  it("returns false when 1M equals 6M", () => {
    const stock = makeStock({ growth5d: 5, growth1m: 20, growth6m: 20, growth12m: 30 });
    expect(isRecommended(stock)).toBe(false);
  });

  it("returns false when 1M > 6M", () => {
    const stock = makeStock({ growth5d: 5, growth1m: 25, growth6m: 20, growth12m: 30 });
    expect(isRecommended(stock)).toBe(false);
  });

  it("returns false when 6M equals 12M", () => {
    const stock = makeStock({ growth5d: 5, growth1m: 10, growth6m: 30, growth12m: 30 });
    expect(isRecommended(stock)).toBe(false);
  });

  it("returns false when 6M > 12M", () => {
    const stock = makeStock({ growth5d: 5, growth1m: 10, growth6m: 35, growth12m: 30 });
    expect(isRecommended(stock)).toBe(false);
  });

  it("returns true with negative values as long as they are ascending", () => {
    const stock = makeStock({ growth5d: -20, growth1m: -10, growth6m: 5, growth12m: 15 });
    expect(isRecommended(stock)).toBe(true);
  });

  it("returns true with all negative ascending values", () => {
    const stock = makeStock({ growth5d: -40, growth1m: -30, growth6m: -20, growth12m: -10 });
    expect(isRecommended(stock)).toBe(true);
  });
});

describe("calculateRecommendationScore", () => {
  // Formula: [2.5*(1M/5D)/25 + 2*(6M/1M)/150 + 1.5*(12M/6M)/185] * (avg_growth/100)
  // Each ratio normalized by day difference between periods
  // Multiplied by average growth factor as decimal

  it("calculates score correctly with simple values", () => {
    // 5D=10, 1M=20, 6M=40, 12M=60
    // Base: 2.5*(20/10)/25 + 2*(40/20)/150 + 1.5*(60/40)/185
    // = 2.5*2/25 + 2*2/150 + 1.5*1.5/185
    // = 0.2 + 0.02667 + 0.01216 = 0.2388
    // Avg growth: (10+20+40+60)/4 = 32.5
    // Growth factor: 32.5/100 = 0.325
    // Final: 0.2388 * 0.325 ≈ 0.0776
    const stock = makeStock({ growth5d: 10, growth1m: 20, growth6m: 40, growth12m: 60 });
    expect(calculateRecommendationScore(stock)).toBeCloseTo(0.0776, 3);
  });

  it("calculates score correctly with equal ratios", () => {
    // 5D=1, 1M=2, 6M=4, 12M=8 (each doubles)
    // Base: 2.5*(2/1)/25 + 2*(4/2)/150 + 1.5*(8/4)/185
    // = 2.5*2/25 + 2*2/150 + 1.5*2/185
    // = 0.2 + 0.02667 + 0.01622 = 0.2429
    // Avg growth: (1+2+4+8)/4 = 3.75
    // Growth factor: 3.75/100 = 0.0375
    // Final: 0.2429 * 0.0375 ≈ 0.0091
    const stock = makeStock({ growth5d: 1, growth1m: 2, growth6m: 4, growth12m: 8 });
    expect(calculateRecommendationScore(stock)).toBeCloseTo(0.0091, 3);
  });

  it("returns higher score for steeper early growth", () => {
    // Stock A: 5D=1, 1M=10 (10x), 6M=20, 12M=30
    const stockA = makeStock({ growth5d: 1, growth1m: 10, growth6m: 20, growth12m: 30 });
    // Stock B: 5D=5, 1M=10 (2x), 6M=20, 12M=30
    const stockB = makeStock({ growth5d: 5, growth1m: 10, growth6m: 20, growth12m: 30 });

    expect(calculateRecommendationScore(stockA)).toBeGreaterThan(calculateRecommendationScore(stockB));
  });

  it("handles decimal values correctly", () => {
    // 5D=0.5, 1M=1.5, 6M=3, 12M=6
    // Base: 2.5*(1.5/0.5)/25 + 2*(3/1.5)/150 + 1.5*(6/3)/185
    // = 2.5*3/25 + 2*2/150 + 1.5*2/185
    // = 0.3 + 0.02667 + 0.01622 = 0.3429
    // Avg growth: (0.5+1.5+3+6)/4 = 2.75
    // Growth factor: 2.75/100 = 0.0275
    // Final: 0.3429 * 0.0275 ≈ 0.0094
    const stock = makeStock({ growth5d: 0.5, growth1m: 1.5, growth6m: 3, growth12m: 6 });
    expect(calculateRecommendationScore(stock)).toBeCloseTo(0.0094, 3);
  });
});

describe("filterAndSortByRecommendation", () => {
  it("returns empty array when given empty array", () => {
    expect(filterAndSortByRecommendation([])).toEqual([]);
  });

  it("filters out stocks without valid recommendation data", () => {
    const stocks = [
      makeStock({ symbol: "A", growth5d: undefined, growth1m: 10, growth6m: 20, growth12m: 30 }),
      makeStock({ symbol: "B", growth5d: 5, growth1m: 10, growth6m: 20, growth12m: 30 }),
      makeStock({ symbol: "C", growth5d: 0, growth1m: 10, growth6m: 20, growth12m: 30 }),
    ];
    const result = filterAndSortByRecommendation(stocks);
    expect(result.map(s => s.symbol)).toEqual(["B"]);
  });

  it("filters out non-recommended stocks", () => {
    const stocks = [
      makeStock({ symbol: "A", growth5d: 5, growth1m: 10, growth6m: 20, growth12m: 30 }), // ascending - recommended
      makeStock({ symbol: "B", growth5d: 15, growth1m: 10, growth6m: 20, growth12m: 30 }), // 5D > 1M - not recommended
      makeStock({ symbol: "C", growth5d: 5, growth1m: 10, growth6m: 8, growth12m: 30 }), // 6M < 1M - not recommended
    ];
    const result = filterAndSortByRecommendation(stocks);
    expect(result.map(s => s.symbol)).toEqual(["A"]);
  });

  it("sorts by recommendation score descending (highest first)", () => {
    const stocks = [
      // Lower score: 5D=5, 1M=10, 6M=20, 12M=30
      // 2.5*(10/5) + 2*(20/10) + 1.5*(30/20) = 5 + 4 + 2.25 = 11.25
      makeStock({ symbol: "LOW", growth5d: 5, growth1m: 10, growth6m: 20, growth12m: 30 }),
      // Higher score: 5D=1, 1M=10, 6M=20, 12M=30
      // 2.5*(10/1) + 2*(20/10) + 1.5*(30/20) = 25 + 4 + 2.25 = 31.25
      makeStock({ symbol: "HIGH", growth5d: 1, growth1m: 10, growth6m: 20, growth12m: 30 }),
      // Medium score: 5D=2, 1M=10, 6M=20, 12M=30
      // 2.5*(10/2) + 2*(20/10) + 1.5*(30/20) = 12.5 + 4 + 2.25 = 18.75
      makeStock({ symbol: "MED", growth5d: 2, growth1m: 10, growth6m: 20, growth12m: 30 }),
    ];
    const result = filterAndSortByRecommendation(stocks);
    expect(result.map(s => s.symbol)).toEqual(["HIGH", "MED", "LOW"]);
  });

  it("handles stocks with equal scores maintaining stable sort", () => {
    const stocks = [
      makeStock({ symbol: "A", growth5d: 5, growth1m: 10, growth6m: 20, growth12m: 30 }),
      makeStock({ symbol: "B", growth5d: 5, growth1m: 10, growth6m: 20, growth12m: 30 }),
    ];
    const result = filterAndSortByRecommendation(stocks);
    expect(result).toHaveLength(2);
    // Both should be present (order doesn't matter for equal scores)
    expect(result.map(s => s.symbol).sort()).toEqual(["A", "B"]);
  });

  it("works with a mix of valid and invalid stocks", () => {
    const stocks = [
      makeStock({ symbol: "INVALID1", growth5d: undefined }),
      makeStock({ symbol: "HIGH", growth5d: 1, growth1m: 10, growth6m: 20, growth12m: 30 }),
      makeStock({ symbol: "INVALID2", growth5d: 0, growth1m: 10, growth6m: 20, growth12m: 30 }),
      makeStock({ symbol: "LOW", growth5d: 5, growth1m: 10, growth6m: 20, growth12m: 30 }),
      makeStock({ symbol: "INVALID3", growth5d: 20, growth1m: 10, growth6m: 20, growth12m: 30 }), // not ascending
      makeStock({ symbol: "MED", growth5d: 2, growth1m: 10, growth6m: 20, growth12m: 30 }),
    ];
    const result = filterAndSortByRecommendation(stocks);
    expect(result.map(s => s.symbol)).toEqual(["HIGH", "MED", "LOW"]);
  });
});
