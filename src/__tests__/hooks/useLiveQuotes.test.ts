// ABOUTME: Tests for the useLiveQuotes hook.
// ABOUTME: Verifies fetching live quotes on mount and handling loading/error states.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";

describe("useLiveQuotes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns loading state initially", () => {
    vi.mocked(global.fetch).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useLiveQuotes(["AAPL"]));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.quotes).toEqual({});
    expect(result.current.error).toBeNull();
  });

  it("fetches quotes on mount", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          quotes: [
            {
              symbol: "AAPL",
              price: 150.0,
              previousClose: 145.0,
              change: 5.0,
              changePercent: 3.45,
            },
          ],
          fetchedAt: "2024-01-15T10:00:00Z",
        }),
    } as Response);

    const { result } = renderHook(() => useLiveQuotes(["AAPL"]));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(global.fetch).toHaveBeenCalledWith("/api/live-quotes?symbols=AAPL");
    expect(result.current.quotes).toEqual({
      AAPL: {
        symbol: "AAPL",
        price: 150.0,
        previousClose: 145.0,
        change: 5.0,
        changePercent: 3.45,
      },
    });
    expect(result.current.fetchedAt).toBe("2024-01-15T10:00:00Z");
  });

  it("handles multiple symbols", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          quotes: [
            {
              symbol: "AAPL",
              price: 150.0,
              previousClose: 145.0,
              change: 5.0,
              changePercent: 3.45,
            },
            {
              symbol: "MSFT",
              price: 300.0,
              previousClose: 295.0,
              change: 5.0,
              changePercent: 1.69,
            },
          ],
          fetchedAt: "2024-01-15T10:00:00Z",
        }),
    } as Response);

    const { result } = renderHook(() => useLiveQuotes(["AAPL", "MSFT"]));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/live-quotes?symbols=AAPL,MSFT"
    );
    expect(Object.keys(result.current.quotes)).toHaveLength(2);
    expect(result.current.quotes["AAPL"]).toBeDefined();
    expect(result.current.quotes["MSFT"]).toBeDefined();
  });

  it("handles empty symbols array", async () => {
    const { result } = renderHook(() => useLiveQuotes([]));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.quotes).toEqual({});
  });

  it("handles fetch error", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useLiveQuotes(["AAPL"]));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Network error");
    expect(result.current.quotes).toEqual({});
  });

  it("handles non-ok response", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    } as Response);

    const { result } = renderHook(() => useLiveQuotes(["AAPL"]));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Failed to fetch quotes");
    expect(result.current.quotes).toEqual({});
  });

  it("refetches when symbols change", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            quotes: [
              {
                symbol: "AAPL",
                price: 150.0,
                previousClose: 145.0,
                change: 5.0,
                changePercent: 3.45,
              },
            ],
            fetchedAt: "2024-01-15T10:00:00Z",
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            quotes: [
              {
                symbol: "MSFT",
                price: 300.0,
                previousClose: 295.0,
                change: 5.0,
                changePercent: 1.69,
              },
            ],
            fetchedAt: "2024-01-15T10:01:00Z",
          }),
      } as Response);

    const { result, rerender } = renderHook(
      ({ symbols }) => useLiveQuotes(symbols),
      { initialProps: { symbols: ["AAPL"] } }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.quotes["AAPL"]).toBeDefined();

    rerender({ symbols: ["MSFT"] });

    await waitFor(() =>
      expect(result.current.quotes["MSFT"]).toBeDefined()
    );

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
