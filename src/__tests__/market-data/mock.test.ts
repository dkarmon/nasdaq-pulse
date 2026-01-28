// ABOUTME: Tests for the mock market data provider.
// ABOUTME: Verifies screener data, filtering, sorting, and detail responses.

import { describe, it, expect } from "vitest";
import {
  getScreenerData,
  getStockDetail,
  getNews,
  getAllMockStocks,
} from "@/lib/market-data/mock";
import type { ScreenerParams } from "@/lib/market-data/types";

describe("Mock Market Data Provider", () => {
  describe("getScreenerData", () => {
    it("returns stocks sorted by 1m growth by default", () => {
      const params: ScreenerParams = {
        sortBy: "1m",
        limit: 10,
        filters: { minPrice: null },
        exchange: "nasdaq",
      };

      const result = getScreenerData(params);

      expect(result.stocks).toHaveLength(10);
      expect(result.source).toBe("cached");
      expect(result.updatedAt).toBeDefined();

      for (let i = 0; i < result.stocks.length - 1; i++) {
        expect(result.stocks[i].growth1m).toBeGreaterThanOrEqual(
          result.stocks[i + 1].growth1m
        );
      }
    });

    it("returns stocks sorted by 6m growth", () => {
      const params: ScreenerParams = {
        sortBy: "6m",
        limit: 10,
        filters: { minPrice: null },
        exchange: "nasdaq",
      };

      const result = getScreenerData(params);

      for (let i = 0; i < result.stocks.length - 1; i++) {
        expect(result.stocks[i].growth6m).toBeGreaterThanOrEqual(
          result.stocks[i + 1].growth6m
        );
      }
    });

    it("returns stocks sorted by 1d growth", () => {
      const params: ScreenerParams = {
        sortBy: "1d",
        limit: 10,
        filters: { minPrice: null },
        exchange: "nasdaq",
      };

      const result = getScreenerData(params);

      for (let i = 0; i < result.stocks.length - 1; i++) {
        expect((result.stocks[i].growth1d ?? 0)).toBeGreaterThanOrEqual(
          result.stocks[i + 1].growth1d ?? 0
        );
      }
    });

    it("returns stocks sorted by 12m growth", () => {
      const params: ScreenerParams = {
        sortBy: "12m",
        limit: 10,
        filters: { minPrice: null },
        exchange: "nasdaq",
      };

      const result = getScreenerData(params);

      for (let i = 0; i < result.stocks.length - 1; i++) {
        expect(result.stocks[i].growth12m).toBeGreaterThanOrEqual(
          result.stocks[i + 1].growth12m
        );
      }
    });

    it("respects the limit parameter", () => {
      const params: ScreenerParams = {
        sortBy: "1m",
        limit: 5,
        filters: { minPrice: null },
        exchange: "nasdaq",
      };

      const result = getScreenerData(params);

      expect(result.stocks).toHaveLength(5);
    });

    it("filters by minimum price", () => {
      const params: ScreenerParams = {
        sortBy: "1m",
        limit: 100,
        filters: { minPrice: 100 },
        exchange: "nasdaq",
      };

      const result = getScreenerData(params);

      for (const stock of result.stocks) {
        expect(stock.price).toBeGreaterThanOrEqual(100);
      }
    });

    it("returns all stocks when minPrice is null", () => {
      const paramsWithFilter: ScreenerParams = {
        sortBy: "1m",
        limit: 100,
        filters: { minPrice: 500 },
        exchange: "nasdaq",
      };

      const paramsWithoutFilter: ScreenerParams = {
        sortBy: "1m",
        limit: 100,
        filters: { minPrice: null },
        exchange: "nasdaq",
      };

      const filteredResult = getScreenerData(paramsWithFilter);
      const unfilteredResult = getScreenerData(paramsWithoutFilter);

      expect(unfilteredResult.stocks.length).toBeGreaterThanOrEqual(
        filteredResult.stocks.length
      );
    });
  });

  describe("getStockDetail", () => {
    it("returns detail for a known stock", () => {
      const result = getStockDetail("NVDA");

      expect(result).not.toBeNull();
      expect(result!.profile.symbol).toBe("NVDA");
      expect(result!.profile.name).toBe("NVIDIA Corporation");
      expect(result!.quote.symbol).toBe("NVDA");
      expect(result!.quote.price).toBeGreaterThan(0);
      expect(result!.history.length).toBeGreaterThan(0);
    });

    it("returns null for unknown stock", () => {
      const result = getStockDetail("UNKNOWN");

      expect(result).toBeNull();
    });

    it("generates 365 days of historical data", () => {
      const result = getStockDetail("AAPL");

      expect(result).not.toBeNull();
      expect(result!.history.length).toBe(366);
    });
  });

  describe("getNews", () => {
    it("returns all news when no symbol specified", () => {
      const result = getNews();

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.updatedAt).toBeDefined();
    });

    it("filters news by symbol", () => {
      const result = getNews("NVDA");

      for (const item of result.items) {
        expect(item.symbols).toContain("NVDA");
      }
    });

    it("returns empty array for stock with no news", () => {
      const result = getNews("COST");

      expect(result.items).toHaveLength(0);
    });
  });

  describe("getAllMockStocks", () => {
    it("returns all mock stocks", () => {
      const stocks = getAllMockStocks();

      expect(stocks.length).toBeGreaterThan(0);
      expect(stocks[0].symbol).toBeDefined();
      expect(stocks[0].name).toBeDefined();
      expect(stocks[0].price).toBeGreaterThan(0);
    });
  });
});
