// ABOUTME: Shared omit-rule helpers used by APIs and background jobs.

import type { Exchange, OmitRule, OmitRulesConfig, Stock } from "./types";

function getStockFieldValue(stock: Stock, field: OmitRule["field"]): number | undefined {
  switch (field) {
    case "price":
      return stock.price;
    case "marketCap":
      return stock.marketCap;
    case "growth1d":
      return stock.growth1d;
    case "growth5d":
      return stock.growth5d;
    case "growth1m":
      return stock.growth1m;
    case "growth6m":
      return stock.growth6m;
    case "growth12m":
      return stock.growth12m;
  }
}

export function applyOmitRules(stocks: Stock[], rules: OmitRulesConfig | null, exchange: Exchange): Stock[] {
  if (!rules || !rules.enabled) return stocks;

  const exchangeRules = rules.rules[exchange];
  if (!exchangeRules || exchangeRules.length === 0) return stocks;

  return stocks.filter((stock) => {
    for (const rule of exchangeRules) {
      const value = getStockFieldValue(stock, rule.field);
      if (value === undefined) continue;

      if (rule.min != null && value < rule.min) return false;
      if (rule.max != null && value > rule.max) return false;
    }
    return true;
  });
}

