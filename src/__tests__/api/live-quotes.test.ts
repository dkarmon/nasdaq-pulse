// ABOUTME: Tests for the live-quotes API endpoint.
// ABOUTME: Verifies fetching current prices and intraday change percentages.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Yahoo Finance module before importing the route
vi.mock("@/lib/market-data/yahoo", () => ({
  getQuote: vi.fn(),
}));

import { GET } from "@/app/api/live-quotes/route";
import { getQuote } from "@/lib/market-data/yahoo";

const mockGetQuote = vi.mocked(getQuote);

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
    mockGetQuote.mockResolvedValueOnce({
      symbol: "AAPL",
      price: 150.0,
      previousClose: 145.0,
      name: "Apple Inc.",
      exchange: "NASDAQ",
    });
    mockGetQuote.mockResolvedValueOnce({
      symbol: "MSFT",
      price: 300.0,
      previousClose: 295.0,
      name: "Microsoft Corp",
      exchange: "NASDAQ",
    });

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
    mockGetQuote.mockResolvedValueOnce({
      symbol: "AZRG.TA",
      price: 100.0,
      previousClose: 98.0,
      name: "Azrieli Group",
      exchange: "TLV",
    });

    const request = createRequest({ symbols: "AZRG.TA" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quotes).toHaveLength(1);
    expect(data.quotes[0].symbol).toBe("AZRG.TA");
    expect(data.quotes[0].changePercent).toBeCloseTo(2.04, 1);
  });

  it("excludes symbols that fail to fetch", async () => {
    mockGetQuote.mockResolvedValueOnce({
      symbol: "AAPL",
      price: 150.0,
      previousClose: 145.0,
      name: "Apple Inc.",
      exchange: "NASDAQ",
    });
    mockGetQuote.mockResolvedValueOnce(null); // INVALID fails

    const request = createRequest({ symbols: "AAPL,INVALID" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quotes).toHaveLength(1);
    expect(data.quotes[0].symbol).toBe("AAPL");
  });

  it("returns empty quotes array if all symbols fail", async () => {
    mockGetQuote.mockResolvedValue(null);

    const request = createRequest({ symbols: "INVALID1,INVALID2" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quotes).toEqual([]);
  });

  it("trims and uppercases symbols", async () => {
    mockGetQuote.mockResolvedValueOnce({
      symbol: "AAPL",
      price: 150.0,
      previousClose: 145.0,
      name: "Apple Inc.",
      exchange: "NASDAQ",
    });

    const request = createRequest({ symbols: " aapl " });
    const response = await GET(request);

    expect(mockGetQuote).toHaveBeenCalledWith("AAPL");
  });

  it("limits to 500 symbols max", async () => {
    const symbols = Array.from({ length: 600 }, (_, i) => `SYM${i}`).join(",");
    mockGetQuote.mockResolvedValue(null);

    const request = createRequest({ symbols });
    await GET(request);

    expect(mockGetQuote).toHaveBeenCalledTimes(500);
  });

  it("includes fetchedAt timestamp", async () => {
    mockGetQuote.mockResolvedValueOnce({
      symbol: "AAPL",
      price: 150.0,
      previousClose: 145.0,
      name: "Apple Inc.",
      exchange: "NASDAQ",
    });

    const request = createRequest({ symbols: "AAPL" });
    const response = await GET(request);
    const data = await response.json();

    expect(data.fetchedAt).toBeDefined();
    expect(new Date(data.fetchedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });
});
