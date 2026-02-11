// ABOUTME: Tests that StockTable displays live price when available.
// ABOUTME: Verifies fallback to static price when no live quote.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StockTable } from "@/app/[locale]/pulse/components/stock-table";
import type { Stock } from "@/lib/market-data/types";
import type { LiveQuote, QuotesMap } from "@/hooks/useLiveQuotes";

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
  growth3m: 6.4,
  growth6m: 10.5,
  growth12m: 25.0,
  exchange: "nasdaq",
  marketCap: 1_000_000_000,
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const defaultLabels = {
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
};

describe("StockTable live price display", () => {
  it("displays live price when liveQuote is provided for a stock", () => {
    const stock = createMockStock({ price: 150.0 });
    const liveQuotes: QuotesMap = {
      AAPL: {
        symbol: "AAPL",
        price: 175.5, // Live price differs from static
        previousClose: 170.0,
        change: 5.5,
        changePercent: 3.24,
      },
    };

    render(
      <StockTable
        stocks={[stock]}
        sortBy="1m"
        selectedSymbol={null}
        onSelectStock={vi.fn()}
        onHideStock={vi.fn()}
        liveQuotes={liveQuotes}
        labels={defaultLabels}
      />
    );

    // Should display the live price, not the static price
    expect(screen.getByText("$175.50")).toBeInTheDocument();
    expect(screen.queryByText("$150.00")).not.toBeInTheDocument();
  });

  it("displays static price when liveQuote is not provided for a stock", () => {
    const stock = createMockStock({ price: 150.0 });

    render(
      <StockTable
        stocks={[stock]}
        sortBy="1m"
        selectedSymbol={null}
        onSelectStock={vi.fn()}
        onHideStock={vi.fn()}
        liveQuotes={{}}
        labels={defaultLabels}
      />
    );

    // Should display the static price
    expect(screen.getByText("$150.00")).toBeInTheDocument();
  });

  it("displays mixed prices when some stocks have live quotes and others do not", () => {
    const stockWithLive = createMockStock({
      symbol: "AAPL",
      name: "Apple Inc.",
      price: 150.0,
    });
    const stockWithoutLive = createMockStock({
      symbol: "MSFT",
      name: "Microsoft Corp.",
      price: 350.0,
    });

    const liveQuotes: QuotesMap = {
      AAPL: {
        symbol: "AAPL",
        price: 175.5,
        previousClose: 170.0,
        change: 5.5,
        changePercent: 3.24,
      },
      // MSFT has no live quote
    };

    render(
      <StockTable
        stocks={[stockWithLive, stockWithoutLive]}
        sortBy="1m"
        selectedSymbol={null}
        onSelectStock={vi.fn()}
        onHideStock={vi.fn()}
        liveQuotes={liveQuotes}
        labels={defaultLabels}
      />
    );

    // AAPL should display live price
    expect(screen.getByText("$175.50")).toBeInTheDocument();
    expect(screen.queryByText("$150.00")).not.toBeInTheDocument();

    // MSFT should display static price
    expect(screen.getByText("$350.00")).toBeInTheDocument();
  });

  it("displays ILS live price with correct currency symbol", () => {
    const stock = createMockStock({
      symbol: "TEVA.TA",
      name: "Teva Pharmaceutical",
      price: 45.0,
      currency: "ILS",
    });
    const liveQuotes: QuotesMap = {
      "TEVA.TA": {
        symbol: "TEVA.TA",
        price: 48.75,
        previousClose: 45.0,
        change: 3.75,
        changePercent: 8.33,
      },
    };

    render(
      <StockTable
        stocks={[stock]}
        sortBy="1m"
        selectedSymbol={null}
        onSelectStock={vi.fn()}
        onHideStock={vi.fn()}
        liveQuotes={liveQuotes}
        labels={defaultLabels}
      />
    );

    // Should display the live price with ILS symbol
    expect(screen.getByText("₪48.75")).toBeInTheDocument();
    expect(screen.queryByText("₪45.00")).not.toBeInTheDocument();
  });
});
