// ABOUTME: Tests for expression-based recommendation scoring and filtering.

import { describe, it, expect } from "vitest";
import {
  calculateRecommendationScore,
  filterAndSortByRecommendation,
  hasValidRecommendationData,
  isStockRecommended,
} from "@/lib/market-data/recommendation";
import { defaultRecommendationFormula } from "@/lib/recommendations/config";
import type { RecommendationFormula } from "@/lib/recommendations/types";
import type { Stock } from "@/lib/market-data/types";

function makeStock(overrides: Partial<Stock> = {}): Stock {
  return {
    symbol: "TEST",
    name: "Test",
    exchange: "nasdaq",
    price: 100,
    currency: "USD",
    marketCap: 1_000_000_000,
    growth5d: 5,
    growth1m: 10,
    growth6m: 20,
    growth12m: 40,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("hasValidRecommendationData", () => {
  it("requires growth1m/6m/12m fields", () => {
    expect(hasValidRecommendationData(makeStock({ growth1m: undefined as any }))).toBe(false);
    expect(hasValidRecommendationData(makeStock({ growth6m: undefined as any }))).toBe(false);
    expect(hasValidRecommendationData(makeStock({ growth12m: undefined as any }))).toBe(false);
    expect(hasValidRecommendationData(makeStock())).toBe(true);
  });
});

describe("calculateRecommendationScore", () => {
  it("uses the seeded default expression", () => {
    const stock = makeStock({ growth5d: 10, growth1m: 20, growth6m: 40, growth12m: 60 });
    const score = calculateRecommendationScore(stock);
    expect(score).toBeCloseTo(51.24, 1);
  });

  it("returns null when required data is missing", () => {
    const score = calculateRecommendationScore(makeStock({ growth1m: undefined as any }));
    expect(score).toBeNull();
  });

  it("supports custom formulas", () => {
    const formula: RecommendationFormula = {
      ...defaultRecommendationFormula,
      id: "custom-1",
      expression: "g1m + g6m + g12m",
      status: "published",
      version: 2,
      name: "Sum",
    };
    const stock = makeStock({ growth1m: 1, growth6m: 2, growth12m: 3 });
    expect(calculateRecommendationScore(stock, formula)).toBeCloseTo(6, 4);
  });
});

describe("isStockRecommended", () => {
  it("uses cached score when present", () => {
    const stock = makeStock({ recommendationScore: 5, recommendationFormulaId: defaultRecommendationFormula.id });
    expect(isStockRecommended(stock)).toBe(true);
  });

  it("returns false when score is negative", () => {
    const stock = makeStock({ recommendationScore: -1 });
    expect(isStockRecommended(stock)).toBe(false);
  });
});

describe("filterAndSortByRecommendation", () => {
  it("filters to positive-scoring stocks and sorts descending", () => {
    const stocks = [
      makeStock({ symbol: "LOW", growth5d: 1, growth1m: 2, growth6m: 3, growth12m: 4 }),
      makeStock({ symbol: "HIGH", growth5d: 1, growth1m: 20, growth6m: 40, growth12m: 80 }),
      makeStock({ symbol: "MISS", growth1m: undefined as any }),
    ];
    const result = filterAndSortByRecommendation(stocks);
    expect(result.map((s) => s.symbol)).toEqual(["HIGH", "LOW"]);
    expect(result[0].recommendationScore).toBeGreaterThan(result[1].recommendationScore ?? 0);
  });
});
