// ABOUTME: Tests for the live-quotes API endpoint.
// ABOUTME: Verifies fetching current prices and intraday change percentages.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { BatchQuote } from "@/lib/market-data/yahoo";

// Mock Yahoo Finance module before importing the route
vi.mock("@/lib/market-data/yahoo", () => ({
  getBatchQuotes: vi.fn(),
}));

import { GET } from "@/app/api/live-quotes/route";
import { getBatchQuotes } from "@/lib/market-data/yahoo";

const mockGetBatchQuotes = vi.mocked(getBatchQuotes);

function createQuotesMap(quotes: BatchQuote[]): Map<string, BatchQuote> {
  const map = new Map<string, BatchQuote>();
  for (const quote of quotes) {
    map.set(quote.symbol, quote);
  }
  return map;
}

function createRequest(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/live-quotes");
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
}

describe("GET /api/live-quotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 if no symbols provided", async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("returns quotes for valid symbols", async () => {
    mockGetBatchQuotes.mockResolvedValueOnce(
      createQuotesMap([
        { symbol: "AAPL", price: 150.0, previousClose: 145.0 },
        { symbol: "MSFT", price: 300.0, previousClose: 295.0 },
      ])
    );

    const request = createRequest({ symbols: "AAPL,MSFT" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quotes).toHaveLength(2);
    expect(data.quotes[0]).toEqual({
      symbol: "AAPL",
      price: 150.0,
      previousClose: 145.0,
      change: 5.0,
      changePercent: expect.closeTo(3.45, 1),
    });
    expect(data.quotes[1]).toEqual({
      symbol: "MSFT",
      price: 300.0,
      previousClose: 295.0,
      change: 5.0,
      changePercent: expect.closeTo(1.69, 1),
    });
  });

  it("handles TLV symbols with .TA suffix", async () => {
    mockGetBatchQuotes.mockResolvedValueOnce(
      createQuotesMap([{ symbol: "AZRG.TA", price: 100.0, previousClose: 98.0 }])
    );

    const request = createRequest({ symbols: "AZRG.TA" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quotes).toHaveLength(1);
    expect(data.quotes[0].symbol).toBe("AZRG.TA");
    expect(data.quotes[0].changePercent).toBeCloseTo(2.04, 1);
  });

  it("excludes symbols that fail to fetch", async () => {
    // Only AAPL is in the map, INVALID is not
    mockGetBatchQuotes.mockResolvedValueOnce(
      createQuotesMap([{ symbol: "AAPL", price: 150.0, previousClose: 145.0 }])
    );

    const request = createRequest({ symbols: "AAPL,INVALID" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quotes).toHaveLength(1);
    expect(data.quotes[0].symbol).toBe("AAPL");
  });

  it("returns empty quotes array if all symbols fail", async () => {
    mockGetBatchQuotes.mockResolvedValue(new Map());

    const request = createRequest({ symbols: "INVALID1,INVALID2" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quotes).toEqual([]);
  });

  it("trims and uppercases symbols", async () => {
    mockGetBatchQuotes.mockResolvedValueOnce(
      createQuotesMap([{ symbol: "AAPL", price: 150.0, previousClose: 145.0 }])
    );

    const request = createRequest({ symbols: " aapl " });
    await GET(request);

    expect(mockGetBatchQuotes).toHaveBeenCalledWith(["AAPL"]);
  });

  it("limits to 500 symbols max", async () => {
    const symbols = Array.from({ length: 600 }, (_, i) => `SYM${i}`).join(",");
    mockGetBatchQuotes.mockResolvedValue(new Map());

    const request = createRequest({ symbols });
    await GET(request);

    // Should be called once with at most 500 symbols
    expect(mockGetBatchQuotes).toHaveBeenCalledTimes(1);
    const calledSymbols = mockGetBatchQuotes.mock.calls[0][0];
    expect(calledSymbols).toHaveLength(500);
  });

  it("includes fetchedAt timestamp", async () => {
    mockGetBatchQuotes.mockResolvedValueOnce(
      createQuotesMap([{ symbol: "AAPL", price: 150.0, previousClose: 145.0 }])
    );

    const request = createRequest({ symbols: "AAPL" });
    const response = await GET(request);
    const data = await response.json();

    expect(data.fetchedAt).toBeDefined();
    expect(new Date(data.fetchedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });
});
