// ABOUTME: Tests that stock detail displays live price for recommended stocks.
// ABOUTME: Verifies fallback to API price when no live quote available.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock the PriceChart component
vi.mock("@/app/[locale]/pulse/components/price-chart", () => ({
  PriceChart: () => <div data-testid="mock-price-chart">Chart</div>,
}));

// Mock useLiveQuotes hook
const mockUseLiveQuotes = vi.fn();
vi.mock("@/hooks/useLiveQuotes", () => ({
  useLiveQuotes: (symbols: string[]) => mockUseLiveQuotes(symbols),
}));

// Mock recommendation check
vi.mock("@/lib/market-data/recommendation", () => ({
  isStockRecommended: () => true,
}));

import { StockDetail } from "@/app/[locale]/pulse/components/stock-detail";

const mockStockDetail = {
  profile: {
    symbol: "AAPL",
    name: "Apple Inc.",
    sector: "Technology",
    industry: "Consumer Electronics",
    marketCap: 2800000000000,
    website: "https://apple.com",
    description: "Technology company",
    descriptionHebrew: null,
  },
  quote: {
    price: 150.0, // Static price from API
    change: 2.5,
    changePercent: 1.4,
  },
  history: [],
  growth1d: 0.6,
  growth5d: 1.2,
  growth1m: 3.5,
  growth6m: 12.4,
  growth12m: 25.8,
  nameHebrew: null,
};

const mockLabels = {
  backToList: "Back",
  price: "Price",
  growth1d: "1D",
  growth5d: "5D",
  growth1m: "1M",
  growth6m: "6M",
  growth12m: "12M",
  pe: "P/E",
  week52Range: "52W Range",
  latestNews: "Latest News",
  noNews: "No news",
  viewAllNews: "View all",
  live: "Live",
  loading: "Loading",
  error: "Error",
  recommended: "Recommended",
  sector: "Sector",
  industry: "Industry",
  marketCap: "Market Cap",
  companyOverview: "Overview",
  website: "Website",
};

const mockAiAnalysisLabels = {
  title: "Analysis",
  generate: "Generate Analysis",
  refresh: "Refresh",
  updated: "Updated",
  notEnoughNews: "Not enough recent news",
  generating: "Generating...",
  error: "Failed to generate",
  buy: "Buy",
  hold: "Hold",
  sell: "Sell",
};

describe("StockDetail live price display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/stock/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStockDetail),
        } as Response);
      }
      if (urlStr.includes("/api/news/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [] }),
        } as Response);
      }
      return Promise.reject(new Error("Unknown URL"));
    });
  });

  it("displays live price when available for recommended stock", async () => {
    // Mock useLiveQuotes to return a live quote with different price
    mockUseLiveQuotes.mockReturnValue({
      quotes: {
        AAPL: {
          symbol: "AAPL",
          price: 175.5, // Live price differs from static
          previousClose: 170.0,
          change: 5.5,
          changePercent: 3.24,
        },
      },
      isLoading: false,
      error: null,
      fetchedAt: "2024-01-15T10:00:00Z",
    });

    render(
      <StockDetail
        symbol="AAPL"
        onClose={() => {}}
        locale="en"
        labels={mockLabels}
        aiAnalysisLabels={mockAiAnalysisLabels}
      />
    );

    await waitFor(() => {
      // Should display the live price, not the static price
      expect(screen.getByText(/\$175\.50/)).toBeInTheDocument();
    });

    // Static price should NOT be displayed
    expect(screen.queryByText(/\$150\.00/)).not.toBeInTheDocument();
  });

  it("displays static price when no live quote available", async () => {
    // Mock useLiveQuotes to return empty quotes
    mockUseLiveQuotes.mockReturnValue({
      quotes: {},
      isLoading: false,
      error: null,
      fetchedAt: null,
    });

    render(
      <StockDetail
        symbol="AAPL"
        onClose={() => {}}
        locale="en"
        labels={mockLabels}
        aiAnalysisLabels={mockAiAnalysisLabels}
      />
    );

    await waitFor(() => {
      // Should display the static price from API
      expect(screen.getByText(/\$150\.00/)).toBeInTheDocument();
    });
  });

  it("displays live intraday change when available", async () => {
    mockUseLiveQuotes.mockReturnValue({
      quotes: {
        AAPL: {
          symbol: "AAPL",
          price: 175.5,
          previousClose: 170.0,
          change: 5.5,
          changePercent: 3.24,
        },
      },
      isLoading: false,
      error: null,
      fetchedAt: "2024-01-15T10:00:00Z",
    });

    render(
      <StockDetail
        symbol="AAPL"
        onClose={() => {}}
        locale="en"
        labels={mockLabels}
        aiAnalysisLabels={mockAiAnalysisLabels}
      />
    );

    await waitFor(() => {
      // Should display the intraday change percentage (formatted to 1 decimal)
      expect(screen.getByText(/\+3\.2%/)).toBeInTheDocument();
    });
  });
});
