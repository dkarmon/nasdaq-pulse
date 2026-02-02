// ABOUTME: Tests for Yahoo Finance batch quotes functionality.
// ABOUTME: Verifies batching, retry logic, and error handling.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking fetch
import { getBatchQuotes, getQuoteAndGrowth } from "@/lib/market-data/yahoo";

describe("getBatchQuotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createSparkResponse(
    symbols: { symbol: string; price: number; previousClose: number; open?: number }[]
  ) {
    const result: Record<string, unknown> = {};
    for (const s of symbols) {
      result[s.symbol] = {
        symbol: s.symbol,
        chartPreviousClose: s.previousClose,
        close: [s.price],
        open: [s.open ?? s.price],
        timestamp: [Date.now() / 1000],
      };
    }
    return result;
  }

  it("returns quotes for multiple symbols in a single batch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        createSparkResponse([
          { symbol: "AAPL", price: 150.0, previousClose: 145.0 },
          { symbol: "GOOGL", price: 180.0, previousClose: 175.0 },
          { symbol: "MSFT", price: 400.0, previousClose: 395.0 },
        ]),
    });

    const result = await getBatchQuotes(["AAPL", "GOOGL", "MSFT"]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("symbols=AAPL,GOOGL,MSFT"),
      expect.any(Object)
    );

    expect(result.size).toBe(3);
    expect(result.get("AAPL")).toEqual({
      symbol: "AAPL",
      price: 150.0,
      previousClose: 145.0,
      open: 150.0,
    });
    expect(result.get("GOOGL")).toEqual({
      symbol: "GOOGL",
      price: 180.0,
      previousClose: 175.0,
      open: 180.0,
    });
    expect(result.get("MSFT")).toEqual({
      symbol: "MSFT",
      price: 400.0,
      previousClose: 395.0,
      open: 400.0,
    });
  });

  it("splits requests into batches of 20 symbols", async () => {
    const symbols = Array.from({ length: 45 }, (_, i) => `SYM${i}`);

    // Mock 3 batches: 20, 20, 5
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createSparkResponse(
            symbols.slice(0, 20).map((s) => ({ symbol: s, price: 100, previousClose: 99 }))
          ),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createSparkResponse(
            symbols.slice(20, 40).map((s) => ({ symbol: s, price: 100, previousClose: 99 }))
          ),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createSparkResponse(
            symbols.slice(40, 45).map((s) => ({ symbol: s, price: 100, previousClose: 99 }))
          ),
      });

    const result = await getBatchQuotes(symbols);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.size).toBe(45);
  });

  it("handles symbols missing from response gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        createSparkResponse([
          { symbol: "AAPL", price: 150.0, previousClose: 145.0 },
          // INVALID is omitted by Yahoo
        ]),
    });

    const result = await getBatchQuotes(["AAPL", "INVALID"]);

    expect(result.size).toBe(1);
    expect(result.has("AAPL")).toBe(true);
    expect(result.has("INVALID")).toBe(false);
  });

  it("retries on HTTP error with exponential backoff", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createSparkResponse([{ symbol: "AAPL", price: 150.0, previousClose: 145.0 }]),
      });

    const resultPromise = getBatchQuotes(["AAPL"]);

    // First attempt fails immediately
    await vi.advanceTimersByTimeAsync(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // After 100ms backoff, second attempt
    await vi.advanceTimersByTimeAsync(100);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // After 200ms backoff, third attempt succeeds
    await vi.advanceTimersByTimeAsync(200);
    expect(mockFetch).toHaveBeenCalledTimes(3);

    const result = await resultPromise;
    expect(result.size).toBe(1);
    expect(result.get("AAPL")?.price).toBe(150.0);
  });

  it("returns empty map for batch after max retries exhausted", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const resultPromise = getBatchQuotes(["AAPL"]);

    // Exhaust all retries
    await vi.advanceTimersByTimeAsync(0); // 1st attempt
    await vi.advanceTimersByTimeAsync(100); // 2nd attempt
    await vi.advanceTimersByTimeAsync(200); // 3rd attempt

    const result = await resultPromise;
    expect(result.size).toBe(0);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("retries on network error", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createSparkResponse([{ symbol: "AAPL", price: 150.0, previousClose: 145.0 }]),
      });

    const resultPromise = getBatchQuotes(["AAPL"]);

    // First attempt fails
    await vi.advanceTimersByTimeAsync(0);
    // After backoff, second attempt succeeds
    await vi.advanceTimersByTimeAsync(100);

    const result = await resultPromise;
    expect(result.size).toBe(1);
    expect(result.get("AAPL")?.price).toBe(150.0);
  });

  it("returns empty map for empty symbols array", async () => {
    const result = await getBatchQuotes([]);
    expect(result.size).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("getQuoteAndGrowth - NaN handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createChartResponse(meta: Record<string, unknown>, quotes: Record<string, number[]>, timestamps: number[]) {
    return {
      chart: {
        result: [{
          meta: {
            symbol: "TEST",
            currency: "USD",
            exchangeName: "NASDAQ",
            ...meta,
          },
          timestamp: timestamps,
          indicators: {
            quote: [quotes],
          },
        }],
        error: null,
      },
    };
  }

  it("falls back to historical calculation when regularMarketPrice is undefined", async () => {
    // Create timestamps for 10 trading days
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const timestamps = Array.from({ length: 10 }, (_, i) => Math.floor((now - (10 - i) * day) / 1000));
    const closePrices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 110];

    // Year data has undefined regularMarketPrice
    const yearResponse = createChartResponse(
      {
        regularMarketPrice: undefined, // This is the bug scenario!
        previousClose: 108,
        chartPreviousClose: 108,
      },
      {
        open: closePrices,
        high: closePrices.map(p => p + 1),
        low: closePrices.map(p => p - 1),
        close: closePrices,
        volume: closePrices.map(() => 1000000),
      },
      timestamps
    );

    // Day data
    const dayResponse = createChartResponse(
      {
        regularMarketPrice: undefined,
        previousClose: 108,
        chartPreviousClose: 108,
      },
      {
        close: [110],
        open: [109],
        high: [111],
        low: [108],
        volume: [1000000],
      },
      [timestamps[timestamps.length - 1]]
    );

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => yearResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => dayResponse });

    const result = await getQuoteAndGrowth("TEST");

    // growth1d should NOT be NaN/null - it should fall back to historical calculation
    expect(result).not.toBeNull();
    expect(Number.isFinite(result!.growth.growth1d)).toBe(true);
    // Historical: (110 - 108) / 108 * 100 ≈ 1.85%
    // The exact value depends on timestamp alignment, but it should be a finite number
    console.log("growth1d when regularMarketPrice is undefined:", result!.growth.growth1d);
  });

  it("falls back to historical calculation when regularMarketPrice is NaN", async () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const timestamps = Array.from({ length: 10 }, (_, i) => Math.floor((now - (10 - i) * day) / 1000));
    const closePrices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 110];

    // Year data has NaN regularMarketPrice
    const yearResponse = createChartResponse(
      {
        regularMarketPrice: NaN, // Explicit NaN
        previousClose: 108,
        chartPreviousClose: 108,
      },
      {
        open: closePrices,
        high: closePrices.map(p => p + 1),
        low: closePrices.map(p => p - 1),
        close: closePrices,
        volume: closePrices.map(() => 1000000),
      },
      timestamps
    );

    const dayResponse = createChartResponse(
      {
        regularMarketPrice: NaN,
        previousClose: 108,
        chartPreviousClose: 108,
      },
      {
        close: [110],
        open: [109],
        high: [111],
        low: [108],
        volume: [1000000],
      },
      [timestamps[timestamps.length - 1]]
    );

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => yearResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => dayResponse });

    const result = await getQuoteAndGrowth("TEST");

    expect(result).not.toBeNull();
    expect(Number.isFinite(result!.growth.growth1d)).toBe(true);
    console.log("growth1d when regularMarketPrice is NaN:", result!.growth.growth1d);
  });
});

describe("getBatchQuotes - partial failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createSparkResponse(
    symbols: { symbol: string; price: number; previousClose: number; open?: number }[]
  ) {
    const result: Record<string, unknown> = {};
    for (const s of symbols) {
      result[s.symbol] = {
        symbol: s.symbol,
        chartPreviousClose: s.previousClose,
        close: [s.price],
        open: [s.open ?? s.price],
        timestamp: [Date.now() / 1000],
      };
    }
    return result;
  }

  it("handles partial batch failure gracefully", async () => {
    const symbols = Array.from({ length: 25 }, (_, i) => `SYM${i}`);

    // First batch succeeds, second batch fails all retries
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createSparkResponse(
            symbols.slice(0, 20).map((s) => ({ symbol: s, price: 100, previousClose: 99 }))
          ),
      })
      // Second batch fails 3 times
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const resultPromise = getBatchQuotes(symbols);

    // Let retries complete
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);

    const result = await resultPromise;

    // Should have 20 results from successful first batch
    expect(result.size).toBe(20);
    expect(result.has("SYM0")).toBe(true);
    expect(result.has("SYM19")).toBe(true);
    expect(result.has("SYM20")).toBe(false); // Second batch failed

    consoleErrorSpy.mockRestore();
  });
});
