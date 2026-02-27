// ABOUTME: Prevents repeated screener fetches when parent passes an unstable formula callback.
// ABOUTME: Reproduces callback identity churn from formula-related state updates.

import { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { ScreenerClient } from "@/app/[locale]/pulse/components/screener-client";
import type { Dictionary } from "@/lib/i18n";
import type { RecommendationFormulaSummary } from "@/lib/recommendations/types";
import type { Exchange, ScreenerResponse } from "@/lib/market-data/types";

let screenerFetchCount = 0;

vi.mock("@/app/[locale]/pulse/components/sticky-header", () => ({
  StickyHeader: () => null,
}));

vi.mock("@/app/[locale]/pulse/components/stock-table", () => ({
  StockTable: () => null,
}));

vi.mock("@/app/[locale]/pulse/components/stock-card", () => ({
  StockCardList: () => null,
}));

vi.mock("@/hooks/useLiveQuotes", () => ({
  useLiveQuotes: () => ({ quotes: {} }),
}));

vi.mock("@/hooks/usePreferences", () => ({
  usePreferences: () => ({
    preferences: {
      sortBy: "1m",
      sortDirection: "desc",
      limit: 50,
      exchange: "nasdaq",
      hiddenSymbols: { nasdaq: [], tlv: [] },
      showRecommendedOnly: true,
      preRecommendedState: null,
    },
    isLoaded: true,
    setSortBy: vi.fn(),
    setSortDirection: vi.fn(),
    setLimit: vi.fn(),
    setExchange: vi.fn(),
    hideStock: vi.fn(),
    setShowRecommendedOnly: vi.fn(),
    currentHiddenSymbols: [],
  }),
}));

const initialData: ScreenerResponse = {
  stocks: [],
  updatedAt: new Date().toISOString(),
  source: "cached",
  exchange: "nasdaq",
};

const dict = {
  screener: {
    sortBy: "Sort by",
    show: "Show",
    score: "Score",
    intraday: "Intraday",
    direction: "Direction",
    search: "Search",
    recommendedOnly: "Recommended",
    recommendedMode: "Recommended mode",
    exchange: "Exchange",
    nasdaq: "NASDAQ",
    tlv: "TLV",
    print: "Print",
    stock: "Stock",
    price: "Price",
    growth: "Growth",
    growth1d: "1D",
    growth5d: "5D",
    growth1m: "1M",
    growth3m: "3M",
    growth6m: "6M",
    growth12m: "12M",
    view: "View",
    noStocks: "No stocks",
    hide: "Hide",
    recommended: "Recommended",
    printOn: "On",
    printOff: "Off",
    printNone: "None",
    ordering: "Ordering",
    query: "Query",
    formula: "Formula",
    printDate: "Date",
    printTime: "Time",
  },
  aiAnalysis: {
    buy: "Buy",
    hold: "Hold",
    sell: "Sell",
  },
  settings: {
    recommendationsActive: "Formula",
  },
} as unknown as Dictionary;

function Harness() {
  const [activeFormulas, setActiveFormulas] = useState<Record<Exchange, RecommendationFormulaSummary | null>>({
    nasdaq: null,
    tlv: null,
  });

  return (
    <ScreenerClient
      initialData={initialData}
      dict={dict}
      onSelectStock={vi.fn()}
      selectedSymbol={null}
      activeFormulas={activeFormulas}
      onFormulaChange={(exchange, formula) => {
        setActiveFormulas((prev) => ({ ...prev, [exchange]: formula }));
      }}
      isAdmin={true}
      navContent={null}
    />
  );
}

describe("ScreenerClient formula callback behavior", () => {
  beforeEach(() => {
    screenerFetchCount = 0;

    global.fetch = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.includes("/api/screener?")) {
        screenerFetchCount += 1;
        return {
          ok: true,
          json: async () => ({
            stocks: [],
            updatedAt: new Date().toISOString(),
            source: "cached",
            exchange: "nasdaq",
            recommendation: {
              activeFormula: {
                id: "formula-1",
                name: "Formula 1",
                description: null,
                expression: "growth1m",
                status: "published",
                version: 1,
                updatedAt: "2026-02-14T00:00:00.000Z",
              },
            },
          }),
        } as Response;
      }

      if (url.includes("/api/daily-ai-badges?")) {
        return {
          ok: true,
          json: async () => ({ badges: {} }),
        } as Response;
      }

      if (url.includes("/api/analysis/badges?")) {
        return {
          ok: true,
          json: async () => ({ badges: {} }),
        } as Response;
      }

      throw new Error(`Unexpected fetch url: ${url}`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not refetch screener in a loop when callback identity changes", async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(screenerFetchCount).toBe(1);
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(screenerFetchCount).toBe(1);
  });
});
