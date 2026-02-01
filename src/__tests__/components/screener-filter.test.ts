// ABOUTME: Tests for screener search filtering behavior by exchange.
// ABOUTME: Verifies NASDAQ searches by ticker, TLV searches by Hebrew name.

import { describe, it, expect } from "vitest";
import type { Stock, Exchange } from "@/lib/market-data/types";

// Extract the filtering logic from screener-client.tsx for unit testing
function filterBySearch(
  stocks: Stock[],
  searchQuery: string
): Stock[] {
  if (!searchQuery) return stocks;

  const query = searchQuery.toLowerCase();
  return stocks.filter((stock) =>
    stock.exchange === "tlv"
      ? stock.nameHebrew?.toLowerCase().includes(query)
      : stock.symbol.toLowerCase().includes(query)
  );
}

const mockStock = (
  symbol: string,
  exchange: Exchange,
  nameHebrew?: string
): Stock => ({
  symbol,
  name: `${symbol} Inc`,
  exchange,
  nameHebrew,
  price: 100,
  currency: exchange === "tlv" ? "ILS" : "USD",
  marketCap: 1000000000,
  growth1m: 10,
  growth6m: 5,
  growth12m: 15,
  updatedAt: new Date().toISOString(),
});

describe("screener search filtering", () => {
  describe("NASDAQ stocks", () => {
    const nasdaqStocks = [
      mockStock("AAPL", "nasdaq"),
      mockStock("MSFT", "nasdaq"),
      mockStock("GOOGL", "nasdaq"),
    ];

    it("filters by ticker symbol", () => {
      const result = filterBySearch(nasdaqStocks, "AAPL");
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("AAPL");
    });

    it("is case insensitive", () => {
      const result = filterBySearch(nasdaqStocks, "aapl");
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("AAPL");
    });

    it("does NOT filter by company name", () => {
      const result = filterBySearch(nasdaqStocks, "Inc");
      expect(result).toHaveLength(0);
    });

    it("matches partial tickers", () => {
      const result = filterBySearch(nasdaqStocks, "MS");
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("MSFT");
    });
  });

  describe("TLV stocks", () => {
    const tlvStocks = [
      mockStock("ARYT.TA", "tlv", "אריתם טכנולוגיות"),
      mockStock("TEVA.TA", "tlv", "טבע תעשיות פרמצבטיות"),
      mockStock("ICL.TA", "tlv", "כיל ישראל כימיקלים"),
    ];

    it("filters by Hebrew name", () => {
      const result = filterBySearch(tlvStocks, "אריתם");
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("ARYT.TA");
    });

    it("is case insensitive for Hebrew", () => {
      // Hebrew doesn't have case, but test the lowercase behavior
      const result = filterBySearch(tlvStocks, "טבע");
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("TEVA.TA");
    });

    it("does NOT filter by ticker symbol", () => {
      const result = filterBySearch(tlvStocks, "ARYT");
      expect(result).toHaveLength(0);
    });

    it("does NOT filter by English name", () => {
      const result = filterBySearch(tlvStocks, "Inc");
      expect(result).toHaveLength(0);
    });

    it("matches partial Hebrew names", () => {
      const result = filterBySearch(tlvStocks, "ישראל");
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("ICL.TA");
    });

    it("handles stocks without Hebrew name", () => {
      const stocksWithMissingHebrew = [
        ...tlvStocks,
        mockStock("NOHE.TA", "tlv"), // No Hebrew name
      ];
      const result = filterBySearch(stocksWithMissingHebrew, "test");
      expect(result).toHaveLength(0);
    });
  });

  describe("mixed exchanges", () => {
    const mixedStocks = [
      mockStock("AAPL", "nasdaq"),
      mockStock("ARYT.TA", "tlv", "אריתם טכנולוגיות"),
    ];

    it("filters NASDAQ by ticker in mixed list", () => {
      const result = filterBySearch(mixedStocks, "AAPL");
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("AAPL");
    });

    it("filters TLV by Hebrew name in mixed list", () => {
      const result = filterBySearch(mixedStocks, "אריתם");
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("ARYT.TA");
    });

    it("ticker search does not match TLV stocks", () => {
      const result = filterBySearch(mixedStocks, "ARYT");
      expect(result).toHaveLength(0);
    });
  });

  describe("empty search", () => {
    const stocks = [mockStock("AAPL", "nasdaq")];

    it("returns all stocks when search is empty", () => {
      const result = filterBySearch(stocks, "");
      expect(result).toEqual(stocks);
    });
  });
});
