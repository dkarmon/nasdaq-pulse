// ABOUTME: Tests for mobile stock card swipe-to-hide functionality.
// ABOUTME: Verifies swipe gesture detection and inline metric display.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StockCard } from "@/app/[locale]/pulse/components/stock-card";
import type { Stock } from "@/lib/market-data/types";

vi.mock("@/lib/market-data/recommendation", () => ({
  isStockRecommended: () => true,
}));

const createMockStock = (overrides: Partial<Stock> = {}): Stock => ({
  symbol: "AAPL",
  name: "Apple Inc.",
  price: 150.0,
  currency: "USD",
  growth1d: 2.5,
  growth5d: 5.1,
  growth1m: 12.3,
  growth3m: 18.2,
  growth6m: 25.4,
  growth12m: 45.2,
  exchange: "nasdaq",
  marketCap: 1_000_000_000,
  updatedAt: new Date().toISOString(),
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

describe("StockCard mobile layout", () => {
  it("shows ticker for NASDAQ stocks without company name", () => {
    const stock = createMockStock({ symbol: "AAPL", name: "Apple Inc." });
    render(<StockCard stock={stock} {...defaultProps} />);

    expect(screen.getByText(/AAPL/)).toBeInTheDocument();
  });

  it("shows Hebrew name for TLV stocks", () => {
    const stock = createMockStock({
      symbol: "TEVA.TA",
      name: "Teva Pharmaceutical",
      nameHebrew: "טבע תעשיות",
      currency: "ILS",
    });
    render(<StockCard stock={stock} {...defaultProps} />);

    expect(screen.getByText(/טבע תעשיות/)).toBeInTheDocument();
  });

  it("displays all growth metrics inline", () => {
    const stock = createMockStock();
    render(<StockCard stock={stock} {...defaultProps} />);

    expect(screen.getByText("1D")).toBeInTheDocument();
    expect(screen.getByText("5D")).toBeInTheDocument();
    expect(screen.getByText("1M")).toBeInTheDocument();
    expect(screen.getByText("3M")).toBeInTheDocument();
    expect(screen.getByText("6M")).toBeInTheDocument();
    expect(screen.getByText("12M")).toBeInTheDocument();
  });

  it("shows rank without hash prefix", () => {
    const stock = createMockStock();
    render(<StockCard stock={stock} rank={7} {...defaultProps} />);

    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.queryByText("#7")).not.toBeInTheDocument();
  });

  it("calls onHide when swipe action is triggered", () => {
    const onHide = vi.fn();
    const stock = createMockStock();
    render(<StockCard stock={stock} {...defaultProps} onHide={onHide} />);

    // Find the card container by its test id
    const card = screen.getByTestId("stock-card");

    // Simulate a swipe left by firing touch events (swipe > 100px)
    fireEvent.touchStart(card, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchMove(card, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(card);

    // After a sufficient swipe, onHide should be called
    expect(onHide).toHaveBeenCalled();
  });

  it("does not call onHide for small swipes", () => {
    const onHide = vi.fn();
    const stock = createMockStock();
    render(<StockCard stock={stock} {...defaultProps} onHide={onHide} />);

    const card = screen.getByTestId("stock-card");

    // Small swipe - should snap back, not hide (< 100px)
    fireEvent.touchStart(card, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchMove(card, { touches: [{ clientX: 280, clientY: 100 }] });
    fireEvent.touchEnd(card);

    expect(onHide).not.toHaveBeenCalled();
  });
});
