// ABOUTME: Tests for Hebrew name display in TLV (Tel Aviv) stocks.
// ABOUTME: Verifies Hebrew names are returned in stock detail responses for TASE stocks.

import { describe, it, expect } from "vitest";
import { getHebrewName } from "@/lib/market-data/tase-symbols";

describe("Hebrew Names for TLV Stocks", () => {
  describe("getHebrewName", () => {
    it("returns Hebrew name for known TLV symbol", () => {
      const hebrewName = getHebrewName("LUMI");
      expect(hebrewName).toBe("בנק לאומי");
    });

    it("returns Hebrew name for Yahoo-format symbol with .TA suffix", () => {
      const hebrewName = getHebrewName("LUMI.TA");
      expect(hebrewName).toBe("בנק לאומי");
    });

    it("returns undefined for unknown symbol", () => {
      const hebrewName = getHebrewName("AAPL");
      expect(hebrewName).toBeUndefined();
    });

    it("returns undefined for NASDAQ stock", () => {
      const hebrewName = getHebrewName("NVDA");
      expect(hebrewName).toBeUndefined();
    });
  });
});
