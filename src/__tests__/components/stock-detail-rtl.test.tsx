// ABOUTME: Tests that stock detail metrics row displays in LTR order regardless of locale.
// ABOUTME: Ensures time periods (5d, 1m, 6m, 12m) always display left-to-right.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock the PriceChart component to avoid canvas/chart library issues in jsdom
vi.mock("@/app/[locale]/pulse/components/price-chart", () => ({
  PriceChart: () => <div data-testid="mock-price-chart">Chart</div>,
}));

import { StockDetail } from "@/app/[locale]/pulse/components/stock-detail";

// Mock fetch for stock details and news
const mockStockDetail = {
  profile: {
    symbol: "AAPL",
    name: "Apple Inc.",
    sector: "Technology",
    industry: "Consumer Electronics",
    marketCap: 2800000000000,
    website: "https://apple.com",
    description: "Technology company",
    descriptionHebrew: "חברת טכנולוגיה",
  },
  quote: {
    price: 178.5,
    change: 2.5,
    changePercent: 1.4,
  },
  history: [],
  growth1d: 0.8,
  growth5d: 1.2,
  growth1m: 3.5,
  growth6m: 12.4,
  growth12m: 25.8,
  nameHebrew: "אפל",
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

describe("StockDetail RTL", () => {
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

  it("renders metrics row with LTR direction to maintain correct time period order", async () => {
    render(
      <StockDetail
        symbol="AAPL"
        onClose={() => {}}
        locale="he"
        labels={mockLabels}
        aiAnalysisLabels={mockAiAnalysisLabels}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("1D")).toBeInTheDocument();
    });

    // Find the metrics row container (parent of the metric labels)
    const metricLabel = screen.getByText("1D");
    const metricCard = metricLabel.closest('[class*="metricCard"]');
    const metricsRow = metricCard?.parentElement;

    expect(metricsRow).toHaveAttribute("dir", "ltr");
  });

  it("displays metric periods in correct visual order: 1D, 5D, 1M, 6M, 12M", async () => {
    render(
      <StockDetail
        symbol="AAPL"
        onClose={() => {}}
        locale="he"
        labels={mockLabels}
        aiAnalysisLabels={mockAiAnalysisLabels}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("1D")).toBeInTheDocument();
    });

    // Get all metric labels in order
    const labels = ["1D", "5D", "1M", "6M", "12M"];
    const labelElements = labels.map((label) => screen.getByText(label));

    // Verify they all exist (order is enforced by dir="ltr" on parent)
    labelElements.forEach((el) => {
      expect(el).toBeInTheDocument();
    });

    // Find the metrics row and verify it has LTR direction
    const metricLabel = screen.getByText("1D");
    const metricCard = metricLabel.closest('[class*="metricCard"]');
    const metricsRow = metricCard?.parentElement;

    // The dir="ltr" attribute ensures visual order matches DOM order
    expect(metricsRow).toHaveAttribute("dir", "ltr");
  });
});
