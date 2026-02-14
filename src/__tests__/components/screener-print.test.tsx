// ABOUTME: Tests for desktop print behavior in ScreenerClient.
// ABOUTME: Verifies print trigger and print summary metadata rendering.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScreenerClient } from "@/app/[locale]/pulse/components/screener-client";
import type { ScreenerResponse, Stock } from "@/lib/market-data/types";
import { getDictionary } from "@/lib/i18n";

const mockPreferences = vi.fn();

vi.mock("@/hooks/usePreferences", () => ({
  usePreferences: () => mockPreferences(),
}));

vi.mock("@/hooks/useLiveQuotes", () => ({
  useLiveQuotes: () => ({ quotes: {} }),
}));

const mockStock: Stock = {
  symbol: "AAPL",
  name: "Apple Inc",
  exchange: "nasdaq",
  price: 200,
  currency: "USD",
  marketCap: 1000000000,
  growth1d: 1.2,
  growth5d: 2.1,
  growth1m: 5.5,
  growth6m: 8.3,
  growth12m: 12.8,
  updatedAt: new Date().toISOString(),
};

const mockInitialData: ScreenerResponse = {
  stocks: [mockStock],
  updatedAt: new Date().toISOString(),
  source: "cached",
  exchange: "nasdaq",
  recommendation: { activeFormula: null },
};

const mockDict = getDictionary("en");

describe("ScreenerClient print", () => {
  beforeEach(() => {
    mockPreferences.mockReturnValue({
      preferences: {
        sortBy: "1m",
        sortDirection: "desc",
        limit: 50,
        exchange: "nasdaq",
        showRecommendedOnly: false,
      },
      isLoaded: true,
      setSortBy: vi.fn(),
      setSortDirection: vi.fn(),
      setLimit: vi.fn(),
      setExchange: vi.fn(),
      hideStock: vi.fn(),
      setShowRecommendedOnly: vi.fn(),
      currentHiddenSymbols: [],
    });

    global.fetch = vi.fn(async (url: string) => {
      if (url.includes("/api/daily-ai-badges")) {
        return {
          ok: true,
          json: async () => ({ badges: {} }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({
          stocks: [mockStock],
          updatedAt: new Date().toISOString(),
          source: "cached",
          recommendation: { activeFormula: null },
          exchange: "nasdaq",
        }),
      } as Response;
    });

    Object.defineProperty(window, "print", {
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders print summary fields with configuration metadata", async () => {
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

    await waitFor(() => {
      expect(screen.getByText("Ordering:")).toBeInTheDocument();
    });

    expect(screen.getByText("Exchange:")).toBeInTheDocument();
    expect(screen.getByText("Recommended only:")).toBeInTheDocument();
    expect(screen.getByText("Query:")).toBeInTheDocument();
    expect(screen.getByText("Printed at:")).toBeInTheDocument();
  });

  it("calls window.print from the desktop print button and clears print mode after afterprint", async () => {
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

    const printButton = await screen.findByRole("button", { name: "Print" });
    await user.click(printButton);

    expect(window.print).toHaveBeenCalledTimes(1);
    expect(document.body.getAttribute("data-printing")).toBe("first-page");

    window.dispatchEvent(new Event("afterprint"));
    expect(document.body.getAttribute("data-printing")).toBeNull();
  });
});
