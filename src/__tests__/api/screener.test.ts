// ABOUTME: Tests for the screener API route.
// ABOUTME: Verifies query parameter parsing and response shape.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/screener/route";
import { getAllMockStocks } from "@/lib/market-data/mock";
import type { Stock } from "@/lib/market-data/types";

vi.mock("next/cache", () => ({
  unstable_cache: <T,>(fn: () => T) => fn,
}));

const { mockOmitRules } = vi.hoisted(() => ({
  mockOmitRules: vi.fn((): Promise<unknown> => Promise.resolve(null)),
}));

// Stock with extreme growth that omit rules would normally filter out
const extremeGrowthStock: Stock = {
  symbol: "SNDK",
  name: "SanDisk Corporation",
  exchange: "nasdaq",
  price: 851,
  currency: "USD",
  marketCap: 0,
  growth1d: 5,
  growth5d: 15,
  growth1m: 80,
  growth3m: 200,
  growth6m: 900,
  growth12m: 2900,
  updatedAt: new Date().toISOString(),
};

vi.mock("@/lib/market-data/storage", () => ({
  getStocks: vi.fn(() => Promise.resolve([...getAllMockStocks(), extremeGrowthStock])),
  getLastUpdated: vi.fn(() => Promise.resolve(new Date().toISOString())),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
    },
  })),
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/recommendations/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/recommendations/server")>();
  return {
    ...actual,
    fetchEffectiveOmitRules: mockOmitRules,
  };
});

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

  it("sorts by 3m when requested", async () => {
    const request = createRequest({ sortBy: "3m" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    for (let i = 0; i < data.stocks.length - 1; i++) {
      expect(data.stocks[i].growth3m).toBeGreaterThanOrEqual(
        data.stocks[i + 1].growth3m
      );
    }
  });

  it("sorts by 1d when requested", async () => {
    const request = createRequest({ sortBy: "1d" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    for (let i = 0; i < data.stocks.length - 1; i++) {
      expect(data.stocks[i].growth1d ?? 0).toBeGreaterThanOrEqual(
        data.stocks[i + 1].growth1d ?? 0
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
    expect(stock.growth1d).toBeDefined();
    expect(stock.growth1m).toBeDefined();
    expect(stock.growth3m).toBeDefined();
    expect(stock.growth6m).toBeDefined();
    expect(stock.growth12m).toBeDefined();
  });

  it("search bypasses omit rules so extreme-growth stocks are findable", async () => {
    // Omit rules that would filter out SNDK (growth12m: 2900 exceeds max 1501)
    mockOmitRules.mockResolvedValueOnce({
      enabled: true,
      rules: {
        nasdaq: [
          { field: "growth12m", min: -73, max: 1501 },
        ],
      },
    });

    const request = createRequest({ search: "SNDK", limit: "100" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    const sndk = data.stocks.find((s: Stock) => s.symbol === "SNDK");
    expect(sndk).toBeDefined();
    expect(sndk.price).toBe(851);
  });

  it("skipOmitRules returns all stocks including those omit rules would filter", async () => {
    mockOmitRules.mockResolvedValueOnce({
      enabled: true,
      rules: {
        nasdaq: [
          { field: "growth12m", min: -73, max: 1501 },
        ],
      },
    });

    const request = createRequest({ skipOmitRules: "true", limit: "10000" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    const sndk = data.stocks.find((s: Stock) => s.symbol === "SNDK");
    expect(sndk).toBeDefined();
    expect(sndk.price).toBe(851);
    // Should return ALL stocks, not just search-filtered ones
    expect(data.stocks.length).toBeGreaterThan(1);
  });

  it("omit rules still apply when browsing without search", async () => {
    // Same omit rules — SNDK should be filtered when not searching
    mockOmitRules.mockResolvedValueOnce({
      enabled: true,
      rules: {
        nasdaq: [
          { field: "growth12m", min: -73, max: 1501 },
        ],
      },
    });

    const request = createRequest({ limit: "10000" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    const sndk = data.stocks.find((s: Stock) => s.symbol === "SNDK");
    expect(sndk).toBeUndefined();
  });
});
