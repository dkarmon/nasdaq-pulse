// ABOUTME: Tests static company info merge behavior in the market-data facade.
// ABOUTME: Ensures TLV stocks receive sector and descriptions from company-info fallback data.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/market-data/finnhub", () => ({
  getQuote: vi.fn(),
  getCompanyProfile: vi.fn(),
}));

vi.mock("@/lib/market-data/yahoo", () => ({
  getHistoricalData: vi.fn(),
  getQuoteAndGrowth: vi.fn(),
}));

vi.mock("@/lib/market-data/newsapi", () => ({
  getNewsForStock: vi.fn(),
  getMarketNews: vi.fn(),
}));

vi.mock("@/lib/market-data/mock", () => ({
  getScreenerData: vi.fn(),
  getStockDetail: vi.fn(),
  getNews: vi.fn(),
}));

vi.mock("@/lib/market-data/tase-symbols", () => ({
  getHebrewName: vi.fn(() => "אברא טכנולוגיות מידע"),
}));

import { getStockDetail } from "@/lib/market-data";
import * as finnhub from "@/lib/market-data/finnhub";
import * as mock from "@/lib/market-data/mock";
import * as yahoo from "@/lib/market-data/yahoo";

describe("Market Data Company Info Merge", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(finnhub.getCompanyProfile).mockResolvedValue(null);
    vi.mocked(mock.getStockDetail).mockReturnValue(null);

    vi.mocked(yahoo.getQuoteAndGrowth).mockResolvedValue({
      quote: {
        symbol: "ABRA.TA",
        price: 100,
        previousClose: 98,
        open: 99,
        name: "Abra Information Technologies Inc.",
        exchange: "TLV",
      },
      growth: {
        symbol: "ABRA.TA",
        currentPrice: 100,
        growth1d: 1,
        growth5d: 2,
        growth1m: 3,
        growth6m: 4,
        growth12m: 5,
      },
      history: [
        {
          date: "2026-02-10",
          open: 99,
          high: 101,
          low: 98,
          close: 100,
          volume: 1000,
        },
      ],
      hasSplitWarning: false,
    });
  });

  it("applies static TLV sector and descriptions when profile falls back to Yahoo", async () => {
    const result = await getStockDetail("ABRA.TA");

    expect(result).not.toBeNull();
    expect(result!.profile.symbol).toBe("ABRA.TA");
    expect(result!.profile.sector).toBe("Technology");
    expect(result!.profile.industry).toBe("IT Services");
    expect(result!.profile.description).toContain("Abra Information Technologies");
    expect(result!.profile.descriptionHebrew).toContain("אברא טכנולוגיות מידע");
  });
});
