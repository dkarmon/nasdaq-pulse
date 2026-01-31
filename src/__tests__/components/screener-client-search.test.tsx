// ABOUTME: Tests that screener search triggers fetch with unlimited results.
// ABOUTME: Verifies search queries cause full dataset fetch to find stocks outside top N.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScreenerClient } from "@/app/[locale]/pulse/components/screener-client";
import type { ScreenerResponse, Stock } from "@/lib/market-data/types";

// Track fetch calls
let fetchCalls: { url: string; params: URLSearchParams }[] = [];

const mockStock = (symbol: string, growth1m: number): Stock => ({
  symbol,
  name: `${symbol} Inc`,
  price: 100,
  marketCap: 1000000000,
  growth1d: 0,
  growth5d: 0,
  growth1m,
  growth6m: 0,
  growth12m: 0,
  exchange: "NASDAQ",
});

const topStocks = Array.from({ length: 50 }, (_, i) =>
  mockStock(`TOP${i + 1}`, 50 - i)
);

const allStocks = [
  ...topStocks,
  mockStock("PLTR", -18.9), // Outside top 50 due to negative growth
];

const mockInitialData: ScreenerResponse = {
  stocks: topStocks,
  updatedAt: new Date().toISOString(),
  source: "redis",
  recommendation: null,
};

const mockDict = {
  screener: {
    sortBy: "Sort by",
    show: "Show",
    search: "Search",
    recommendedOnly: "Recommended only",
    exchange: "Exchange",
    nasdaq: "NASDAQ",
    tlv: "Tel Aviv",
    stock: "Stock",
    price: "Price",
    growth: "Growth",
    growth1d: "1D",
    growth5d: "5D",
    growth1m: "1M",
    growth6m: "6M",
    growth12m: "12M",
    view: "View",
    noStocks: "No stocks",
    hide: "Hide",
    recommended: "Recommended",
  },
} as any;

// Mock usePreferences
vi.mock("@/hooks/usePreferences", () => ({
  usePreferences: () => ({
    preferences: {
      sortBy: "1m",
      limit: 50,
      exchange: "NASDAQ",
      showRecommendedOnly: false,
    },
    isLoaded: true,
    setSortBy: vi.fn(),
    setLimit: vi.fn(),
    setExchange: vi.fn(),
    hideStock: vi.fn(),
    setShowRecommendedOnly: vi.fn(),
    currentHiddenSymbols: [],
  }),
}));

// Mock useLiveQuotes
vi.mock("@/hooks/useLiveQuotes", () => ({
  useLiveQuotes: () => ({ quotes: {} }),
}));

describe("ScreenerClient search", () => {
  beforeEach(() => {
    fetchCalls = [];

    // Mock fetch to track calls and return appropriate data
    global.fetch = vi.fn(async (url: string) => {
      const urlObj = new URL(url, "http://localhost:3000");
      const params = urlObj.searchParams;
      fetchCalls.push({ url, params });

      const limit = parseInt(params.get("limit") || "50", 10);
      const stocks = limit >= 9999 ? allStocks : topStocks;

      return {
        ok: true,
        json: async () => ({
          stocks,
          updatedAt: new Date().toISOString(),
          source: "redis",
          recommendation: null,
        }),
      } as Response;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches all stocks when search query is entered", async () => {
    const user = userEvent.setup();

    render(
      <ScreenerClient
        initialData={mockInitialData}
        dict={mockDict}
        onSelectStock={vi.fn()}
        selectedSymbol={null}
        activeFormula={null}
        onFormulaChange={vi.fn()}
        isAdmin={false}
        navContent={<div>Nav</div>}
      />
    );

    // Wait for initial fetch (with default limit)
    await waitFor(() => {
      expect(fetchCalls.length).toBeGreaterThan(0);
    });

    const initialFetch = fetchCalls[fetchCalls.length - 1];
    expect(parseInt(initialFetch.params.get("limit") || "0", 10)).toBe(50);

    // Clear fetch calls to track only search-triggered fetches
    fetchCalls = [];

    // Find and interact with desktop search input
    const searchInputs = screen.getAllByPlaceholderText(/search/i);
    const searchInput = searchInputs[searchInputs.length - 1]; // Desktop input is second
    await user.type(searchInput, "PLTR");

    // Wait for debounced search to trigger fetch with large limit
    await waitFor(
      () => {
        const searchFetch = fetchCalls.find((call) => {
          const limit = parseInt(call.params.get("limit") || "0", 10);
          return limit >= 9999;
        });
        expect(searchFetch).toBeDefined();
      },
      { timeout: 1000 }
    );
  });

  it("filters by ticker symbol only, not company name", async () => {
    const user = userEvent.setup();

    // The mock data has stocks like TOP1, TOP2, etc. with names like "TOP1 Inc"
    // We'll search for "Inc" which appears in all names but no tickers
    render(
      <ScreenerClient
        initialData={mockInitialData}
        dict={mockDict}
        onSelectStock={vi.fn()}
        selectedSymbol={null}
        activeFormula={null}
        onFormulaChange={vi.fn()}
        isAdmin={false}
        navContent={<div>Nav</div>}
      />
    );

    // Wait for initial render - TOP1 should be visible (appears in both table and card)
    await waitFor(() => {
      expect(screen.getAllByText("TOP1").length).toBeGreaterThan(0);
    });

    const searchInputs = screen.getAllByPlaceholderText(/search/i);
    const searchInput = searchInputs[searchInputs.length - 1];

    // Search by ticker prefix - should find TOP1, TOP10, etc.
    await user.type(searchInput, "TOP1");
    await waitFor(() => {
      expect(screen.getAllByText("TOP1").length).toBeGreaterThan(0);
    });

    // Clear and search by company name fragment - should NOT find anything
    // All stocks have "Inc" in their name (e.g., "TOP1 Inc") but not in ticker
    await user.clear(searchInput);
    await user.type(searchInput, "Inc");

    // Wait for the filter to apply - no stocks should match "Inc" in ticker
    await waitFor(() => {
      expect(screen.queryAllByText("TOP1")).toHaveLength(0);
    });

    // The "no stocks" message should appear (appears in both table and card)
    expect(screen.getAllByText("No stocks").length).toBeGreaterThan(0);
  });

  it("reverts to normal limit when search is cleared", async () => {
    const user = userEvent.setup();

    render(
      <ScreenerClient
        initialData={mockInitialData}
        dict={mockDict}
        onSelectStock={vi.fn()}
        selectedSymbol={null}
        activeFormula={null}
        onFormulaChange={vi.fn()}
        isAdmin={false}
        navContent={<div>Nav</div>}
      />
    );

    // Wait for initial fetch
    await waitFor(() => {
      expect(fetchCalls.length).toBeGreaterThan(0);
    });

    fetchCalls = [];

    // Type search query - use desktop search input
    const searchInputs = screen.getAllByPlaceholderText(/search/i);
    const searchInput = searchInputs[searchInputs.length - 1];
    await user.type(searchInput, "PLTR");

    // Wait for search fetch
    await waitFor(
      () => {
        expect(fetchCalls.some((c) => parseInt(c.params.get("limit") || "0", 10) >= 9999)).toBe(true);
      },
      { timeout: 1000 }
    );

    fetchCalls = [];

    // Clear search
    await user.clear(searchInput);

    // Wait for fetch with normal limit
    await waitFor(
      () => {
        const normalFetch = fetchCalls.find((call) => {
          const limit = parseInt(call.params.get("limit") || "0", 10);
          return limit === 50;
        });
        expect(normalFetch).toBeDefined();
      },
      { timeout: 1000 }
    );
  });
});
