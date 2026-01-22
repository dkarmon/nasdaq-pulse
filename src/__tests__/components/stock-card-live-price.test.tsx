// ABOUTME: Tests that StockCard displays live price when available.
// ABOUTME: Verifies fallback to static price when no live quote.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StockCard } from "@/app/[locale]/pulse/components/stock-card";
import type { Stock } from "@/lib/market-data/types";
import type { LiveQuote } from "@/hooks/useLiveQuotes";

// Mock the recommendation check
vi.mock("@/lib/market-data/recommendation", () => ({
  isStockRecommended: () => true,
}));

const createMockStock = (overrides: Partial<Stock> = {}): Stock => ({
  symbol: "AAPL",
  name: "Apple Inc.",
  price: 150.0, // Static cached price
  currency: "USD",
  growth5d: 1.5,
  growth1m: 3.2,
  growth6m: 10.5,
  growth12m: 25.0,
  recommendationDate: "2024-01-15",
  ...overrides,
});

const defaultProps = {
  sortBy: "1m" as const,
  isSelected: false,
  onSelect: vi.fn(),
  onHide: vi.fn(),
  hideLabel: "Hide",
  recommendedLabel: "Recommended",
};

describe("StockCard live price display", () => {
  it("displays live price when liveQuote is provided", () => {
    const stock = createMockStock({ price: 150.0 });
    const liveQuote: LiveQuote = {
      symbol: "AAPL",
      price: 175.5, // Live price differs from static
      previousClose: 170.0,
      change: 5.5,
      changePercent: 3.24,
    };

    render(
      <StockCard
        stock={stock}
        liveQuote={liveQuote}
        {...defaultProps}
      />
    );

    // Should display the live price, not the static price
    expect(screen.getByText("$175.50")).toBeInTheDocument();
    expect(screen.queryByText("$150.00")).not.toBeInTheDocument();
  });

  it("displays static price when liveQuote is undefined", () => {
    const stock = createMockStock({ price: 150.0 });

    render(
      <StockCard
        stock={stock}
        liveQuote={undefined}
        {...defaultProps}
      />
    );

    // Should display the static price
    expect(screen.getByText("$150.00")).toBeInTheDocument();
  });

  it("displays ILS live price with correct currency symbol", () => {
    const stock = createMockStock({
      symbol: "TEVA.TA",
      price: 45.0,
      currency: "ILS",
    });
    const liveQuote: LiveQuote = {
      symbol: "TEVA.TA",
      price: 48.75,
      previousClose: 45.0,
      change: 3.75,
      changePercent: 8.33,
    };

    render(
      <StockCard
        stock={stock}
        liveQuote={liveQuote}
        {...defaultProps}
      />
    );

    // Should display the live price with ILS symbol
    expect(screen.getByText("₪48.75")).toBeInTheDocument();
    expect(screen.queryByText("₪45.00")).not.toBeInTheDocument();
  });
});
