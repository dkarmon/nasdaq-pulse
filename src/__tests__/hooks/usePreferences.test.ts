// ABOUTME: Tests for usePreferences hook.
// ABOUTME: Verifies preference state management and recommended mode behavior.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePreferences } from "@/hooks/usePreferences";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("usePreferences", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.resetAllMocks();
    // Mock fetch to avoid Supabase calls
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ preferences: null }),
      })
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("recommended only mode", () => {
    it("should save and restore sort/limit when toggling recommended mode", () => {
      const { result } = renderHook(() => usePreferences());

      // Set initial state
      act(() => {
        result.current.setSortBy("3m");
        result.current.setSortDirection("asc");
        result.current.setLimit(25);
      });

      expect(result.current.preferences.sortBy).toBe("3m");
      expect(result.current.preferences.sortDirection).toBe("asc");
      expect(result.current.preferences.limit).toBe(25);

      // Enable recommended only (saves sort/limit to preRecommendedState)
      act(() => {
        result.current.setShowRecommendedOnly(true);
      });

      expect(result.current.preferences.showRecommendedOnly).toBe(true);
      expect(result.current.preferences.sortBy).toBe("score");
      expect(result.current.preferences.sortDirection).toBe("desc");

      // Disable recommended only
      act(() => {
        result.current.setShowRecommendedOnly(false);
      });

      // Sort and limit should be restored
      expect(result.current.preferences.sortBy).toBe("3m");
      expect(result.current.preferences.sortDirection).toBe("asc");
      expect(result.current.preferences.limit).toBe(25);
    });
  });

  describe("exchange switching", () => {
    it("should switch exchanges correctly", () => {
      const { result } = renderHook(() => usePreferences());

      expect(result.current.preferences.exchange).toBe("nasdaq");

      act(() => {
        result.current.setExchange("tlv");
      });

      expect(result.current.preferences.exchange).toBe("tlv");
    });
  });

  describe("hidden stocks", () => {
    it("should hide and unhide stocks per exchange", () => {
      const { result } = renderHook(() => usePreferences());

      // Hide a stock on nasdaq
      act(() => {
        result.current.hideStock("AAPL");
      });

      expect(result.current.currentHiddenSymbols).toContain("AAPL");

      // Unhide the stock
      act(() => {
        result.current.unhideStock("AAPL");
      });

      expect(result.current.currentHiddenSymbols).not.toContain("AAPL");
    });
  });
});
