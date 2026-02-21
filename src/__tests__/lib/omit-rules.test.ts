// ABOUTME: Tests for omit-rule filtering logic.
// ABOUTME: Validates that NaN, Infinity, and extreme growth values are handled correctly.

import { describe, it, expect } from "vitest";
import { applyOmitRules } from "@/lib/market-data/omit-rules";
import type { Stock, OmitRulesConfig } from "@/lib/market-data/types";

function makeStock(overrides: Partial<Stock> = {}): Stock {
  return {
    symbol: "TEST",
    name: "Test Stock",
    price: 50,
    previousClose: 48,
    marketCap: 1_000_000,
    growth1d: 2,
    growth5d: 5,
    growth1m: 10,
    growth6m: 20,
    growth12m: 30,
    ...overrides,
  } as Stock;
}

function makeRules(
  exchange: "nasdaq" | "tlv",
  rules: OmitRulesConfig["rules"][string]
): OmitRulesConfig {
  return {
    enabled: true,
    rules: { [exchange]: rules },
  } as OmitRulesConfig;
}

describe("applyOmitRules", () => {
  it("returns all stocks when rules are null", () => {
    const stocks = [makeStock()];
    expect(applyOmitRules(stocks, null, "nasdaq")).toEqual(stocks);
  });

  it("returns all stocks when rules are disabled", () => {
    const stocks = [makeStock()];
    const rules: OmitRulesConfig = { enabled: false, rules: {} };
    expect(applyOmitRules(stocks, rules, "nasdaq")).toEqual(stocks);
  });

  it("filters stocks exceeding max rule", () => {
    const stocks = [
      makeStock({ symbol: "OK", growth1m: 50 }),
      makeStock({ symbol: "HIGH", growth1m: 150 }),
    ];
    const rules = makeRules("nasdaq", [{ field: "growth1m", max: 100 }]);
    const result = applyOmitRules(stocks, rules, "nasdaq");
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("OK");
  });

  it("filters stocks below min rule", () => {
    const stocks = [
      makeStock({ symbol: "OK", growth1m: 10 }),
      makeStock({ symbol: "LOW", growth1m: -50 }),
    ];
    const rules = makeRules("nasdaq", [{ field: "growth1m", min: -20 }]);
    const result = applyOmitRules(stocks, rules, "nasdaq");
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("OK");
  });

  it("filters stocks with NaN growth values when max rule is set", () => {
    const stocks = [
      makeStock({ symbol: "NORMAL", growth1m: 50 }),
      makeStock({ symbol: "NAN_STOCK", growth1m: NaN }),
    ];
    const rules = makeRules("nasdaq", [{ field: "growth1m", max: 100 }]);
    const result = applyOmitRules(stocks, rules, "nasdaq");
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("NORMAL");
  });

  it("filters stocks with NaN growth values when min rule is set", () => {
    const stocks = [
      makeStock({ symbol: "NORMAL", growth1m: 5 }),
      makeStock({ symbol: "NAN_STOCK", growth1m: NaN }),
    ];
    const rules = makeRules("nasdaq", [{ field: "growth1m", min: -10 }]);
    const result = applyOmitRules(stocks, rules, "nasdaq");
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("NORMAL");
  });

  it("filters stocks with Infinity growth values", () => {
    const stocks = [
      makeStock({ symbol: "NORMAL", growth1m: 50 }),
      makeStock({ symbol: "INF_STOCK", growth1m: Infinity }),
      makeStock({ symbol: "NEG_INF", growth1m: -Infinity }),
    ];
    const rules = makeRules("nasdaq", [{ field: "growth1m", max: 100 }]);
    const result = applyOmitRules(stocks, rules, "nasdaq");
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("NORMAL");
  });

  it("filters extreme but finite values correctly (e.g. 8984.9%)", () => {
    const stocks = [
      makeStock({ symbol: "NORMAL", growth1m: 50 }),
      makeStock({ symbol: "EXTREME", growth1m: 8984.9 }),
    ];
    const rules = makeRules("nasdaq", [{ field: "growth1m", max: 100 }]);
    const result = applyOmitRules(stocks, rules, "nasdaq");
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("NORMAL");
  });

  it("applies rules per-exchange (TLV rules don't affect NASDAQ)", () => {
    const stocks = [makeStock({ symbol: "HIGH", growth1m: 150 })];
    const rules = makeRules("tlv", [{ field: "growth1m", max: 100 }]);
    const result = applyOmitRules(stocks, rules, "nasdaq");
    expect(result).toHaveLength(1);
  });

  it("applies TLV rules to TLV stocks", () => {
    const stocks = [makeStock({ symbol: "HIGH.TA", growth1m: 150 })];
    const rules = makeRules("tlv", [{ field: "growth1m", max: 100 }]);
    const result = applyOmitRules(stocks, rules, "tlv");
    expect(result).toHaveLength(0);
  });
});
