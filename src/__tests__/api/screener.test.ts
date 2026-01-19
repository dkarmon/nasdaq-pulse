// ABOUTME: Tests for the screener API route.
// ABOUTME: Verifies query parameter parsing and response shape.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/screener/route";
import { getAllMockStocks } from "@/lib/market-data/mock";

vi.mock("next/cache", () => ({
  unstable_cache: <T,>(fn: () => T) => fn,
}));

vi.mock("@/lib/market-data/storage", () => ({
  getStocks: vi.fn(() => Promise.resolve(getAllMockStocks())),
  getLastUpdated: vi.fn(() => Promise.resolve(new Date().toISOString())),
}));

function createRequest(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/screener");
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
}

describe("GET /api/screener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns screener data with default parameters", async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stocks).toBeDefined();
    expect(data.stocks.length).toBeLessThanOrEqual(50);
    expect(data.updatedAt).toBeDefined();
    expect(data.source).toBeDefined();
  });

  it("respects sortBy parameter", async () => {
    const request = createRequest({ sortBy: "6m" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    for (let i = 0; i < data.stocks.length - 1; i++) {
      expect(data.stocks[i].growth6m).toBeGreaterThanOrEqual(
        data.stocks[i + 1].growth6m
      );
    }
  });

  it("respects limit parameter", async () => {
    const request = createRequest({ limit: "25" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stocks.length).toBeLessThanOrEqual(25);
  });

  it("respects filter parameters", async () => {
    const request = createRequest({
      max1m: "10",
      max6m: "25",
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    for (const stock of data.stocks) {
      expect(stock.growth1m).toBeLessThanOrEqual(10);
      expect(stock.growth6m).toBeLessThanOrEqual(25);
    }
  });

  it("defaults invalid sortBy to 1m", async () => {
    const request = createRequest({ sortBy: "invalid" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    for (let i = 0; i < data.stocks.length - 1; i++) {
      expect(data.stocks[i].growth1m).toBeGreaterThanOrEqual(
        data.stocks[i + 1].growth1m
      );
    }
  });

  it("defaults invalid limit to 50", async () => {
    const request = createRequest({ limit: "99999" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stocks.length).toBeLessThanOrEqual(50);
  });

  it("defaults invalid filter to any", async () => {
    const request = createRequest({ max1m: "invalid" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stocks.length).toBeGreaterThan(0);
  });

  it("returns stocks with required fields", async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stocks.length).toBeGreaterThan(0);

    const stock = data.stocks[0];
    expect(stock.symbol).toBeDefined();
    expect(stock.name).toBeDefined();
    expect(stock.price).toBeDefined();
    expect(stock.marketCap).toBeDefined();
    expect(stock.growth1m).toBeDefined();
    expect(stock.growth6m).toBeDefined();
    expect(stock.growth12m).toBeDefined();
  });
});
